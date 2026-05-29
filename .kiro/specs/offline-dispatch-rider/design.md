# Design Document: Offline-Tolerant Dispatch Rider Web Experience

## Overview

This design describes the frontend and backend changes needed to support offline-tolerant dispatch rider workflows. Riders operate in low-connectivity environments and must be able to capture assignment acceptance, pickup confirmation, drop-off confirmation, signature state, and photo evidence references without an active network connection. A client-side Sync Engine drains a persistent IndexedDB queue when connectivity is restored. The backend enforces idempotency on all sync endpoints to prevent duplicate state transitions, and exposes late-sync metadata so operators can audit time-sensitive deliveries.

The feature integrates with the existing NestJS backend (dispatch, delivery-proof, orders modules) and the Next.js 16 / React 19 frontend (health-chain). It reuses the existing `IdempotencyService` (Redis-backed, 24 h TTL) and extends it to 72 h for offline replay scenarios.

---

## Architecture

```mermaid
flowchart TD
    subgraph Rider Device (Browser / PWA)
        UI[Rider Dashboard UI]
        SE[Sync Engine]
        IDB[(IndexedDB\nOffline Queue)]
        SW[Service Worker]
    end

    subgraph Backend (NestJS)
        DSC[Dispatch Sync Controller]
        IS[Idempotency Service\n(Redis, 72 h TTL)]
        DPS[Delivery Proof Service]
        OSM[Order State Machine]
        DB[(PostgreSQL)]
    end

    UI -->|capture action| IDB
    IDB -->|drain on online| SE
    SE -->|POST with Idempotency-Key| DSC
    SW -->|background sync| SE
    DSC -->|check key| IS
    IS -->|hit: return cached| DSC
    IS -->|miss: proceed| DPS
    DPS --> OSM
    OSM --> DB
    DSC -->|response| SE
    SE -->|update status| IDB
    SE -->|notify| UI
```

**Key design decisions:**

- IndexedDB (via `idb` library) is chosen over localStorage for structured, transactional storage of Action records.
- The Service Worker Background Sync API is used as a secondary trigger; the primary trigger is the `online` DOM event for broad browser compatibility.
- The existing `IdempotencyService` is reused with TTL extended to 72 h to cover multi-day offline scenarios.
- A new `DispatchSyncController` is introduced rather than modifying existing controllers, keeping the offline sync path isolated and independently testable.

---

## Components and Interfaces

### Frontend

#### `OfflineQueue` (lib/offline/offline-queue.ts)

Wraps IndexedDB via the `idb` library. Responsible for persisting, reading, updating, and deleting Action records.

```typescript
interface OfflineAction {
  id: string;                  // client-generated UUID (Idempotency-Key)
  type: ActionType;
  assignmentId: string;
  payload: ActionPayload;
  capturedAt: string;          // ISO 8601 timestamp
  syncStatus: SyncStatus;
  conflictSubStatus?: 'conflict';
  conflictDescriptor?: ConflictDescriptor;
  retryCount: number;
  createdAt: string;
}

type ActionType =
  | 'accept_assignment'
  | 'confirm_pickup'
  | 'confirm_dropoff'
  | 'capture_signature'
  | 'attach_photo_reference';

type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

interface ActionPayload {
  // Fields vary by ActionType; all are JSON-serialisable
  [key: string]: unknown;
}

interface ConflictDescriptor {
  conflictingStep: string;
  currentServerState: string;
}
```

Key methods:
- `enqueue(action: Omit<OfflineAction, 'syncStatus' | 'retryCount' | 'createdAt'>): Promise<void>`
- `getPending(): Promise<OfflineAction[]>`
- `updateStatus(id: string, status: SyncStatus, meta?: Partial<OfflineAction>): Promise<void>`
- `remove(id: string): Promise<void>`
- `deduplicateByKey(key: string): Promise<void>`

#### `SyncEngine` (lib/offline/sync-engine.ts)

Singleton service that listens for connectivity changes and drains the queue.

```typescript
class SyncEngine {
  start(): void                          // attach online/offline listeners
  stop(): void                           // detach listeners
  drain(): Promise<void>                 // flush pending actions FIFO
  retryFailed(): Promise<void>           // re-attempt all failed actions
  getStatus(): SyncEngineStatus
}

interface SyncEngineStatus {
  pending: number;
  syncing: number;
  failed: number;
  lastSyncedAt: string | null;
}
```

Retry policy: exponential back-off starting at 1 s, doubling each attempt, max 5 attempts (≈ 31 s total). 5xx and network errors are retried; 4xx (except 409) are marked failed immediately.

#### `useSyncStatus` hook (lib/hooks/useSyncStatus.ts)

React hook that subscribes to `SyncEngine` status updates and exposes them to UI components.

#### `SyncStatusBanner` component (components/riders/SyncStatusBanner.tsx)

Persistent banner rendered in the Rider Dashboard showing pending/syncing/failed counts, "All synced" state, and a manual retry button.

#### `ConflictCard` component (components/riders/ConflictCard.tsx)

Renders a conflict descriptor and a dismiss button. On dismiss, calls `OfflineQueue.remove(id)`.

#### Rider Workflow Pages (app/rider/)

New Next.js route group:
- `app/rider/assignments/[id]/page.tsx` — assignment detail with offline-aware action buttons
- `app/rider/assignments/[id]/pickup/page.tsx` — pickup confirmation form
- `app/rider/assignments/[id]/dropoff/page.tsx` — drop-off confirmation + signature + photo reference form

Each page calls `OfflineQueue.enqueue()` directly rather than calling the API, then the Sync Engine handles the actual HTTP call.

### Backend

#### `DispatchSyncController` (backend/src/dispatch/dispatch-sync.controller.ts)

New controller under `/dispatch/sync`. All endpoints require the `Idempotency-Key` header.

```
POST /dispatch/sync/accept          — accept_assignment
POST /dispatch/sync/pickup          — confirm_pickup
POST /dispatch/sync/dropoff         — confirm_dropoff
POST /dispatch/sync/signature       — capture_signature
POST /dispatch/sync/photo           — attach_photo_reference
```

Each endpoint:
1. Validates `Idempotency-Key` header (UUID format).
2. Checks `IdempotencyService` for a cached response → return 200 if hit.
3. Acquires idempotency lock → return 409 with `retry-after: 5` if lock held.
4. Validates the target order is not in a terminal state.
5. Applies the state transition via `OrderStateMachine` / `DeliveryProofService`.
6. Computes `late_sync` flag (capture timestamp > 5 min before server receipt).
7. Stores response in `IdempotencyService` (72 h TTL).
8. Returns result.

#### `DispatchSyncService` (backend/src/dispatch/dispatch-sync.service.ts)

Business logic extracted from the controller. Handles late-sync detection and conflict detection.

```typescript
interface SyncActionDto {
  assignmentId: string;
  capturedAt: string;   // ISO 8601 — original client capture time
  payload: Record<string, unknown>;
}

interface SyncResult {
  accepted: boolean;
  lateSync: boolean;
  syncedAt: string;
  conflictDescriptor?: ConflictDescriptor;
}
```

#### Extended `IdempotencyService`

The existing `IdempotencyService` TTL is configurable. A new constant `OFFLINE_SYNC_TTL_SECONDS = 72 * 60 * 60` is introduced and passed when storing offline sync responses.

---

## Data Models

### `OfflineAction` (IndexedDB — client only)

| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | Primary key; doubles as Idempotency-Key |
| type | ActionType | Enum of 5 action types |
| assignmentId | string | FK to dispatch assignment |
| payload | object | Action-specific fields |
| capturedAt | string | ISO 8601 — when rider performed the action |
| syncStatus | SyncStatus | pending / syncing / synced / failed |
| conflictSubStatus | string? | 'conflict' if 409 conflict received |
| conflictDescriptor | object? | Server conflict details |
| retryCount | number | Incremented on each retry attempt |
| createdAt | string | ISO 8601 — when record was inserted |

IndexedDB store name: `offline_actions`. Indexes: `syncStatus`, `assignmentId`, `createdAt`.

### `DeliveryProofEntity` — extended fields

Two new columns added to the existing `delivery_proof` table:

| Column | Type | Default | Notes |
|---|---|---|---|
| late_sync | boolean | false | True if capture timestamp > 5 min before server receipt |
| synced_at | timestamptz | null | Server timestamp when the synced action was processed |

### `DispatchSyncLogEntity` (new — backend/src/dispatch/entities/dispatch-sync-log.entity.ts)

Audit log of every sync submission for operator visibility.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| idempotency_key | string | The client-provided key |
| action_type | string | One of the 5 action types |
| assignment_id | string | FK to order/assignment |
| rider_id | string | FK to rider |
| captured_at | timestamptz | Client capture time |
| synced_at | timestamptz | Server receipt time |
| late_sync | boolean | Computed flag |
| status | string | accepted / duplicate / conflict / rejected |
| created_at | timestamptz | Auto |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Idempotency of sync submissions

*For any* valid Action and Idempotency-Key, submitting that Action to the backend twice must produce the same observable outcome (same HTTP status, same server state) as submitting it once.

**Validates: Requirements 3.2, 8.1**

### Property 2: FIFO ordering of queue drain

*For any* sequence of Actions enqueued while offline, the Sync Engine must submit them to the backend in the same order they were captured (by `createdAt` ascending).

**Validates: Requirements 2.3**

### Property 3: Late-sync flag correctness

*For any* Action whose `capturedAt` timestamp is more than 5 minutes before the server receipt time, the resulting delivery record must have `late_sync = true`; for any Action whose `capturedAt` is within 5 minutes of server receipt, `late_sync` must be `false`.

**Validates: Requirements 4.2**

### Property 4: Terminal-state rejection

*For any* Action targeting an order in a terminal state (`DELIVERED` or `CANCELLED`), the backend must return HTTP 409 and the order state must remain unchanged.

**Validates: Requirements 8.2**

### Property 5: Client-side deduplication before submission

*For any* Offline_Queue containing multiple Actions with the same Idempotency-Key, the Sync Engine must submit that key exactly once.

**Validates: Requirements 8.3**

### Property 6: Conflict sub-status on 409 conflict response

*For any* Action for which the backend returns HTTP 409 with a conflict descriptor, the Offline_Queue must update that Action's `syncStatus` to `failed` and set `conflictSubStatus` to `'conflict'`.

**Validates: Requirements 6.1**

### Property 7: Retry count bounded by max attempts

*For any* Action that receives 5xx or network-timeout responses, the Sync Engine must not submit it more than 5 times before marking it `failed`.

**Validates: Requirements 2.6**

### Property 8: Offline_Queue persistence across page reload

*For any* Action enqueued while offline, reloading the page and re-initialising the Sync Engine must result in the same Action being present in the queue with its original `capturedAt` and `syncStatus`.

**Validates: Requirements 1.1**

---

## Error Handling

| Scenario | Frontend behaviour | Backend behaviour |
|---|---|---|
| IndexedDB write failure | Surface error to UI; do not report action as queued | N/A |
| Network timeout during sync | Retry with exponential back-off (max 5 attempts) | N/A |
| 4xx (non-409) from backend | Mark action `failed`; no auto-retry | Return descriptive error body |
| 409 lock held | Sync Engine waits `retry-after` seconds then retries | Return 409 + `retry-after: 5` header |
| 409 conflict | Mark action `failed` + `conflict` sub-status; show ConflictCard | Return conflict descriptor payload |
| 409 terminal state | Mark action `failed`; show error in UI | Return 409 + reason |
| 5xx from backend | Retry with exponential back-off (max 5 attempts) | Log error; return 5xx |
| Idempotency key collision (duplicate) | Treat 200 replay response as success; mark `synced` | Return original cached response |

---

## Testing Strategy

### Unit Tests

- `OfflineQueue`: enqueue, deduplication, status updates, IndexedDB error handling.
- `SyncEngine`: FIFO drain order, retry logic, back-off timing, online/offline event handling.
- `DispatchSyncService`: late-sync flag computation, conflict detection, terminal-state rejection.
- `DispatchSyncController`: idempotency header validation, lock acquisition, response caching.

### Property-Based Tests

Property-based testing uses **fast-check** (frontend, TypeScript) and **fast-check** via Jest (backend, TypeScript/NestJS). Each property test runs a minimum of 100 iterations.

Tag format: `Feature: offline-dispatch-rider, Property {N}: {property_text}`

| Property | Test location | Library |
|---|---|---|
| P1: Idempotency of sync submissions | backend/src/dispatch/dispatch-sync.service.spec.ts | fast-check |
| P2: FIFO ordering of queue drain | frontend/health-chain/lib/offline/sync-engine.spec.ts | fast-check |
| P3: Late-sync flag correctness | backend/src/dispatch/dispatch-sync.service.spec.ts | fast-check |
| P4: Terminal-state rejection | backend/src/dispatch/dispatch-sync.service.spec.ts | fast-check |
| P5: Client-side deduplication | frontend/health-chain/lib/offline/offline-queue.spec.ts | fast-check |
| P6: Conflict sub-status on 409 | frontend/health-chain/lib/offline/sync-engine.spec.ts | fast-check |
| P7: Retry count bounded | frontend/health-chain/lib/offline/sync-engine.spec.ts | fast-check |
| P8: Queue persistence across reload | frontend/health-chain/lib/offline/offline-queue.spec.ts | fast-check |

### Integration Tests

- End-to-end sync flow: enqueue actions offline → come online → verify all actions synced and server state correct.
- Duplicate submit: submit same idempotency key twice → verify single state transition.
- Late-arriving update: submit action with old `capturedAt` → verify `late_sync = true` on delivery record.
- Terminal-state guard: attempt to sync action against delivered order → verify 409 and no state change.

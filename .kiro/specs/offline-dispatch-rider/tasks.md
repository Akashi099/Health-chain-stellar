# Implementation Plan: Offline-Tolerant Dispatch Rider Web Experience

## Overview

Implement the offline-tolerant rider workflow in two parallel tracks: (1) a frontend IndexedDB queue + Sync Engine + UI components, and (2) a backend `DispatchSyncController` with idempotency, late-sync detection, and operator visibility. Tasks are ordered so each step produces runnable, integrated code.

## Tasks

- [ ] 1. Extend backend data models and migrations
  - [ ] 1.1 Add `late_sync` (boolean, default false) and `synced_at` (timestamptz, nullable) columns to `DeliveryProofEntity` and generate a TypeORM migration
    - Modify `backend/src/delivery-proof/entities/delivery-proof.entity.ts`
    - Create migration file under `backend/src/migrations/`
    - _Requirements: 4.3_
  - [ ] 1.2 Create `DispatchSyncLogEntity` with columns: id, idempotency_key, action_type, assignment_id, rider_id, captured_at, synced_at, late_sync, status, created_at
    - Create `backend/src/dispatch/entities/dispatch-sync-log.entity.ts`
    - Create corresponding migration
    - _Requirements: 4.4, 7.1_

- [ ] 2. Implement backend `DispatchSyncService`
  - [ ] 2.1 Create `DispatchSyncService` in `backend/src/dispatch/dispatch-sync.service.ts`
    - Implement `computeLateSync(capturedAt: string, receivedAt: Date): boolean` — returns true when gap > 5 minutes
    - Implement `isTerminalState(orderStatus: OrderStatus): boolean`
    - Implement `applyAction(dto: SyncActionDto, idempotencyKey: string): Promise<SyncResult>` — orchestrates idempotency check, terminal-state guard, state transition, late-sync flag, and sync log write
    - _Requirements: 3.2, 3.3, 4.2, 8.1, 8.2_
  - [ ]* 2.2 Write property test for `computeLateSync` — Property 3: Late-sync flag correctness
    - **Property 3: Late-sync flag correctness**
    - *For any* (capturedAt, receivedAt) pair, `computeLateSync` must return true iff the gap exceeds 5 minutes
    - **Validates: Requirements 4.2**
    - Use fast-check; minimum 100 iterations
    - _File: backend/src/dispatch/dispatch-sync.service.spec.ts_
  - [ ]* 2.3 Write property test for terminal-state rejection — Property 4
    - **Property 4: Terminal-state rejection**
    - *For any* action targeting an order in DELIVERED or CANCELLED state, `applyAction` must throw a conflict error and leave order state unchanged
    - **Validates: Requirements 8.2**
    - _File: backend/src/dispatch/dispatch-sync.service.spec.ts_
  - [ ]* 2.4 Write property test for idempotency — Property 1
    - **Property 1: Idempotency of sync submissions**
    - *For any* action and idempotency key, calling `applyAction` twice with the same key must return the same result and produce a single state transition
    - **Validates: Requirements 3.2, 8.1**
    - _File: backend/src/dispatch/dispatch-sync.service.spec.ts_

- [ ] 3. Implement `DispatchSyncController`
  - [ ] 3.1 Create `backend/src/dispatch/dispatch-sync.controller.ts` with endpoints:
    - `POST /dispatch/sync/accept`
    - `POST /dispatch/sync/pickup`
    - `POST /dispatch/sync/dropoff`
    - `POST /dispatch/sync/signature`
    - `POST /dispatch/sync/photo`
    - Each endpoint validates `Idempotency-Key` UUID header, delegates to `DispatchSyncService`, and returns `SyncResult`
    - _Requirements: 3.1, 3.4, 3.5_
  - [ ] 3.2 Register `DispatchSyncController` and `DispatchSyncService` in `dispatch.module.ts`; inject `IdempotencyService` with 72 h TTL constant
    - _Requirements: 3.3_
  - [ ]* 3.3 Write unit tests for `DispatchSyncController`
    - Test missing `Idempotency-Key` header → 400
    - Test duplicate key → 200 with cached response
    - Test lock-held → 409 with `retry-after: 5`
    - Test conflict → 409 with conflict descriptor
    - _Requirements: 3.1, 3.4, 3.5_

- [ ] 4. Checkpoint — Ensure all backend tests pass
  - Run `cd backend && npx jest --testPathPattern="dispatch-sync" --runInBand`
  - Ensure all tests pass; ask the user if questions arise.

- [ ] 5. Implement frontend `OfflineQueue`
  - [ ] 5.1 Add `idb` package to frontend dependencies
    - `cd frontend/health-chain && npm install idb`
  - [ ] 5.2 Create `frontend/health-chain/lib/offline/offline-queue.ts`
    - Define `OfflineAction`, `ActionType`, `SyncStatus`, `ConflictDescriptor` types
    - Implement `openDB()` initialising the `offline_actions` store with indexes on `syncStatus`, `assignmentId`, `createdAt`
    - Implement `enqueue`, `getPending`, `updateStatus`, `remove`, `deduplicateByKey`
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 8.3_
  - [ ]* 5.3 Write property test for queue persistence — Property 8
    - **Property 8: Offline_Queue persistence across reload**
    - *For any* action enqueued, re-opening the DB must return the same action with original `capturedAt` and `syncStatus`
    - **Validates: Requirements 1.1**
    - Use fast-check with fake-indexeddb; minimum 100 iterations
    - _File: frontend/health-chain/lib/offline/offline-queue.spec.ts_
  - [ ]* 5.4 Write property test for client-side deduplication — Property 5
    - **Property 5: Client-side deduplication before submission**
    - *For any* queue containing N actions with the same Idempotency-Key, `deduplicateByKey` must leave exactly 1 record with that key
    - **Validates: Requirements 8.3**
    - _File: frontend/health-chain/lib/offline/offline-queue.spec.ts_

- [ ] 6. Implement frontend `SyncEngine`
  - [ ] 6.1 Create `frontend/health-chain/lib/offline/sync-engine.ts`
    - Implement `start()` / `stop()` attaching `window.addEventListener('online' | 'offline', ...)`
    - Implement `drain()` — fetch pending actions sorted by `createdAt` ASC, submit each via `fetch` with `Idempotency-Key` header, update status on response
    - Implement exponential back-off retry (base 1 s, max 5 attempts) for 5xx / network errors
    - Implement `retryFailed()` — re-queue all `failed` actions to `pending` and call `drain()`
    - Implement `getStatus()` returning counts
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.4_
  - [ ]* 6.2 Write property test for FIFO drain order — Property 2
    - **Property 2: FIFO ordering of queue drain**
    - *For any* sequence of enqueued actions, the order of HTTP submissions must match `createdAt` ascending
    - **Validates: Requirements 2.3**
    - Mock `fetch`; use fast-check to generate random action sequences; minimum 100 iterations
    - _File: frontend/health-chain/lib/offline/sync-engine.spec.ts_
  - [ ]* 6.3 Write property test for retry bound — Property 7
    - **Property 7: Retry count bounded by max attempts**
    - *For any* action receiving only 5xx responses, the Sync Engine must not call `fetch` more than 5 times for that action
    - **Validates: Requirements 2.6**
    - _File: frontend/health-chain/lib/offline/sync-engine.spec.ts_
  - [ ]* 6.4 Write property test for conflict sub-status — Property 6
    - **Property 6: Conflict sub-status on 409 conflict response**
    - *For any* action for which the backend returns 409 with a conflict descriptor, `syncStatus` must be `failed` and `conflictSubStatus` must be `'conflict'`
    - **Validates: Requirements 6.1**
    - _File: frontend/health-chain/lib/offline/sync-engine.spec.ts_

- [ ] 7. Implement `useSyncStatus` hook and sync status UI components
  - [ ] 7.1 Create `frontend/health-chain/lib/hooks/useSyncStatus.ts`
    - Subscribe to `SyncEngine` status updates via a polling interval or event emitter
    - Return `{ pending, syncing, failed, lastSyncedAt }`
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  - [ ] 7.2 Create `frontend/health-chain/components/riders/SyncStatusBanner.tsx`
    - Render pending/syncing/failed counts
    - Render "All synced" when all counts are 0
    - Render "Syncing…" when `syncing > 0`
    - Render warning + "Retry" button when `failed > 0`; button calls `SyncEngine.retryFailed()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ] 7.3 Create `frontend/health-chain/components/riders/ConflictCard.tsx`
    - Accept `action: OfflineAction` prop
    - Display `conflictDescriptor.conflictingStep` and `conflictDescriptor.currentServerState`
    - Render "Dismiss" button that calls `OfflineQueue.remove(action.id)`
    - _Requirements: 6.2, 6.3, 6.4_
  - [ ]* 7.4 Write property test for conflict persistence — Property 9
    - **Property 9: Conflict persists until explicit dismiss**
    - *For any* conflict action, without calling `remove`, the action must remain in the queue with `conflictSubStatus = 'conflict'`
    - **Validates: Requirements 6.3, 6.4**
    - _File: frontend/health-chain/lib/offline/offline-queue.spec.ts_

- [ ] 8. Implement rider workflow pages with offline-aware action capture
  - [ ] 8.1 Create `frontend/health-chain/app/rider/assignments/[id]/page.tsx`
    - Display assignment details fetched from API (with stale-while-revalidate via React Query)
    - Render action buttons: "Accept", "Confirm Pickup", "Confirm Drop-off"
    - Each button calls `OfflineQueue.enqueue(...)` with the appropriate `ActionType` and payload, then shows optimistic UI feedback
    - _Requirements: 1.1, 1.3_
  - [ ] 8.2 Create `frontend/health-chain/app/rider/assignments/[id]/pickup/page.tsx`
    - Form for pickup confirmation (location hash, timestamp)
    - On submit: enqueue `confirm_pickup` action; navigate back to assignment page
    - _Requirements: 1.1, 1.3_
  - [ ] 8.3 Create `frontend/health-chain/app/rider/assignments/[id]/dropoff/page.tsx`
    - Form for drop-off confirmation, signature capture (canvas-based), and photo reference input
    - On submit: enqueue `confirm_dropoff`, `capture_signature`, and `attach_photo_reference` actions
    - _Requirements: 1.1, 1.3_
  - [ ] 8.4 Integrate `SyncStatusBanner` and `ConflictCard` list into the rider assignment layout
    - Add `SyncStatusBanner` to `frontend/health-chain/app/rider/layout.tsx`
    - Render a `ConflictCard` for each action with `conflictSubStatus = 'conflict'`
    - _Requirements: 5.1, 6.2_

- [ ] 9. Checkpoint — Ensure all frontend tests pass
  - Run `cd frontend/health-chain && npx vitest run`
  - Ensure all tests pass; ask the user if questions arise.

- [ ] 10. Implement operator late-sync visibility
  - [ ] 10.1 Add `late_sync` filter support to the delivery proof query endpoint
    - Modify `backend/src/delivery-proof/dto/delivery-proof-query.dto.ts` to include optional `lateSync: boolean` field
    - Modify `DeliveryProofService.queryProofs` to apply the filter when `lateSync = true`
    - _Requirements: 7.1_
  - [ ] 10.2 Expose `late_sync` and `synced_at` in the delivery proof API response
    - Ensure `DeliveryProofEntity` serialises both fields in the controller response
    - _Requirements: 4.4_
  - [ ] 10.3 Add "Late Sync" badge and timestamp display to the operator delivery list UI
    - Modify `frontend/health-chain/components/orders/` (or create a new operator delivery list component) to render a "Late Sync" badge when `late_sync = true`
    - In the delivery detail view, display `capturedAt` and `synced_at` side by side
    - _Requirements: 7.2, 7.3_
  - [ ]* 10.4 Write property test for late-sync filter correctness — Property 10
    - **Property 10: Late-sync filter correctness**
    - *For any* dataset of delivery records with mixed `late_sync` values, filtering by `late_sync = true` must return only records where `late_sync = true`
    - **Validates: Requirements 7.1**
    - _File: backend/src/delivery-proof/delivery-proof.service.spec.ts_

- [ ] 11. Wire Service Worker Background Sync (progressive enhancement)
  - [ ] 11.1 Create `frontend/health-chain/public/sw.js` service worker
    - Register a `sync` event handler that calls the Sync Engine drain logic
    - Register the service worker in `frontend/health-chain/app/layout.tsx`
    - _Requirements: 2.1_

- [ ] 12. Final checkpoint — Ensure all tests pass
  - Run backend tests: `cd backend && npx jest --runInBand`
  - Run frontend tests: `cd frontend/health-chain && npx vitest run`
  - Ensure all tests pass; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** on both frontend (vitest) and backend (jest)
- Minimum 100 iterations per property test
- The `idb` library wraps IndexedDB with a Promise API; use `fake-indexeddb` in tests
- The existing `IdempotencyService` TTL is extended to 72 h only for the `/dispatch/sync/*` endpoints via a dedicated constant

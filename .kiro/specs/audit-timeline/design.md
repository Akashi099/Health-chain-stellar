# Design Document: Audit Timeline

## Overview

The audit timeline introduces a unified, event-sourced activity stream that captures domain events from orders, inventory, dispatch, rider assignment, notifications, disputes, and settlement. The system stores normalized `AuditEvent` records in an append-only PostgreSQL table, exposes paginated query and export endpoints, and renders a frontend timeline component with filtering, severity badges, and metadata expansion.

The design builds on the existing `OrderEventEntity` and `OutboxEventEntity` patterns already present in the codebase. Rather than replacing those domain-specific stores, the audit timeline is a cross-cutting read model that aggregates events from all domains into a single queryable surface.

---

## Architecture

```mermaid
graph TD
    subgraph Domain Modules
        A[Orders Service] -->|emits| E[EventEmitter2]
        B[Inventory Service] -->|emits| E
        C[Dispatch Service] -->|emits| E
        D[Notifications Service] -->|emits| E
        F[Blood Units Service] -->|emits| E
    end

    subgraph Audit Module
        E -->|@OnEvent| G[AuditEventListener]
        G -->|writes| H[(audit_events table)]
        I[AuditTimelineService] -->|queries| H
        J[AuditTimelineController] -->|calls| I
    end

    subgraph Frontend
        K[OrderDetailPage] -->|renders| L[TimelineComponent]
        L -->|GET /api/v1/audit/timeline| J
        L -->|GET /api/v1/audit/timeline/export| J
    end
```

The `AuditEventListener` subscribes to existing NestJS `EventEmitter2` events already emitted by domain services. No changes to domain service logic are required — the listener is purely additive. If the listener fails to write, it logs the error and does not propagate the exception, ensuring domain operations are never blocked.

---

## Components and Interfaces

### Backend

#### AuditEventEntity

Stored in the `audit_events` table. Append-only — no update or delete operations.

```typescript
@Entity('audit_events')
@Index('IDX_AUDIT_AGG', ['aggregateType', 'aggregateId'])
@Index('IDX_AUDIT_TIMESTAMP', ['timestamp'])
@Index('IDX_AUDIT_CATEGORY', ['category'])
@Index('IDX_AUDIT_ACTOR', ['actorId'])
export class AuditEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 50 })
  aggregateType: AggregateType;

  @Column({ name: 'aggregate_id', type: 'varchar', length: 120 })
  aggregateId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @Column({ type: 'enum', enum: AuditCategory })
  category: AuditCategory;

  @Column({ type: 'enum', enum: AuditSeverity, default: AuditSeverity.INFO })
  severity: AuditSeverity;

  @Column({ name: 'actor_id', type: 'varchar', length: 120, nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_role', type: 'varchar', length: 50, nullable: true })
  actorRole: string | null;

  @CreateDateColumn({ name: 'timestamp', precision: 3 })
  timestamp: Date;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;
}
```

#### Enums

```typescript
export enum AggregateType {
  ORDER = 'ORDER',
  BLOOD_UNIT = 'BLOOD_UNIT',
  INVENTORY = 'INVENTORY',
  RIDER = 'RIDER',
  DONOR = 'DONOR',
  ORGANIZATION = 'ORGANIZATION',
}

export enum AuditCategory {
  ORDER = 'ORDER',
  INVENTORY = 'INVENTORY',
  DISPATCH = 'DISPATCH',
  NOTIFICATION = 'NOTIFICATION',
  DISPUTE = 'DISPUTE',
  SETTLEMENT = 'SETTLEMENT',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}
```

#### AuditTimelineService

```typescript
interface TimelineQueryDto {
  aggregateType?: AggregateType;
  aggregateId?: string;
  actorId?: string;
  category?: AuditCategory | AuditCategory[];
  severity?: AuditSeverity | AuditSeverity[];
  startDate?: string;   // ISO date string
  endDate?: string;     // ISO date string
  page?: number;        // default 1
  pageSize?: number;    // default 25, max 100
}

interface TimelineResponse {
  data: AuditEventEntity[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

interface ExportQueryDto extends TimelineQueryDto {
  format?: 'csv' | 'json';  // default 'csv'
}
```

Key methods:
- `queryTimeline(dto: TimelineQueryDto): Promise<TimelineResponse>` — paginated query with all filters applied
- `exportTimeline(dto: ExportQueryDto): Promise<{ data: AuditEventEntity[]; truncated: boolean }>` — up to 10,000 records

#### AuditEventListener

Subscribes to existing EventEmitter2 events. Maps each domain event to an `AuditEventEntity` and persists it. Wraps each write in a try/catch to prevent blocking domain operations.

Event subscriptions:
| EventEmitter2 event | aggregateType | category | severity |
|---|---|---|---|
| `order.confirmed` | ORDER | ORDER | INFO |
| `order.dispatched` | ORDER | DISPATCH | INFO |
| `order.in-transit` | ORDER | DISPATCH | INFO |
| `order.delivered` | ORDER | ORDER | INFO |
| `order.cancelled` | ORDER | ORDER | WARNING |
| `order.disputed` | ORDER | DISPUTE | CRITICAL |
| `order.resolved` | ORDER | DISPUTE | INFO |
| `order.rider-assigned` | ORDER | DISPATCH | INFO |
| `inventory.low` | INVENTORY | INVENTORY | WARNING |
| `blood-unit.status-changed` | BLOOD_UNIT | INVENTORY | INFO |
| `notification.sent` | ORDER | NOTIFICATION | INFO |
| `settlement.fee-applied` | ORDER | SETTLEMENT | INFO |
| `settlement.payment-confirmed` | ORDER | SETTLEMENT | INFO |
| `settlement.payment-failed` | ORDER | SETTLEMENT | CRITICAL |

#### AuditTimelineController

```
GET  /api/v1/audit/timeline         → queryTimeline
GET  /api/v1/audit/timeline/export  → exportTimeline
```

Both endpoints require JWT authentication and the `view:audit` permission (new permission added to `Permission` enum).

---

## Data Models

### Migration: CreateAuditEventsTable

```sql
CREATE TABLE audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(50)  NOT NULL,
  aggregate_id   VARCHAR(120) NOT NULL,
  event_type     VARCHAR(100) NOT NULL,
  category       VARCHAR(30)  NOT NULL,
  severity       VARCHAR(10)  NOT NULL DEFAULT 'INFO',
  actor_id       VARCHAR(120),
  actor_role     VARCHAR(50),
  timestamp      TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  metadata       JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IDX_AUDIT_AGG       ON audit_events (aggregate_type, aggregate_id);
CREATE INDEX IDX_AUDIT_TIMESTAMP ON audit_events (timestamp);
CREATE INDEX IDX_AUDIT_CATEGORY  ON audit_events (category);
CREATE INDEX IDX_AUDIT_ACTOR     ON audit_events (actor_id);
```

No foreign keys are defined — the table is intentionally decoupled from domain tables so that domain record deletions do not cascade into the audit log.

### CSV Export Column Order

`id, aggregateType, aggregateId, eventType, category, severity, actorId, actorRole, timestamp, metadata`

The `metadata` column is JSON-stringified in CSV output.

---

## Frontend Components

### TimelineComponent

Location: `frontend/health-chain/components/audit/TimelineComponent.tsx`

Props:
```typescript
interface TimelineProps {
  aggregateType: AggregateType;
  aggregateId: string;
}
```

Internal state:
- `filters: { category?: string[]; actorId?: string }` — controlled by filter controls
- `page: number` — current pagination page
- Query managed via React Query (`useAuditTimeline` hook)

Rendering structure:
```
<TimelineComponent>
  <CategorySummaryBar />       ← event counts grouped by category
  <FilterControls />           ← category multi-select, actor text input
  <ExportButton />             ← triggers CSV download
  <EventList>
    <DateGroup label="2024-01-15">
      <AuditEventRow>
        <SeverityBadge />      ← INFO | WARNING | CRITICAL
        <EventLabel />
        <ActorChip />
        <Timestamp />
        <MetadataExpander />   ← click to expand JSON
      </AuditEventRow>
    </DateGroup>
  </EventList>
  <Pagination />
</TimelineComponent>
```

### API Layer

`frontend/health-chain/lib/api/audit.api.ts` — typed fetch functions using the existing `http-client`.

`frontend/health-chain/lib/hooks/useAuditTimeline.ts` — React Query hook wrapping `fetchAuditTimeline`.

`frontend/health-chain/lib/types/audit.ts` — TypeScript types mirroring backend DTOs.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Audit events are append-only

*For any* sequence of write operations to the `audit_events` table, the total count of rows should be monotonically non-decreasing; no existing row's fields should change after insertion.

**Validates: Requirements 1.2**

### Property 2: Timeline query results are sorted ascending by timestamp

*For any* timeline query response, for all adjacent pairs of events `(e_i, e_{i+1})` in the returned data array, `e_i.timestamp <= e_{i+1}.timestamp`.

**Validates: Requirements 3.2**

### Property 3: Filter by aggregateId returns only matching events

*For any* timeline query with a given `aggregateId`, all returned Audit_Events should have `aggregateId` equal to the query parameter.

**Validates: Requirements 3.1, 3.2**

### Property 4: Filter by category returns only matching events

*For any* timeline query with one or more `category` values, all returned Audit_Events should have a `category` that is a member of the requested set.

**Validates: Requirements 3.5**

### Property 5: Filter by actorId returns only matching events

*For any* timeline query with a given `actorId`, all returned Audit_Events should have `actorId` equal to the query parameter.

**Validates: Requirements 3.1**

### Property 6: Export truncation invariant

*For any* export query whose total matching records exceed 10,000, the returned data array should contain exactly 10,000 records and the `truncated` flag should be `true`. For queries with 10,000 or fewer matching records, `truncated` should be `false`.

**Validates: Requirements 4.5**

### Property 7: CSV export contains all required columns

*For any* CSV export response, every row should contain all required headers: id, aggregateType, aggregateId, eventType, category, severity, actorId, actorRole, timestamp, metadata.

**Validates: Requirements 4.2**

### Property 8: Domain event capture completeness

*For any* order state transition (created, confirmed, dispatched, in-transit, delivered, cancelled, disputed, resolved), after the transition completes, the `audit_events` table should contain at least one new row with the corresponding `aggregateId` and `eventType`.

**Validates: Requirements 2.1**

### Property 9: Listener failure isolation

*For any* domain operation that triggers an audit event write, if the audit write fails, the domain operation should still complete successfully (the audit failure should not propagate).

**Validates: Requirements 2.8**

### Property 10: Pagination consistency

*For any* timeline query with `pageSize = N` and `totalCount = T`, the number of pages should equal `ceil(T / N)`, and fetching all pages sequentially should yield exactly `T` unique events with no duplicates.

**Validates: Requirements 3.2**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `aggregateId` provided without `aggregateType` | 400 Bad Request with message "aggregateType is required when aggregateId is provided" |
| `startDate` after `endDate` | 400 Bad Request with message "startDate must be before endDate" |
| Unauthenticated request | 401 Unauthorized (JWT guard) |
| Missing `view:audit` permission | 403 Forbidden (permissions guard) |
| Audit event listener write failure | Logger.error with original event payload; domain operation continues |
| Export exceeds 10,000 records | Returns first 10,000 records with `X-Truncated: true` response header |
| Invalid `format` parameter on export | 400 Bad Request |

---

## Testing Strategy

### Unit Tests

- `AuditTimelineService`: test filter combinations, pagination math, empty result sets, date range validation
- `AuditEventListener`: test each event subscription maps to the correct `aggregateType`, `category`, and `severity`; test that listener errors do not throw
- `AuditTimelineController`: test 400 validation cases, 401/403 guard behavior
- `TimelineComponent`: test rendering with mock data, filter control interactions, empty state, error state, loading skeleton

### Property-Based Tests (using `fast-check` on backend, `fast-check` on frontend)

Each property test runs a minimum of 100 iterations.

- **Property 2** — `Feature: audit-timeline, Property 2: timeline results sorted ascending`
  Generate random sets of AuditEvents with random timestamps, insert them, query, assert ascending order.

- **Property 3** — `Feature: audit-timeline, Property 3: filter by aggregateId`
  Generate random events with mixed aggregateIds, query by one aggregateId, assert all results match.

- **Property 4** — `Feature: audit-timeline, Property 4: filter by category`
  Generate random events with mixed categories, query by subset of categories, assert all results are in the subset.

- **Property 5** — `Feature: audit-timeline, Property 5: filter by actorId`
  Generate random events with mixed actorIds, query by one actorId, assert all results match.

- **Property 6** — `Feature: audit-timeline, Property 6: export truncation`
  Generate event counts above and below 10,000, assert truncation flag and record count are correct.

- **Property 7** — `Feature: audit-timeline, Property 7: CSV column completeness`
  Generate random AuditEvent arrays, serialize to CSV, parse back, assert all required columns present in every row.

- **Property 10** — `Feature: audit-timeline, Property 10: pagination consistency`
  Generate random total counts and page sizes, assert page count formula and that sequential page fetches yield no duplicates and correct total.

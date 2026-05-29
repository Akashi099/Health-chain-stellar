# Implementation Plan: Audit Timeline

## Overview

Implement a unified, event-sourced audit timeline across orders, inventory, dispatch, and settlement. The plan proceeds backend-first (entity → migration → listener → service → controller), then frontend (types → API → hook → component → page integration).

## Tasks

- [ ] 1. Create audit event entity, enums, and database migration
  - [ ] 1.1 Create `AuditCategory`, `AuditSeverity`, and `AggregateType` enums in `backend/src/audit/enums/`
    - _Requirements: 1.1, 2.1–2.7_
  - [ ] 1.2 Create `AuditEventEntity` in `backend/src/audit/entities/audit-event.entity.ts`
    - Append-only entity with fields: id, aggregateType, aggregateId, eventType, category, severity, actorId, actorRole, timestamp (precision 3), metadata (jsonb)
    - Add composite index on (aggregateType, aggregateId), single indexes on timestamp, category, actorId
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ] 1.3 Create TypeORM migration `CreateAuditEventsTable` in `backend/src/migrations/`
    - No foreign keys — table is intentionally decoupled from domain tables
    - _Requirements: 1.1, 1.2_
  - [ ]* 1.4 Write unit test verifying AuditEventEntity fields and indexes are correctly defined
    - _Requirements: 1.1_

- [ ] 2. Implement AuditTimelineService with query and export logic
  - [ ] 2.1 Create `AuditTimelineService` in `backend/src/audit/audit-timeline.service.ts`
    - Implement `queryTimeline(dto)` returning paginated, timestamp-ascending results with all filter combinations (aggregateType, aggregateId, actorId, category[], severity[], startDate, endDate)
    - Implement `exportTimeline(dto)` returning up to 10,000 records with a `truncated` boolean
    - Validate that `aggregateId` without `aggregateType` throws `BadRequestException`
    - Validate that `startDate` after `endDate` throws `BadRequestException`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.5_
  - [ ]* 2.2 Write property test for timeline sort order (Property 2)
    - **Property 2: Timeline query results are sorted ascending by timestamp**
    - **Validates: Requirements 3.2**
    - Generate random AuditEvent arrays with random timestamps, insert, query, assert ascending order for all inputs
  - [ ]* 2.3 Write property test for aggregateId filter (Property 3)
    - **Property 3: Filter by aggregateId returns only matching events**
    - **Validates: Requirements 3.1, 3.2**
  - [ ]* 2.4 Write property test for category and severity filters (Property 4)
    - **Property 4: Filter by category/severity returns only matching events**
    - **Validates: Requirements 3.5, 3.6**
  - [ ]* 2.5 Write property test for export truncation (Property 6)
    - **Property 6: Export truncation invariant**
    - **Validates: Requirements 4.5**
  - [ ]* 2.6 Write property test for CSV column completeness (Property 7)
    - **Property 7: CSV export contains all required columns**
    - **Validates: Requirements 4.2**
  - [ ]* 2.7 Write property test for pagination consistency (Property 10)
    - **Property 10: Pagination consistency**
    - **Validates: Requirements 3.2**

- [ ] 3. Implement AuditEventListener to capture domain events
  - [ ] 3.1 Create `AuditEventListener` in `backend/src/audit/audit-event.listener.ts`
    - Subscribe to all existing EventEmitter2 events: `order.*`, `inventory.low`, `blood-unit.status-changed`, `notification.sent`, `settlement.*`
    - Map each event to the correct aggregateType, category, and severity per the mapping table in the design
    - Wrap each write in try/catch — log errors with original payload, never throw
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  - [ ]* 3.2 Write property test for event capture completeness (Property 8)
    - **Property 8: Domain event capture completeness**
    - **Validates: Requirements 2.1**
    - For each order event type, emit the event and assert a corresponding audit row exists
  - [ ]* 3.3 Write unit test for listener failure isolation (Property 9)
    - **Property 9: Listener failure isolation**
    - **Validates: Requirements 2.8**
    - Mock repository to throw, emit a domain event, assert no exception propagates

- [ ] 4. Add `view:audit` permission and implement AuditTimelineController
  - [ ] 4.1 Add `VIEW_AUDIT = 'view:audit'` to `Permission` enum in `backend/src/auth/enums/permission.enum.ts`
    - _Requirements: 3.8, 3.9, 4.6_
  - [ ] 4.2 Create `TimelineQueryDto` and `ExportQueryDto` in `backend/src/audit/dto/`
    - Use class-validator decorators; `category` and `severity` accept arrays via `@IsArray()` + `@IsEnum()`
    - _Requirements: 3.1, 3.3, 3.4, 4.1_
  - [ ] 4.3 Create `AuditTimelineController` in `backend/src/audit/audit-timeline.controller.ts`
    - `GET /api/v1/audit/timeline` — calls `queryTimeline`, protected by JWT + `view:audit` permission
    - `GET /api/v1/audit/timeline/export` — calls `exportTimeline`, sets `Content-Disposition` header for CSV, sets `X-Truncated` header when truncated
    - _Requirements: 3.1, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [ ]* 4.4 Write unit tests for controller validation (400, 401, 403 cases)
    - _Requirements: 3.3, 3.4, 3.8, 3.9_

- [ ] 5. Wire up AuditModule and register with AppModule
  - [ ] 5.1 Create `AuditModule` in `backend/src/audit/audit.module.ts`
    - Import `TypeOrmModule.forFeature([AuditEventEntity])`
    - Declare `AuditEventListener`, `AuditTimelineService`, `AuditTimelineController`
    - _Requirements: 1.1_
  - [ ] 5.2 Import `AuditModule` in `backend/src/app.module.ts`
    - _Requirements: 2.1_

- [ ] 6. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Create frontend types, API client, and React Query hook
  - [ ] 7.1 Create `frontend/health-chain/lib/types/audit.ts`
    - Mirror backend enums and DTOs: `AuditEvent`, `AggregateType`, `AuditCategory`, `AuditSeverity`, `TimelineQueryParams`, `TimelineResponse`
    - _Requirements: 5.3_
  - [ ] 7.2 Create `frontend/health-chain/lib/api/audit.api.ts`
    - `fetchAuditTimeline(params)` — GET `/api/v1/audit/timeline`
    - `exportAuditTimeline(params)` — GET `/api/v1/audit/timeline/export` returning a Blob for download
    - _Requirements: 5.6, 5.10_
  - [ ] 7.3 Create `frontend/health-chain/lib/hooks/useAuditTimeline.ts`
    - React Query hook wrapping `fetchAuditTimeline` with filter and pagination state
    - _Requirements: 5.6, 5.7, 5.8_
  - [ ]* 7.4 Write unit tests for `audit.api.ts` fetch functions
    - _Requirements: 5.6_

- [ ] 8. Build TimelineComponent and sub-components
  - [ ] 8.1 Create `SeverityBadge` component in `frontend/health-chain/components/audit/SeverityBadge.tsx`
    - INFO: neutral/gray, WARNING: amber, CRITICAL: red
    - _Requirements: 5.2_
  - [ ] 8.2 Create `AuditEventRow` component in `frontend/health-chain/components/audit/AuditEventRow.tsx`
    - Displays: event type label, category, actor identifier, formatted timestamp
    - Expandable metadata section (click to toggle JSON display)
    - _Requirements: 5.3, 5.4_
  - [ ] 8.3 Create `CategorySummaryBar` component in `frontend/health-chain/components/audit/CategorySummaryBar.tsx`
    - Counts events per category from the current result set
    - _Requirements: 6.3_
  - [ ] 8.4 Create `FilterControls` component in `frontend/health-chain/components/audit/FilterControls.tsx`
    - Category multi-select and actor text input
    - Calls `onFilterChange` callback on change
    - _Requirements: 5.5_
  - [ ] 8.5 Create `TimelineComponent` in `frontend/health-chain/components/audit/TimelineComponent.tsx`
    - Composes CategorySummaryBar, FilterControls, ExportButton, date-grouped EventList, Pagination
    - Renders loading skeleton while fetching, error state with retry, empty state message
    - _Requirements: 5.1, 5.5, 5.7, 5.8, 5.9, 5.10, 6.1, 6.4_
  - [ ]* 8.6 Write unit tests for TimelineComponent
    - Test: renders events grouped by date ascending, empty state, error state, loading skeleton, filter change triggers refetch
    - _Requirements: 5.1, 5.7, 5.8, 5.9_
  - [ ]* 8.7 Write property test for category summary accuracy (Property 3 frontend)
    - **Property: Category summary counts match actual event counts in rendered output**
    - **Validates: Requirements 6.3**

- [ ] 9. Integrate TimelineComponent into order detail page
  - [ ] 9.1 Add a "Timeline" tab or section to the order detail page in `frontend/health-chain/app/`
    - Render `<TimelineComponent aggregateType="ORDER" aggregateId={orderId} />`
    - _Requirements: 6.1, 6.2_
  - [ ]* 9.2 Write integration test verifying the order detail page renders the timeline with the correct aggregateId
    - _Requirements: 6.1, 6.2_

- [ ] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The `AuditEventListener` is purely additive — no changes to existing domain services are required
- The `audit_events` table has no foreign keys by design, ensuring domain deletions never cascade into the audit log
- Property tests use `fast-check` (already available in the TypeScript ecosystem); run with `--run` flag for single execution

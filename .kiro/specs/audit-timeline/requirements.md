# Requirements Document

## Introduction

The audit timeline feature introduces a unified, event-sourced activity stream that captures domain events across orders, inventory, dispatch, rider assignment, notifications, disputes, and settlement. Operators and administrators can reconstruct the full lifecycle of any request or blood unit from intake to delivery and settlement. The feature includes backend storage and query endpoints, plus a frontend timeline component with filtering, severity badges, and export capabilities.

## Glossary

- **Activity_Stream**: The normalized, append-only table that stores all domain events from across the system.
- **Audit_Event**: A single immutable record in the Activity_Stream representing one domain occurrence, including actor, aggregate type, aggregate ID, timestamp, category, severity, and metadata.
- **Aggregate**: A domain entity that events are grouped around (e.g., Order, BloodUnit, Rider, Donor, Organization).
- **Actor**: The user, service, or system component that triggered an Audit_Event.
- **Category**: A logical grouping of Audit_Events (e.g., ORDER, INVENTORY, DISPATCH, NOTIFICATION, DISPUTE, SETTLEMENT).
- **Severity**: The importance level of an Audit_Event: INFO, WARNING, or CRITICAL.
- **Timeline**: An ordered sequence of Audit_Events for a given Aggregate, sorted by timestamp ascending.
- **Timeline_API**: The NestJS controller and service that exposes Timeline query endpoints.
- **Timeline_Component**: The Next.js React component that renders a Timeline with grouped events, severity badges, and metadata expansion.
- **Export**: A downloadable CSV or JSON file containing Audit_Events matching a given query.
- **Audit_Module**: The NestJS module encapsulating the Activity_Stream entity, Timeline_API, and event listeners.
- **Event_Listener**: A NestJS service that subscribes to domain events and writes Audit_Events to the Activity_Stream.

---

## Requirements

### Requirement 1: Normalized Activity Stream Storage

**User Story:** As a system architect, I want all domain events stored in a single normalized table, so that I can query the full lifecycle of any aggregate without joining across multiple domain tables.

#### Acceptance Criteria

1. THE Activity_Stream SHALL store each Audit_Event with the following fields: id (UUID), aggregateType, aggregateId, eventType, category, severity, actorId, actorRole, timestamp, and metadata (JSONB).
2. THE Activity_Stream SHALL be append-only; existing Audit_Events SHALL never be updated or deleted.
3. THE Activity_Stream SHALL index on (aggregateType, aggregateId) to support efficient Timeline queries.
4. THE Activity_Stream SHALL index on (timestamp) to support time-range queries.
5. THE Activity_Stream SHALL index on (category) and (actorId) to support filter queries.
6. WHEN an Audit_Event is written, THE Activity_Stream SHALL assign a monotonically increasing timestamp with millisecond precision.

### Requirement 2: Event Capture from Domain Modules

**User Story:** As an operator, I want all major domain events automatically captured in the audit timeline, so that I can reconstruct the full lifecycle of any order or blood unit without manual instrumentation.

#### Acceptance Criteria

1. WHEN an order is created, confirmed, dispatched, placed in transit, delivered, cancelled, disputed, or resolved, THE Event_Listener SHALL write an Audit_Event to the Activity_Stream with aggregateType ORDER and the corresponding order ID.
2. WHEN a blood unit's status changes (e.g., quarantined, reserved, released, expired), THE Event_Listener SHALL write an Audit_Event to the Activity_Stream with aggregateType BLOOD_UNIT and the corresponding unit ID.
3. WHEN a rider is assigned to or unassigned from an order, THE Event_Listener SHALL write an Audit_Event to the Activity_Stream with aggregateType ORDER and category DISPATCH.
4. WHEN a notification is sent for an order, THE Event_Listener SHALL write an Audit_Event to the Activity_Stream with aggregateType ORDER and category NOTIFICATION.
5. WHEN a dispute is raised or resolved on an order, THE Event_Listener SHALL write an Audit_Event to the Activity_Stream with aggregateType ORDER, category DISPUTE, and severity CRITICAL.
6. WHEN a settlement action is recorded (fee applied, payment confirmed, or payment failed), THE Event_Listener SHALL write an Audit_Event to the Activity_Stream with aggregateType ORDER and category SETTLEMENT.
7. WHEN an inventory stock level crosses a low threshold, THE Event_Listener SHALL write an Audit_Event to the Activity_Stream with aggregateType INVENTORY and severity WARNING.
8. IF an Event_Listener fails to write an Audit_Event, THEN THE Audit_Module SHALL log the failure with the original event payload and continue processing without blocking the originating domain operation.

### Requirement 3: Timeline Query Endpoints

**User Story:** As an operator, I want to query the audit timeline filtered by aggregate, actor, category, and time range, so that I can investigate specific incidents efficiently.

#### Acceptance Criteria

1. THE Timeline_API SHALL expose a GET endpoint at `/api/v1/audit/timeline` that accepts query parameters: aggregateType, aggregateId, actorId, category, severity, startDate, endDate, page, and pageSize.
2. WHEN a request is made to the timeline endpoint, THE Timeline_API SHALL return a paginated list of Audit_Events sorted by timestamp ascending.
3. WHEN aggregateId is provided without aggregateType, THE Timeline_API SHALL return a 400 error with a descriptive message.
4. WHEN startDate is provided and is after endDate, THE Timeline_API SHALL return a 400 error with a descriptive message.
5. THE Timeline_API SHALL support filtering by multiple categories simultaneously using repeated query parameters.
6. THE Timeline_API SHALL support filtering by multiple severity levels simultaneously using repeated query parameters.
7. WHEN no Audit_Events match the query, THE Timeline_API SHALL return an empty data array with pagination metadata indicating zero total records.
8. THE Timeline_API SHALL require authentication; unauthenticated requests SHALL receive a 401 response.
9. THE Timeline_API SHALL enforce role-based access; users without audit read permission SHALL receive a 403 response.

### Requirement 4: Audit Data Export

**User Story:** As an operator, I want to export audit timeline data for a given aggregate or time range, so that I can share evidence during investigations or compliance reviews.

#### Acceptance Criteria

1. THE Timeline_API SHALL expose a GET endpoint at `/api/v1/audit/timeline/export` that accepts the same filter parameters as the timeline query endpoint.
2. WHEN the export endpoint is called with `format=csv`, THE Timeline_API SHALL return a CSV file with headers: id, aggregateType, aggregateId, eventType, category, severity, actorId, actorRole, timestamp, metadata.
3. WHEN the export endpoint is called with `format=json`, THE Timeline_API SHALL return a JSON array of Audit_Events matching the query.
4. WHEN the export endpoint is called without a format parameter, THE Timeline_API SHALL default to CSV format.
5. THE Timeline_API SHALL limit export results to a maximum of 10,000 Audit_Events per request; IF the query would exceed this limit, THEN THE Timeline_API SHALL return the first 10,000 records and include a `truncated: true` flag in the response headers.
6. THE Timeline_API SHALL require the same authentication and authorization as the timeline query endpoint.

### Requirement 5: Frontend Timeline Component

**User Story:** As an operator, I want a visual timeline component that shows grouped domain events with severity indicators, so that I can quickly understand the state progression of an order or blood unit.

#### Acceptance Criteria

1. THE Timeline_Component SHALL render Audit_Events as a vertically ordered list grouped by date, with the earliest event at the top.
2. THE Timeline_Component SHALL display a severity badge for each Audit_Event using distinct visual styles: INFO (neutral), WARNING (amber), CRITICAL (red).
3. THE Timeline_Component SHALL display for each Audit_Event: event type label, category, actor identifier, formatted timestamp, and an expandable metadata section.
4. WHEN a user clicks on an Audit_Event, THE Timeline_Component SHALL expand to show the full metadata JSON in a readable format.
5. THE Timeline_Component SHALL provide filter controls for category and actor, updating the displayed events without a full page reload.
6. WHEN the filter controls are changed, THE Timeline_Component SHALL fetch updated Audit_Events from the Timeline_API and replace the current list.
7. WHEN the Timeline_Component is loading data, THE Timeline_Component SHALL display a loading skeleton in place of the event list.
8. WHEN the Timeline_API returns an error, THE Timeline_Component SHALL display an error message with a retry option.
9. WHEN there are no Audit_Events matching the current filters, THE Timeline_Component SHALL display an empty state message.
10. THE Timeline_Component SHALL provide an export button that triggers a CSV download of the currently filtered Audit_Events.

### Requirement 6: Order Timeline Page Integration

**User Story:** As an operator, I want to view the complete audit timeline for a specific order from the order detail page, so that I can see all events in one place without navigating away.

#### Acceptance Criteria

1. THE Timeline_Component SHALL be embeddable in the order detail page, pre-filtered to the given order's aggregateId.
2. WHEN the order detail page loads, THE Timeline_Component SHALL automatically fetch and display all Audit_Events for that order.
3. THE Timeline_Component SHALL display a summary count of events grouped by category at the top of the timeline.
4. WHEN an order has events from multiple categories (ORDER, DISPATCH, NOTIFICATION, DISPUTE, SETTLEMENT), THE Timeline_Component SHALL render all categories in a single unified view.

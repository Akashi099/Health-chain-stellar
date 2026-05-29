# Requirements Document

## Introduction

This feature delivers an offline-tolerant web experience for dispatch riders operating on the HealthChain platform. Riders frequently work in areas with poor or intermittent network connectivity. The system must allow riders to complete critical workflow steps — accepting assignments, capturing pickup confirmation, recording drop-off confirmation, capturing signature state, and referencing photo evidence — while offline, then reliably sync those actions to the backend when connectivity is restored. The backend must handle idempotent replay of queued actions to prevent duplicate state transitions, and operators must be able to see whether a delivery update arrived late via a sync.

## Glossary

- **Rider**: A registered dispatch rider who accepts and fulfils delivery assignments.
- **Operator**: A platform administrator or dispatcher who monitors delivery status.
- **Assignment**: A dispatch order assigned to a Rider, representing a blood-unit delivery task.
- **Offline_Queue**: The client-side store (IndexedDB) that holds pending rider actions captured while offline.
- **Sync_Engine**: The frontend service responsible for detecting connectivity, draining the Offline_Queue, and replaying actions against the backend.
- **Action**: A discrete rider workflow step (accept assignment, confirm pickup, confirm drop-off, capture signature, attach photo reference) stored as a serialisable record.
- **Idempotency_Key**: A client-generated UUID attached to each Action that allows the backend to detect and discard duplicate submissions.
- **Sync_Status**: The current state of an Action in the Offline_Queue — one of `pending`, `syncing`, `synced`, or `failed`.
- **Late_Sync_Flag**: A boolean field on a delivery update record indicating the update arrived after the expected delivery window.
- **Conflict**: A situation where a replayed Action targets a server-side state that has already advanced beyond the expected prior state.
- **Delivery_Proof**: The existing backend entity that records pickup, drop-off, signature, and photo evidence for a completed delivery.
- **PWA**: Progressive Web App — the frontend is served as a PWA to enable service-worker-based offline support.

## Requirements

### Requirement 1: Offline Action Capture

**User Story:** As a Rider, I want to record workflow steps (accept, pickup, drop-off, signature, photo) while offline, so that I can complete my delivery without waiting for connectivity.

#### Acceptance Criteria

1. WHEN a Rider performs a workflow step while the device has no network connectivity, THE Offline_Queue SHALL persist the Action to IndexedDB before returning a success response to the UI.
2. WHEN an Action is persisted to the Offline_Queue, THE Offline_Queue SHALL assign a client-generated UUID as the Idempotency_Key for that Action.
3. THE Offline_Queue SHALL support storing the following Action types: `accept_assignment`, `confirm_pickup`, `confirm_dropoff`, `capture_signature`, `attach_photo_reference`.
4. WHILE the device is offline, THE Sync_Engine SHALL not attempt to flush the Offline_Queue.
5. IF the IndexedDB write fails, THEN THE Offline_Queue SHALL surface an error to the UI and SHALL NOT report the Action as successfully queued.

### Requirement 2: Connectivity Detection and Sync Trigger

**User Story:** As a Rider, I want queued actions to sync automatically when I regain connectivity, so that I do not have to manually trigger uploads.

#### Acceptance Criteria

1. WHEN the device transitions from offline to online, THE Sync_Engine SHALL begin draining the Offline_Queue within 3 seconds.
2. WHEN the device transitions from online to offline, THE Sync_Engine SHALL pause any in-progress queue drain and retain all unsynced Actions in the Offline_Queue.
3. THE Sync_Engine SHALL process Actions in the Offline_Queue in the order they were originally captured (FIFO).
4. WHEN the Sync_Engine successfully submits an Action to the backend, THE Offline_Queue SHALL update that Action's Sync_Status to `synced`.
5. IF the backend returns a 4xx error for an Action (excluding 409 Conflict), THEN THE Sync_Engine SHALL mark that Action's Sync_Status as `failed` and SHALL NOT retry it automatically.
6. IF the backend returns a 5xx error or a network timeout for an Action, THEN THE Sync_Engine SHALL retry that Action with exponential back-off up to 5 attempts before marking it `failed`.

### Requirement 3: Backend Idempotency for Replayed Actions

**User Story:** As a platform engineer, I want replayed offline actions to be idempotent, so that duplicate submissions do not create duplicate state transitions.

#### Acceptance Criteria

1. WHEN the backend receives a sync request, THE Dispatch_Sync_Controller SHALL require an `Idempotency-Key` header on every Action submission endpoint.
2. WHEN the backend receives an Action whose Idempotency_Key has already been processed, THE Idempotency_Service SHALL return the original response with HTTP 200 and SHALL NOT re-apply the state transition.
3. THE Idempotency_Service SHALL store processed Idempotency_Keys with a TTL of 72 hours.
4. WHEN the backend receives an Action whose Idempotency_Key is currently being processed (lock held), THE Idempotency_Service SHALL return HTTP 409 with a `retry-after` header of 5 seconds.
5. IF an Action arrives with a valid Idempotency_Key but targets a state that has already advanced beyond the expected prior state, THEN THE Dispatch_Sync_Controller SHALL return HTTP 409 with a conflict descriptor payload.

### Requirement 4: Late Sync Detection

**User Story:** As an Operator, I want to know whether a delivery update was submitted late via an offline sync, so that I can assess delivery timeliness accurately.

#### Acceptance Criteria

1. WHEN the Sync_Engine submits a queued Action to the backend, THE Sync_Engine SHALL include the original client-side capture timestamp in the request payload.
2. WHEN the backend processes a synced Action whose capture timestamp precedes the server receipt time by more than 5 minutes, THE Dispatch_Sync_Controller SHALL set the `late_sync` flag to `true` on the resulting delivery record.
3. THE Delivery_Proof entity SHALL include a `late_sync` boolean field and a `synced_at` timestamp field.
4. WHEN an Operator queries delivery records, THE Dispatch_Sync_Controller SHALL expose `late_sync` and `synced_at` fields in the response payload.

### Requirement 5: Sync Status UI

**User Story:** As a Rider, I want to see the sync status of my queued actions, so that I know which steps have been confirmed by the server.

#### Acceptance Criteria

1. THE Rider_Dashboard SHALL display a persistent sync status indicator showing the count of pending, syncing, and failed Actions.
2. WHEN all Actions in the Offline_Queue have Sync_Status `synced`, THE Rider_Dashboard SHALL display a "All synced" confirmation state.
3. WHEN one or more Actions have Sync_Status `failed`, THE Rider_Dashboard SHALL display a warning indicator and SHALL provide a manual retry control.
4. WHEN a Rider activates the manual retry control, THE Sync_Engine SHALL re-attempt submission of all `failed` Actions.
5. WHEN the Sync_Engine is actively draining the queue, THE Rider_Dashboard SHALL display a "Syncing…" indicator.

### Requirement 6: Conflict Resolution UI

**User Story:** As a Rider, I want to understand and resolve sync conflicts, so that I can take corrective action when my offline data cannot be applied.

#### Acceptance Criteria

1. WHEN the backend returns a conflict response (HTTP 409 with conflict descriptor) for an Action, THE Sync_Engine SHALL mark that Action's Sync_Status as `failed` with a `conflict` sub-status.
2. WHEN an Action has a `conflict` sub-status, THE Rider_Dashboard SHALL display a conflict card describing the conflicting step and the current server state.
3. WHEN a Rider dismisses a conflict card, THE Offline_Queue SHALL remove the conflicted Action from the queue.
4. THE Rider_Dashboard SHALL NOT automatically resolve conflicts without explicit Rider acknowledgement.

### Requirement 7: Operator Late-Sync Visibility

**User Story:** As an Operator, I want to filter and view deliveries that were updated via a late sync, so that I can audit time-sensitive operations.

#### Acceptance Criteria

1. WHEN an Operator queries the delivery list, THE Operator_Dashboard SHALL support filtering by `late_sync = true`.
2. WHEN displaying a delivery record with `late_sync = true`, THE Operator_Dashboard SHALL render a visible "Late Sync" badge alongside the delivery entry.
3. WHEN an Operator views a delivery detail, THE Operator_Dashboard SHALL display the original capture timestamp and the `synced_at` timestamp side by side.

### Requirement 8: Duplicate Submit and Replay Safety

**User Story:** As a platform engineer, I want the system to be safe against duplicate submissions and late-arriving updates, so that delivery state remains consistent.

#### Acceptance Criteria

1. FOR ALL Action submissions, THE Dispatch_Sync_Controller SHALL enforce idempotency such that submitting the same Idempotency_Key twice produces the same observable outcome.
2. WHEN a late-arriving Action targets an order that has already reached a terminal state (`DELIVERED`, `CANCELLED`), THE Dispatch_Sync_Controller SHALL reject the Action with HTTP 409 and SHALL NOT modify the order state.
3. WHEN the Sync_Engine replays a batch of Actions after reconnection, THE Offline_Queue SHALL deduplicate Actions with the same Idempotency_Key before submission.
4. IF two Actions with different Idempotency_Keys attempt to transition the same order to the same state concurrently, THEN THE Dispatch_Sync_Controller SHALL apply the first and reject the second with HTTP 409.

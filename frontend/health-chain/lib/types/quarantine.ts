export type QuarantineTriggerSource =
  | 'DONOR_SCREENING'
  | 'TEMPERATURE_BREACH'
  | 'MANUAL_OPERATOR_ACTION'
  | 'ANOMALY_DETECTION';

export type QuarantineReasonCode =
  | 'SCREENING_FAILURE'
  | 'STORAGE_ANOMALY'
  | 'CONTAMINATION_SUSPECTED'
  | 'DONOR_LEVEL_EVENT'
  | 'FAILED_DELIVERY'
  | 'OTHER';

export type QuarantineReviewState =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED_RELEASE'
  | 'APPROVED_DISCARD'
  | 'CLOSED';

export type QuarantineDisposition = 'RELEASE' | 'DISCARD';

export interface QuarantineCase {
  id: string;
  bloodUnitId: string;
  triggerSource: QuarantineTriggerSource;
  reasonCode: QuarantineReasonCode;
  reason: string | null;
  notes: string | null;
  reviewState: QuarantineReviewState;
  reviewerAssignedTo: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  finalDisposition: QuarantineDisposition | null;
  dispositionNotes: string | null;
  dispositionAt: string | null;
  policyReference: string | null;
  metadata: Record<string, unknown> | null;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueryQuarantineCasesParams {
  reviewState?: QuarantineReviewState;
  triggerSource?: QuarantineTriggerSource;
  reasonCode?: QuarantineReasonCode;
  reviewerAssignedTo?: string;
  bloodUnitId?: string;
  active?: boolean;
}

export interface CreateQuarantineCasePayload {
  bloodUnitId: string;
  triggerSource: QuarantineTriggerSource;
  reasonCode: QuarantineReasonCode;
  reason?: string;
  notes?: string;
  policyReference?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateQuarantineReviewPayload {
  reviewState: QuarantineReviewState;
  notes?: string;
}

export interface FinalizeQuarantinePayload {
  disposition: QuarantineDisposition;
  notes?: string;
  policyReference?: string;
}

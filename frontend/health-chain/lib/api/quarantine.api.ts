import { api } from './http-client';
import type {
  CreateQuarantineCasePayload,
  FinalizeQuarantinePayload,
  QueryQuarantineCasesParams,
  QuarantineCase,
  UpdateQuarantineReviewPayload,
} from '@/lib/types/quarantine';

const PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || 'api/v1';

export async function fetchQuarantineCases(
  params: QueryQuarantineCasesParams,
): Promise<{ data: QuarantineCase[] }> {
  const q = new URLSearchParams();
  if (params.reviewState) q.set('reviewState', params.reviewState);
  if (params.triggerSource) q.set('triggerSource', params.triggerSource);
  if (params.reasonCode) q.set('reasonCode', params.reasonCode);
  if (params.reviewerAssignedTo)
    q.set('reviewerAssignedTo', params.reviewerAssignedTo);
  if (params.bloodUnitId) q.set('bloodUnitId', params.bloodUnitId);
  if (params.active !== undefined) q.set('active', String(params.active));
  return api.get<{ data: QuarantineCase[] }>(
    `/${PREFIX}/blood-units/quarantine/cases?${q.toString()}`,
  );
}

export async function createQuarantineCase(
  payload: CreateQuarantineCasePayload,
): Promise<{ success: boolean; case: QuarantineCase }> {
  return api.post<{ success: boolean; case: QuarantineCase }>(
    `/${PREFIX}/blood-units/quarantine/cases`,
    payload,
  );
}

export async function assignQuarantineReviewer(
  caseId: string,
  reviewerAssignedTo: string,
): Promise<{ success: boolean; case: QuarantineCase }> {
  return api.patch<{ success: boolean; case: QuarantineCase }>(
    `/${PREFIX}/blood-units/quarantine/cases/${caseId}/assign-reviewer`,
    { reviewerAssignedTo },
  );
}

export async function updateQuarantineReview(
  caseId: string,
  payload: UpdateQuarantineReviewPayload,
): Promise<{ success: boolean; case: QuarantineCase }> {
  return api.patch<{ success: boolean; case: QuarantineCase }>(
    `/${PREFIX}/blood-units/quarantine/cases/${caseId}/review`,
    payload,
  );
}

export async function finalizeQuarantineCase(
  caseId: string,
  payload: FinalizeQuarantinePayload,
): Promise<{ success: boolean; case: QuarantineCase }> {
  return api.patch<{ success: boolean; case: QuarantineCase }>(
    `/${PREFIX}/blood-units/quarantine/cases/${caseId}/finalize`,
    payload,
  );
}

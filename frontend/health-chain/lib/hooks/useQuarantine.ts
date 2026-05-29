import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  assignQuarantineReviewer,
  createQuarantineCase,
  fetchQuarantineCases,
  finalizeQuarantineCase,
  updateQuarantineReview,
} from '@/lib/api/quarantine.api';
import { queryKeys } from '@/lib/api/queryKeys';
import type {
  CreateQuarantineCasePayload,
  FinalizeQuarantinePayload,
  QueryQuarantineCasesParams,
  UpdateQuarantineReviewPayload,
} from '@/lib/types/quarantine';

export function useQuarantineCases(params: QueryQuarantineCasesParams) {
  return useQuery({
    queryKey: queryKeys.quarantine.list(params),
    queryFn: () => fetchQuarantineCases(params),
  });
}

export function useCreateQuarantineCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateQuarantineCasePayload) =>
      createQuarantineCase(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.quarantine.all }),
  });
}

export function useAssignQuarantineReviewer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, reviewerAssignedTo }: { caseId: string; reviewerAssignedTo: string }) =>
      assignQuarantineReviewer(caseId, reviewerAssignedTo),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.quarantine.all }),
  });
}

export function useUpdateQuarantineReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, payload }: { caseId: string; payload: UpdateQuarantineReviewPayload }) =>
      updateQuarantineReview(caseId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.quarantine.all }),
  });
}

export function useFinalizeQuarantineCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, payload }: { caseId: string; payload: FinalizeQuarantinePayload }) =>
      finalizeQuarantineCase(caseId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.quarantine.all }),
  });
}

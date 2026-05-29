import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  activatePolicyVersion,
  comparePolicyVersions,
  createPolicyVersion,
  fetchActivePolicy,
  fetchPolicyVersions,
  rollbackToPolicyVersion,
  updatePolicyVersion,
} from "@/lib/api/policy-center.api";
import { queryKeys } from "@/lib/api/queryKeys";
import type {
  CreatePolicyVersionPayload,
  UpdatePolicyVersionPayload,
} from "@/lib/types/policy-center";

export function usePolicyVersions(policyName?: string) {
  return useQuery({
    queryKey: queryKeys.policyCenter.versions(policyName),
    queryFn: () => fetchPolicyVersions(policyName),
  });
}

export function useActivePolicy(policyName?: string) {
  return useQuery({
    queryKey: queryKeys.policyCenter.active(policyName),
    queryFn: () => fetchActivePolicy(policyName),
  });
}

export function useComparePolicies(fromVersionId?: string, toVersionId?: string) {
  return useQuery({
    queryKey:
      fromVersionId && toVersionId
        ? queryKeys.policyCenter.compare(fromVersionId, toVersionId)
        : ["policyCenter", "compare", "empty"],
    queryFn: () => comparePolicyVersions(fromVersionId!, toVersionId!),
    enabled: Boolean(fromVersionId && toVersionId),
  });
}

export function useCreatePolicyVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePolicyVersionPayload) => createPolicyVersion(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.policyCenter.all }),
  });
}

export function useUpdatePolicyVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePolicyVersionPayload }) =>
      updatePolicyVersion(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.policyCenter.all }),
  });
}

export function useActivatePolicyVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activatePolicyVersion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.policyCenter.all }),
  });
}

export function useRollbackPolicyVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rollbackToPolicyVersion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.policyCenter.all }),
  });
}

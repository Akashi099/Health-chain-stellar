import { api } from "./http-client";
import type {
  CreatePolicyVersionPayload,
  PolicyCompareResult,
  PolicySnapshot,
  PolicyVersion,
  UpdatePolicyVersionPayload,
} from "@/lib/types/policy-center";

const PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || "api/v1";

export async function fetchPolicyVersions(policyName?: string): Promise<PolicyVersion[]> {
  const q = new URLSearchParams();
  if (policyName) {
    q.set("policyName", policyName);
  }
  return api.get<PolicyVersion[]>(`/${PREFIX}/policy-center/versions?${q.toString()}`);
}

export async function fetchActivePolicy(policyName?: string): Promise<PolicySnapshot> {
  const q = new URLSearchParams();
  if (policyName) {
    q.set("policyName", policyName);
  }
  return api.get<PolicySnapshot>(`/${PREFIX}/policy-center/active?${q.toString()}`);
}

export async function createPolicyVersion(
  payload: CreatePolicyVersionPayload,
): Promise<PolicyVersion> {
  return api.post<PolicyVersion>(`/${PREFIX}/policy-center/versions`, payload);
}

export async function updatePolicyVersion(
  id: string,
  payload: UpdatePolicyVersionPayload,
): Promise<PolicyVersion> {
  return api.patch<PolicyVersion>(`/${PREFIX}/policy-center/versions/${id}`, payload);
}

export async function activatePolicyVersion(id: string): Promise<PolicyVersion> {
  return api.post<PolicyVersion>(`/${PREFIX}/policy-center/versions/${id}/activate`);
}

export async function rollbackToPolicyVersion(id: string): Promise<PolicyVersion> {
  return api.post<PolicyVersion>(`/${PREFIX}/policy-center/versions/${id}/rollback`);
}

export async function comparePolicyVersions(
  fromVersionId: string,
  toVersionId: string,
): Promise<PolicyCompareResult> {
  const q = new URLSearchParams({ fromVersionId, toVersionId });
  return api.get<PolicyCompareResult>(`/${PREFIX}/policy-center/compare?${q.toString()}`);
}

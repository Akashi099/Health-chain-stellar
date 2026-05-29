export type PolicyVersionStatus =
  | "draft"
  | "active"
  | "superseded"
  | "rolled_back";

export interface OperationalPolicyRules {
  anomaly: {
    duplicateEmergencyMinCount: number;
    riderMinOrders: number;
    riderCancellationRatioThreshold: number;
    disputeCountThreshold: number;
    stockSwingWindowMinutes: number;
    stockSwingMinOrders: number;
  };
  dispatch: {
    acceptanceTimeoutMs: number;
    distanceWeight: number;
    workloadWeight: number;
    ratingWeight: number;
  };
  inventory: {
    expiringSoonHours: number;
  };
  notification: {
    defaultQuietHoursEnabled: boolean;
    defaultQuietHoursStart: string;
    defaultQuietHoursEnd: string;
    defaultEmergencyBypassTier: "normal" | "urgent" | "critical";
  };
}

export interface PolicyVersion {
  id: string;
  policyName: string;
  version: number;
  status: PolicyVersionStatus;
  rules: OperationalPolicyRules;
  changeSummary?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  createdBy?: string | null;
  activatedBy?: string | null;
  activatedAt?: string | null;
  rollbackFromVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicySnapshot {
  policyVersionId: string;
  version: number;
  policyName: string;
  rules: OperationalPolicyRules;
}

export interface PolicyCompareResult {
  fromVersionId: string;
  toVersionId: string;
  changedKeys: string[];
}

export interface CreatePolicyVersionPayload {
  policyName?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  changeSummary?: string;
  rules: Record<string, unknown>;
}

export interface UpdatePolicyVersionPayload {
  effectiveFrom?: string;
  effectiveTo?: string;
  changeSummary?: string;
  rules?: Record<string, unknown>;
}

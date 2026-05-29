"use client";

import React, { useMemo, useState } from "react";

import {
  useActivatePolicyVersion,
  useComparePolicies,
  useCreatePolicyVersion,
  usePolicyVersions,
  useRollbackPolicyVersion,
} from "@/lib/hooks/usePolicyCenter";
import type { PolicyVersion } from "@/lib/types/policy-center";

const DEFAULT_CREATE_RULES = {
  anomaly: {
    duplicateEmergencyMinCount: 3,
    riderMinOrders: 5,
    riderCancellationRatioThreshold: 0.4,
    disputeCountThreshold: 3,
    stockSwingWindowMinutes: 60,
    stockSwingMinOrders: 10,
  },
  dispatch: {
    acceptanceTimeoutMs: 180000,
    distanceWeight: 0.5,
    workloadWeight: 0.3,
    ratingWeight: 0.2,
  },
  inventory: {
    expiringSoonHours: 72,
  },
  notification: {
    defaultQuietHoursEnabled: false,
    defaultQuietHoursStart: "22:00",
    defaultQuietHoursEnd: "06:00",
    defaultEmergencyBypassTier: "normal",
  },
};

function StatusBadge({ status }: { status: PolicyVersion["status"] }) {
  const style =
    status === "active"
      ? "bg-green-100 text-green-700"
      : status === "draft"
        ? "bg-blue-100 text-blue-700"
        : status === "rolled_back"
          ? "bg-amber-100 text-amber-700"
          : "bg-gray-100 text-gray-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}

export default function PolicyCenterPage() {
  const [summary, setSummary] = useState("");
  const [rulesJson, setRulesJson] = useState(
    JSON.stringify(DEFAULT_CREATE_RULES, null, 2),
  );

  const { data: versions, isLoading, isError } = usePolicyVersions();
  const activate = useActivatePolicyVersion();
  const rollback = useRollbackPolicyVersion();
  const create = useCreatePolicyVersion();

  const [compareFrom, setCompareFrom] = useState<string | undefined>();
  const [compareTo, setCompareTo] = useState<string | undefined>();
  const compare = useComparePolicies(compareFrom, compareTo);

  const activeVersion = useMemo(
    () => versions?.find((v) => v.status === "active") ?? null,
    [versions],
  );

  const drafts = useMemo(
    () => (versions ?? []).filter((v) => v.status === "draft"),
    [versions],
  );

  function handleCreateVersion(e: React.FormEvent) {
    e.preventDefault();
    try {
      const parsed = JSON.parse(rulesJson) as Record<string, unknown>;
      create.mutate({
        changeSummary: summary || "Policy revision",
        rules: parsed,
      });
      setSummary("");
    } catch {
      window.alert("Rules JSON is invalid. Please fix and retry.");
    }
  }

  return (
    <div className="min-h-screen bg-white p-6 lg:p-10 space-y-8">
      <header className="border-b border-gray-100 pb-5">
        <h1 className="text-3xl font-manrope font-bold text-brand-black">Policy Center</h1>
        <p className="text-gray-500 mt-1">
          Manage operational thresholds by version, activate safely, and rollback when needed.
        </p>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <article className="rounded-xl border border-gray-200 p-5 xl:col-span-2">
          <h2 className="text-lg font-semibold text-brand-black mb-3">Versions</h2>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading versions...</p>
          ) : isError ? (
            <p className="text-sm text-red-500">Failed to load versions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="text-left px-3 py-2">Version</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Summary</th>
                    <th className="text-left px-3 py-2">Activated</th>
                    <th className="text-left px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(versions ?? []).map((v) => (
                    <tr key={v.id}>
                      <td className="px-3 py-2 font-semibold">v{v.version}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-3 py-2 text-gray-600">{v.changeSummary || "-"}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {v.activatedAt ? new Date(v.activatedAt).toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-2 flex gap-2">
                        <button
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
                          disabled={v.status === "active" || activate.isPending}
                          onClick={() => activate.mutate(v.id)}
                        >
                          Activate
                        </button>
                        <button
                          className="rounded border border-amber-300 text-amber-700 px-2 py-1 text-xs hover:bg-amber-50 disabled:opacity-40"
                          disabled={rollback.isPending || v.status === "active"}
                          onClick={() => rollback.mutate(v.id)}
                        >
                          Rollback To
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-brand-black mb-3">Active Policy</h2>
          {!activeVersion ? (
            <p className="text-sm text-gray-500">No active version found.</p>
          ) : (
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-semibold">Current:</span> v{activeVersion.version}
              </p>
              <p>
                <span className="font-semibold">Summary:</span> {activeVersion.changeSummary || "-"}
              </p>
              <p>
                <span className="font-semibold">Activated by:</span> {activeVersion.activatedBy || "system"}
              </p>
            </div>
          )}

          <hr className="my-4" />

          <h3 className="font-semibold text-sm mb-2">Compare Versions</h3>
          <div className="space-y-2">
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={compareFrom ?? ""}
              onChange={(e) => setCompareFrom(e.target.value || undefined)}
            >
              <option value="">From Version</option>
              {(versions ?? []).map((v) => (
                <option key={`from-${v.id}`} value={v.id}>
                  v{v.version}
                </option>
              ))}
            </select>

            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={compareTo ?? ""}
              onChange={(e) => setCompareTo(e.target.value || undefined)}
            >
              <option value="">To Version</option>
              {(versions ?? []).map((v) => (
                <option key={`to-${v.id}`} value={v.id}>
                  v{v.version}
                </option>
              ))}
            </select>
          </div>

          {compare.data && (
            <div className="mt-3 rounded border border-gray-200 p-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-600 mb-1">Changed Keys</p>
              <ul className="text-xs text-gray-700 space-y-1 max-h-32 overflow-auto">
                {compare.data.changedKeys.map((key) => (
                  <li key={key}>{key}</li>
                ))}
              </ul>
            </div>
          )}
        </article>
      </section>

      <section className="rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-brand-black mb-3">Create Draft Version</h2>
        <p className="text-sm text-gray-500 mb-4">
          Start from existing rules and adjust only what changed. Activation validates ranges and effective dates.
        </p>

        <form onSubmit={handleCreateVersion} className="space-y-3">
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Change summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <textarea
            className="w-full h-56 border rounded px-3 py-2 text-xs font-mono"
            value={rulesJson}
            onChange={(e) => setRulesJson(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded bg-brand-black text-white px-4 py-2 text-sm disabled:opacity-40"
            >
              {create.isPending ? "Creating..." : "Create Draft"}
            </button>
            <span className="text-xs text-gray-500">
              {drafts.length} draft version{drafts.length === 1 ? "" : "s"} ready for review
            </span>
          </div>
        </form>
      </section>
    </div>
  );
}

"use client";

import React, { useState } from "react";

import { createPledge, type PledgeFrequency } from "@/lib/api/pledges.api";

export function PledgeForm() {
  const [amount, setAmount] = useState(25);
  const [payerAddress, setPayerAddress] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [frequency, setFrequency] = useState<PledgeFrequency>("MONTHLY");
  const [causeTag, setCauseTag] = useState("");
  const [regionTag, setRegionTag] = useState("");
  const [emergencyPool, setEmergencyPool] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await createPledge({
        amount,
        payerAddress,
        recipientId,
        frequency,
        causeTag: causeTag || undefined,
        regionTag: regionTag || undefined,
        emergencyPool,
      });
      setStatus(`Pledge created. Reference: ${(res as { memo?: string }).memo ?? "ok"}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to create pledge");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[14px] border border-gray-200 bg-white p-5 shadow-sm space-y-3">
      <h2 className="text-[16px] font-semibold text-brand-black">
        Recurring pledge &amp; earmarks
      </h2>
      <p className="text-[12px] text-[#5C5B5B]">
        Schedule off-chain execution; memo is used for Stellar reconciliation. Optional
        cause, region, and emergency pool tag your pledge for transparency.
      </p>
      <input
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px]"
        placeholder="Payer Stellar address"
        value={payerAddress}
        onChange={(e) => setPayerAddress(e.target.value)}
      />
      <input
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px]"
        placeholder="Recipient / project id"
        value={recipientId}
        onChange={(e) => setRecipientId(e.target.value)}
      />
      <div className="flex gap-2">
        <label className="flex-1 text-[12px] text-[#5C5B5B]">
          Amount
          <input
            type="number"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px]"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </label>
        <label className="flex-1 text-[12px] text-[#5C5B5B]">
          Frequency
          <select
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px]"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as PledgeFrequency)}
          >
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
          </select>
        </label>
      </div>
      <input
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px]"
        placeholder="Cause (e.g. pediatric oncology)"
        value={causeTag}
        onChange={(e) => setCauseTag(e.target.value)}
      />
      <input
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px]"
        placeholder="Region (e.g. KE-Nairobi)"
        value={regionTag}
        onChange={(e) => setRegionTag(e.target.value)}
      />
      <label className="flex items-center gap-2 text-[13px] text-[#333]">
        <input
          type="checkbox"
          checked={emergencyPool}
          onChange={(e) => setEmergencyPool(e.target.checked)}
        />
        Earmark for emergency pool
      </label>
      <button
        type="button"
        disabled={loading || !payerAddress || !recipientId}
        onClick={submit}
        className="w-full py-2.5 rounded-[12px] bg-[#1B5E20] text-white text-[13px] font-semibold disabled:opacity-50"
      >
        {loading ? "Saving…" : "Create pledge"}
      </button>
      {status && (
        <p className="text-[12px] text-[#5C5B5B]" role="status">
          {status}
        </p>
      )}
    </div>
  );
}

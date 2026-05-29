"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  fetchCampaigns,
  createCampaign,
  type RestockingCampaign,
  type CreateCampaignPayload,
} from "@/lib/api/campaigns.api";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function CampaignConsole() {
  const [campaigns, setCampaigns] = useState<RestockingCampaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateCampaignPayload>({
    bloodType: "O+",
    region: "",
    bloodBankId: "",
    thresholdUnits: 10,
    targetUnits: 50,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCampaigns().then(setCampaigns).catch(console.error);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await createCampaign(form);
      setCampaigns((prev) => [created, ...prev]);
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black">Restocking Campaigns</h2>
          <p className="text-sm text-gray-500">Targeted donor outreach triggered by low inventory.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-[#D32F2F] text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm p-5 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Blood Type</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={form.bloodType}
              onChange={(e) => setForm((f) => ({ ...f, bloodType: e.target.value }))}
            >
              {BLOOD_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Region</label>
            <input
              required
              className="border rounded-lg px-3 py-2 text-sm"
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Blood Bank ID</label>
            <input
              required
              className="border rounded-lg px-3 py-2 text-sm"
              value={form.bloodBankId}
              onChange={(e) => setForm((f) => ({ ...f, bloodBankId: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Threshold Units</label>
            <input
              type="number"
              min={1}
              required
              className="border rounded-lg px-3 py-2 text-sm"
              value={form.thresholdUnits}
              onChange={(e) => setForm((f) => ({ ...f, thresholdUnits: +e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Target Units</label>
            <input
              type="number"
              min={1}
              required
              className="border rounded-lg px-3 py-2 text-sm"
              value={form.targetUnits}
              onChange={(e) => setForm((f) => ({ ...f, targetUnits: +e.target.value }))}
            />
          </div>
          <div className="col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#D32F2F] text-white text-sm font-medium px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              {["Blood Type", "Region", "Stock", "Audience", "Sent", "Conversions", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No campaigns yet.</td></tr>
            ) : campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.bloodType}</td>
                <td className="px-4 py-3 text-gray-600">{c.region}</td>
                <td className="px-4 py-3">
                  <span className={c.currentUnits <= c.thresholdUnits ? "text-red-600 font-semibold" : "text-gray-700"}>
                    {c.currentUnits} / {c.targetUnits}
                  </span>
                </td>
                <td className="px-4 py-3">{c.audienceSize}</td>
                <td className="px-4 py-3">{c.notificationsSent}</td>
                <td className="px-4 py-3">{c.conversions}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${STATUS_STYLE[c.status] ?? ""}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

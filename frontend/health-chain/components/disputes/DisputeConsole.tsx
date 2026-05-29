"use client";

import React, { useState } from "react";
import { AlertCircle, Clock, CheckCircle, Filter, MessageSquare, Paperclip } from "lucide-react";

interface Dispute {
  id: string;
  orderId: string | null;
  paymentId: string | null;
  status: "open" | "under_review" | "resolved" | "closed";
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
  description: string | null;
  openedBy: string;
  assignedTo: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface Props {
  disputes: Dispute[];
  onAssign?: (id: string, operatorId: string) => void;
  onResolve?: (id: string, notes: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  under_review: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-blue-50 text-blue-600",
  medium: "bg-yellow-50 text-yellow-600",
  high: "bg-orange-50 text-orange-600",
  critical: "bg-red-50 text-red-700 font-bold",
};

export function DisputeConsole({ disputes, onAssign, onResolve }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");

  const filtered = disputes.filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (severityFilter !== "all" && d.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="flex gap-4 h-full">
      {/* List panel */}
      <div className="flex-1 space-y-3">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-gray-400" />
          {["all", "open", "under_review", "resolved"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${statusFilter === s ? "bg-gray-800 text-white border-gray-800" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
          <span className="text-gray-300">|</span>
          {["all", "low", "medium", "high", "critical"].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${severityFilter === s ? "bg-gray-800 text-white border-gray-800" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Dispute rows */}
        {filtered.length === 0 && <p className="text-sm text-gray-400 italic">No disputes match the current filters.</p>}
        {filtered.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelected(d)}
            className={`w-full text-left rounded-xl border p-4 space-y-2 transition-colors hover:border-blue-300 ${selected?.id === d.id ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[d.status]}`}>{d.status.replace("_", " ")}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_STYLES[d.severity]}`}>{d.severity}</span>
              </div>
              <span className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-sm font-medium text-gray-700 capitalize">{d.reason.replace(/_/g, " ")}</p>
            {d.orderId && <p className="text-xs text-gray-400">Order: {d.orderId}</p>}
            {d.assignedTo && <p className="text-xs text-gray-400">Assigned to: {d.assignedTo}</p>}
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 shrink-0 rounded-xl border border-gray-200 bg-white p-5 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            <h3 className="font-semibold text-gray-800">Case Detail</h3>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[selected.status]}`}>{selected.status.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Severity</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_STYLES[selected.severity]}`}>{selected.severity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reason</span>
              <span className="text-gray-700 capitalize">{selected.reason.replace(/_/g, " ")}</span>
            </div>
            {selected.orderId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Order</span>
                <span className="font-mono text-xs text-gray-700">{selected.orderId}</span>
              </div>
            )}
            {selected.paymentId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Payment</span>
                <span className="font-mono text-xs text-gray-700">{selected.paymentId}</span>
              </div>
            )}
          </div>

          {selected.description && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">{selected.description}</div>
          )}

          {/* Resolve form */}
          {selected.status !== "resolved" && selected.status !== "closed" && onResolve && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resolution Notes</label>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="Describe the resolution…"
              />
              <button
                onClick={() => { onResolve(selected.id, resolveNotes); setResolveNotes(""); }}
                disabled={!resolveNotes.trim()}
                className="w-full text-sm bg-green-600 text-white rounded-lg py-2 hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                Mark Resolved
              </button>
            </div>
          )}

          {selected.resolutionNotes && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resolution</p>
              <p className="text-xs text-gray-600 bg-green-50 rounded-lg p-3">{selected.resolutionNotes}</p>
              {selected.resolvedAt && (
                <p className="text-xs text-gray-400">{new Date(selected.resolvedAt).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

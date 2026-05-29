"use client";

import React from "react";
import { Trophy, MapPin, Star, TrendingUp, Thermometer } from "lucide-react";

interface Candidate {
  riderId: string;
  totalScore: number;
  breakdown: {
    distanceScore: number;
    reputationNorm: number;
    completionScore: number;
    rejectionScore: number;
    coldChainScore: number;
  };
  distanceKm: number;
}

interface Props {
  selectedRiderId: string;
  candidates: Candidate[];
}

const SCORE_LABELS: { key: keyof Candidate["breakdown"]; label: string; icon: React.ReactNode }[] = [
  { key: "distanceScore", label: "Distance", icon: <MapPin size={12} /> },
  { key: "reputationNorm", label: "Reputation", icon: <Star size={12} /> },
  { key: "completionScore", label: "Completion", icon: <TrendingUp size={12} /> },
  { key: "rejectionScore", label: "Acceptance", icon: <TrendingUp size={12} /> },
  { key: "coldChainScore", label: "Cold Chain", icon: <Thermometer size={12} /> },
];

function ScoreBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

export function AssignmentExplainabilityPanel({ selectedRiderId, candidates }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
        <Trophy size={16} className="text-yellow-500" />
        Assignment Explanation
      </h3>

      <div className="space-y-3">
        {candidates.map((c, idx) => (
          <div
            key={c.riderId}
            className={`rounded-lg border p-3 space-y-2 ${c.riderId === selectedRiderId ? "border-blue-300 bg-blue-50" : "border-gray-100"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                <span className="text-sm font-medium text-gray-700 font-mono">{c.riderId.slice(0, 8)}…</span>
                {c.riderId === selectedRiderId && (
                  <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">Selected</span>
                )}
              </div>
              <span className="text-sm font-bold text-gray-800">{(c.totalScore * 100).toFixed(1)}</span>
            </div>

            <div className="space-y-1">
              {SCORE_LABELS.map(({ key, label, icon }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-gray-400 w-3">{icon}</span>
                  <span className="text-xs text-gray-500 w-20">{label}</span>
                  <ScoreBar value={c.breakdown[key]} />
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400">{c.distanceKm.toFixed(1)} km away</p>
          </div>
        ))}
      </div>
    </div>
  );
}

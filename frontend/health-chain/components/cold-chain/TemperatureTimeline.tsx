"use client";

import React from "react";
import { Thermometer, AlertTriangle, CheckCircle } from "lucide-react";

interface TemperatureSample {
  id: string;
  temperatureCelsius: number;
  recordedAt: string;
  isExcursion: boolean;
  source: string;
}

interface ComplianceRecord {
  isCompliant: boolean;
  excursionCount: number;
  minTempCelsius: number | null;
  maxTempCelsius: number | null;
  complianceHash: string | null;
}

interface Props {
  samples: TemperatureSample[];
  compliance?: ComplianceRecord;
  safeMin?: number;
  safeMax?: number;
}

const SAFE_MIN = 2;
const SAFE_MAX = 8;

export function TemperatureTimeline({ samples, compliance, safeMin = SAFE_MIN, safeMax = SAFE_MAX }: Props) {
  if (!samples.length) {
    return <p className="text-sm text-gray-400 italic">No telemetry data recorded for this delivery.</p>;
  }

  const allTemps = samples.map((s) => s.temperatureCelsius);
  const chartMin = Math.min(...allTemps, safeMin) - 2;
  const chartMax = Math.max(...allTemps, safeMax) + 2;
  const range = chartMax - chartMin;

  const toY = (temp: number) => ((chartMax - temp) / range) * 100;

  const points = samples
    .map((s, i) => {
      const x = samples.length === 1 ? 50 : (i / (samples.length - 1)) * 100;
      const y = toY(s.temperatureCelsius);
      return `${x},${y}`;
    })
    .join(" ");

  const safeBandTop = toY(safeMax);
  const safeBandHeight = toY(safeMin) - safeBandTop;

  return (
    <div className="space-y-4">
      {/* Compliance badge */}
      {compliance && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${compliance.isCompliant ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {compliance.isCompliant ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {compliance.isCompliant ? "Temperature compliant" : `${compliance.excursionCount} excursion(s) detected`}
          {compliance.complianceHash && (
            <span className="ml-auto text-xs font-mono text-gray-400 truncate max-w-[120px]" title={compliance.complianceHash}>
              #{compliance.complianceHash.slice(0, 8)}
            </span>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="relative bg-gray-50 rounded-lg p-3 border border-gray-200">
        <svg viewBox="0 0 100 60" className="w-full h-40" preserveAspectRatio="none">
          {/* Safe band */}
          <rect x="0" y={safeBandTop} width="100" height={safeBandHeight} fill="#dcfce7" opacity="0.6" />
          {/* Safe band borders */}
          <line x1="0" y1={safeBandTop} x2="100" y2={safeBandTop} stroke="#16a34a" strokeWidth="0.3" strokeDasharray="2,1" />
          <line x1="0" y1={toY(safeMin)} x2="100" y2={toY(safeMin)} stroke="#16a34a" strokeWidth="0.3" strokeDasharray="2,1" />
          {/* Temperature line */}
          <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
          {/* Data points */}
          {samples.map((s, i) => {
            const x = samples.length === 1 ? 50 : (i / (samples.length - 1)) * 100;
            const y = toY(s.temperatureCelsius);
            return (
              <circle
                key={s.id}
                cx={x}
                cy={y}
                r="1.5"
                fill={s.isExcursion ? "#ef4444" : "#3b82f6"}
                stroke="white"
                strokeWidth="0.5"
              />
            );
          })}
        </svg>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-3 bottom-3 flex flex-col justify-between text-xs text-gray-400 pointer-events-none" style={{ width: "2rem" }}>
          <span>{chartMax.toFixed(0)}°</span>
          <span>{safeMax}°</span>
          <span>{safeMin}°</span>
          <span>{chartMin.toFixed(0)}°</span>
        </div>
      </div>

      {/* Excursion list */}
      {samples.filter((s) => s.isExcursion).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Excursions</p>
          {samples
            .filter((s) => s.isExcursion)
            .map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs text-red-700 bg-red-50 px-2 py-1 rounded">
                <Thermometer size={12} />
                <span>{s.temperatureCelsius.toFixed(1)}°C</span>
                <span className="text-gray-400">{new Date(s.recordedAt).toLocaleString()}</span>
                <span className="text-gray-400">via {s.source}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

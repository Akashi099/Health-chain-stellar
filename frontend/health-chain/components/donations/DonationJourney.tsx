"use client";
import React from "react";
import { Lock, CheckCircle2, Unlock, UserCheck, Circle } from "lucide-react";

export type DonationStatus = "escrow" | "conditions_met" | "released" | "confirmed";

interface DonationJourneyProps {
  donationId: string;
  amount: string;
  recipient: string;
  currentStatus: DonationStatus;
  timestamps: Partial<Record<DonationStatus, string>>;
}

const STEPS: { key: DonationStatus; label: string; description: string; Icon: React.ElementType }[] = [
  { key: "escrow", label: "Funds in Escrow", description: "Donation locked in Soroban smart contract", Icon: Lock },
  { key: "conditions_met", label: "Conditions Met", description: "On-chain oracle conditions verified", Icon: CheckCircle2 },
  { key: "released", label: "Funds Released", description: "Smart contract released funds to recipient", Icon: Unlock },
  { key: "confirmed", label: "Recipient Confirmed", description: "Healthcare actor confirmed receipt", Icon: UserCheck },
];

const STATUS_ORDER: DonationStatus[] = ["escrow", "conditions_met", "released", "confirmed"];

export const DonationJourney: React.FC<DonationJourneyProps> = ({
  donationId,
  amount,
  recipient,
  currentStatus,
  timestamps,
}) => {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="bg-white rounded-[24px] shadow-[0px_4px_20px_rgba(0,0,0,0.05)] p-8 font-poppins">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-2">
        <div>
          <h2 className="text-[20px] font-bold text-brand-black tracking-[0.03em]">Donation Journey</h2>
          <p className="text-[13px] text-[#5C5B5B] mt-1">ID: {donationId}</p>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-bold text-[#D32F2F]">{amount}</p>
          <p className="text-[13px] text-[#5C5B5B]">→ {recipient}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Connector line */}
        <div className="absolute left-[23px] top-6 bottom-6 w-[2px] bg-gray-100 md:hidden" />
        <div className="hidden md:block absolute top-[23px] left-6 right-6 h-[2px] bg-gray-100" />

        <div className="flex flex-col md:flex-row gap-6 md:gap-0 md:justify-between relative">
          {STEPS.map((step, index) => {
            const isDone = index < currentIndex;
            const isActive = index === currentIndex;
            const isPending = index > currentIndex;

            return (
              <div key={step.key} className="flex md:flex-col items-start md:items-center gap-4 md:gap-3 md:flex-1 relative z-10">
                {/* Icon bubble */}
                <div
                  className={`w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0 border-2 transition-all
                    ${isDone ? "bg-[#D32F2F] border-[#D32F2F]" : ""}
                    ${isActive ? "bg-white border-[#D32F2F] shadow-[0_0_0_4px_rgba(211,47,47,0.15)]" : ""}
                    ${isPending ? "bg-white border-gray-200" : ""}
                  `}
                >
                  {isDone ? (
                    <step.Icon size={20} className="text-white" />
                  ) : isActive ? (
                    <step.Icon size={20} className="text-[#D32F2F]" />
                  ) : (
                    <Circle size={20} className="text-gray-300" />
                  )}
                </div>

                {/* Text */}
                <div className="md:text-center">
                  <p className={`text-[13px] font-semibold tracking-[0.03em] ${isPending ? "text-gray-400" : "text-brand-black"}`}>
                    {step.label}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isPending ? "text-gray-300" : "text-[#5C5B5B]"}`}>
                    {step.description}
                  </p>
                  {timestamps[step.key] && (
                    <p className="text-[10px] text-[#D32F2F] mt-1 font-medium">{timestamps[step.key]}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active status banner */}
      <div className="mt-8 bg-red-50 border border-red-100 rounded-[12px] px-5 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[#D32F2F] animate-pulse" />
        <p className="text-[13px] font-medium text-[#D32F2F]">
          Current status: <span className="font-bold">{STEPS[currentIndex].label}</span>
        </p>
      </div>
    </div>
  );
};

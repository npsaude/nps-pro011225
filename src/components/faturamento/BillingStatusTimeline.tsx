import React from "react";
import { CheckCircle2, Clock3, Minus } from "lucide-react";
import type { BillingStep, BillingStatus } from "./billing-types.ts";

interface BillingStatusTimelineProps {
  steps: BillingStep[];
}

function getStatusColors(status: BillingStatus) {
  switch (status) {
    case "completed":
      return {
        circleBorder: "border-emerald-500",
        circleShadow: "shadow-[0_0_0_3px_rgba(16,185,129,0.18)]",
        circleBg: "bg-emerald-500",
        icon: "text-white",
        label: "text-slate-700",
        value: "text-emerald-600",
        line: "bg-emerald-500",
      };
    case "processing":
      return {
        circleBorder: "border-sky-500",
        circleShadow: "shadow-[0_0_0_3px_rgba(56,189,248,0.18)]",
        circleBg: "bg-white",
        icon: "text-sky-600",
        label: "text-slate-700",
        value: "text-sky-600",
        line: "bg-sky-500",
      };
    case "pending":
      return {
        circleBorder: "border-amber-400",
        circleShadow: "shadow-[0_0_0_3px_rgba(251,191,36,0.24)]",
        circleBg: "bg-white",
        icon: "text-amber-500",
        label: "text-slate-700",
        value: "text-amber-600",
        line: "bg-amber-400",
      };
    case "waiting":
      return {
        circleBorder: "border-slate-300",
        circleShadow: "shadow-[0_0_0_3px_rgba(148,163,184,0.2)]",
        circleBg: "bg-white",
        icon: "text-slate-500",
        label: "text-slate-500",
        value: "text-slate-400",
        line: "bg-slate-300",
      };
    case "nc":
    default:
      return {
        circleBorder: "border-slate-300",
        circleShadow: "shadow-[0_0_0_3px_rgba(148,163,184,0.15)]",
        circleBg: "bg-white",
        icon: "text-slate-400",
        label: "text-slate-400",
        value: "text-slate-400",
        line: "bg-slate-300",
      };
  }
}

function getStatusValueText(step: BillingStep): string {
  if (step.status === "completed" && step.date) {
    return step.date;
  }

  switch (step.status) {
    case "processing":
      return "Em verificação";
    case "pending":
    case "waiting":
      return "Aguardando";
    case "nc":
    default:
      return "n.c.";
  }
}

function StatusIcon({
  status,
  className,
}: {
  status: BillingStatus;
  className?: string;
}) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className={`h-4 w-4 ${className ?? ""}`} />;
    case "processing":
    case "pending":
    case "waiting":
      return <Clock3 className={`h-4 w-4 ${className ?? ""}`} />;
    case "nc":
    default:
      return <Minus className={`h-4 w-4 ${className ?? ""}`} />;
  }
}

const BillingStatusTimeline: React.FC<BillingStatusTimelineProps> = ({
  steps,
}) => {
  return (
    <div className="mt-1 flex flex-col gap-4">
      <div className="flex items-center gap-4 md:gap-8">
        {steps.map((step, index) => {
          const colors = getStatusColors(step.status);
          const isLast = index === steps.length - 1;

          return (
            <div
              key={step.id}
              className="flex flex-1 flex-col items-center text-center"
            >
              <div className="flex w-full items-center">
                <div
                  className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full border-[2.2px] bg-white ${colors.circleBorder} ${colors.circleShadow} ${colors.circleBg}`}
                >
                  <StatusIcon status={step.status} className={colors.icon} />
                </div>
                {!isLast && (
                  <div
                    className={`ml-2 hidden h-[2px] flex-1 rounded-full md:block ${colors.line}`}
                  />
                )}
              </div>
              <div
                className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] ${colors.label}`}
              >
                {step.label}
              </div>
              <div className={`mt-1 text-[11px] font-medium ${colors.value}`}>
                {getStatusValueText(step)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BillingStatusTimeline;
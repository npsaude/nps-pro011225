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
        circle: "border-emerald-500 bg-emerald-50 text-emerald-600",
        label: "text-emerald-700",
        value: "text-emerald-600",
        line: "bg-emerald-500",
      };
    case "processing":
      return {
        circle: "border-sky-500 bg-sky-50 text-sky-600",
        label: "text-sky-700",
        value: "text-sky-600",
        line: "bg-sky-500",
      };
    case "pending":
      return {
        circle: "border-amber-400 bg-amber-50 text-amber-600",
        label: "text-amber-700",
        value: "text-amber-600",
        line: "bg-amber-400",
      };
    case "waiting":
      return {
        circle: "border-slate-300 bg-slate-50 text-slate-500",
        label: "text-slate-500",
        value: "text-slate-400",
        line: "bg-slate-200",
      };
    case "nc":
    default:
      return {
        circle: "border-slate-200 bg-slate-100 text-slate-400",
        label: "text-slate-400",
        value: "text-slate-400",
        line: "bg-slate-200",
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

function StatusIcon({ status }: { status: BillingStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4" />;
    case "processing":
    case "pending":
    case "waiting":
      return <Clock3 className="h-4 w-4" />;
    case "nc":
    default:
      return <Minus className="h-4 w-4" />;
  }
}

const BillingStatusTimeline: React.FC<BillingStatusTimelineProps> = ({
  steps,
}) => {
  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-slate-200 pt-4">
      <div className="flex items-center gap-4 md:gap-6">
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
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2 ${colors.circle}`}
                >
                  <StatusIcon status={step.status} />
                </div>
                {!isLast && (
                  <div
                    className={`ml-2 hidden h-0.5 flex-1 rounded-full md:block ${colors.line}`}
                  />
                )}
              </div>
              <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
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
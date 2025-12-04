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
        circleBg: "bg-emerald-500",
        icon: "text-white",
        label: "text-slate-700",
        value: "text-emerald-600",
        line: "bg-emerald-500",
      };
    case "processing":
      return {
        circleBorder: "border-sky-500",
        circleBg: "bg-white",
        icon: "text-sky-600",
        label: "text-slate-700",
        value: "text-sky-600",
        line: "bg-slate-300",
      };
    case "pending":
      return {
        circleBorder: "border-amber-400",
        circleBg: "bg-white",
        icon: "text-amber-500",
        label: "text-slate-700",
        value: "text-amber-600",
        line: "bg-slate-300",
      };
    case "waiting":
      return {
        circleBorder: "border-slate-300",
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
      return <CheckCircle2 className={`h-[13px] w-[13px] ${className ?? ""}`} />;
    case "processing":
    case "pending":
    case "waiting":
      return <Clock3 className={`h-[13px] w-[13px] ${className ?? ""}`} />;
    case "nc":
    default:
      return <Minus className={`h-[13px] w-[13px] ${className ?? ""}`} />;
  }
}

const BillingStatusTimeline: React.FC<BillingStatusTimelineProps> = ({
  steps,
}) => {
  return (
    <div className="mt-1 flex flex-col">
      <div className="flex items-center gap-3 md:gap-6">
        {steps.map((step, index) => {
          const colors = getStatusColors(step.status);
          const isLast = index === steps.length - 1;

          // linha herda a cor do passo atual se estiver concluído, senão cinza claro
          const lineColor =
            step.status === "completed" ? colors.line : "bg-slate-200";

          return (
            <div
              key={step.id}
              className="flex flex-1 flex-col items-center text-center"
            >
              {/* Linha + bolinha na mesma altura, como na referência */}
              <div className="flex w-full items-center">
                <div
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full border-[2px] ${colors.circleBorder} ${colors.circleBg}`}
                >
                  <StatusIcon status={step.status} className={colors.icon} />
                </div>
                {!isLast && (
                  <div
                    className={`ml-1 hidden h-[2px] flex-1 rounded-full md:block ${lineColor}`}
                  />
                )}
              </div>

              {/* Textos alinhados diretamente abaixo da bolinha */}
              <div
                className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] ${colors.label}`}
              >
                {step.label}
              </div>
              <div className={`mt-0.5 text-[10px] font-medium ${colors.value}`}>
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
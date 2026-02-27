import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export type BillingDocStepId =
  | "guia_solicitacao"
  | "guia_autorizacao"
  | "descricao_cirurgica"
  | "guia_honorarios"
  | "email_faturamento";

export type BillingDocStep = {
  id: BillingDocStepId;
  label: string;
  sent: boolean;
};

function getColors(sent: boolean) {
  if (sent) {
    return {
      circleBorder: "border-emerald-500",
      circleBg: "bg-emerald-500",
      icon: "text-white",
      label: "text-slate-700",
      line: "bg-emerald-500",
      statusText: "text-emerald-600",
      statusLabel: "Enviado",
    };
  }

  return {
    circleBorder: "border-red-500",
    circleBg: "bg-red-500",
    icon: "text-white",
    label: "text-slate-700",
    line: "bg-slate-200",
    statusText: "text-red-600",
    statusLabel: "Não enviado",
  };
}

export default function BillingDocsProgress({ steps }: { steps: BillingDocStep[] }) {
  return (
    <div className="mt-1 flex flex-col">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const colors = getColors(step.sent);
          const isFirst = index === 0;
          const isLast = index === steps.length - 1;

          // A linha herda a cor do passo atual quando enviado; caso contrário fica neutra.
          const lineColor = step.sent ? colors.line : "bg-slate-200";

          return (
            <div key={step.id} className="flex flex-1 flex-col items-center text-center">
              <div className="relative flex w-full items-center justify-center">
                {!isFirst && (
                  <div
                    className={`pointer-events-none absolute left-0 right-1/2 h-[2px] rounded-full ${lineColor}`}
                  />
                )}
                {!isLast && (
                  <div
                    className={`pointer-events-none absolute left-1/2 right-0 h-[2px] rounded-full ${lineColor}`}
                  />
                )}

                <div
                  className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-[2px] ${colors.circleBorder} ${colors.circleBg}`}
                >
                  {step.sent ? (
                    <CheckCircle2 className={`h-[13px] w-[13px] ${colors.icon}`} />
                  ) : (
                    <XCircle className={`h-[13px] w-[13px] ${colors.icon}`} />
                  )}
                </div>
              </div>

              <div className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] ${colors.label}`}>
                {step.label}
              </div>
              <div className={`mt-0.5 text-[10px] font-medium ${colors.statusText}`}>
                {colors.statusLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from "react";
import { CheckCircle2, FileText, Mail, ReceiptText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type Summary = {
  total: number;
  docsSent: number;
  docsTotal: number;
  emailsSent: number;
  emailsTotal: number;
};

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="rounded-2xl border border-[#D4A017]/15 bg-black/40 backdrop-blur-xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              {label}
            </div>
            <div className="mt-1 text-xl font-semibold text-[#F5F5F5]">{value}</div>
            {sub ? (
              <div className="mt-1 text-[12px] text-[#9CA3AF]">{sub}</div>
            ) : null}
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D4A017]/20 bg-black/40 text-[#D4A017]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MedicoFaturamentosSummary({ summary }: { summary: Summary }) {
  const docsPct = summary.docsTotal > 0 ? Math.round((summary.docsSent / summary.docsTotal) * 100) : 0;
  const emailsPct = summary.emailsTotal > 0 ? Math.round((summary.emailsSent / summary.emailsTotal) * 100) : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        icon={<ReceiptText className="h-5 w-5" />}
        label="Casos"
        value={String(summary.total)}
        sub="faturamentos no período"
      />
      <MetricCard
        icon={<FileText className="h-5 w-5" />}
        label="Documentos"
        value={`${docsPct}%`}
        sub={`${summary.docsSent}/${summary.docsTotal} enviados`}
      />
      <MetricCard
        icon={<Mail className="h-5 w-5" />}
        label="E-mail"
        value={`${emailsPct}%`}
        sub={`${summary.emailsSent}/${summary.emailsTotal} enviados`}
      />
      <MetricCard
        icon={<CheckCircle2 className="h-5 w-5" />}
        label="Concluídos"
        value={String(
          summary.emailsTotal > 0 ? summary.emailsSent : 0,
        )}
        sub="com e-mail enviado"
      />
    </div>
  );
}

import React, { useMemo } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Hospital,
  Users,
  Wallet,
  XCircle,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import type { BillingDocStep } from "@/components/faturamento/BillingDocsProgress";

export type MedicoBillingCardRecord = {
  id: string;
  pacienteNome: string;
  dataCirurgia: string | null;
  horaCirurgia: string | null;
  hospitalNome: string | null;
  procedimentos: string[];
  profissionais: string[];
  qtdSolicitada: number;
  qtdAutorizada: number;
  valorFaturamento: number | null;
  steps: BillingDocStep[];
};

function formatDatePtBr(dateIso: string | null): string {
  if (!dateIso) return "-";
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function formatTimeShort(time: string | null): string {
  if (!time) return "-";
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getEmailBadge(steps: BillingDocStep[]) {
  const email = steps.find((s) => s.id === "email_faturamento");
  const sent = Boolean(email?.sent);

  if (sent) {
    return (
      <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15">
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
        Email enviado
      </Badge>
    );
  }

  return (
    <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15">
      <XCircle className="mr-1 h-3.5 w-3.5" />
      Email pendente
    </Badge>
  );
}

function DocsChips({ steps }: { steps: BillingDocStep[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((s) => (
        <span
          key={s.id}
          className={
            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium " +
            (s.sent
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              : "border-[#D4A017]/15 bg-black/30 text-[#9CA3AF]")
          }
        >
          {s.sent ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Clock3 className="h-3.5 w-3.5" />
          )}
          <span className="whitespace-nowrap">{s.label}</span>
        </span>
      ))}
    </div>
  );
}

export default function MedicoBillingCard({
  record,
}: {
  record: MedicoBillingCardRecord;
}) {
  const hasGuiaSolicitacao = record.qtdSolicitada > 0;
  const qtdSolicitadaLabel = hasGuiaSolicitacao ? String(record.qtdSolicitada) : "—";

  const docsSent = useMemo(
    () => record.steps.filter((s) => s.sent).length,
    [record.steps],
  );

  const primaryValue = hasGuiaSolicitacao
    ? formatCurrency(record.valorFaturamento ?? 0)
    : "-";

  return (
    <Card className="overflow-hidden rounded-2xl border border-[#D4A017]/15 bg-black/40 shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <CardContent className="p-0">
        <div className="px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4A017]/90">
                Paciente
              </div>
              <div className="mt-1 truncate text-base font-semibold text-[#F5F5F5]">
                {record.pacienteNome}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {getEmailBadge(record.steps)}
                <Badge className="border-[#D4A017]/20 bg-black/30 text-[#E5E7EB] hover:bg-black/35">
                  {docsSent}/{record.steps.length} docs
                </Badge>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
                Valor
              </div>
              <div
                className={
                  "mt-1 text-sm font-semibold " +
                  (hasGuiaSolicitacao ? "text-emerald-200" : "text-[#9CA3AF]")
                }
              >
                {primaryValue}
              </div>
              {!hasGuiaSolicitacao ? (
                <div className="mt-1 text-[11px] font-medium text-rose-200">
                  falta guia
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-[#D4A017]/10 bg-black/30 px-3 py-2">
              <CalendarDays className="h-4 w-4 text-[#D4A017]" />
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
                  Data
                </div>
                <div className="truncate text-[12px] font-medium text-[#F5F5F5]">
                  {formatDatePtBr(record.dataCirurgia)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[#D4A017]/10 bg-black/30 px-3 py-2">
              <Clock3 className="h-4 w-4 text-[#D4A017]" />
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
                  Hora
                </div>
                <div className="truncate text-[12px] font-medium text-[#F5F5F5]">
                  {formatTimeShort(record.horaCirurgia)}
                </div>
              </div>
            </div>

            <div className="col-span-2 flex items-center gap-2 rounded-xl border border-[#D4A017]/10 bg-black/30 px-3 py-2">
              <Hospital className="h-4 w-4 text-[#D4A017]" />
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
                  Hospital
                </div>
                <div className="truncate text-[12px] font-medium text-[#F5F5F5]">
                  {record.hospitalNome?.trim() || "-"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-[#D4A017]/10" />

        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
            <div className="flex items-center gap-1.5 text-[#9CA3AF]">
              <FileText className="h-4 w-4 text-[#D4A017]" />
              <span className="font-medium">Solicitado:</span>
              <span className="text-[#F5F5F5]">{qtdSolicitadaLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#9CA3AF]">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span className="font-medium">Autorizado:</span>
              <span className="text-[#F5F5F5]">{record.qtdAutorizada}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#9CA3AF]">
              <Wallet className="h-4 w-4 text-[#D4A017]" />
              <span className="font-medium">Docs:</span>
              <span className="text-[#F5F5F5]">
                {docsSent}/{record.steps.length}
              </span>
            </div>
          </div>
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="detalhes" className="border-0">
            <AccordionTrigger
              className={
                "px-4 py-3 text-sm font-semibold hover:no-underline " +
                "rounded-none bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black " +
                "shadow-[0_18px_40px_rgba(212,160,23,0.18)]"
              }
            >
              <div className="flex w-full items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  Ver detalhes
                  <ChevronRight className="h-4 w-4" />
                </span>
                <span className="hidden sm:inline text-[11px] font-medium text-black/70">
                  procedimentos, equipe e documentos
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#D4A017]">
                    <FileText className="h-4 w-4" />
                    Procedimentos
                  </div>
                  <div className="rounded-xl border border-[#D4A017]/10 bg-black/30 px-3 py-2 text-[12px] text-[#E5E7EB]">
                    {record.procedimentos.length > 0
                      ? record.procedimentos.join(", ")
                      : "—"}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#D4A017]">
                    <Users className="h-4 w-4" />
                    Equipe
                  </div>
                  <div className="rounded-xl border border-[#D4A017]/10 bg-black/30 px-3 py-2 text-[12px] text-[#E5E7EB]">
                    {record.profissionais.length > 0
                      ? record.profissionais.join(", ")
                      : "—"}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[12px] font-semibold text-[#D4A017]">
                    Documentos
                  </div>
                  <DocsChips steps={record.steps} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
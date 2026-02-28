import React from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Hospital,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { MedicoBillingCardRecord } from "@/components/faturamento/MedicoBillingCard";

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
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function EmailBadge({ record }: { record: MedicoBillingCardRecord }) {
  const email = record.steps.find((s) => s.id === "email_faturamento");
  const sent = Boolean(email?.sent);

  return sent ? (
    <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15">
      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
      Email enviado
    </Badge>
  ) : (
    <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15">
      <XCircle className="mr-1 h-3.5 w-3.5" />
      Email pendente
    </Badge>
  );
}

function DocChips({ record }: { record: MedicoBillingCardRecord }) {
  return (
    <div className="flex flex-wrap gap-2">
      {record.steps.map((s) => (
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

export default function MedicoFaturamentoDetailsSheet({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: MedicoBillingCardRecord | null;
}) {
  const docsSent = record ? record.steps.filter((s) => s.sent).length : 0;
  const docsTotal = record ? record.steps.length : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-[#D4A017]/15 bg-[#0b0b0b] p-0 text-[#F5F5F5] sm:max-w-xl"
      >
        {record ? (
          <div className="flex h-full flex-col">
            <SheetHeader className="space-y-1 border-b border-[#D4A017]/10 px-5 py-4 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
                    Paciente
                  </div>
                  <SheetTitle className="mt-1 truncate text-xl font-semibold text-[#F5F5F5]">
                    {record.pacienteNome}
                  </SheetTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <EmailBadge record={record} />
                    <Badge className="border-[#D4A017]/20 bg-black/30 text-[#E5E7EB] hover:bg-black/35">
                      {docsSent}/{docsTotal} docs
                    </Badge>
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
              <Card className="rounded-2xl border border-[#D4A017]/15 bg-black/40 backdrop-blur-xl">
                <CardContent className="p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
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

                    <div className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-[#D4A017]/10 bg-black/30 px-3 py-2">
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

                    <div className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-[#D4A017]/10 bg-black/30 px-3 py-2">
                      <Wallet className="h-4 w-4 text-[#D4A017]" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
                          Valor
                        </div>
                        <div className="truncate text-[12px] font-medium text-[#F5F5F5]">
                          {record.valorFaturamento == null
                            ? "-"
                            : formatCurrency(record.valorFaturamento)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4 bg-[#D4A017]/10" />

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
                    <div className="flex items-center gap-1.5 text-[#9CA3AF]">
                      <FileText className="h-4 w-4 text-[#D4A017]" />
                      <span className="font-medium">Solicitado:</span>
                      <span className="text-[#F5F5F5]">
                        {record.qtdSolicitada > 0 ? record.qtdSolicitada : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#9CA3AF]">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      <span className="font-medium">Autorizado:</span>
                      <span className="text-[#F5F5F5]">{record.qtdAutorizada}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#D4A017]/15 bg-black/40 backdrop-blur-xl">
                <CardContent className="p-4">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
                    Documentos
                  </div>
                  <DocChips record={record} />
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#D4A017]/15 bg-black/40 backdrop-blur-xl">
                <CardContent className="p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
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
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

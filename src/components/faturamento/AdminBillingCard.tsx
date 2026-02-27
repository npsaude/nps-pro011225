import React from "react";
import { CalendarDays, Clock3, Hospital, User2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import BillingDocsProgress, { type BillingDocStep } from "./BillingDocsProgress";

function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export type AdminBillingCardRecord = {
  id: string;
  pacienteNome: string | null;
  dataCirurgia: string | null; // YYYY-MM-DD
  horaCirurgia: string | null; // HH:mm:ss
  hospitalNome: string | null;
  steps: BillingDocStep[];
  // Novos campos de resumo
  procedimentos: string[];
  profissionais: string[];
  qtdSolicitada: number;
  qtdAutorizada: number;
  valorFaturamento: number;
};

function formatDatePtBr(dateIso: string | null): string {
  if (!dateIso) return "-";
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function formatTimeShort(time: string | null): string {
  if (!time) return "-";
  // HH:mm:ss => HH:mm
  if (time.length >= 5) return time.slice(0, 5);
  return time;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function AdminBillingCard({ record }: { record: AdminBillingCardRecord }) {
  const pacienteLabel = record.pacienteNome?.trim() || "Paciente não informado";

  const procedimentosText = record.procedimentos.length > 0
    ? record.procedimentos.join(", ")
    : "—";

  const profissionaisText = record.profissionais.length > 0
    ? record.profissionais.join(", ")
    : "—";

  return (
    <Card className="overflow-hidden rounded-[22px] border-[#D5DFEF] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.1)]">
      <CardContent className="p-0">
        <div className="bg-[#EAF1FF] px-6 py-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Paciente */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E4FBF2] text-[13px] font-semibold text-emerald-600">
                {getInitials(pacienteLabel)}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Paciente
                </span>
                <span className="mt-0.5 text-[13px] font-semibold text-slate-900">
                  {pacienteLabel}
                </span>
              </div>
            </div>

            {/* Data cirurgia */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4E9FF] text-fuchsia-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Data cirurgia
                </span>
                <span className="mt-0.5 text-[13px] font-semibold text-slate-900">
                  {formatDatePtBr(record.dataCirurgia)}
                </span>
              </div>
            </div>

            {/* Hora cirurgia */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D9E4FF] text-[#163E99]">
                <Clock3 className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Hora cirurgia
                </span>
                <span className="mt-0.5 text-[13px] font-semibold text-slate-900">
                  {formatTimeShort(record.horaCirurgia)}
                </span>
              </div>
            </div>

            {/* Hospital */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#2F4B7C] ring-1 ring-[#D5DFEF]">
                <Hospital className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Hospital
                </span>
                <span className="mt-0.5 text-[13px] font-semibold text-slate-900">
                  {record.hospitalNome?.trim() || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Linha de informações resumidas - Layout visual melhorado */}
        <div className="border-t border-[#D5DFEF] bg-[#F9FAFC] px-6 py-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            {/* Coluna esquerda: Procedimentos e Equipe */}
            <div className="space-y-2.5">
              {/* Procedimentos */}
              <div className="flex flex-wrap items-start gap-x-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Procedimentos:
                </span>
                <span className="text-[11px] text-slate-700">
                  {procedimentosText}
                </span>
              </div>

              {/* Equipe */}
              <div className="flex flex-wrap items-start gap-x-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Equipe:
                </span>
                <span className="text-[11px] text-slate-700">
                  {profissionaisText}
                </span>
              </div>
            </div>

            {/* Coluna direita: Métricas numéricas */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 lg:justify-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Itens solicitados:
                </span>
                <span className="text-[13px] font-semibold text-slate-800">
                  {record.qtdSolicitada}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Itens autorizados:
                </span>
                <span className="text-[13px] font-semibold text-slate-800">
                  {record.qtdAutorizada}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Valor:
                </span>
                <span className="text-[13px] font-semibold text-emerald-600">
                  {formatCurrency(record.valorFaturamento)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#D5DFEF] bg-[#F5F7FC] px-6 pb-5 pt-4">
          <BillingDocsProgress steps={record.steps} />
        </div>
      </CardContent>
    </Card>
  );
}
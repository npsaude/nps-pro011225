import React from "react";
import { CalendarDays, Clock3, Hospital, User2, Stethoscope, Users, FileText, FileCheck, DollarSign, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
  valorFaturamento: number | null; // null quando não há guia de solicitação
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

export default function AdminBillingCard({
  record,
  onDelete,
}: {
  record: AdminBillingCardRecord;
  onDelete?: (id: string) => void;
}) {
  const pacienteLabel = record.pacienteNome?.trim() || "Paciente não informado";

  const procedimentosText = record.procedimentos.length > 0
    ? record.procedimentos.join(", ")
    : "—";

  const profissionaisText = record.profissionais.length > 0
    ? record.profissionais.join(", ")
    : "—";

  // Determinar se tem guia de solicitação
  const temGuiaSolicitacao = record.qtdSolicitada > 0;

  return (
    <Card className="overflow-hidden rounded-[22px] border-[#D5DFEF] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.1)] relative">
      {onDelete && (
        <div className="absolute right-4 top-4 z-10">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir faturamento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o faturamento de{" "}
                  <strong>{pacienteLabel}</strong>? Esta ação não pode ser
                  desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(record.id)}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      <CardContent className="p-0">
        <div className="bg-[#EAF1FF] px-6 py-4 pr-16">
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

        {/* Linha de informações resumidas - Layout visual com ícones */}
        <div className="border-t border-[#D5DFEF] bg-[#F9FAFC] px-6 py-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            {/* Coluna esquerda: Procedimentos e Equipe */}
            <div className="space-y-2.5">
              {/* Procedimentos */}
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#EDE9FE] text-violet-600">
                  <Stethoscope className="h-3 w-3" />
                </div>
                <div className="flex flex-wrap items-start gap-x-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Procedimentos:
                  </span>
                  <span className="text-[11px] text-slate-600">
                    {procedimentosText}
                  </span>
                </div>
              </div>

              {/* Equipe */}
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#DBEAFE] text-blue-600">
                  <Users className="h-3 w-3" />
                </div>
                <div className="flex flex-wrap items-start gap-x-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Equipe:
                  </span>
                  <span className="text-[11px] text-slate-600">
                    {profissionaisText}
                  </span>
                </div>
              </div>
            </div>

            {/* Coluna direita: Métricas numéricas */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 lg:justify-end">
              {/* Itens solicitados */}
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#FEF3C7] text-amber-600">
                  <FileText className="h-3 w-3" />
                </div>
                <span className="text-[11px] text-slate-500">Solicitados:</span>
                <span className="text-[13px] font-semibold text-slate-800">
                  {temGuiaSolicitacao ? record.qtdSolicitada : "—"}
                </span>
              </div>

              {/* Itens autorizados */}
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#D1FAE5] text-emerald-600">
                  <FileCheck className="h-3 w-3" />
                </div>
                <span className="text-[11px] text-slate-500">Autorizados:</span>
                <span className="text-[13px] font-semibold text-slate-800">
                  {record.qtdAutorizada}
                </span>
              </div>

              {/* Valor */}
              <div className="flex items-center gap-1.5">
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${temGuiaSolicitacao ? "bg-[#DCFCE7] text-green-600" : "bg-[#FEE2E2] text-red-500"}`}>
                  <DollarSign className="h-3 w-3" />
                </div>
                <span className="text-[11px] text-slate-500">Valor:</span>
                {temGuiaSolicitacao ? (
                  <span className="text-[13px] font-bold text-emerald-600">
                    {formatCurrency(record.valorFaturamento ?? 0)}
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-red-500">
                    (falta guia de solicitação)
                  </span>
                )}
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
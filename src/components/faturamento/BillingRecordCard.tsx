import React from "react";
import { CalendarDays, Hospital, MapPin, Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import BillingStatusTimeline from "./BillingStatusTimeline.tsx";
import type { BillingRecord } from "./billing-types.ts";

interface BillingRecordCardProps {
  record: BillingRecord;
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatCurrencyBr(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

const BillingRecordCard: React.FC<BillingRecordCardProps> = ({ record }) => {
  return (
    <Card className="mb-4 overflow-hidden rounded-[22px] border-[#D5DFEF] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.1)]">
      <CardContent className="p-0">
        {/* Top header row */}
        <div className="flex flex-col gap-4 bg-[#EAF1FF] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Blocos: Médico / Paciente / Data - distribuídos */}
          <div className="flex w-full flex-1 flex-wrap items-center gap-6 sm:gap-10">
            {/* Médico */}
            <div className="flex min-w-[180px] flex-1 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D9E4FF] text-[13px] font-semibold text-[#163E99]">
                {getInitials(record.doctorName)}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Médico
                </span>
                <span className="mt-0.5 text-[13px] font-semibold text-slate-900">
                  {record.doctorName}
                </span>
              </div>
            </div>

            {/* Paciente */}
            <div className="flex min-w-[180px] flex-1 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E4FBF2] text-[13px] font-semibold text-emerald-600">
                {getInitials(record.patientName)}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Paciente
                </span>
                <span className="mt-0.5 text-[13px] font-semibold text-slate-900">
                  {record.patientName}
                </span>
              </div>
            </div>

            {/* Data cirurgia */}
            <div className="flex min-w-[160px] flex-1 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4E9FF] text-fuchsia-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Data cirurgia
                </span>
                <span className="mt-0.5 text-[13px] font-semibold text-slate-900">
                  {record.surgeryDate}
                </span>
              </div>
            </div>
          </div>

          {/* Valor honorário, alinhado à direita */}
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Valor honorário
            </span>
            <span className="mt-1 text-[18px] font-semibold tracking-tight text-[#0B3B8C]">
              {formatCurrencyBr(record.value)}
            </span>
          </div>
        </div>

        {/* Middle info row: Procedimento / Hospital / Local faturamento em 3 colunas */}
        <div className="grid gap-6 border-t border-[#D5DFEF] bg-white px-6 py-5 sm:grid-cols-3">
          {/* Procedimento */}
          <div className="flex items-start gap-3">
            <div className="mt-[2px] text-[#2F4B7C]">
              <Stethoscope className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Procedimento
              </span>
              <span className="mt-1 text-[13px] font-medium text-slate-900">
                {record.procedure}
              </span>
            </div>
          </div>

          {/* Hospital */}
          <div className="flex items-start gap-3">
            <div className="mt-[2px] text-[#2F4B7C]">
              <Hospital className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Hospital
              </span>
              <span className="mt-1 text-[13px] font-medium text-slate-900">
                {record.hospital}
              </span>
            </div>
          </div>

          {/* Local Faturamento */}
          <div className="flex items-start gap-3 sm:justify-end">
            <div className="mt-[2px] text-[#2F4B7C]">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Local faturamento
              </span>
              <span className="mt-1 text-[13px] font-medium text-slate-900">
                {record.billingLocation}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline row (colada na borda inferior, como no modelo) */}
        <div className="border-t border-[#D5DFEF] bg-[#F5F7FC] px-6 pb-5 pt-4">
          <BillingStatusTimeline steps={record.steps} />
        </div>
      </CardContent>
    </Card>
  );
};

export default BillingRecordCard;
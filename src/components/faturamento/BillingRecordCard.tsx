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
    <Card className="mb-4 overflow-hidden rounded-3xl border-slate-200 bg-slate-50/90 shadow-sm">
      <CardContent className="p-0">
        {/* Top header row */}
        <div className="flex flex-col gap-4 bg-sky-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-6">
            {/* Médico */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                {getInitials(record.doctorName)}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Médico
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {record.doctorName}
                </span>
              </div>
            </div>

            {/* Paciente */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                {getInitials(record.patientName)}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Paciente
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {record.patientName}
                </span>
              </div>
            </div>

            {/* Data cirurgia */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-50 text-fuchsia-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Data cirurgia
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {record.surgeryDate}
                </span>
              </div>
            </div>
          </div>

          {/* Valor honorário */}
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Valor honorário
            </span>
            <span className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
              {formatCurrencyBr(record.value)}
            </span>
          </div>
        </div>

        {/* Middle info row */}
        <div className="flex flex-col gap-6 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap gap-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-500">
                <Stethoscope className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Procedimento
                </span>
                <span className="mt-1 text-sm font-medium text-slate-900">
                  {record.procedure}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-500">
                <Hospital className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Hospital
                </span>
                <span className="mt-1 text-sm font-medium text-slate-900">
                  {record.hospital}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-slate-500">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Local faturamento
              </span>
              <span className="mt-1 text-sm font-medium text-slate-900">
                {record.billingLocation}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline row */}
        <div className="px-6 pb-5">
          <BillingStatusTimeline steps={record.steps} />
        </div>
      </CardContent>
    </Card>
  );
};

export default BillingRecordCard;
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { MedicoBillingCardRecord } from "@/components/faturamento/MedicoBillingCard";

function formatDatePtBr(dateIso: string | null): string {
  if (!dateIso) return "-";
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function emailSent(record: MedicoBillingCardRecord) {
  return Boolean(record.steps.find((s) => s.id === "email_faturamento")?.sent);
}

function docsStats(record: MedicoBillingCardRecord) {
  const sent = record.steps.filter((s) => s.sent).length;
  const total = record.steps.length;
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
  return { sent, total, pct };
}

export default function MedicoFaturamentosTable({
  records,
  onSelect,
}: {
  records: MedicoBillingCardRecord[];
  onSelect: (record: MedicoBillingCardRecord) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#D4A017]/15 bg-black/40 backdrop-blur-xl">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="border-[#D4A017]/10 hover:bg-transparent">
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              Paciente
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              Data
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              Hospital
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              Docs
            </TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              E-mail
            </TableHead>
            <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
              Valor
            </TableHead>
            <TableHead className="w-[48px]" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {records.map((r) => {
            const emailOk = emailSent(r);
            const stats = docsStats(r);

            return (
              <TableRow
                key={r.id}
                className={cn(
                  "cursor-pointer border-[#D4A017]/10 hover:bg-white/[0.03]",
                  "focus-within:bg-white/[0.03]",
                )}
                onClick={() => onSelect(r)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect(r);
                }}
              >
                <TableCell className="py-4">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-[#F5F5F5]">
                      {r.pacienteNome}
                    </div>
                    <div className="mt-1 truncate text-[12px] text-[#9CA3AF]">
                      {r.procedimentos.length > 0 ? r.procedimentos.join(", ") : "—"}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="py-4">
                  <div className="text-[12px] text-[#E5E7EB]">
                    {formatDatePtBr(r.dataCirurgia)}
                  </div>
                  <div className="mt-1 text-[12px] text-[#9CA3AF]">
                    {r.horaCirurgia ? r.horaCirurgia.slice(0, 5) : "—"}
                  </div>
                </TableCell>

                <TableCell className="py-4">
                  <div className="truncate text-[12px] text-[#E5E7EB]">
                    {r.hospitalNome?.trim() || "-"}
                  </div>
                </TableCell>

                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-28">
                      <Progress
                        value={stats.pct}
                        className="h-2 bg-white/10 [&>div]:bg-[#D4A017]"
                      />
                    </div>
                    <div className="text-[12px] text-[#E5E7EB]">
                      {stats.sent}/{stats.total}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="py-4">
                  {emailOk ? (
                    <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15">
                      Enviado
                    </Badge>
                  ) : (
                    <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15">
                      Pendente
                    </Badge>
                  )}
                </TableCell>

                <TableCell className="py-4 text-right">
                  <div className="text-[12px] font-semibold text-[#E5E7EB]">
                    {r.valorFaturamento == null ? "-" : formatCurrency(r.valorFaturamento)}
                  </div>
                  {r.qtdSolicitada > 0 ? null : (
                    <div className="mt-1 text-[11px] font-medium text-rose-200">falta guia</div>
                  )}
                </TableCell>

                <TableCell className="py-4 text-right">
                  <ChevronRight className="ml-auto h-4 w-4 text-[#9CA3AF]" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

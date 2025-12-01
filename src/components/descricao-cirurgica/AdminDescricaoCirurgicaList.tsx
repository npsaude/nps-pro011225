import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { DescricaoCirurgicaResumoMedico } from "@/services/descricao-cirurgica-service";

type Props = {
  items: DescricaoCirurgicaResumoMedico[];
  isLoading: boolean;
};

const statusLabel: Record<string, string> = {
  AGUARDANDO: "Aguardando",
  CONFIRMADO: "Confirmado",
  EM_FATURAMENTO: "Em faturamento",
  PAGO: "Pago",
  EM_GLOSA: "Em glosa",
};

const statusBadgeClass: Record<string, string> = {
  AGUARDANDO:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  CONFIRMADO:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  EM_FATURAMENTO:
    "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
  PAGO:
    "bg-emerald-200 text-emerald-900 dark:bg-emerald-500/30 dark:text-emerald-100",
  EM_GLOSA:
    "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
};

const AdminDescricaoCirurgicaList: React.FC<Props> = ({
  items,
  isLoading,
}) => {
  return (
    <Card className="rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold sm:text-base">
              Descrições cirúrgicas cadastradas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Lista das descrições já registradas no sistema.
            </CardDescription>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Total:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {items.length}
              </span>{" "}
              registro(s)
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="max-h-[420px] overflow-auto rounded-2xl border border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/70">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <TableHead className="whitespace-nowrap px-3 py-2">
                  Nome do médico
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2">
                  Nome do paciente
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2">
                  Data fim procedimento
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2">
                  Nº prontuário
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-3 py-5 text-center text-xs text-slate-500 dark:text-slate-300"
                  >
                    Carregando descrições cirúrgicas...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-3 py-5 text-center text-xs text-slate-500 dark:text-slate-300"
                  >
                    Nenhuma descrição cirúrgica encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const statusKey = item.status ?? "AGUARDANDO";
                  const label = statusLabel[statusKey] ?? statusKey;
                  const badgeClass =
                    statusBadgeClass[statusKey] ??
                    "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";

                  return (
                    <TableRow
                      key={item.id}
                      className="border-b border-slate-100 text-xs hover:bg-white dark:border-slate-800 dark:hover:bg-slate-800/70"
                    >
                      <TableCell className="px-3 py-2 font-medium text-slate-800 dark:text-slate-50">
                        {item.nomeMedico || "-"}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {item.nomePaciente || "-"}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {item.dataFimProcedimento || "-"}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {item.prontuario || "-"}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge className={badgeClass}>{label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminDescricaoCirurgicaList;
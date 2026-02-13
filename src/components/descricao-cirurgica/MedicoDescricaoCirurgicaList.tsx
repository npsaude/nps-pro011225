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
    "bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/30",
  EM_FATURAMENTO:
    "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
  PAGO:
    "bg-[#D4A017]/15 text-[#FFD700] border border-[#D4A017]/30",
  EM_GLOSA:
    "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
};

const MedicoDescricaoCirurgicaList: React.FC<Props> = ({
  items,
  isLoading,
}) => {
  return (
    <Card className="h-full rounded-2xl border border-[#D4A017]/20 bg-black/70 backdrop-blur-xl text-[#F5F5F5] shadow-lg">
      <CardHeader className="border-b border-[#D4A017]/15 bg-black/60 pb-3">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold sm:text-base">
              Minhas descrições cirúrgicas
            </CardTitle>
            <CardDescription className="text-[11px] text-[#9CA3AF] sm:text-xs">
              Lista das descrições geradas a partir dos documentos enviados.
            </CardDescription>
            <p className="text-[11px] text-[#9CA3AF]">
              Total:{" "}
              <span className="font-semibold text-[#D4A017]">
                {items.length}
              </span>{" "}
              registro(s)
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-1 overflow-hidden rounded-b-2xl bg-black/50">
        <div className="max-h-[520px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#D4A017]/15 text-[11px] uppercase tracking-[0.12em] text-[#D4A017]/85">
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
                    className="px-3 py-5 text-center text-xs text-[#9CA3AF]"
                  >
                    Carregando descrições cirúrgicas...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-3 py-5 text-center text-xs text-[#9CA3AF]"
                  >
                    Nenhuma descrição cirúrgica encontrada para seu usuário.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const statusKey = item.status ?? "AGUARDANDO";
                  const label = statusLabel[statusKey] ?? statusKey;
                  const badgeClass =
                    statusBadgeClass[statusKey] ??
                    "bg-black/40 text-[#F5F5F5] border border-[#D4A017]/15";

                  return (
                    <TableRow
                      key={item.id}
                      className="border-b border-[#D4A017]/10 text-xs text-[#F5F5F5] hover:bg-[#D4A017]/5"
                    >
                      <TableCell className="px-3 py-2 font-medium">
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

export default MedicoDescricaoCirurgicaList;
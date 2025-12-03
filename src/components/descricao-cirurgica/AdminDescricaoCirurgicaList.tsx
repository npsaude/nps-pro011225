import React from "react";
import { Eye, Pencil, Trash2, Plus, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  onNovaDescricao: () => void;
  onVisualizar: (item: DescricaoCirurgicaResumoMedico) => void;
  onEditar: (item: DescricaoCirurgicaResumoMedico) => void;
  onExcluir: (item: DescricaoCirurgicaResumoMedico) => void;
  onVerArquivos: (item: DescricaoCirurgicaResumoMedico) => void;
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
  onNovaDescricao,
  onVisualizar,
  onEditar,
  onExcluir,
  onVerArquivos,
}) => {
  return (
    <Card className="rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
          <Button
            type="button"
            size="sm"
            className="inline-flex items-center gap-2 rounded-full bg-[#135bec] px-3 text-xs font-medium text-white shadow-sm hover:bg-[#0f4ac0]"
            onClick={onNovaDescricao}
          >
            <Plus className="h-4 w-4" />
            Nova descrição
          </Button>
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
                <TableHead className="whitespace-nowrap px-3 py-2 text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-3 py-5 text-center text-xs text-slate-500 dark:text-slate-300"
                  >
                    Carregando descrições cirúrgicas...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
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
                      <TableCell className="px-3 py-2">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            onClick={() => onVisualizar(item)}
                            aria-label="Visualizar descrição cirúrgica"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            onClick={() => onEditar(item)}
                            aria-label="Editar descrição cirúrgica"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            onClick={() => onVerArquivos(item)}
                            aria-label="Visualizar arquivos anexados"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                            onClick={() => onExcluir(item)}
                            aria-label="Excluir descrição cirúrgica"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
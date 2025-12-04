import React from "react";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  Paperclip,
  LineChart,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

type StepStatus = "done" | "current" | "pending";

interface FaturamentoStep {
  id: number;
  label: string;
  helper?: string;
  status: StepStatus;
}

function getInitials(nome: string | null | undefined): string {
  if (!nome) return "";
  const parts = nome.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

function getFaturamentoSteps(
  item: DescricaoCirurgicaResumoMedico | null,
): FaturamentoStep[] {
  if (!item) return [];
  const status = item.status ?? "AGUARDANDO";

  // Define em qual etapa o caso está, baseado no status geral.
  const statusStageMap: Record<string, number> = {
    AGUARDANDO: 1,
    CONFIRMADO: 2,
    EM_FATURAMENTO: 2,
    PAGO: 3,
    EM_GLOSA: 4,
  };

  const currentStage = statusStageMap[status] ?? 1;

  const baseDate = item.dataFimProcedimento || "";

  const rawSteps: Omit<FaturamentoStep, "status">[] = [
    {
      id: 1,
      label: "Cirurgia realizada",
      helper: baseDate || "—",
    },
    {
      id: 2,
      label: "Faturado",
      helper: currentStage > 1 ? baseDate || "—" : "Aguardando",
    },
    {
      id: 3,
      label: "Recebimento",
      helper: currentStage >= 3 ? "Em análise" : "Aguardando",
    },
    {
      id: 4,
      label: "Glosa",
      helper: status === "EM_GLOSA" ? "Em verificação" : "—",
    },
    {
      id: 5,
      label: "Defesa de glosa",
      helper: "Aguardando",
    },
    {
      id: 6,
      label: "Recebimento da glosa",
      helper: "n.c.",
    },
  ];

  return rawSteps.map((step) => {
    let stepStatus: StepStatus = "pending";
    if (step.id < currentStage) stepStatus = "done";
    else if (step.id === currentStage) stepStatus = "current";

    return {
      ...step,
      status: stepStatus,
    };
  });
}

const AdminDescricaoCirurgicaList: React.FC<Props> = ({
  items,
  isLoading,
  onNovaDescricao,
  onVisualizar,
  onEditar,
  onExcluir,
  onVerArquivos,
}) => {
  const [faturamentoOpen, setFaturamentoOpen] =
    React.useState<boolean>(false);
  const [selectedItem, setSelectedItem] =
    React.useState<DescricaoCirurgicaResumoMedico | null>(null);

  const steps = React.useMemo(
    () => getFaturamentoSteps(selectedItem),
    [selectedItem],
  );

  return (
    <>
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
                  <TableHead className="w-10 px-3 py-2" />
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
                      colSpan={7}
                      className="px-3 py-5 text-center text-xs text-slate-500 dark:text-slate-300"
                    >
                      Carregando descrições cirúrgicas...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
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
                        <TableCell className="px-3 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-sky-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-sky-300"
                            onClick={() => {
                              setSelectedItem(item);
                              setFaturamentoOpen(true);
                            }}
                            aria-label="Ver progresso de faturamento"
                          >
                            <LineChart className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
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

      <Dialog
        open={faturamentoOpen}
        onOpenChange={(open) => {
          setFaturamentoOpen(open);
          if (!open) setSelectedItem(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Progresso de faturamento</DialogTitle>
            <DialogDescription>
              Acompanhe as etapas do faturamento desta descrição cirúrgica.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-5 text-sm">
              {/* Cabeçalho com informações principais */}
              <div className="rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-100 dark:bg-slate-900/70 dark:ring-slate-800">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200">
                      {getInitials(selectedItem.nomeMedico)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Médico
                      </span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-50">
                        {selectedItem.nomeMedico || "Não informado"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
                      {getInitials(selectedItem.nomePaciente)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Paciente
                      </span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-50">
                        {selectedItem.nomePaciente || "Não informado"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-200">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Data cirurgia
                      </span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-50">
                        {selectedItem.dataFimProcedimento || "Não informado"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Valor honorário
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                        {/* Placeholder de valor até termos o campo real */}
                        R$ 12.500,00
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline de faturamento */}
              <div className="space-y-3 rounded-2xl bg-white/90 p-4 ring-1 ring-slate-100 dark:bg-slate-900/80 dark:ring-slate-800">
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <span>Fluxo de faturamento</span>
                  <span>
                    Status atual:{" "}
                    <span className="text-slate-700 dark:text-slate-200">
                      {statusLabel[selectedItem.status ?? "AGUARDANDO"] ??
                        selectedItem.status ??
                        "Aguardando"}
                    </span>
                  </span>
                </div>

                <div className="mt-2 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    {steps.map((step, index) => {
                      const isLast = index === steps.length - 1;

                      const circleBase =
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-semibold";
                      const circleClass =
                        step.status === "done"
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : step.status === "current"
                            ? "border-sky-500 bg-white text-sky-600 shadow-md shadow-sky-500/30 dark:bg-slate-900"
                            : "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500";

                      const lineBase = "h-0.5 flex-1";
                      const lineClass =
                        step.status === "done" || step.status === "current"
                          ? "bg-emerald-500/80"
                          : "bg-slate-200 dark:bg-slate-700";

                      return (
                        <React.Fragment key={step.id}>
                          <div className="flex flex-col items-center gap-1">
                            <div className={`${circleBase} ${circleClass}`}>
                              <span className="sr-only">{step.label}</span>
                              {step.status === "done" ? "✓" : index + 1}
                            </div>
                            <p className="whitespace-nowrap text-[11px] font-medium text-slate-600 dark:text-slate-200">
                              {step.label}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              {step.helper}
                            </p>
                          </div>
                          {!isLast && (
                            <div className={lineBase + " " + lineClass} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                As etapas exibidas são ilustrativas e representam o fluxo
                padrão de faturamento: desde a realização da cirurgia até o
                recebimento final, incluindo possíveis glosas e defesas.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminDescricaoCirurgicaList;
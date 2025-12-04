import React from "react";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  Paperclip,
  LineChart,
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
import type {
  DbDescricaoCirurgicaStatus,
} from "@/db/schema";
import type { DescricaoCirurgicaResumoMedico } from "@/services/descricao-cirurgica-service";

type Props = {
  items: DescricaoCirurgicaResumoMedico[];
  isLoading: boolean;
  onNovaDescricao: () => void;
  onVisualizar: (item: DescricaoCirurgicaResumoMedico) => void;
  onEditar: (item: DescricaoCirurgicaResumoMedico) => void;
  onExcluir: (item: DescricaoCirurgicaResumoMedico) => void;
  onVerArquivos: (item: DescricaoCirurgicaResumoMedico) => void;
  onAtualizarStatus: (id: string, novoStatus: DbDescricaoCirurgicaStatus) => void;
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

// --- Kanban helpers ---

type FaturamentoStageId = 1 | 2 | 3 | 4 | 5 | 6;

interface KanbanItem extends DescricaoCirurgicaResumoMedico {
  stage: FaturamentoStageId;
}

const KANBAN_STAGES: {
  id: FaturamentoStageId;
  label: string;
  helper: string;
}[] = [
  { id: 1, label: "Cirurgia realizada", helper: "—" },
  { id: 2, label: "Faturado", helper: "Aguardando" },
  { id: 3, label: "Recebimento", helper: "Aguardando" },
  { id: 4, label: "Glosa", helper: "—" },
  { id: 5, label: "Defesa de glosa", helper: "Aguardando" },
  { id: 6, label: "Recebimento da glosa", helper: "n.c." },
];

// Classes de cor por coluna do Kanban
const KANBAN_CARD_COLORS: Record<FaturamentoStageId, string> = {
  1: "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-100/80 dark:border-sky-800 dark:from-slate-950 dark:via-slate-950 dark:to-sky-950/40",
  2: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/80 dark:border-emerald-800 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/40",
  3: "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-100/80 dark:border-indigo-800 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/40",
  4: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-100/80 dark:border-rose-800 dark:from-slate-950 dark:via-slate-950 dark:to-rose-950/40",
  5: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100/80 dark:border-amber-800 dark:from-slate-950 dark:via-slate-950 dark:to-amber-950/40",
  6: "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-200/80 dark:border-emerald-900 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/60",
};

function statusToStage(status: DbDescricaoCirurgicaStatus | null): FaturamentoStageId {
  switch (status) {
    case "CONFIRMADO":
    case "EM_FATURAMENTO":
      return 2;
    case "PAGO":
      return 3;
    case "EM_GLOSA":
      return 4;
    case "AGUARDANDO":
    default:
      return 1;
  }
}

function stageToStatus(stage: FaturamentoStageId): DbDescricaoCirurgicaStatus {
  switch (stage) {
    case 1:
      return "AGUARDANDO";
    case 2:
      return "EM_FATURAMENTO";
    case 3:
      return "PAGO";
    case 4:
    case 5:
      return "EM_GLOSA";
    case 6:
      return "PAGO";
    default:
      return "AGUARDANDO";
  }
}

const AdminDescricaoCirurgicaList: React.FC<Props> = ({
  items,
  isLoading,
  onNovaDescricao,
  onVisualizar,
  onEditar,
  onExcluir,
  onVerArquivos,
  onAtualizarStatus,
}) => {
  const [faturamentoOpen, setFaturamentoOpen] =
    React.useState<boolean>(false);
  const [selectedItem, setSelectedItem] =
    React.useState<DescricaoCirurgicaResumoMedico | null>(null);

  const [viewMode, setViewMode] = React.useState<"table" | "kanban">("table");
  const [kanbanItems, setKanbanItems] = React.useState<KanbanItem[]>([]);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const mapped: KanbanItem[] = items.map((item) => ({
      ...item,
      stage: statusToStage(item.status ?? "AGUARDANDO"),
    }));
    setKanbanItems(mapped);
  }, [items]);

  const steps = React.useMemo(
    () => getFaturamentoSteps(selectedItem),
    [selectedItem],
  );

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDropOnStage = (stageId: FaturamentoStageId) => {
    if (!draggingId) return;

    setKanbanItems((prev) =>
      prev.map((item) =>
        item.id === draggingId ? { ...item, stage: stageId } : item,
      ),
    );

    const novoStatus = stageToStatus(stageId);
    onAtualizarStatus(draggingId, novoStatus);
    setDraggingId(null);
  };

  const renderTabela = () => (
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
                      className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-sm ring-2 ring-sky-100/70 transition-transform hover:translate-y-0.5 hover:shadow-md hover:from-sky-600 hover:to-emerald-600 dark:ring-sky-500/40"
                      onClick={() => {
                        setSelectedItem(item);
                        setFaturamentoOpen(true);
                      }}
                      aria-label="Ver progresso de faturamento"
                    >
                      <LineChart className="h-4 w-4" />
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
  );

  const renderKanban = () => (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {KANBAN_STAGES.map((stage) => {
        const itemsCol = kanbanItems.filter((it) => it.stage === stage.id);

        return (
          <div
            key={stage.id}
            className="flex min-w-[230px] max-w-xs flex-1 flex-col rounded-2xl bg-slate-50/80 p-3 ring-1 ring-slate-100 dark:bg-slate-900/70 dark:ring-slate-800"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleDropOnStage(stage.id);
            }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-sky-300 bg-white text-[11px] font-semibold text-sky-600 shadow-sm dark:border-sky-700 dark:bg-slate-900 dark:text-sky-300">
                  {stage.id}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {stage.label}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {stage.helper}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                {itemsCol.length}
              </span>
            </div>

            <div className="mt-1 flex flex-1 flex-col gap-2">
              {isLoading ? (
                <p className="rounded-xl bg-slate-100/80 px-2 py-3 text-[11px] text-slate-400 dark:bg-slate-800/60 dark:text-slate-500">
                  Carregando...
                </p>
              ) : itemsCol.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-2 py-6 text-center text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  Arraste descrições para este estágio.
                </p>
              ) : (
                itemsCol.map((item) => {
                  const statusKey = item.status ?? "AGUARDANDO";
                  const label = statusLabel[statusKey] ?? statusKey;
                  const badgeClass =
                    statusBadgeClass[statusKey] ??
                    "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      className={`group cursor-grab rounded-xl border p-3 text-[11px] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        KANBAN_CARD_COLORS[stage.id]
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-50">
                            {item.nomePaciente || "Paciente não informado"}
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300">
                            Dr(a). {item.nomeMedico || "—"}
                          </span>
                        </div>
                      </div>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-300">
                          Prontuário:{" "}
                          <span className="font-medium text-slate-700 dark:text-slate-100">
                            {item.prontuario || "—"}
                          </span>
                        </span>
                        <Badge className={`px-2 py-0.5 text-[10px] ${badgeClass}`}>
                          {label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          Cirurgia: {item.dataFimProcedimento || "Sem data"}
                        </span>
                        <div className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                            onClick={() => onVisualizar(item)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                            onClick={() => onEditar(item)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <Card className="rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-semibold sm:text-base">
                Descrições cirúrgicas cadastradas
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Visualize em lista ou organize o faturamento em Kanban.
              </CardDescription>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Total:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {items.length}
                </span>{" "}
                registro(s)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-[11px] ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    viewMode === "table"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
                  }`}
                  onClick={() => setViewMode("table")}
                >
                  Lista
                </button>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    viewMode === "kanban"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
                  }`}
                  onClick={() => setViewMode("kanban")}
                >
                  Kanban
                </button>
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
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {viewMode === "table" ? renderTabela() : renderKanban()}
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
              <div className="rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-100 dark:bg-slate-900/70 dark:ring-slate-800">
                <div className="grid gap-4 md:grid-cols-3">
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
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      Nº
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Prontuário
                      </span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-50">
                        {selectedItem.prontuario || "Não informado"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

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
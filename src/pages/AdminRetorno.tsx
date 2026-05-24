import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Trash2,
  Upload,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useSystemUser } from "@/hooks/use-system-user";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import {
  ItemRelatorioComCabecalho,
  listarTodosItensRetorno,
  excluirItemRelatorioRetorno,
  importarRelatorioRetorno,
  formatBRL,
  formatDateBR,
} from "@/services/relatorios-retorno-service";

const PAGE_SIZE = 20;

const AdminRetorno: React.FC = () => {
  const { systemUser, loading: userLoading } = useSystemUser();

  const [itens, setItens] = useState<ItemRelatorioComCabecalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<ItemRelatorioComCabecalho | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listarTodosItensRetorno();
      setItens(rows);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar itens.";
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return itens;
    return itens.filter((it) =>
      [
        it.paciente_nome,
        it.convenio,
        it.codigo_procedimento,
        it.descricao_procedimento,
        it.funcao_profissional,
        it.numero_guia,
        it.relatorio_origem,
        it.relatorio_clinica_hospital,
        it.relatorio_medico_nome,
        it.relatorio_competencia,
      ]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [itens, search]);

  // Totais do que está filtrado
  const totais = useMemo(() => {
    return filtered.reduce(
      (acc, it) => {
        acc.base += it.valor_base ?? it.valor_apresentado ?? 0;
        acc.glosa += it.valor_glosa ?? 0;
        acc.liquido += it.valor_liquido ?? 0;
        return acc;
      },
      { base: 0, glosa: 0, liquido: 0 },
    );
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setImportFile(null);
      return;
    }
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      showError("Envie um arquivo PDF.");
      e.target.value = "";
      return;
    }
    setImportFile(f);
  };

  const handleImport = async () => {
    if (!importFile) {
      showError("Selecione um arquivo PDF.");
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData.user;
    if (!authUser) {
      showError("Sessão expirada. Faça login novamente.");
      return;
    }

    setImporting(true);
    try {
      const res = await importarRelatorioRetorno({
        file: importFile,
        userId: authUser.id,
        expectedMedicoNome: (systemUser as any)?.nome ?? "",
        expectedMedicoEmail: authUser.email ?? "",
      });

      if (!res.success) {
        const detalhe =
          res.medico_relatorio && res.medico_esperado
            ? ` (Médico no relatório: "${res.medico_relatorio}" / Esperado: "${res.medico_esperado}")`
            : "";
        showError((res.error ?? "Falha ao importar.") + detalhe);
        return;
      }

      showSuccess(
        `Relatório importado com sucesso. ${res.total_itens ?? 0} itens adicionados.`,
      );
      setImportOpen(false);
      setImportFile(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao importar.";
      showError(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await excluirItemRelatorioRetorno(deleteTarget.id);
      showSuccess("Item excluído.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir.";
      showError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="relatorio-repasse" />

        <div className="flex flex-1 flex-col gap-5 rounded-3xl bg-transparent lg:py-1">
          {/* Header */}
          <header className="mb-1 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <FileText className="h-4 w-4" />
                </span>
                Relatório de Repasse
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Cada linha representa um procedimento extraído pela IA. Importe
                novos PDFs para adicionar mais itens à lista.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200/80 focus-within:ring-amber-500 sm:flex">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-7 w-40 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none sm:w-52 sm:text-sm"
                />
              </div>
              <AdminHeaderActions notificationsCount={0} />
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-500">
                      Itens do Relatório de Repasse
                    </h2>
                    <p className="text-xs text-slate-400">
                      Total:{" "}
                      <span className="font-medium text-amber-600">
                        {filtered.length} item(ns)
                      </span>
                    </p>
                  </div>

                  <div className="hidden gap-3 sm:flex">
                    <TotalChip label="Base" value={formatBRL(totais.base)} color="slate" />
                    <TotalChip label="Glosa" value={formatBRL(totais.glosa)} color="rose" />
                    <TotalChip
                      label="Líquido"
                      value={formatBRL(totais.liquido)}
                      color="emerald"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => setImportOpen(true)}
                  className="gap-2 rounded-full bg-amber-600 px-5 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  <Upload className="h-4 w-4" />
                  Importar Relatório de Repasse
                </Button>
              </div>

              {/* Tabela */}
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 hover:bg-slate-50">
                      <TableHead className="py-3 pl-4">Origem</TableHead>
                      <TableHead>Competência</TableHead>
                      <TableHead>Atendimento</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Convênio</TableHead>
                      <TableHead>Procedimento</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Glosa</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading || userLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={11}
                          className="py-10 text-center text-sm text-slate-400"
                        >
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : paginated.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={11}
                          className="py-10 text-center text-sm text-slate-400"
                        >
                          Nenhum item importado. Clique em "Importar Relatório
                          de Repasse" para começar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((it) => (
                        <TableRow
                          key={it.id}
                          className="border-b border-slate-50 text-sm hover:bg-slate-50/60"
                        >
                          <TableCell className="pl-4">
                            {it.relatorio_origem ? (
                              <Badge
                                variant="outline"
                                className="border-amber-200 bg-amber-50 text-[10px] font-semibold text-amber-700"
                              >
                                {it.relatorio_origem}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {it.relatorio_competencia || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {formatDateBR(it.data_atendimento)}
                          </TableCell>
                          <TableCell className="font-medium text-slate-800 max-w-[200px] truncate">
                            {it.paciente_nome || "—"}
                          </TableCell>
                          <TableCell className="text-slate-600 max-w-[140px] truncate">
                            {it.convenio || "—"}
                          </TableCell>
                          <TableCell className="max-w-[260px] text-slate-700">
                            <div className="flex flex-col">
                              <span className="font-mono text-[10px] text-slate-400">
                                {it.codigo_procedimento || ""}
                              </span>
                              <span className="truncate">
                                {it.descricao_procedimento || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {it.funcao_profissional || "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs text-slate-600">
                            {formatBRL(it.valor_base ?? it.valor_apresentado)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-rose-500">
                            {formatBRL(it.valor_glosa)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-emerald-600">
                            {formatBRL(it.valor_liquido)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                title="Excluir item"
                                onClick={() => setDeleteTarget(it)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Página {page} de {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de importação */}
      <Dialog
        open={importOpen}
        onOpenChange={(o) => {
          if (!importing) {
            setImportOpen(o);
            if (!o) setImportFile(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Relatório de Repasse</DialogTitle>
            <DialogDescription>
              Envie o PDF do extrato de pagamento. A IA vai identificar o formato
              da clínica e extrair médico, paciente, procedimentos, valores e
              glosas. A importação só é concluída se o médico identificado for{" "}
              <strong>{(systemUser as any)?.nome || "o usuário logado"}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label
              htmlFor="retorno-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40 px-4 py-6 text-center text-sm text-slate-600 transition hover:border-amber-500 hover:bg-amber-50"
            >
              <Upload className="h-6 w-6 text-amber-500" />
              {importFile ? (
                <span className="text-slate-800 font-medium break-all">
                  {importFile.name}
                </span>
              ) : (
                <span>Clique para selecionar um PDF</span>
              )}
              <span className="text-xs text-slate-400">
                Somente arquivos .pdf
              </span>
              <Input
                id="retorno-file"
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileChange}
                disabled={importing}
              />
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportOpen(false)}
              disabled={importing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !importFile}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de exclusão */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Deseja realmente excluir este item do relatório de repasse?
              <br />
              <strong>
                {deleteTarget?.paciente_nome ||
                  deleteTarget?.descricao_procedimento ||
                  deleteTarget?.id}
              </strong>
              <br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function TotalChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "slate" | "rose" | "emerald";
}) {
  const colorMap: Record<typeof color, string> = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    rose: "bg-rose-50 text-rose-600 ring-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  return (
    <div
      className={`flex flex-col items-start rounded-xl px-3 py-1.5 ring-1 ${colorMap[color]}`}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
        {label}
      </span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}

export default AdminRetorno;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Eye,
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
  RelatorioRetorno,
  ItemRelatorioRetorno,
  listarRelatoriosRetorno,
  listarItensDoRelatorio,
  excluirRelatorioRetorno,
  importarRelatorioRetorno,
  formatBRL,
  formatDateBR,
} from "@/services/relatorios-retorno-service";

const PAGE_SIZE = 10;

const AdminRetorno: React.FC = () => {
  const { systemUser, loading: userLoading } = useSystemUser();

  const [relatorios, setRelatorios] = useState<RelatorioRetorno[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const [viewTarget, setViewTarget] = useState<RelatorioRetorno | null>(null);
  const [viewItens, setViewItens] = useState<ItemRelatorioRetorno[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RelatorioRetorno | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listarRelatoriosRetorno();
      setRelatorios(rows);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar relatórios.";
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
    if (!q) return relatorios;
    return relatorios.filter((r) =>
      [
        r.origem,
        r.clinica_hospital,
        r.medico_nome,
        r.competencia,
        r.arquivo_nome,
      ]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [relatorios, search]);

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
        `Relatório importado com sucesso. ${res.total_itens ?? 0} itens lidos.`,
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

  const openView = async (r: RelatorioRetorno) => {
    setViewTarget(r);
    setLoadingItens(true);
    try {
      const itens = await listarItensDoRelatorio(r.id);
      setViewItens(itens);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar itens.";
      showError(msg);
      setViewItens([]);
    } finally {
      setLoadingItens(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await excluirRelatorioRetorno(deleteTarget.id);
      showSuccess("Relatório excluído.");
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
                Importe relatórios de repasse (extratos de pagamento) em PDF. A
                IA extrai os procedimentos, valores e glosas.
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
                <div>
                  <h2 className="text-sm font-semibold text-slate-500">
                    Relatórios importados
                  </h2>
                  <p className="text-xs text-slate-400">
                    Total:{" "}
                    <span className="font-medium text-amber-600">
                      {filtered.length} relatório(s)
                    </span>
                  </p>
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
                      <TableHead className="py-3 pl-4">Arquivo</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Clínica / Hospital</TableHead>
                      <TableHead>Médico</TableHead>
                      <TableHead>Competência</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading || userLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-10 text-center text-sm text-slate-400"
                        >
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : paginated.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-10 text-center text-sm text-slate-400"
                        >
                          Nenhum relatório de repasse importado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((r) => (
                        <TableRow
                          key={r.id}
                          className="border-b border-slate-50 text-sm hover:bg-slate-50/60"
                        >
                          <TableCell className="pl-4 max-w-[220px] truncate text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-amber-500" />
                              {r.arquivo_nome || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {r.origem ? (
                              <Badge
                                variant="outline"
                                className="border-amber-200 bg-amber-50 text-[10px] font-semibold text-amber-700"
                              >
                                {r.origem}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {r.clinica_hospital || "—"}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {r.medico_nome || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {r.competencia || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {formatDateBR(r.data_pagamento)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-emerald-600">
                            {formatBRL(r.total_liquido)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                title="Visualizar"
                                onClick={() => openView(r)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                title="Excluir"
                                onClick={() => setDeleteTarget(r)}
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

      {/* Modal de visualização */}
      <Dialog
        open={!!viewTarget}
        onOpenChange={(o) => {
          if (!o) {
            setViewTarget(null);
            setViewItens([]);
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Relatório de Repasse</DialogTitle>
            <DialogDescription>
              Dados extraídos pela IA a partir do PDF importado.
            </DialogDescription>
          </DialogHeader>

          {viewTarget && (
            <div className="space-y-4">
              {/* Cabeçalho */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm sm:grid-cols-2 md:grid-cols-3">
                <InfoCell label="Origem" value={viewTarget.origem} />
                <InfoCell
                  label="Clínica / Hospital"
                  value={viewTarget.clinica_hospital}
                />
                <InfoCell label="Médico" value={viewTarget.medico_nome} />
                <InfoCell label="CRM" value={viewTarget.medico_crm} />
                <InfoCell
                  label="Especialidade"
                  value={viewTarget.medico_especialidade}
                />
                <InfoCell label="Função" value={viewTarget.medico_funcao} />
                <InfoCell
                  label="Competência"
                  value={viewTarget.competencia}
                />
                <InfoCell
                  label="Data pagamento"
                  value={formatDateBR(viewTarget.data_pagamento)}
                />
                <InfoCell
                  label="Período"
                  value={
                    viewTarget.periodo_inicio || viewTarget.periodo_fim
                      ? `${formatDateBR(viewTarget.periodo_inicio)} → ${formatDateBR(
                          viewTarget.periodo_fim,
                        )}`
                      : null
                  }
                />
                <InfoCell
                  label="Total bruto"
                  value={formatBRL(viewTarget.total_bruto)}
                />
                <InfoCell
                  label="Total glosa"
                  value={formatBRL(viewTarget.total_glosa)}
                />
                <InfoCell
                  label="Total líquido"
                  value={formatBRL(viewTarget.total_liquido)}
                  highlight
                />
              </div>

              {/* Itens */}
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-600">
                  Itens ({viewItens.length})
                </p>
                <div className="max-h-[55vh] overflow-auto rounded-xl border border-slate-100">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 hover:bg-slate-50">
                        <TableHead className="py-2 pl-4">#</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Atendimento</TableHead>
                        <TableHead>Convênio</TableHead>
                        <TableHead>Procedimento</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">Glosa</TableHead>
                        <TableHead className="text-right">Líquido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingItens ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="py-6 text-center text-xs text-slate-400"
                          >
                            Carregando itens...
                          </TableCell>
                        </TableRow>
                      ) : viewItens.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="py-6 text-center text-xs text-slate-400"
                          >
                            Nenhum item registrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        viewItens.map((it) => (
                          <TableRow
                            key={it.id}
                            className="border-b border-slate-50 text-xs hover:bg-slate-50/60"
                          >
                            <TableCell className="pl-4 text-slate-400">
                              {it.ordem ?? "—"}
                            </TableCell>
                            <TableCell className="font-medium text-slate-800">
                              {it.paciente_nome || "—"}
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {formatDateBR(it.data_atendimento)}
                            </TableCell>
                            <TableCell className="text-slate-500">
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
                            <TableCell className="text-slate-500">
                              {it.funcao_profissional || "—"}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              {formatBRL(it.valor_base ?? it.valor_apresentado)}
                            </TableCell>
                            <TableCell className="text-right text-rose-500">
                              {formatBRL(it.valor_glosa)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-emerald-600">
                              {formatBRL(it.valor_liquido)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewTarget(null);
                setViewItens([]);
              }}
            >
              Fechar
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
              Deseja realmente excluir este relatório de repasse?
              <br />
              <strong>{deleteTarget?.arquivo_nome || deleteTarget?.id}</strong>
              <br />
              Esta ação não pode ser desfeita e os itens vinculados também serão
              removidos.
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

function InfoCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span
        className={`text-sm ${
          highlight ? "font-semibold text-emerald-600" : "text-slate-800"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

export default AdminRetorno;

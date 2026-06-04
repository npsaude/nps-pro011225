import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

type GuiaRow = {
  id: string;
  numero_guia_prestador: string | null;
  numero_guia_solicitacao: string | null;
  nome_beneficiario: string | null;
  contratado_nome: string | null;
  data_inicio_faturamento: string | null;
  data_fim_faturamento: string | null;
  valor_total_faturamento: number | null;
  created_at: string;
};

const PAGE_SIZE = 10;

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatCurrency(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const GuiaSolicitacaoPage: React.FC = () => {
  const navigate = useNavigate();
  const [guias, setGuias] = useState<GuiaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<GuiaRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewTarget, setViewTarget] = useState<GuiaRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("guia_solicitacao")
      .select(
        "id, numero_guia_prestador, numero_guia_solicitacao, nome_beneficiario, contratado_nome, data_inicio_faturamento, data_fim_faturamento, valor_total_faturamento, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      showError("Não foi possível carregar as guias de solicitação.");
    } else {
      setGuias((data as GuiaRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = guias.filter((g) => {
    const q = search.toLowerCase();
    return (
      (g.nome_beneficiario ?? "").toLowerCase().includes(q) ||
      (g.numero_guia_prestador ?? "").toLowerCase().includes(q) ||
      (g.numero_guia_solicitacao ?? "").toLowerCase().includes(q) ||
      (g.contratado_nome ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("guia_solicitacao")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) {
      showError("Não foi possível excluir a guia.");
    } else {
      showSuccess("Guia excluída com sucesso.");
      void load();
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="guia-solicitacao" />

        <div className="flex flex-1 flex-col gap-5 rounded-3xl bg-transparent lg:py-1">
          {/* Header */}
          <header className="mb-1 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <FileText className="h-4 w-4" />
                </span>
                Guia de Solicitação
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Gerencie as guias de solicitação de procedimentos.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200/80 focus-within:ring-blue-500 sm:flex">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar guia..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="h-7 w-40 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none sm:w-52 sm:text-sm"
                />
              </div>
              <AdminHeaderActions notificationsCount={0} />
            </div>
          </header>

          {/* Conteúdo (retângulo) */}
          <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl">
            {/* Card principal */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-500">
                    Guias de solicitação cadastradas
                  </h2>
                  <p className="text-xs text-slate-400">
                    Total:{" "}
                    <span className="font-medium text-blue-600">
                      {filtered.length} registro(s)
                    </span>
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/admin/guia-solicitacao/nova")}
                  className="gap-2 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Nova Guia
                </Button>
              </div>

              {/* Busca mobile */}
              <div className="mb-3 flex items-center rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200/80 sm:hidden">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar guia..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="h-7 w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {/* Tabela */}
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 hover:bg-slate-50">
                      <TableHead className="py-3 pl-4">Nº Guia Prestador</TableHead>
                      <TableHead>Nº Guia Solicitação</TableHead>
                      <TableHead>Beneficiário</TableHead>
                      <TableHead>Contratado</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-400">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-400">
                          Nenhuma guia de solicitação encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((g) => (
                        <TableRow
                          key={g.id}
                          className="border-b border-slate-50 text-sm hover:bg-slate-50/60"
                        >
                          <TableCell className="pl-4 font-medium text-slate-800">
                            {g.numero_guia_prestador || "—"}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {g.numero_guia_solicitacao || "—"}
                          </TableCell>
                          <TableCell className="text-slate-800">
                            {g.nome_beneficiario || "—"}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {g.contratado_nome || "—"}
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs">
                            {g.data_inicio_faturamento || g.data_fim_faturamento
                              ? `${formatDate(g.data_inicio_faturamento)} – ${formatDate(g.data_fim_faturamento)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-800">
                            {formatCurrency(g.valor_total_faturamento)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                title="Visualizar"
                                onClick={() => setViewTarget(g)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                title="Editar"
                                onClick={() => navigate(`/admin/guia-solicitacao/editar/${g.id}`)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                title="Excluir"
                                onClick={() => setDeleteTarget(g)}
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
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
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

      {/* Modal Visualizar */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Guia</DialogTitle>
            <DialogDescription>
              Informações completas da guia de solicitação selecionada.
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="grid gap-3 text-sm">
              <Row label="Nº Guia Prestador" value={viewTarget.numero_guia_prestador} />
              <Row label="Nº Guia Solicitação" value={viewTarget.numero_guia_solicitacao} />
              <Row label="Beneficiário" value={viewTarget.nome_beneficiario} />
              <Row label="Contratado" value={viewTarget.contratado_nome} />
              <Row label="Início Faturamento" value={formatDate(viewTarget.data_inicio_faturamento)} />
              <Row label="Fim Faturamento" value={formatDate(viewTarget.data_fim_faturamento)} />
              <Row label="Valor Total" value={formatCurrency(viewTarget.valor_total_faturamento)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              Fechar
            </Button>
            {viewTarget && (
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  navigate(`/admin/guia-solicitacao/editar/${viewTarget.id}`);
                  setViewTarget(null);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Deseja realmente excluir a guia{" "}
              <strong>{deleteTarget?.numero_guia_prestador || deleteTarget?.id}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
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

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}

export default GuiaSolicitacaoPage;
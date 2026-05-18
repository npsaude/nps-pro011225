import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Activity,
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

type SadtRow = {
  id: string;
  numero_guia_prestador: string | null;
  numero_guia_sadt: string | null;
  nome_beneficiario: string | null;
  solicitante_nome: string | null;
  executante_nome: string | null;
  data_autorizacao: string | null;
  data_validade_senha: string | null;
  valor_total_geral: number | null;
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

const SadtAcompanhamentoPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SadtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<SadtRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewTarget, setViewTarget] = useState<SadtRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sadt_acompanhamento")
      .select(
        "id, numero_guia_prestador, numero_guia_sadt, nome_beneficiario, solicitante_nome, executante_nome, data_autorizacao, data_validade_senha, valor_total_geral, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      showError("Não foi possível carregar as SADTs.");
    } else {
      setRows((data as SadtRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((g) => {
    const q = search.toLowerCase();
    return (
      (g.nome_beneficiario ?? "").toLowerCase().includes(q) ||
      (g.numero_guia_prestador ?? "").toLowerCase().includes(q) ||
      (g.numero_guia_sadt ?? "").toLowerCase().includes(q) ||
      (g.solicitante_nome ?? "").toLowerCase().includes(q) ||
      (g.executante_nome ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("sadt_acompanhamento")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) {
      showError("Não foi possível excluir a SADT.");
    } else {
      showSuccess("SADT excluída com sucesso.");
      void load();
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="sadt-acompanhamento" />

        <div className="flex flex-1 flex-col gap-5 rounded-3xl bg-transparent lg:py-1">
          {/* Header */}
          <header className="mb-1 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <Activity className="h-4 w-4" />
                </span>
                Acompanhamento de SADT
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Gerencie as guias SADT processadas.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200/80 focus-within:ring-teal-500 sm:flex">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar SADT..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="h-7 w-40 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none sm:w-52 sm:text-sm"
                />
              </div>
              <AdminHeaderActions notificationsCount={0} />
            </div>
          </header>

          {/* Conteúdo */}
          <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-500">
                    Guias SADT cadastradas
                  </h2>
                  <p className="text-xs text-slate-400">
                    Total:{" "}
                    <span className="font-medium text-teal-600">
                      {filtered.length} registro(s)
                    </span>
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/admin/sadt-acompanhamento/nova")}
                  className="gap-2 rounded-full bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  Nova SADT
                </Button>
              </div>

              {/* Busca mobile */}
              <div className="mb-3 flex items-center rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200/80 sm:hidden">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar SADT..."
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
                      <TableHead>Nº Guia SADT</TableHead>
                      <TableHead>Beneficiário</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Executante</TableHead>
                      <TableHead>Autorização</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-400">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-400">
                          Nenhuma SADT encontrada.
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
                            {g.numero_guia_sadt || "—"}
                          </TableCell>
                          <TableCell className="text-slate-800">
                            {g.nome_beneficiario || "—"}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {g.solicitante_nome || "—"}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {g.executante_nome || "—"}
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs">
                            {formatDate(g.data_autorizacao)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-800">
                            {formatCurrency(g.valor_total_geral)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                title="Visualizar"
                                onClick={() => setViewTarget(g)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-teal-50 hover:text-teal-600"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                title="Editar"
                                onClick={() => navigate(`/admin/sadt-acompanhamento/editar/${g.id}`)}
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
            <DialogTitle>Detalhes da SADT</DialogTitle>
            <DialogDescription>
              Informações completas da guia SADT selecionada.
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="grid gap-3 text-sm">
              <Row label="Nº Guia Prestador" value={viewTarget.numero_guia_prestador} />
              <Row label="Nº Guia SADT" value={viewTarget.numero_guia_sadt} />
              <Row label="Beneficiário" value={viewTarget.nome_beneficiario} />
              <Row label="Solicitante" value={viewTarget.solicitante_nome} />
              <Row label="Executante" value={viewTarget.executante_nome} />
              <Row label="Data de Autorização" value={formatDate(viewTarget.data_autorizacao)} />
              <Row label="Validade da Senha" value={formatDate(viewTarget.data_validade_senha)} />
              <Row label="Valor Total" value={formatCurrency(viewTarget.valor_total_geral)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              Fechar
            </Button>
            {viewTarget && (
              <Button
                className="bg-teal-600 text-white hover:bg-teal-700"
                onClick={() => {
                  navigate(`/admin/sadt-acompanhamento/editar/${viewTarget.id}`);
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

      {/* Modal Excluir */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Deseja realmente excluir a SADT{" "}
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

export default SadtAcompanhamentoPage;

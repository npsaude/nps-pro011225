import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ShieldCheck,
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
  numero_autorizacao: string | null;
  numero_guia_honorarios: string | null;
  paciente_nome: string | null;
  hospital_nome: string | null;
  data_cirurgia: string | null;
  data_atendimento: string | null;
  status_pagamento: string | null;
  tipo_cirurgia: string | null;
  created_at: string;
};

const PAGE_SIZE = 10;

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function statusBadge(status: string | null) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-700" },
    pago: { label: "Pago", cls: "bg-emerald-100 text-emerald-700" },
    glosado: { label: "Glosado", cls: "bg-rose-100 text-rose-700" },
    cancelado: { label: "Cancelado", cls: "bg-slate-100 text-slate-500" },
  };
  const s = (status ?? "pendente").toLowerCase();
  const { label, cls } = map[s] ?? { label: status ?? "—", cls: "bg-slate-100 text-slate-500" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}

const GuiaAutorizacaoPage: React.FC = () => {
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
      .from("faturamentos")
      .select(
        "id, numero_autorizacao, numero_guia_honorarios, paciente_nome, hospital_nome, data_cirurgia, data_atendimento, status_pagamento, tipo_cirurgia, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      showError("Não foi possível carregar as guias de autorização.");
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
      (g.paciente_nome ?? "").toLowerCase().includes(q) ||
      (g.numero_autorizacao ?? "").toLowerCase().includes(q) ||
      (g.numero_guia_honorarios ?? "").toLowerCase().includes(q) ||
      (g.hospital_nome ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("faturamentos")
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
        <AdminSidebar section="guia-autorizacao" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl">
          {/* Header */}
          <header className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                Guia de Autorização
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Gerencie as guias de autorização de procedimentos cirúrgicos.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200/80 focus-within:ring-violet-500 sm:flex">
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

          {/* Card principal */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-500">
                  Guias de autorização cadastradas
                </h2>
                <p className="text-xs text-slate-400">
                  Total:{" "}
                  <span className="font-medium text-violet-600">
                    {filtered.length} registro(s)
                  </span>
                </p>
              </div>
              <Button
                onClick={() => navigate("/admin/guia-autorizacao/nova")}
                className="gap-2 rounded-full bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700"
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
                    <TableHead className="py-3 pl-4">Nº Autorização</TableHead>
                    <TableHead>Nº Guia Honorários</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Hospital / Clínica</TableHead>
                    <TableHead>Data Cirurgia</TableHead>
                    <TableHead>Tipo</TableHead>
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
                        Nenhuma guia de autorização encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((g) => (
                      <TableRow
                        key={g.id}
                        className="border-b border-slate-50 text-sm hover:bg-slate-50/60"
                      >
                        <TableCell className="pl-4 font-medium text-slate-800">
                          {g.numero_autorizacao || "—"}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {g.numero_guia_honorarios || "—"}
                        </TableCell>
                        <TableCell className="text-slate-800">
                          {g.paciente_nome || "—"}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {g.hospital_nome || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {formatDate(g.data_cirurgia ?? g.data_atendimento)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {g.tipo_cirurgia || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title="Visualizar"
                              onClick={() => setViewTarget(g)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              title="Editar"
                              onClick={() => navigate(`/admin/guia-autorizacao/editar/${g.id}`)}
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
                <span>Página {page} de {totalPages}</span>
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

      {/* Modal Visualizar */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Guia de Autorização</DialogTitle>
            <DialogDescription>
              Informações completas da guia selecionada.
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="grid gap-3 text-sm">
              <Row label="Nº Autorização" value={viewTarget.numero_autorizacao} />
              <Row label="Nº Guia Honorários" value={viewTarget.numero_guia_honorarios} />
              <Row label="Paciente" value={viewTarget.paciente_nome} />
              <Row label="Hospital / Clínica" value={viewTarget.hospital_nome} />
              <Row label="Data Cirurgia" value={formatDate(viewTarget.data_cirurgia ?? viewTarget.data_atendimento)} />
              <Row label="Tipo de Cirurgia" value={viewTarget.tipo_cirurgia} />
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2">
                <span className="text-xs text-slate-400">Status</span>
                {statusBadge(viewTarget.status_pagamento)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
              Fechar
            </Button>
            {viewTarget && (
              <Button
                className="bg-violet-600 text-white hover:bg-violet-700"
                onClick={() => {
                  navigate(`/admin/guia-autorizacao/editar/${viewTarget.id}`);
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
              Deseja realmente excluir a guia de autorização{" "}
              <strong>{deleteTarget?.numero_autorizacao || deleteTarget?.id}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuiaAutorizacaoPage;
import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Receipt,
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
import { useSystemUser } from "@/hooks/use-system-user";

type GuiaRow = {
  id: string;
  medico_id: string | null;
  profissional_nome: string | null;
  profissional_crm: string | null;
  paciente_nome: string | null;
  convenio: string | null;
  data: string | null;
  hora: string | null;
  proc_cir_1_descricao: string | null;
  created_at: string;
  // enriquecido no cliente
  medico_nome?: string | null;
};

const PAGE_SIZE = 10;

const GuiaHonorariosPage: React.FC = () => {
  const navigate = useNavigate();
  const { systemUser, loading: userLoading } = useSystemUser();
  const role = String((systemUser as any)?.regra ?? "").trim().toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";

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
      .from("guia_honorarios")
      .select(
        "id, medico_id, profissional_nome, profissional_crm, paciente_nome, convenio, data, hora, proc_cir_1_descricao, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      showError("Não foi possível carregar as guias de honorários.");
      setLoading(false);
      return;
    }

    let rows = (data as GuiaRow[]) ?? [];

    // Para super_admin: enriquece com nome do médico via tabela medicos
    if (isSuperAdmin && rows.length > 0) {
      const medicoIds = [...new Set(rows.map((r) => r.medico_id).filter(Boolean))] as string[];
      if (medicoIds.length > 0) {
        const { data: medicos } = await supabase
          .from("medicos")
          .select("id, nome")
          .in("id", medicoIds);

        const medicoMap = new Map<string, string>();
        for (const m of medicos ?? []) medicoMap.set(m.id, m.nome);
        rows = rows.map((r) => ({
          ...r,
          medico_nome: r.medico_id ? (medicoMap.get(r.medico_id) ?? null) : null,
        }));
      }
    }

    setGuias(rows);
    setLoading(false);
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!userLoading) void load();
  }, [load, userLoading]);

  const filtered = guias.filter((g) => {
    const q = search.toLowerCase();
    return (
      (g.profissional_nome ?? "").toLowerCase().includes(q) ||
      (g.paciente_nome ?? "").toLowerCase().includes(q) ||
      (g.convenio ?? "").toLowerCase().includes(q) ||
      (g.proc_cir_1_descricao ?? "").toLowerCase().includes(q) ||
      (g.medico_nome ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("guia_honorarios")
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

  // Colunas dinâmicas: super_admin vê coluna "Médico" extra
  const colSpan = isSuperAdmin ? 8 : 7;

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar documentosSubsection="guia-honorarios" />

        <div className="flex flex-1 flex-col gap-5 rounded-3xl bg-transparent lg:py-1">
          {/* Header */}
          <header className="mb-1 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Receipt className="h-4 w-4" />
                </span>
                Guia de Honorários
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                {isSuperAdmin
                  ? "Todas as guias de honorários da base."
                  : "Gerencie as guias de honorários médicos."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200/80 focus-within:ring-emerald-500 sm:flex">
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

          {/* Conteúdo */}
          <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-500">
                    Guias de honorários cadastradas
                  </h2>
                  <p className="text-xs text-slate-400">
                    Total:{" "}
                    <span className="font-medium text-emerald-600">
                      {filtered.length} registro(s)
                    </span>
                  </p>
                </div>
                {!isSuperAdmin && (
                  <Button
                    onClick={() => navigate("/admin/guia-honorarios/nova")}
                    className="gap-2 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    Nova Guia
                  </Button>
                )}
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
                      {isSuperAdmin && <TableHead className="py-3 pl-4">Médico</TableHead>}
                      <TableHead className={isSuperAdmin ? "" : "py-3 pl-4"}>Profissional</TableHead>
                      <TableHead>CRM</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Convênio</TableHead>
                      <TableHead>Data / Hora</TableHead>
                      <TableHead>Procedimento Principal</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading || userLoading ? (
                      <TableRow>
                        <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-slate-400">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-slate-400">
                          Nenhuma guia de honorários encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((g) => (
                        <TableRow
                          key={g.id}
                          className="border-b border-slate-50 text-sm hover:bg-slate-50/60"
                        >
                          {isSuperAdmin && (
                            <TableCell className="pl-4 text-xs text-slate-500">
                              {g.medico_nome || "—"}
                            </TableCell>
                          )}
                          <TableCell className={`${isSuperAdmin ? "" : "pl-4"} font-medium text-slate-800`}>
                            {g.profissional_nome || "—"}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {g.profissional_crm || "—"}
                          </TableCell>
                          <TableCell className="text-slate-800">
                            {g.paciente_nome || "—"}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {g.convenio || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {g.data ? `${g.data}${g.hora ? " " + g.hora : ""}` : "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-slate-600">
                            {g.proc_cir_1_descricao || "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                title="Visualizar"
                                onClick={() => setViewTarget(g)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                title="Editar"
                                onClick={() => navigate(`/admin/guia-honorarios/editar/${g.id}`)}
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
      </div>

      {/* Modal Visualizar */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Guia de Honorários</DialogTitle>
            <DialogDescription>
              Informações da guia de honorários selecionada.
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="grid gap-3 text-sm">
              {isSuperAdmin && <Row label="Médico" value={viewTarget.medico_nome} />}
              <Row label="Profissional" value={viewTarget.profissional_nome} />
              <Row label="CRM" value={viewTarget.profissional_crm} />
              <Row label="Paciente" value={viewTarget.paciente_nome} />
              <Row label="Convênio" value={viewTarget.convenio} />
              <Row label="Data" value={viewTarget.data} />
              <Row label="Hora" value={viewTarget.hora} />
              <Row label="Procedimento Principal" value={viewTarget.proc_cir_1_descricao} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              Fechar
            </Button>
            {viewTarget && (
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  navigate(`/admin/guia-honorarios/editar/${viewTarget.id}`);
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
              Deseja realmente excluir a guia de{" "}
              <strong>{deleteTarget?.paciente_nome || deleteTarget?.id}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
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

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}

export default GuiaHonorariosPage;

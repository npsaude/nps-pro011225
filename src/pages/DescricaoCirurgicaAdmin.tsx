import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Eye,
  Trash2,
  FileSignature,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
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

type DescricaoRow = {
  id: string;
  numero_guia_internacao: string | null;
  paciente_nome: string | null;
  paciente_cpf: string | null;
  cirurgiao_principal_nome: string | null;
  tipo_cirurgia: string | null;
  data_cirurgia: string | null;
  status_pagamento: string | null;
  hospital_nome: string | null;
  url_descricao_cirurgica: string[];
  created_at: string;
};

type SignedFile = {
  path: string;
  signedUrl: string | null;
  fileName: string;
};

const PAGE_SIZE = 10;
const bucketName = "NPS-pro";

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function hasAny(arr: string[] | null | undefined): boolean {
  return Array.isArray(arr) && arr.length > 0;
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

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}

const DescricaoCirurgicaAdminPage: React.FC = () => {
  const [items, setItems] = useState<DescricaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<DescricaoRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewTarget, setViewTarget] = useState<DescricaoRow | null>(null);
  const [viewFiles, setViewFiles] = useState<SignedFile[]>([]);
  const [viewFilesLoading, setViewFilesLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("faturamentos")
      .select(
        "id, numero_guia_internacao, paciente_nome, paciente_cpf, cirurgiao_principal_nome, tipo_cirurgia, data_cirurgia, status_pagamento, hospital_nome, url_descricao_cirurgica, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      showError("Não foi possível carregar as descrições cirúrgicas.");
    } else {
      const rows = ((data as DescricaoRow[]) ?? []).filter((r) =>
        hasAny(r.url_descricao_cirurgica),
      );
      setItems(rows);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    const loadFiles = async () => {
      if (!viewTarget) {
        setViewFiles([]);
        setViewFilesLoading(false);
        return;
      }

      const paths = viewTarget.url_descricao_cirurgica ?? [];
      if (!hasAny(paths)) {
        setViewFiles([]);
        setViewFilesLoading(false);
        return;
      }

      setViewFilesLoading(true);
      try {
        const files = await Promise.all(
          paths.map(async (path) => {
            const { data } = await supabase.storage
              .from(bucketName)
              .createSignedUrl(path, 60 * 60);
            const fileName = path.split("/").pop() || path;
            return {
              path,
              signedUrl: data?.signedUrl ?? null,
              fileName,
            } satisfies SignedFile;
          }),
        );

        if (!cancelled) setViewFiles(files);
      } finally {
        if (!cancelled) setViewFilesLoading(false);
      }
    };

    void loadFiles();

    return () => {
      cancelled = true;
    };
  }, [viewTarget]);

  const filtered = items.filter((d) => {
    const q = search.toLowerCase();
    return (
      (d.numero_guia_internacao ?? "").toLowerCase().includes(q) ||
      (d.paciente_nome ?? "").toLowerCase().includes(q) ||
      (d.paciente_cpf ?? "").toLowerCase().includes(q) ||
      (d.cirurgiao_principal_nome ?? "").toLowerCase().includes(q) ||
      (d.hospital_nome ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("faturamentos")
      .update({ url_descricao_cirurgica: [] })
      .eq("id", deleteTarget.id);

    setDeleting(false);
    setDeleteTarget(null);

    if (error) {
      showError("Não foi possível remover os anexos da descrição.");
    } else {
      showSuccess("Anexos da descrição cirúrgica removidos com sucesso.");
      void load();
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="descricao-cirurgica" />

        <div className="flex flex-1 flex-col gap-5 rounded-3xl bg-transparent lg:py-1">
          {/* Header */}
          <header className="mb-1 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <FileSignature className="h-4 w-4" />
                </span>
                Descrição Cirúrgica
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Documentos de descrição cirúrgica enviados no faturamento.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200/80 focus-within:ring-blue-500 sm:flex">
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

          {/* Conteúdo (retângulo) */}
          <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl">
            {/* Card principal */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-500">Descrições cadastradas</h2>
                  <p className="text-xs text-slate-400">
                    Total:{" "}
                    <span className="font-medium text-blue-600">{filtered.length} registro(s)</span>
                  </p>
                </div>
              </div>

              {/* Busca mobile */}
              <div className="mb-3 flex items-center rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200/80 sm:hidden">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-7 w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {/* Tabela */}
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 hover:bg-slate-50">
                      <TableHead className="py-3 pl-4">Prontuário</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Registro Civil</TableHead>
                      <TableHead>Cirurgião</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
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
                          Nenhuma descrição cirúrgica encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((d) => (
                        <TableRow key={d.id} className="border-b border-slate-50 text-sm hover:bg-slate-50/60">
                          <TableCell className="pl-4 font-medium text-slate-800">{d.numero_guia_internacao || "—"}</TableCell>
                          <TableCell className="text-slate-800">{d.paciente_nome || "—"}</TableCell>
                          <TableCell className="text-slate-600">{d.paciente_cpf || "—"}</TableCell>
                          <TableCell className="text-slate-600">{d.cirurgiao_principal_nome || "—"}</TableCell>
                          <TableCell className="text-xs text-slate-500">{d.tipo_cirurgia || "—"}</TableCell>
                          <TableCell className="text-xs text-slate-500">{formatDate(d.data_cirurgia)}</TableCell>
                          <TableCell className="text-xs">{statusBadge(d.status_pagamento)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                title="Visualizar"
                                onClick={() => setViewTarget(d)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                title="Remover anexos"
                                onClick={() => setDeleteTarget(d)}
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
            <DialogTitle>Detalhes da Descrição Cirúrgica</DialogTitle>
            <DialogDescription>
              Informações do faturamento e links dos arquivos enviados.
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="grid gap-4 text-sm">
              <div className="grid gap-3">
                <InfoRow label="Prontuário" value={viewTarget.numero_guia_internacao} />
                <InfoRow label="Paciente" value={viewTarget.paciente_nome} />
                <InfoRow label="CPF" value={viewTarget.paciente_cpf} />
                <InfoRow label="Hospital" value={viewTarget.hospital_nome} />
                <InfoRow label="Cirurgião" value={viewTarget.cirurgiao_principal_nome} />
                <InfoRow label="Tipo de Cirurgia" value={viewTarget.tipo_cirurgia} />
                <InfoRow label="Data" value={formatDate(viewTarget.data_cirurgia)} />
                <div className="flex justify-between gap-4 border-b border-slate-50 pb-2">
                  <span className="text-xs text-slate-400">Status pagamento</span>
                  {statusBadge(viewTarget.status_pagamento)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Arquivos
                </div>
                {viewFilesLoading ? (
                  <div className="text-xs text-slate-500">Carregando arquivos...</div>
                ) : viewFiles.length === 0 ? (
                  <div className="text-xs text-slate-500">Nenhum arquivo encontrado.</div>
                ) : (
                  <div className="space-y-2">
                    {viewFiles.map((f) => (
                      <div key={f.path} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-slate-800">{f.fileName}</div>
                          <div className="truncate text-[11px] text-slate-500">{f.path}</div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-2"
                          disabled={!f.signedUrl}
                          onClick={() => {
                            if (!f.signedUrl) return;
                            window.open(f.signedUrl, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Abrir
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewTarget(null)}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Remoção */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar remoção</DialogTitle>
            <DialogDescription>
              Deseja realmente remover os anexos da descrição cirúrgica do registro{" "}
              <strong>{deleteTarget?.numero_guia_internacao || deleteTarget?.id}</strong>?
              Esta ação não exclui o faturamento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DescricaoCirurgicaAdminPage;
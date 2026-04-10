import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Eye, Mail, Pencil, Plus, Search } from "lucide-react";

import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  carregarModelosEmail,
  EMAIL_TEMPLATE_DESCRIPTIONS,
  EMAIL_TEMPLATE_LABELS,
  EMAIL_TEMPLATE_TYPES,
  type EmailTemplate,
  type EmailTemplateType,
} from "@/services/email-templates-service";
import { showError } from "@/utils/toast";

type TemplateListRow = {
  id: string | null;
  tipo: EmailTemplateType;
  assunto: string;
  updated_at: string | null;
  configurado: boolean;
};

function formatDateTime(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminEmailTemplates() {
  const navigate = useNavigate();
  const [items, setItems] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await carregarModelosEmail();
      setItems(data);
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os modelos de email.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo<TemplateListRow[]>(() => {
    return EMAIL_TEMPLATE_TYPES.map((tipo) => {
      const existing = items.find((item) => item.tipo === tipo);

      return {
        id: existing?.id ?? null,
        tipo,
        assunto: existing?.assunto ?? "Modelo ainda não cadastrado.",
        updated_at: existing?.updated_at ?? null,
        configurado: !!existing,
      };
    });
  }, [items]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return rows;

    return rows.filter((row) => {
      return (
        EMAIL_TEMPLATE_LABELS[row.tipo].toLowerCase().includes(query) ||
        EMAIL_TEMPLATE_DESCRIPTIONS[row.tipo].toLowerCase().includes(query) ||
        row.assunto.toLowerCase().includes(query)
      );
    });
  }, [rows, search]);

  const missingTypes = useMemo(() => {
    return EMAIL_TEMPLATE_TYPES.filter(
      (tipo) => !items.some((item) => item.tipo === tipo),
    );
  }, [items]);

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="modelos-email" />

        <div className="flex flex-1 flex-col gap-5 rounded-3xl bg-transparent lg:py-1">
          <header className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>Painel</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-blue-700">Modelos de Emails</span>
              </div>
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Mail className="h-4 w-4" />
                </span>
                Modelos de Emails
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Gerencie os modelos de faturamento e visualize o email pronto antes de salvar.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200/80 focus-within:ring-blue-500 sm:flex">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar modelo..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-7 w-44 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none sm:w-56 sm:text-sm"
                />
              </div>
              <Button
                type="button"
                onClick={() => navigate("/admin/modelos-emails/novo")}
                disabled={missingTypes.length === 0}
                className="gap-2 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                <Plus className="h-4 w-4" />
                Novo modelo
              </Button>
              <AdminHeaderActions notificationsCount={0} />
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-500">
                    Modelos cadastrados
                  </h2>
                  <p className="text-xs text-slate-400">
                    Total de tipos suportados: <span className="font-medium text-blue-600">{rows.length}</span>
                  </p>
                </div>
                {missingTypes.length === 0 ? (
                  <Badge variant="secondary" className="w-fit bg-emerald-100 text-emerald-700">
                    Todos os tipos já estão cadastrados
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="w-fit bg-amber-100 text-amber-700">
                    {missingTypes.length} tipo(s) disponível(is) para cadastro
                  </Badge>
                )}
              </div>

              <div className="mb-3 flex items-center rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200/80 sm:hidden">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar modelo..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-7 w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 hover:bg-slate-50">
                      <TableHead className="py-3 pl-4">Modelo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Atualizado em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-400">
                          Carregando modelos de email...
                        </TableCell>
                      </TableRow>
                    ) : filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-400">
                          Nenhum modelo encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((row) => (
                        <TableRow
                          key={row.tipo}
                          className="border-b border-slate-50 text-sm hover:bg-slate-50/60"
                        >
                          <TableCell className="pl-4 font-medium text-slate-800">
                            {EMAIL_TEMPLATE_LABELS[row.tipo]}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {EMAIL_TEMPLATE_DESCRIPTIONS[row.tipo]}
                          </TableCell>
                          <TableCell className="max-w-[360px] truncate text-slate-700" title={row.assunto}>
                            {row.assunto}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {formatDateTime(row.updated_at)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={row.configurado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}
                            >
                              {row.configurado ? "Configurado" : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              {row.id ? (
                                <>
                                  <button
                                    title="Visualizar"
                                    onClick={() => navigate(`/admin/modelos-emails/${row.id}`)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    title="Editar"
                                    onClick={() => navigate(`/admin/modelos-emails/${row.id}/editar`)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  title="Cadastrar"
                                  onClick={() => navigate(`/admin/modelos-emails/novo?tipo=${row.tipo}`)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

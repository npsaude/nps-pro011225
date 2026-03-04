import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Mail,
  Phone,
  Search,
  ArrowLeft,
  MapPin,
  Landmark,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  listarClinicas,
  criarClinica,
  atualizarClinica,
  type Clinica,
  type ClinicaInput,
} from "@/services/clinicas-service";
import ClinicaForm from "@/components/clinicas/ClinicaForm";
import { showError, showSuccess } from "@/utils/toast";

type ViewMode = "list" | "form";

const ClinicasList = () => {
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [filtered, setFiltered] = useState<Clinica[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editing, setEditing] = useState<Clinica | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await listarClinicas();
        setClinicas(data);
        setFiltered(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erro ao carregar clínicas/hospitais.";
        showError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(clinicas);
      return;
    }
    const term = search.toLowerCase();
    setFiltered(
      clinicas.filter((c) => {
        return (
          c.razao_social.toLowerCase().includes(term) ||
          c.nome_fantasia.toLowerCase().includes(term) ||
          (c.cnpj ?? "").toLowerCase().includes(term) ||
          (c.cidade ?? "").toLowerCase().includes(term) ||
          (c.codigo_referencial_got ?? "").toLowerCase().includes(term)
        );
      }),
    );
  }, [search, clinicas]);

  const openNew = () => {
    setEditing(null);
    setViewMode("form");
  };

  const openEdit = (clinica: Clinica) => {
    setEditing(clinica);
    setViewMode("form");
  };

  const handleCancel = () => {
    setViewMode("list");
    setEditing(null);
  };

  const handleSubmit = async (values: ClinicaInput) => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await atualizarClinica(editing.id, values);
        setClinicas((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
        showSuccess("Cadastro atualizado com sucesso.");
      } else {
        const created = await criarClinica(values);
        setClinicas((prev) => [...prev, created]);
        showSuccess("Cadastro criado com sucesso.");
      }
      setViewMode("list");
      setEditing(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o cadastro.";
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  /* ── FORM VIEW ── */
  if (viewMode === "form") {
    return (
      <div className="flex flex-col gap-4">
        {/* Breadcrumb / back */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para a lista
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className="font-medium text-slate-700">
            {editing ? "Editar cadastro" : "Novo cadastro"}
          </span>
        </div>

        {/* Form title */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            {editing?.tipo_unidade === "HOSPITAL" ? (
              <Landmark className="h-5 w-5" />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {editing
                ? `Editar: ${editing.nome_fantasia}`
                : "Nova clínica / hospital"}
            </h2>
            <p className="text-xs text-slate-400">
              {editing
                ? "Atualize os dados da unidade de atendimento."
                : "Preencha os dados para cadastrar uma nova unidade de atendimento."}
            </p>
          </div>
        </div>

        <ClinicaForm
          clinica={editing}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={saving}
        />
      </div>
    );
  }

  /* ── LIST VIEW ── */
  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{clinicas.length}</span> registro(s) cadastrado(s)
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar por nome, CNPJ, cidade..."
              className="h-9 w-full rounded-full border-slate-200 bg-white pl-9 text-xs shadow-sm placeholder:text-slate-400 focus-visible:ring-indigo-300 sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-full bg-indigo-600 px-4 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
            onClick={openNew}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nova clínica / hospital
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Building2 className="h-7 w-7" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-600">
              {search ? "Nenhum resultado encontrado" : "Nenhuma clínica/hospital cadastrado"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {search
                ? "Tente buscar com outros termos."
                : "Clique em \"Nova clínica / hospital\" para começar."}
            </p>
          </div>
          {!search && (
            <Button
              type="button"
              size="sm"
              className="mt-1 h-9 rounded-full bg-indigo-600 px-5 text-xs font-medium text-white hover:bg-indigo-700"
              onClick={openNew}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Cadastrar agora
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md"
            >
              {/* Icon */}
              <span className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                c.tipo_unidade === "HOSPITAL"
                  ? "bg-violet-100 text-violet-600"
                  : "bg-sky-100 text-sky-600"
              }`}>
                {c.tipo_unidade === "HOSPITAL" ? (
                  <Landmark className="h-5 w-5" />
                ) : (
                  <Building2 className="h-5 w-5" />
                )}
              </span>

              {/* Main info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      c.tipo_unidade === "HOSPITAL"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {c.tipo_unidade === "HOSPITAL" ? "Hospital" : "Clínica"}
                  </Badge>
                  {c.codigo_referencial_got && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      GOT: {c.codigo_referencial_got}
                    </span>
                  )}
                  {c.nome_rede && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                      Rede: {c.nome_rede}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm font-semibold text-slate-800 leading-tight">
                  {c.nome_fantasia}
                </p>
                <p className="text-xs text-slate-400">{c.razao_social}</p>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    {c.endereco}, {c.bairro} — {c.cidade}/{c.uf}
                  </span>
                  {c.cnpj && (
                    <span className="text-slate-400">CNPJ: {c.cnpj}</span>
                  )}
                </div>

                {/* Faturamento info */}
                {(c.nome_contato_faturamento || c.email_contato_faturamento || c.telefone_contato_faturamento) && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                    {c.nome_contato_faturamento && (
                      <span className="font-medium text-slate-600">{c.nome_contato_faturamento}</span>
                    )}
                    {c.email_contato_faturamento && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {c.email_contato_faturamento}
                      </span>
                    )}
                    {c.telefone_contato_faturamento && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {c.telefone_contato_faturamento}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Edit button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 flex-shrink-0 rounded-full px-3 text-xs text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-indigo-50 hover:text-indigo-700"
                onClick={() => openEdit(c)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClinicasList;

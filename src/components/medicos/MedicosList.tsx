import { useEffect, useMemo, useState } from "react";
import {
  Stethoscope,
  Plus,
  Pencil,
  Mail,
  Phone,
  Building2,
  UserSearch,
} from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import type { Medico, MedicoInput } from "@/services/medicos-service";
import { listarMedicos, salvarMedico } from "@/services/medicos-service";
import type { Clinica } from "@/services/clinicas-service";
import { listarClinicas } from "@/services/clinicas-service";
import type { Hospital } from "@/services/hospitais-service";
import { listarHospitais } from "@/services/hospitais-service";
import type { DbSystemUser } from "@/db/schema";
import { supabase } from "@/integrations/supabase/client";
import MedicoForm from "@/components/medicos/MedicoForm";
import { showError, showSuccess } from "@/utils/toast";

interface MedicosListState {
  medicos: Medico[];
  clinicas: Clinica[];
  hospitais: Hospital[];
  usuariosMedico: DbSystemUser[];
}

const MedicosList = () => {
  const [state, setState] = useState<MedicosListState>({
    medicos: [],
    clinicas: [],
    hospitais: [],
    usuariosMedico: [],
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [usuarioSelecionado, setUsuarioSelecionado] =
    useState<DbSystemUser | null>(null);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [medicos, clinicas, hospitais] = await Promise.all([
          listarMedicos(),
          listarClinicas(),
          listarHospitais(),
        ]);

        const { data: usuariosMedico, error } = await supabase
          .from("usuarios_sistema")
          .select("*")
          .eq("regra", "MEDICO")
          .eq("ativo", true)
          .order("nome", { ascending: true });

        if (error) {
          throw new Error(
            error.message ||
              "Não foi possível carregar a lista de usuários médicos.",
          );
        }

        setState({
          medicos,
          clinicas,
          hospitais,
          usuariosMedico: (usuariosMedico ?? []) as DbSystemUser[],
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erro ao carregar dados de médicos.";
        showError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadAll();
  }, []);

  const medicosComUsuario = useMemo(() => {
    const mapUsuario = new Map<string, DbSystemUser>();
    state.usuariosMedico.forEach((u) => mapUsuario.set(u.id_user, u));

    return state.medicos.map((m) => ({
      medico: m,
      usuario: mapUsuario.get(m.id) ?? null,
    }));
  }, [state.medicos, state.usuariosMedico]);

  const filtered = useMemo(() => {
    if (!search.trim()) return medicosComUsuario;
    const term = search.toLowerCase();
    return medicosComUsuario.filter(({ medico, usuario }) => {
      return (
        medico.nome.toLowerCase().includes(term) ||
        medico.email.toLowerCase().includes(term) ||
        (usuario?.nome ?? "").toLowerCase().includes(term)
      );
    });
  }, [medicosComUsuario, search]);

  const openNew = () => {
    setUsuarioSelecionado(null);
    setDialogOpen(true);
  };

  const openEdit = (medico: Medico) => {
    const usuario = state.usuariosMedico.find((u) => u.id_user === medico.id);
    if (!usuario) {
      showError(
        "Não foi possível localizar o usuário do sistema vinculado a este médico.",
      );
      return;
    }
    setUsuarioSelecionado(usuario);
    setDialogOpen(true);
  };

  const handleSubmit = async (input: MedicoInput) => {
    setSaving(true);
    try {
      const saved = await salvarMedico(input);
      setState((prev) => {
        const exists = prev.medicos.find((m) => m.id === saved.id);
        const medicos = exists
          ? prev.medicos.map((m) => (m.id === saved.id ? saved : m))
          : [...prev.medicos, saved];

        return { ...prev, medicos };
      });
      showSuccess("Cadastro de médico salvo com sucesso.");
      setDialogOpen(false);
      setUsuarioSelecionado(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o cadastro do médico.";
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const medicosSemCadastro = useMemo(() => {
    const idsComCadastro = new Set(state.medicos.map((m) => m.id));
    return state.usuariosMedico.filter((u) => !idsComCadastro.has(u.id_user));
  }, [state.medicos, state.usuariosMedico]);

  return (
    <Card className="h-full rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-3 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                <Stethoscope className="h-4 w-4" />
              </span>
              <span>Cadastro complementar de médicos</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Defina CRM, telefone (WhatsApp) e as clínicas e hospitais em que cada médico atua.
            </CardDescription>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Total cadastrados:{" "}
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {state.medicos.length}
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full min-w-[200px] sm:w-60">
              <Input
                placeholder="Buscar por nome ou e-mail..."
                className="h-9 rounded-full border-slate-200 bg-white px-3 text-xs shadow-sm placeholder:text-slate-400 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="rounded-full bg-emerald-600 px-4 text-xs font-medium text-white shadow-sm hover:bg-emerald-700"
              onClick={openNew}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo médico
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-1 overflow-hidden rounded-b-2xl bg-white/90 dark:bg-slate-900/80">
        {loading ? (
          <p className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
            Carregando médicos...
          </p>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <TableHead className="px-4 py-3">Nome</TableHead>
                  <TableHead className="px-4 py-3">E-mail</TableHead>
                  <TableHead className="px-4 py-3">WhatsApp</TableHead>
                  <TableHead className="px-4 py-3">CRM</TableHead>
                  <TableHead className="px-4 py-3">
                    Clínicas vinculadas
                  </TableHead>
                  <TableHead className="px-4 py-3">
                    Hospitais onde atua
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="px-4 py-6 text-center text-xs text-slate-400"
                    >
                      Nenhum médico com cadastro complementar encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(({ medico, usuario }) => (
                    <TableRow
                      key={medico.id}
                      className="border-b border-slate-50 text-xs hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    >
                      <TableCell className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                        {medico.nome}
                        {usuario && usuario.nome !== medico.nome && (
                          <span className="mt-0.5 block text-[11px] text-slate-400">
                            Usuário do sistema: {usuario.nome}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{medico.email}</span>
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {medico.telefone_whatsapp || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {medico.crm || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div className="flex flex-wrap gap-1">
                          {medico.clinicas_ids.length === 0
                            ? "-"
                            : medico.clinicas_ids.map((id) => {
                                const c = state.clinicas.find(
                                  (cli) => cli.id === id,
                                );
                                if (!c) return null;
                                return (
                                  <span
                                    key={id}
                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  >
                                    <Building2 className="h-3 w-3" />
                                    {c.nome_fantasia}
                                  </span>
                                );
                              })}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div className="flex flex-wrap gap-1">
                          {medico.hospitais_ids?.length === 0 ||
                          !medico.hospitais_ids
                            ? "-"
                            : medico.hospitais_ids.map((id) => {
                                const h = state.hospitais.find(
                                  (hos) => hos.id === id,
                                );
                                if (!h) return null;
                                return (
                                  <span
                                    key={id}
                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  >
                                    <Building2 className="h-3 w-3" />
                                    {h.nome_fantasia}
                                  </span>
                                );
                              })}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
                          onClick={() => openEdit(medico)}
                          title="Editar cadastro"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && medicosSemCadastro.length > 0 && (
          <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3 text-[11px] text-slate-500 ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <UserSearch className="h-3.5 w-3.5" />
              <span>
                Médicos com usuário criado, mas sem cadastro complementar:
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {medicosSemCadastro.map((u) => (
                <button
                  key={u.id_user}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
                  onClick={() => {
                    setUsuarioSelecionado(u);
                    setDialogOpen(true);
                  }}
                >
                  <Stethoscope className="h-3 w-3 text-emerald-500" />
                  <span>{u.nome}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setUsuarioSelecionado(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {usuarioSelecionado
                ? "Cadastro complementar do médico"
                : "Selecione um médico para cadastrar"}
            </DialogTitle>
            <DialogDescription>
              Os dados de nome e e-mail vêm da tabela de usuários médicos; aqui
              você complementa com CRM, WhatsApp e as clínicas e hospitais onde
              atua.
            </DialogDescription>
          </DialogHeader>

          {usuarioSelecionado ? (
            <MedicoForm
              medicoBase={{
                id: usuarioSelecionado.id_user,
                nome: usuarioSelecionado.nome,
                email: usuarioSelecionado.email,
              }}
              medicoExistente={
                state.medicos.find((m) => m.id === usuarioSelecionado.id_user) ??
                null
              }
              clinicas={state.clinicas}
              hospitais={state.hospitais}
              onSubmit={handleSubmit}
              isSubmitting={saving}
            />
          ) : (
            <div className="space-y-3 text-xs sm:text-sm">
              <p>
                Escolha um médico na lista abaixo (usuários com regra{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  MEDICO
                </code>
                ) para preencher o cadastro complementar.
              </p>
              {state.usuariosMedico.length === 0 ? (
                <p className="text-slate-500">
                  Não há usuários com regra médico cadastrados.
                </p>
              ) : (
                <div className="max-h-64 space-y-1 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                  {state.usuariosMedico.map((u) => (
                    <button
                      key={u.id_user}
                      type="button"
                      onClick={() => setUsuarioSelecionado(u)}
                      className="flex w-full flex-col rounded-xl px-2.5 py-1.5 text-left text-xs hover:bg-white dark:hover:bg-slate-800"
                    >
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {u.nome}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {u.email}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default MedicosList;
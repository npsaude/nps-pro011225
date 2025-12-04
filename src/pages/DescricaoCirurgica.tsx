import React, { useState, useEffect } from "react";
import { Bell, Search, FileSignature, Plus } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select as UiSelect,
  SelectTrigger as UiSelectTrigger,
  SelectContent as UiSelectContent,
  SelectItem as UiSelectItem,
  SelectValue as UiSelectValue,
} from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
import {
  criarDescricaoCirurgica,
  atualizarDescricaoCirurgicaCompleta,
  type DescricaoCirurgicaFormData,
  listarDescricoesCirurgicasDoMedicoLogado,
  type DescricaoCirurgicaResumoMedico,
  excluirDescricaoCirurgica,
  buscarDescricaoCirurgicaPorId,
  type SimNao,
} from "@/services/descricao-cirurgica-service";
import type { DbDescricaoCirurgica } from "@/db/schema";
import AdminDescricaoCirurgicaList from "@/components/descricao-cirurgica/AdminDescricaoCirurgicaList";
import AdminSidebar from "@/components/admin/AdminSidebar";

// helpers de data/hora e booleano -> SimNao
function toDateInput(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function toTimeInput(value: string | null): string {
  if (!value) return "";
  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function toDateTimeLocalInput(value: string | null): string {
  if (!value) return "";
  const datePart = toDateInput(value);
  const timePart = toTimeInput(value);
  if (!datePart || !timePart) return "";
  return `${datePart}T${timePart}`;
}

function mapBoolToSimNao(value: boolean | null): SimNao {
  if (value === true) return "sim";
  if (value === false) return "nao";
  return "";
}

const DescricaoCirurgicaPage: React.FC = () => {
  const navigate = useNavigate();

  const [salvando, setSalvando] = useState(false);
  const [listaDescricoes, setListaDescricoes] = useState<
    DescricaoCirurgicaResumoMedico[]
  >([]);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [viewItem, setViewItem] =
    useState<DescricaoCirurgicaResumoMedico | null>(null);
  const [viewData, setViewData] = useState<DbDescricaoCirurgica | null>(null);
  const [carregandoView, setCarregandoView] = useState(false);

  const [processandoAcao, setProcessandoAcao] = useState(false);
  const [pendingDescricoes, setPendingDescricoes] = useState<number>(0);

  const carregarDescricoes = async () => {
    setCarregandoLista(true);
    try {
      const data = await listarDescricoesCirurgicasDoMedicoLogado();
      setListaDescricoes(data);
      const pendentes = data.filter(
        (item) => item.status === "AGUARDANDO",
      ).length;
      setPendingDescricoes(pendentes);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as descrições cirúrgicas.";
      showError(message);
    } finally {
      setCarregandoLista(false);
    }
  };

  useEffect(() => {
    if (!showForm) {
      void carregarDescricoes();
    }
  }, [showForm]);

  const form = useForm<DescricaoCirurgicaFormData>({
    defaultValues: {
      prontuario: "",
      registro: "",
      nome_social: "",
      registro_civil: "",
      cpf: "",
      matricula: "",
      data_nascimento: "",
      idade: "",
      sexo: "",

      convenio_plano: "",
      setor: "",
      leito: "",
      dthr_admissao: "",

      status: "AGUARDANDO",
      tipo_cirurgia: "",
      data_inicio_procedimento: "",
      hora_inicio_procedimento: "",
      data_fim_procedimento: "",
      hora_fim_procedimento: "",
      diagnostico_pre_operatorio: "",
      diagnostico_pos_operatorio: "",

      descricao_cirurgica: "",

      cirurgiao_responsavel: "",
      cirurgiao_responsavel_crm: "",
      data_hora_afere: "",
      usuario_impressao: "",
      data_hora_impressao: "",

      diagnostico_pre_igual_pos: "",
      houve_complicacoes: "",
      descricao_complicacoes: "",
      possui_peca_anatomo: "",
      sangramento_estimado: "",
      observacoes_adicionais: "",

      uso_antibioticos: "",
      profilaxia_tev_tvp: "",
      troca_curativo: "",
      dieta: "",
      deambulacao: "",
      previsao_alta: "",
      acompanhamento_pela_instituicao: "",
      outras_orientacoes: "",

      procedimentos: [
        {
          procedimento_id: "",
          descricao_procedimento: "",
          codigo_procedimento: "",
          tipo_procedimento: "",
          quantidade: "",
        },
      ],
      equipe: [
        {
          nome_profissional: "",
          funcao: "",
          conselho: "",
          numero_conselho: "",
          uf_conselho: "",
        },
      ],
      materiais: [
        {
          material_id: "",
          nome_material: "",
          descricao_material: "",
          quantidade: "",
          lote: "",
          fabricante: "",
        },
      ],
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = form;

  const procedimentosArray = useFieldArray({
    control,
    name: "procedimentos",
  });

  const equipeArray = useFieldArray({
    control,
    name: "equipe",
  });

  const materiaisArray = useFieldArray({
    control,
    name: "materiais",
  });

  const onSubmit = async (data: DescricaoCirurgicaFormData) => {
    setSalvando(true);
    try {
      if (editingId) {
        await atualizarDescricaoCirurgicaCompleta(editingId, data);
        showSuccess("Descrição cirúrgica atualizada com sucesso.");
      } else {
        await criarDescricaoCirurgica(data);
        showSuccess("Descrição cirúrgica salva com sucesso.");
      }
      reset();
      setShowForm(false);
      setEditingId(null);
      await carregarDescricoes();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a descrição cirúrgica.";
      showError(message);
    } finally {
      setSalvando(false);
    }
  };

  const disabled = salvando || isSubmitting || processandoAcao;

  const handleNovaDescricao = () => {
    setEditingId(null);
    reset();
    setShowForm(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleVisualizar = async (item: DescricaoCirurgicaResumoMedico) => {
    setViewItem(item);
    setCarregandoView(true);
    try {
      const data = await buscarDescricaoCirurgicaPorId(item.id);
      setViewData(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível carregar detalhes da descrição cirúrgica.";
      showError(message);
      setViewItem(null);
      setViewData(null);
    } finally {
      setCarregandoView(false);
    }
  };

  const handleEditar = async (item: DescricaoCirurgicaResumoMedico) => {
    setSalvando(true);
    try {
      const data = await buscarDescricaoCirurgicaPorId(item.id);

      const procedimentos =
        (data.procedimentos as any[])?.map((p) => ({
          procedimento_id: (p.procedimento_id ?? "") as string,
          descricao_procedimento: (p.descricao_procedimento ?? "") as string,
          codigo_procedimento: (p.codigo_procedimento ?? "") as string,
          tipo_procedimento: (p.tipo_procedimento ?? "") as string,
          quantidade:
            p.quantidade != null ? String(p.quantidade) : "",
        })) ?? [
          {
            procedimento_id: "",
            descricao_procedimento: "",
            codigo_procedimento: "",
            tipo_procedimento: "",
            quantidade: "",
          },
        ];

      const equipe =
        (data.equipe as any[])?.map((e) => ({
          nome_profissional: (e.nome_profissional ?? "") as string,
          funcao: (e.funcao ?? "") as string,
          conselho: (e.conselho ?? "") as string,
          numero_conselho: (e.numero_conselho ?? "") as string,
          uf_conselho: (e.uf_conselho ?? "") as string,
        })) ?? [
          {
            nome_profissional: "",
            funcao: "",
            conselho: "",
            numero_conselho: "",
            uf_conselho: "",
          },
        ];

      const materiais =
        (data.materiais as any[])?.map((m) => ({
          material_id: (m.material_id ?? "") as string,
          nome_material: (m.nome_material ?? "") as string,
          descricao_material: (m.descricao_material ?? "") as string,
          quantidade:
            m.quantidade != null ? String(m.quantidade) : "",
          lote: (m.lote ?? "") as string,
          fabricante: (m.fabricante ?? "") as string,
        })) ?? [
          {
            material_id: "",
            nome_material: "",
            descricao_material: "",
            quantidade: "",
            lote: "",
            fabricante: "",
          },
        ];

      const formValues: DescricaoCirurgicaFormData = {
        prontuario: data.prontuario ?? "",
        registro: data.registro ?? "",
        nome_social: data.nome_social ?? "",
        registro_civil: data.registro_civil ?? "",
        cpf: data.cpf ?? "",
        matricula: data.matricula ?? "",
        data_nascimento: toDateInput(data.data_nascimento ?? null),
        idade:
          data.idade != null ? String(data.idade) : "",
        sexo: data.sexo ?? "",

        convenio_plano: data.convenio_plano ?? "",
        setor: data.setor ?? "",
        leito: data.leito ?? "",
        dthr_admissao: toDateTimeLocalInput(data.dthr_admissao ?? null),

        status: (data.status as string) ?? "AGUARDANDO",
        tipo_cirurgia: data.tipo_cirurgia ?? "",
        data_inicio_procedimento: toDateInput(
          data.data_inicio_procedimento ?? null,
        ),
        hora_inicio_procedimento: toTimeInput(
          data.hora_inicio_procedimento ?? null,
        ),
        data_fim_procedimento: toDateInput(
          data.data_fim_procedimento ?? null,
        ),
        hora_fim_procedimento: toTimeInput(
          data.hora_fim_procedimento ?? null,
        ),
        diagnostico_pre_operatorio:
          data.diagnostico_pre_operatorio ?? "",
        diagnostico_pos_operatorio:
          data.diagnostico_pos_operatorio ?? "",

        descricao_cirurgica: data.descricao_cirurgica ?? "",

        cirurgiao_responsavel: data.cirurgiao_responsavel ?? "",
        cirurgiao_responsavel_crm:
          data.cirurgiao_responsavel_crm ?? "",
        data_hora_afere: toDateTimeLocalInput(
          data.data_hora_afere ?? null,
        ),
        usuario_impressao: data.usuario_impressao ?? "",
        data_hora_impressao: toDateTimeLocalInput(
          data.data_hora_impressao ?? null,
        ),

        diagnostico_pre_igual_pos: mapBoolToSimNao(
          (data.diagnostico_pre_igual_pos as boolean | null) ?? null,
        ),
        houve_complicacoes: mapBoolToSimNao(
          (data.houve_complicacoes as boolean | null) ?? null,
        ),
        descricao_complicacoes: data.descricao_complicacoes ?? "",
        possui_peca_anatomo: mapBoolToSimNao(
          (data.possui_peca_anatomo as boolean | null) ?? null,
        ),
        sangramento_estimado: data.sangramento_estimado ?? "",
        observacoes_adicionais:
          data.observacoes_adicionais ?? "",

        uso_antibioticos: data.uso_antibioticos ?? "",
        profilaxia_tev_tvp: data.profilaxia_tev_tvp ?? "",
        troca_curativo: data.troca_curativo ?? "",
        dieta: data.dieta ?? "",
        deambulacao: data.deambulacao ?? "",
        previsao_alta: data.previsao_alta ?? "",
        acompanhamento_pela_instituicao: mapBoolToSimNao(
          (data.acompanhamento_pela_instituicao as boolean | null) ??
            null,
        ),
        outras_orientacoes: data.outras_orientacoes ?? "",

        procedimentos,
        equipe,
        materiais,
      };

      reset(formValues);
      setEditingId(item.id);
      setShowForm(true);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível carregar a descrição para edição.";
      showError(message);
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (item: DescricaoCirurgicaResumoMedico) => {
    const confirmado = window.confirm(
      `Deseja realmente excluir a descrição do prontuário ${item.prontuario ?? "-"}?`,
    );
    if (!confirmado) return;

    setProcessandoAcao(true);
    try {
      await excluirDescricaoCirurgica(item.id);
      showSuccess("Descrição cirúrgica excluída com sucesso.");
      await carregarDescricoes();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível excluir a descrição cirúrgica.";
      showError(message);
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleVerArquivos = (item: DescricaoCirurgicaResumoMedico) => {
    navigate(`/descricao-cirurgica/${item.id}/arquivos`);
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="descricao" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          {/* Header */}
          <header className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                  <FileSignature className="h-4 w-4" />
                </span>
                <span>Descrição Cirúrgica</span>
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Registro estruturado da descrição cirúrgica, com procedimentos, equipe
                e materiais utilizados.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200/80 focus-within:ring-[#135bec] dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 sm:flex">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar (em breve)"
                  className="h-7 w-40 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-50 sm:w-52 sm:text-sm"
                  disabled
                />
              </div>

              <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm ring-1 ring-slate-200/70 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                {pendingDescricoes > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[10px] font-semibold text-white">
                    {pendingDescricoes > 9 ? "9+" : pendingDescricoes}
                  </span>
                )}
                <Bell className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2 rounded-full bg-slate-100/70 px-2 py-1.5 text-xs shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800/70 dark:ring-slate-700 sm:px-3">
                <img
                  src="/perfil.jpeg"
                  alt="Foto administrador"
                  className="h-8 w-8 rounded-full object-cover"
                />
                <div className="hidden flex-col text-left sm:flex">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                    Administrador
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Área administrativa
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-2">
            {/* Formulário de cadastro/edição */}
            {showForm && (
              <Card className="mb-4 border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/70">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        {editingId ? "Editar descrição cirúrgica" : "Nova descrição cirúrgica"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Preencha os dados da descrição cirúrgica.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={() => {
                          setShowForm(false);
                          setEditingId(null);
                          reset();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        form="descricao-cirurgica-form"
                        disabled={disabled}
                      >
                        {editingId ? "Salvar alterações" : "Salvar descrição"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form
                    id="descricao-cirurgica-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4 text-sm"
                  >
                    {/* 1. Identificação do Paciente */}
                    <section className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        1. Identificação do paciente
                      </h2>
                      <div className="grid gap-3 md:grid-cols-4">
                        <div>
                          <Label>Prontuário</Label>
                          <Input
                            {...register("prontuario")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Registro</Label>
                          <Input
                            {...register("registro")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Nome social</Label>
                          <Input
                            {...register("nome_social")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Registro civil</Label>
                          <Input
                            {...register("registro_civil")}
                            disabled={disabled}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <div>
                          <Label>CPF</Label>
                          <Input {...register("cpf")} disabled={disabled} />
                        </div>
                        <div>
                          <Label>Matrícula</Label>
                          <Input
                            {...register("matricula")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Data de nascimento</Label>
                          <Input
                            type="date"
                            {...register("data_nascimento")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Idade</Label>
                          <Input {...register("idade")} disabled={disabled} />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <div>
                          <Label>Sexo</Label>
                          <Input {...register("sexo")} disabled={disabled} />
                        </div>
                      </div>
                    </section>

                    {/* 2. Internação */}
                    <section className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        2. Internação
                      </h2>
                      <div className="grid gap-3 md:grid-cols-4">
                        <div>
                          <Label>Convênio / Plano</Label>
                          <Input
                            {...register("convenio_plano")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Setor</Label>
                          <Input {...register("setor")} disabled={disabled} />
                        </div>
                        <div>
                          <Label>Leito</Label>
                          <Input {...register("leito")} disabled={disabled} />
                        </div>
                        <div>
                          <Label>Data/hora admissão</Label>
                          <Input
                            type="datetime-local"
                            {...register("dthr_admissao")}
                            disabled={disabled}
                          />
                        </div>
                      </div>
                    </section>

                    {/* 3. Informações iniciais */}
                    <section className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        3. Informações iniciais
                      </h2>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <Label>Status</Label>
                          <Input
                            {...register("status")}
                            disabled={disabled}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Tipo de cirurgia</Label>
                          <Input
                            {...register("tipo_cirurgia")}
                            disabled={disabled}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <div>
                          <Label>Data início procedimento</Label>
                          <Input
                            type="date"
                            {...register("data_inicio_procedimento")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Hora início procedimento</Label>
                          <Input
                            type="time"
                            {...register("hora_inicio_procedimento")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Data fim procedimento</Label>
                          <Input
                            type="date"
                            {...register("data_fim_procedimento")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Hora fim procedimento</Label>
                          <Input
                            type="time"
                            {...register("hora_fim_procedimento")}
                            disabled={disabled}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label>Diagnóstico pré-operatório</Label>
                          <Textarea
                            rows={3}
                            {...register("diagnostico_pre_operatorio")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Diagnóstico pós-operatório</Label>
                          <Textarea
                            rows={3}
                            {...register("diagnostico_pos_operatorio")}
                            disabled={disabled}
                          />
                        </div>
                      </div>
                    </section>

                    {/* 4. Procedimentos */}
                    <section className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        4. Procedimentos
                      </h2>
                      <div className="space-y-3">
                        {procedimentosArray.fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="rounded-lg border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/60"
                          >
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-600 dark:text-slate-200">
                                Procedimento {index + 1}
                              </span>
                              {procedimentosArray.fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-red-500"
                                  disabled={disabled}
                                  onClick={() =>
                                    procedimentosArray.remove(index)
                                  }
                                >
                                  Remover
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-3 md:grid-cols-5">
                              <div className="md:col-span-2">
                                <Label>Descrição</Label>
                                <Input
                                  {...register(
                                    `procedimentos.${index}.descricao_procedimento`,
                                  )}
                                  disabled={disabled}
                                />
                              </div>
                              <div>
                                <Label>Código</Label>
                                <Input
                                  {...register(
                                    `procedimentos.${index}.codigo_procedimento`,
                                  )}
                                  disabled={disabled}
                                />
                              </div>
                              <div>
                                <Label>Tipo</Label>
                                <Input
                                  {...register(
                                    `procedimentos.${index}.tipo_procedimento`,
                                  )}
                                  disabled={disabled}
                                />
                              </div>
                              <div>
                                <Label>Quantidade</Label>
                                <Input
                                  {...register(
                                    `procedimentos.${index}.quantidade`,
                                  )}
                                  disabled={disabled}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={disabled}
                          onClick={() =>
                            procedimentosArray.append({
                              procedimento_id: "",
                              descricao_procedimento: "",
                              codigo_procedimento: "",
                              tipo_procedimento: "",
                              quantidade: "",
                            })
                          }
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Adicionar procedimento
                        </Button>
                      </div>
                    </section>

                    {/* 5. Equipe */}
                    <section className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        5. Equipe cirúrgica
                      </h2>
                      <div className="space-y-3">
                        {equipeArray.fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="rounded-lg border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/60"
                          >
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-600 dark:text-slate-200">
                                Profissional {index + 1}
                              </span>
                              {equipeArray.fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-red-500"
                                  disabled={disabled}
                                  onClick={() => equipeArray.remove(index)}
                                >
                                  Remover
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-3 md:grid-cols-5">
                              <div className="md:col-span-2">
                                <Label>Nome</Label>
                                <Input
                                  {...register(
                                    `equipe.${index}.nome_profissional`,
                                  )}
                                  disabled={disabled}
                                />
                              </div>
                              <div>
                                <Label>Função</Label>
                                <Input
                                  {...register(`equipe.${index}.funcao`)}
                                  disabled={disabled}
                                />
                              </div>
                              <div>
                                <Label>Conselho</Label>
                                <Input
                                  {...register(`equipe.${index}.conselho`)}
                                  disabled={disabled}
                                />
                              </div>
                              <div>
                                <Label>Nº Conselho</Label>
                                <Input
                                  {...register(
                                    `equipe.${index}.numero_conselho`,
                                  )}
                                  disabled={disabled}
                                />
                              </div>
                              <div>
                                <Label>UF</Label>
                                <Input
                                  {...register(`equipe.${index}.uf_conselho`)}
                                  disabled={disabled}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={disabled}
                          onClick={() =>
                            equipeArray.append({
                              nome_profissional: "",
                              funcao: "",
                              conselho: "",
                              numero_conselho: "",
                              uf_conselho: "",
                            })
                          }
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Adicionar profissional
                        </Button>
                      </div>
                    </section>

                    {/* 6. Texto da descrição */}
                    <section className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        6. Texto da descrição cirúrgica
                      </h2>
                      <Textarea
                        rows={6}
                        {...register("descricao_cirurgica")}
                        disabled={disabled}
                      />
                    </section>

                    {/* 7. Auditoria */}
                    <section className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        7. Auditoria
                      </h2>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <Label>Cirurgião responsável</Label>
                          <Input
                            {...register("cirurgiao_responsavel")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>CRM</Label>
                          <Input
                            {...register("cirurgiao_responsavel_crm")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Usuário impressão</Label>
                          <Input
                            {...register("usuario_impressao")}
                            disabled={disabled}
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label>Data/hora aferição</Label>
                          <Input
                            type="datetime-local"
                            {...register("data_hora_afere")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Data/hora impressão</Label>
                          <Input
                            type="datetime-local"
                            {...register("data_hora_impressao")}
                            disabled={disabled}
                          />
                        </div>
                      </div>
                    </section>

                    {/* 8. Materiais */}
                    <section className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        8. Materiais (OPME)
                      </h2>
                      <div className="space-y-3">
                        {materiaisArray.fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="rounded-lg border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/60"
                          >
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-600 dark:text-slate-200">
                                Material {index + 1}
                              </span>
                              {materiaisArray.fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-red-500"
                                  disabled={disabled}
                                  onClick={() => materiaisArray.remove(index)}
                                >
                                  Remover
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-3 md:grid-cols-5">
                              <div className="md:col-span-2">
                                <Label>Nome</Label>
                                <Input
                                  {...register(
                                    `materiais.${index}.nome_material`,
                                  )}
                                  disabled={disabled}
                                />
                              </div>
                              <div>
                                <Label>Descrição</Label>
                                <Input
                                  {...register(
                                    `materiais.${index}.descricao_material`,
                                  )}
                                  disabled={disabled}
                                />
                              </div>
                              <div>
                                <Label>Quantidade</Label>
                                <Input
                                  {...register(
                                    `materiais.${index}.quantidade`,
                                  )}
                                  disabled={disabled}
                                />
                              </div>
                              <div>
                                <Label>Lote</Label>
                                <Input
                                  {...register(`materiais.${index}.lote`)}
                                  disabled={disabled}
                                />
                              </div>
                              <div>
                                <Label>Fabricante</Label>
                                <Input
                                  {...register(`materiais.${index}.fabricante`)}
                                  disabled={disabled}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={disabled}
                          onClick={() =>
                            materiaisArray.append({
                              material_id: "",
                              nome_material: "",
                              descricao_material: "",
                              quantidade: "",
                              lote: "",
                              fabricante: "",
                            })
                          }
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Adicionar material
                        </Button>
                      </div>
                    </section>

                    {/* 9. Informações adicionais */}
                    <section className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        9. Informações adicionais
                      </h2>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label>Diagnóstico pré = pós?</Label>
                          <UiSelect
                            value={
                              form.watch("diagnostico_pre_igual_pos") === ""
                                ? "nao_informado"
                                : form.watch("diagnostico_pre_igual_pos")
                            }
                            onValueChange={(v) =>
                              void form.setValue(
                                "diagnostico_pre_igual_pos",
                                v === "nao_informado" ? "" : (v as SimNao),
                              )
                            }
                            disabled={disabled}
                          >
                            <UiSelectTrigger>
                              <UiSelectValue placeholder="Selecione" />
                            </UiSelectTrigger>
                            <UiSelectContent>
                              <UiSelectItem value="nao_informado">
                                Não informado
                              </UiSelectItem>
                              <UiSelectItem value="sim">Sim</UiSelectItem>
                              <UiSelectItem value="nao">Não</UiSelectItem>
                            </UiSelectContent>
                          </UiSelect>
                        </div>
                        <div className="space-y-1">
                          <Label>Houve complicações?</Label>
                          <UiSelect
                            value={
                              form.watch("houve_complicacoes") === ""
                                ? "nao_informado"
                                : form.watch("houve_complicacoes")
                            }
                            onValueChange={(v) =>
                              void form.setValue(
                                "houve_complicacoes",
                                v === "nao_informado" ? "" : (v as SimNao),
                              )
                            }
                            disabled={disabled}
                          >
                            <UiSelectTrigger>
                              <UiSelectValue placeholder="Selecione" />
                            </UiSelectTrigger>
                            <UiSelectContent>
                              <UiSelectItem value="nao_informado">
                                Não informado
                              </UiSelectItem>
                              <UiSelectItem value="sim">Sim</UiSelectItem>
                              <UiSelectItem value="nao">Não</UiSelectItem>
                            </UiSelectContent>
                          </UiSelect>
                        </div>
                        <div className="space-y-1">
                          <Label>Possui peça anatômica?</Label>
                          <UiSelect
                            value={
                              form.watch("possui_peca_anatomo") === ""
                                ? "nao_informado"
                                : form.watch("possui_peca_anatomo")
                            }
                            onValueChange={(v) =>
                              void form.setValue(
                                "possui_peca_anatomo",
                                v === "nao_informado" ? "" : (v as SimNao),
                              )
                            }
                            disabled={disabled}
                          >
                            <UiSelectTrigger>
                              <UiSelectValue placeholder="Selecione" />
                            </UiSelectTrigger>
                            <UiSelectContent>
                              <UiSelectItem value="nao_informado">
                                Não informado
                              </UiSelectItem>
                              <UiSelectItem value="sim">Sim</UiSelectItem>
                              <UiSelectItem value="nao">Não</UiSelectItem>
                            </UiSelectContent>
                          </UiSelect>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <Label>Descrição das complicações</Label>
                          <Textarea
                            rows={3}
                            {...register("descricao_complicacoes")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Sangramento estimado</Label>
                          <Input
                            {...register("sangramento_estimado")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Observações adicionais</Label>
                          <Textarea
                            rows={3}
                            {...register("observacoes_adicionais")}
                            disabled={disabled}
                          />
                        </div>
                      </div>
                    </section>

                    {/* 10. Plano terapêutico */}
                    <section className="space-y-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        10. Plano terapêutico pós-operatório
                      </h2>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <Label>Uso de antibióticos</Label>
                          <Input
                            {...register("uso_antibioticos")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Profilaxia TEV/TVP</Label>
                          <Input
                            {...register("profilaxia_tev_tvp")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Troca de curativo</Label>
                          <Input
                            {...register("troca_curativo")}
                            disabled={disabled}
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <Label>Dieta</Label>
                          <Input {...register("dieta")} disabled={disabled} />
                        </div>
                        <div>
                          <Label>Deambulação</Label>
                          <Input
                            {...register("deambulacao")}
                            disabled={disabled}
                          />
                        </div>
                        <div>
                          <Label>Previsão de alta</Label>
                          <Input
                            {...register("previsao_alta")}
                            disabled={disabled}
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label>Acomp. pela instituição?</Label>
                          <UiSelect
                            value={
                              form.watch(
                                "acompanhamento_pela_instituicao",
                              ) === ""
                                ? "nao_informado"
                                : form.watch(
                                    "acompanhamento_pela_instituicao",
                                  )
                            }
                            onValueChange={(v) =>
                              void form.setValue(
                                "acompanhamento_pela_instituicao",
                                v === "nao_informado" ? "" : (v as SimNao),
                              )
                            }
                            disabled={disabled}
                          >
                            <UiSelectTrigger>
                              <UiSelectValue placeholder="Selecione" />
                            </UiSelectTrigger>
                            <UiSelectContent>
                              <UiSelectItem value="nao_informado">
                                Não informado
                              </UiSelectItem>
                              <UiSelectItem value="sim">Sim</UiSelectItem>
                              <UiSelectItem value="nao">Não</UiSelectItem>
                            </UiSelectContent>
                          </UiSelect>
                        </div>
                        <div className="md:col-span-2">
                          <Label>Outras orientações</Label>
                          <Input
                            {...register("outras_orientacoes")}
                            disabled={disabled}
                          />
                        </div>
                      </div>
                    </section>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Lista de descrições: só aparece quando NÃO estiver cadastrando/editando */}
            {!showForm && (
              <div className="mb-4">
                <AdminDescricaoCirurgicaList
                  items={listaDescricoes}
                  isLoading={carregandoLista}
                  onNovaDescricao={handleNovaDescricao}
                  onVisualizar={handleVisualizar}
                  onEditar={handleEditar}
                  onExcluir={handleExcluir}
                  onVerArquivos={handleVerArquivos}
                />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Dialog de visualização */}
      <Dialog
        open={!!viewItem}
        onOpenChange={(open) => {
          if (!open) {
            setViewItem(null);
            setViewData(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar descrição cirúrgica</DialogTitle>
            <DialogDescription>
              Detalhes completos da descrição selecionada.
            </DialogDescription>
          </DialogHeader>

          {carregandoView || !viewData ? (
            <p className="text-sm text-slate-500">
              {carregandoView
                ? "Carregando dados da descrição..."
                : "Nenhum dado disponível."}
            </p>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label className="text-xs text-slate-500">
                    Médico responsável
                  </Label>
                  <p className="font-medium">
                    {viewData.cirurgiao_responsavel || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">
                    Paciente
                  </Label>
                  <p className="font-medium">
                    {viewData.nome_social ||
                      viewData.registro_civil ||
                      "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">
                    Nº prontuário
                  </Label>
                  <p className="font-medium">
                    {viewData.prontuario || "-"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs text-slate-500">
                    Convênio / Plano
                  </Label>
                  <p>{viewData.convenio_plano || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">
                    Setor / Leito
                  </Label>
                  <p>
                    {viewData.setor || "-"}{" "}
                    {viewData.leito ? `· Leito ${viewData.leito}` : ""}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-500">
                  Tipo de cirurgia
                </Label>
                <p>{viewData.tipo_cirurgia || "-"}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs text-slate-500">
                    Diagnóstico pré-operatório
                  </Label>
                  <p className="whitespace-pre-wrap">
                    {viewData.diagnostico_pre_operatorio || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">
                    Diagnóstico pós-operatório
                  </Label>
                  <p className="whitespace-pre-wrap">
                    {viewData.diagnostico_pos_operatorio || "-"}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-500">
                  Texto da descrição cirúrgica
                </Label>
                <div className="mt-1 max-h-72 overflow-y-auto rounded-lg bg-slate-100/80 p-3 text-sm leading-relaxed text-slate-800 dark:bg-slate-900/70 dark:text-slate-100">
                  {viewData.descricao_cirurgica
                    ? viewData.descricao_cirurgica
                    : "Nenhum texto de descrição cadastrado."}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DescricaoCirurgicaPage;
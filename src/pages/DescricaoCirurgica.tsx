import React, { useState, useEffect } from "react";
import {
  Bell,
  Search,
  FileSignature,
  Plus,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";

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
  type DescricaoCirurgicaFormData,
  listarDescricoesCirurgicasDoMedicoLogado,
  type DescricaoCirurgicaResumoMedico,
  excluirDescricaoCirurgica,
  atualizarStatusDescricaoCirurgica,
  buscarDescricaoCirurgicaPorId,
} from "@/services/descricao-cirurgica-service";
import type {
  DbDescricaoCirurgicaStatus,
  DbDescricaoCirurgica,
} from "@/db/schema";
import AdminDescricaoCirurgicaList from "@/components/descricao-cirurgica/AdminDescricaoCirurgicaList";
import AdminSidebar from "@/components/admin/AdminSidebar";

const DescricaoCirurgicaPage: React.FC = () => {
  const navigate = useNavigate();
  const [salvando, setSalvando] = useState(false);
  const [listaDescricoes, setListaDescricoes] = useState<
    DescricaoCirurgicaResumoMedico[]
  >([]);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [viewItem, setViewItem] =
    useState<DescricaoCirurgicaResumoMedico | null>(null);
  const [viewData, setViewData] = useState<DbDescricaoCirurgica | null>(null);
  const [carregandoView, setCarregandoView] = useState(false);

  const [editItem, setEditItem] =
    useState<DescricaoCirurgicaResumoMedico | null>(null);
  const [editStatus, setEditStatus] = useState<DbDescricaoCirurgicaStatus | "">(
    "",
  );
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
    void carregarDescricoes();
  }, []);

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
      await criarDescricaoCirurgica(data);
      showSuccess("Descrição cirúrgica salva com sucesso.");
      reset();
      setShowForm(false);
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

  const disabled = salvando || isSubmitting;

  const handleNovaDescricao = () => {
    reset();
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const handleEditar = (item: DescricaoCirurgicaResumoMedico) => {
    setEditItem(item);
    setEditStatus(item.status ?? "AGUARDANDO");
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

  const handleSalvarStatus = async () => {
    if (!editItem || !editStatus) return;
    setProcessandoAcao(true);
    try {
      await atualizarStatusDescricaoCirurgica(editItem.id, editStatus);
      showSuccess("Status atualizado com sucesso.");
      setEditItem(null);
      setEditStatus("");
      await carregarDescricoes();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar o status.";
      showError(message);
    } finally {
      setProcessandoAcao(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Container principal */}
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="descricao" />

        {/* Área principal */}
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

          {/* Lista + Formulário */}
          <main className="flex-1 overflow-y-auto pb-2">
            <div className="mb-4">
              <AdminDescricaoCirurgicaList
                items={listaDescricoes}
                isLoading={carregandoLista}
                onNovaDescricao={handleNovaDescricao}
                onVisualizar={handleVisualizar}
                onEditar={handleEditar}
                onExcluir={handleExcluir}
              />
            </div>

            {showForm && (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mb-4 space-y-4"
              >
                {/* 1. Identificação do Paciente */}
                <Card className="border-slate-200/80 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">
                      1. Identificação do Paciente
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Dados básicos do paciente conforme prontuário.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label htmlFor="prontuario">Nº Prontuário</Label>
                        <Input
                          id="prontuario"
                          {...register("prontuario")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="registro">Registro</Label>
                        <Input
                          id="registro"
                          {...register("registro")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="matricula">Matrícula</Label>
                        <Input
                          id="matricula"
                          {...register("matricula")}
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="nome_social">Nome do paciente</Label>
                        <Input
                          id="nome_social"
                          {...register("nome_social")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="registro_civil">
                          Nome civil / Registro civil
                        </Label>
                        <Input
                          id="registro_civil"
                          {...register("registro_civil")}
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="space-y-1">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input
                          id="cpf"
                          {...register("cpf")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="data_nascimento">
                          Data de nascimento
                        </Label>
                        <Input
                          id="data_nascimento"
                          type="date"
                          {...register("data_nascimento")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="idade">Idade</Label>
                        <Input
                          id="idade"
                          type="number"
                          {...register("idade")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sexo">Sexo</Label>
                        <Input
                          id="sexo"
                          placeholder="M / F / Outro"
                          {...register("sexo")}
                          disabled={disabled}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Internação */}
                <Card className="border-slate-200/80 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">
                      2. Informações de Internação
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Dados do convênio, setor e entrada do paciente.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label htmlFor="convenio_plano">
                          Convênio / Plano
                        </Label>
                        <Input
                          id="convenio_plano"
                          {...register("convenio_plano")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="setor">Setor</Label>
                        <Input
                          id="setor"
                          {...register("setor")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="leito">Leito</Label>
                        <Input
                          id="leito"
                          {...register("leito")}
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="dthr_admissao">
                        Data e hora de admissão
                      </Label>
                      <Input
                        id="dthr_admissao"
                        type="datetime-local"
                        {...register("dthr_admissao")}
                        disabled={disabled}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Informações iniciais da cirurgia */}
                <Card className="border-slate-200/80 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">
                      3. Informações da Cirurgia
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Dados gerais do procedimento cirúrgico.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label htmlFor="status">Status</Label>
                        <UiSelect
                          value={form.watch("status")}
                          onValueChange={(value) => {
                            void form.setValue("status", value);
                          }}
                          disabled={disabled}
                        >
                          <UiSelectTrigger id="status">
                            <UiSelectValue placeholder="Selecione" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem value="AGUARDANDO">
                              Aguardando
                            </UiSelectItem>
                            <UiSelectItem value="CONFIRMADO">
                              Confirmado
                            </UiSelectItem>
                            <UiSelectItem value="EM_FATURAMENTO">
                              Em faturamento
                            </UiSelectItem>
                            <UiSelectItem value="PAGO">Pago</UiSelectItem>
                            <UiSelectItem value="EM_GLOSA">
                              Em glosa
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label htmlFor="tipo_cirurgia">
                          Tipo de cirurgia / Procedimento principal
                        </Label>
                        <Input
                          id="tipo_cirurgia"
                          {...register("tipo_cirurgia")}
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="space-y-1">
                        <Label htmlFor="data_inicio_procedimento">
                          Data início
                        </Label>
                        <Input
                          id="data_inicio_procedimento"
                          type="date"
                          {...register("data_inicio_procedimento")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="hora_inicio_procedimento">
                          Hora início
                        </Label>
                        <Input
                          id="hora_inicio_procedimento"
                          type="time"
                          {...register("hora_inicio_procedimento")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="data_fim_procedimento">
                          Data fim
                        </Label>
                        <Input
                          id="data_fim_procedimento"
                          type="date"
                          {...register("data_fim_procedimento")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="hora_fim_procedimento">
                          Hora fim
                        </Label>
                        <Input
                          id="hora_fim_procedimento"
                          type="time"
                          {...register("hora_fim_procedimento")}
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="diagnostico_pre_operatorio">
                          Diagnóstico pré-operatório
                        </Label>
                        <Textarea
                          id="diagnostico_pre_operatorio"
                          rows={3}
                          {...register("diagnostico_pre_operatorio")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="diagnostico_pos_operatorio">
                          Diagnóstico pós-operatório
                        </Label>
                        <Textarea
                          id="diagnostico_pos_operatorio"
                          rows={3}
                          {...register("diagnostico_pos_operatorio")}
                          disabled={disabled}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Procedimentos */}
                <Card className="border-slate-200/80 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        4. Procedimentos realizados
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Lista dos procedimentos faturáveis realizados.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() =>
                        procedimentosArray.append({
                          procedimento_id: "",
                          descricao_procedimento: "",
                          codigo_procedimento: "",
                          tipo_procedimento: "",
                          quantidade: "",
                        })
                      }
                      disabled={disabled}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {procedimentosArray.fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="space-y-2 rounded-xl border border-slate-200/70 bg-white/70 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/70"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            Procedimento #{index + 1}
                          </span>
                          {procedimentosArray.fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              onClick={() =>
                                procedimentosArray.remove(index)
                              }
                              disabled={disabled}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label>
                              Código do procedimento
                            </Label>
                            <Input
                              {...register(
                                `procedimentos.${index}.codigo_procedimento`,
                              )}
                              disabled={disabled}
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <Label>Descrição do procedimento</Label>
                            <Input
                              {...register(
                                `procedimentos.${index}.descricao_procedimento`,
                              )}
                              disabled={disabled}
                            />
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label>Tipo</Label>
                            <Input
                              placeholder="principal / secundário"
                              {...register(
                                `procedimentos.${index}.tipo_procedimento`,
                              )}
                              disabled={disabled}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Quantidade</Label>
                            <Input
                              type="number"
                              min={0}
                              {...register(
                                `procedimentos.${index}.quantidade`,
                              )}
                              disabled={disabled}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>ID interno</Label>
                            <Input
                              {...register(
                                `procedimentos.${index}.procedimento_id`,
                              )}
                              disabled={disabled}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* 5. Equipe cirúrgica */}
                <Card className="border-slate-200/80 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        5. Equipe cirúrgica
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Profissionais envolvidos no procedimento.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() =>
                        equipeArray.append({
                          nome_profissional: "",
                          funcao: "",
                          conselho: "",
                          numero_conselho: "",
                          uf_conselho: "",
                        })
                      }
                      disabled={disabled}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {equipeArray.fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="space-y-2 rounded-xl border border-slate-200/70 bg-white/70 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/70"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            Profissional #{index + 1}
                          </span>
                          {equipeArray.fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              onClick={() => equipeArray.remove(index)}
                              disabled={disabled}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="space-y-1 md:col-span-2">
                            <Label>Nome</Label>
                            <Input
                              {...register(
                                `equipe.${index}.nome_profissional`,
                              )}
                              disabled={disabled}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Função</Label>
                            <Input
                              {...register(`equipe.${index}.funcao`)}
                              disabled={disabled}
                            />
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label>Conselho</Label>
                            <Input
                              {...register(`equipe.${index}.conselho`)}
                              disabled={disabled}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Nº Conselho</Label>
                            <Input
                              {...register(`equipe.${index}.numero_conselho`)}
                              disabled={disabled}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>UF Conselho</Label>
                            <Input
                              {...register(`equipe.${index}.uf_conselho`)}
                              disabled={disabled}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* 6. Texto da descrição cirúrgica */}
                <Card className="border-slate-200/80 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">
                      6. Texto da descrição cirúrgica
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Relato detalhado do ato cirúrgico.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      rows={8}
                      placeholder="Descreva o procedimento realizado, via de acesso, técnica, achados, condutas, etc."
                      {...register("descricao_cirurgica")}
                      disabled={disabled}
                    />
                  </CardContent>
                </Card>

                {/* 7. Auditoria */}
                <Card className="border-slate-200/80 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">
                      7. Informações de Auditoria
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Responsável técnico e registros de impressão/ conferência.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1 md:col-span-2">
                        <Label htmlFor="cirurgiao_responsavel">
                          Cirurgião responsável
                        </Label>
                        <Input
                          id="cirurgiao_responsavel"
                          {...register("cirurgiao_responsavel")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cirurgiao_responsavel_crm">
                          CRM
                        </Label>
                        <Input
                          id="cirurgiao_responsavel_crm"
                          {...register("cirurgiao_responsavel_crm")}
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label htmlFor="data_hora_afere">
                          Data/hora aferição
                        </Label>
                        <Input
                          id="data_hora_afere"
                          type="datetime-local"
                          {...register("data_hora_afere")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="usuario_impressao">
                          Usuário impressão
                        </Label>
                        <Input
                          id="usuario_impressao"
                          {...register("usuario_impressao")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="data_hora_impressao">
                          Data/hora impressão
                        </Label>
                        <Input
                          id="data_hora_impressao"
                          type="datetime-local"
                          {...register("data_hora_impressao")}
                          disabled={disabled}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 8. Materiais (OPME) */}
                <Card className="border-slate-200/80 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        8. Materiais utilizados (OPME)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Materiais e implantes utilizados durante o ato cirúrgico.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full"
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
                      disabled={disabled}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {materiaisArray.fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="space-y-2 rounded-xl border border-slate-200/70 bg-white/70 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/70"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            Material #{index + 1}
                          </span>
                          {materiaisArray.fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              onClick={() => materiaisArray.remove(index)}
                              disabled={disabled}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label>Material ID</Label>
                            <Input
                              {...register(
                                `materiais.${index}.material_id`,
                              )}
                              disabled={disabled}
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <Label>Nome do material</Label>
                            <Input
                              {...register(
                                `materiais.${index}.nome_material`,
                              )}
                              disabled={disabled}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label>Descrição</Label>
                          <Input
                            {...register(
                              `materiais.${index}.descricao_material`,
                            )}
                            disabled={disabled}
                          />
                        </div>
                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label>Quantidade</Label>
                            <Input
                              type="number"
                              min={0}
                              {...register(
                                `materiais.${index}.quantidade`,
                              )}
                              disabled={disabled}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Lote</Label>
                            <Input
                              {...register(`materiais.${index}.lote`)}
                              disabled={disabled}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Fabricante</Label>
                            <Input
                              {...register(`materiais.${index}.fabricante`)}
                              disabled={disabled}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* 9. Informações adicionais */}
                <Card className="border-slate-200/80 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">
                      9. Informações adicionais
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Complicações, peça anatômica, sangramento e observações.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label>Diagnóstico pré = pós?</Label>
                        <UiSelect
                          value={form.watch("diagnostico_pre_igual_pos")}
                          onValueChange={(v) =>
                            void form.setValue(
                              "diagnostico_pre_igual_pos",
                              v as any,
                            )
                          }
                          disabled={disabled}
                        >
                          <UiSelectTrigger>
                            <UiSelectValue placeholder="Selecione" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem value="">Não informado</UiSelectItem>
                            <UiSelectItem value="sim">Sim</UiSelectItem>
                            <UiSelectItem value="nao">Não</UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                      <div className="space-y-1">
                        <Label>Houve complicações?</Label>
                        <UiSelect
                          value={form.watch("houve_complicacoes")}
                          onValueChange={(v) =>
                            void form.setValue(
                              "houve_complicacoes",
                              v as any,
                            )
                          }
                          disabled={disabled}
                        >
                          <UiSelectTrigger>
                            <UiSelectValue placeholder="Selecione" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem value="">Não informado</UiSelectItem>
                            <UiSelectItem value="sim">Sim</UiSelectItem>
                            <UiSelectItem value="nao">Não</UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                      <div className="space-y-1">
                        <Label>Possui peça anatômica?</Label>
                        <UiSelect
                          value={form.watch("possui_peca_anatomo")}
                          onValueChange={(v) =>
                            void form.setValue(
                              "possui_peca_anatomo",
                              v as any,
                            )
                          }
                          disabled={disabled}
                        >
                          <UiSelectTrigger>
                            <UiSelectValue placeholder="Selecione" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem value="">Não informado</UiSelectItem>
                            <UiSelectItem value="sim">Sim</UiSelectItem>
                            <UiSelectItem value="nao">Não</UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Sangramento estimado</Label>
                        <Input
                          {...register("sangramento_estimado")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Descrição das complicações</Label>
                        <Textarea
                          rows={3}
                          {...register("descricao_complicacoes")}
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Observações adicionais</Label>
                      <Textarea
                        rows={3}
                        {...register("observacoes_adicionais")}
                        disabled={disabled}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 10. Plano terapêutico pós-operatório */}
                <Card className="border-slate-200/80 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">
                      10. Plano terapêutico pós-operatório
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Condutas, medicações e orientações após o procedimento.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Uso de antibióticos</Label>
                        <Input
                          {...register("uso_antibioticos")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Profilaxia TEV/TVP</Label>
                        <Input
                          {...register("profilaxia_tev_tvp")}
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label>Troca de curativo</Label>
                        <Input
                          {...register("troca_curativo")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Dieta</Label>
                        <Input
                          {...register("dieta")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Deambulação</Label>
                        <Input
                          {...register("deambulacao")}
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label>Previsão de alta</Label>
                        <Input
                          {...register("previsao_alta")}
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Acomp. pela instituição?</Label>
                        <UiSelect
                          value={form.watch(
                            "acompanhamento_pela_instituicao",
                          )}
                          onValueChange={(v) =>
                            void form.setValue(
                              "acompanhamento_pela_instituicao",
                              v as any,
                            )
                          }
                          disabled={disabled}
                        >
                          <UiSelectTrigger>
                            <UiSelectValue placeholder="Selecione" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem value="">Não informado</UiSelectItem>
                            <UiSelectItem value="sim">Sim</UiSelectItem>
                            <UiSelectItem value="nao">Não</UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                      <div className="space-y-1">
                        <Label>Outras orientações</Label>
                        <Input
                          {...register("outras_orientacoes")}
                          disabled={disabled}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ações do formulário */}
                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      reset();
                      setShowForm(false);
                    }}
                    disabled={disabled}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-full bg-[#135bec] text-white hover:bg-[#0f4ac0]"
                    disabled={disabled}
                  >
                    {disabled ? "Salvando..." : "Salvar descrição cirúrgica"}
                  </Button>
                </div>
              </form>
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

      {/* Dialog de alteração de status */}
      <Dialog
        open={!!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setEditItem(null);
            setEditStatus("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar status da descrição</DialogTitle>
            <DialogDescription>
              Atualize o status da descrição cirúrgica selecionada.
            </DialogDescription>
          </DialogHeader>

          {editItem && (
            <div className="space-y-4 text-sm">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">
                  Paciente
                </Label>
                <p className="font-medium">
                  {editItem.nomePaciente || "-"}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500">
                  Status atual
                </Label>
                <p>{editItem.status ?? "AGUARDANDO"}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500">
                  Novo status
                </Label>
                <UiSelect
                  value={editStatus || "AGUARDANDO"}
                  onValueChange={(value) =>
                    setEditStatus(value as DbDescricaoCirurgicaStatus)
                  }
                  disabled={processandoAcao}
                >
                  <UiSelectTrigger>
                    <UiSelectValue placeholder="Selecione o novo status" />
                  </UiSelectTrigger>
                  <UiSelectContent>
                    <UiSelectItem value="AGUARDANDO">
                      Aguardando
                    </UiSelectItem>
                    <UiSelectItem value="CONFIRMADO">
                      Confirmado
                    </UiSelectItem>
                    <UiSelectItem value="EM_FATURAMENTO">
                      Em faturamento
                    </UiSelectItem>
                    <UiSelectItem value="PAGO">Pago</UiSelectItem>
                    <UiSelectItem value="EM_GLOSA">
                      Em glosa
                    </UiSelectItem>
                  </UiSelectContent>
                </UiSelect>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setEditItem(null);
                    setEditStatus("");
                  }}
                  disabled={processandoAcao}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="rounded-full bg-[#135bec] text-white hover:bg-[#0f4ac0]"
                  onClick={() => void handleSalvarStatus()}
                  disabled={processandoAcao || !editStatus}
                >
                  {processandoAcao ? "Salvando..." : "Salvar status"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DescricaoCirurgicaPage;
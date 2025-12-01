import React, { useState, useEffect } from "react";
import {
  Home,
  FileText,
  Users,
  Stethoscope,
  MessageCircle,
  Settings,
  HelpCircle,
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
import { showError, showSuccess } from "@/utils/toast";
import {
  criarDescricaoCirurgica,
  type DescricaoCirurgicaFormData,
  listarDescricoesCirurgicasDoMedicoLogado,
  type DescricaoCirurgicaResumoMedico,
} from "@/services/descricao-cirurgica-service";
import AdminDescricaoCirurgicaList from "@/components/descricao-cirurgica/AdminDescricaoCirurgicaList";

const DescricaoCirurgicaPage: React.FC = () => {
  const navigate = useNavigate();
  const [salvando, setSalvando] = useState(false);
  const [listaDescricoes, setListaDescricoes] = useState<
    DescricaoCirurgicaResumoMedico[]
  >([]);
  const [carregandoLista, setCarregandoLista] = useState(false);

  useEffect(() => {
    const load = async () => {
      setCarregandoLista(true);
      try {
        const data = await listarDescricoesCirurgicasDoMedicoLogado();
        setListaDescricoes(data);
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

    void load();
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
      reset({
        ...data,
        status: "AGUARDANDO",
      });
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

  return (
    <div className="relative flex min-h-screen w-full bg-[#f4f7ff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Fundo em gradiente suave */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#e5f0ff] via-[#f8fbff] to-[#e3eeff] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />

      {/* Container principal */}
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        {/* Sidebar (admin) */}
        <aside className="hidden w-60 flex-col justify-between rounded-3xl bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:bg-slate-900/90 lg:flex">
          <div className="flex flex-col gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#135bec]">
                <img
                  src="/logo.jpeg"
                  alt="Logo NP Saúde Pró"
                  className="h-8 w-8 rounded-xl object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-50">
                  NP Saúde Pró
                </span>
                <span className="text-xs text-slate-400">
                  Painel administrativo
                </span>
              </div>
            </div>

            {/* Menu */}
            <nav className="flex flex-col gap-1">
              <button
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                onClick={() => navigate("/admin/dashboard")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Home className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Home</span>
                </span>
              </button>

              <button
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                onClick={() => navigate("/sadt/cadastro")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="font-medium">SADT&apos;s</span>
                </span>
              </button>

              {/* Novo item: Descrição Cirúrgica (ativo nesta tela) */}
              <button
                className="flex items-center justify-between rounded-2xl bg-[#135bec] px-3 py-2.5 text-sm text-white shadow-md shadow-blue-500/40 transition-all"
                onClick={() => navigate("/descricao-cirurgica")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white">
                    <FileSignature className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Descrição Cirúrgica</span>
                </span>
              </button>

              <button className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Recursos</span>
                </span>
              </button>

              {/* Grupo Cadastro */}
              <div className="mt-1 rounded-2xl bg-slate-50/80 p-2 text-xs text-slate-500 ring-1 ring-slate-100/80 dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-800">
                <div className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Users className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-100">
                    Cadastro
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  <button
                    className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                    onClick={() => navigate("/cadastro/clinicas")}
                  >
                    <span className="ml-7">Clínicas / Hospitais</span>
                  </button>
                  <button
                    className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                    onClick={() => navigate("/cadastro/medicos")}
                  >
                    <span className="ml-7">Médicos</span>
                  </button>
                  <button className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                    <span className="ml-7">Planos de Saúde</span>
                  </button>
                </div>
              </div>

              <button className="mt-1 flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Mensagens</span>
                </span>
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 text-[11px] font-semibold text-white">
                  2
                </span>
              </button>

              <button
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                onClick={() => navigate("/admin/configuracoes")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Settings className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Configurações</span>
                </span>
              </button>

              <button className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <HelpCircle className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Ajuda</span>
                </span>
              </button>
            </nav>
          </div>

          <button className="mt-4 flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <HelpCircle className="h-4 w-4" />
            </span>
            <span>Sair</span>
          </button>
        </aside>

        {/* Área principal */}
        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-transparent lg:bg-white/80 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl dark:lg:bg-slate-900/90">
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
                Registro estruturado da descrição cirúrgica, com procedimentos, equipe e materiais utilizados.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200/80 focus-within:ring-[#135bec] dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 sm:flex">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar"
                  className="h-7 w-40 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-50 sm:w-52 sm:text-sm"
                />
              </div>

              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm ring-1 ring-slate-200/70 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
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
              />
            </div>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              {/* 1. Identificação do Paciente */}
              <Card className="rounded-3xl border-slate-100 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">
                    1. Identificação do Paciente
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Dados básicos do paciente relacionados à internação atual.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs sm:text-sm">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-200">
                        Prontuário
                      </label>
                      <Input
                        {...register("prontuario")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Registro
                      </label>
                      <Input
                        {...register("registro")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Nome social
                      </label>
                      <Input
                        {...register("nome_social")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Registro civil
                      </label>
                      <Input
                        {...register("registro_civil")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        CPF
                      </label>
                      <Input
                        {...register("cpf")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Matrícula
                      </label>
                      <Input
                        {...register("matricula")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Data de nascimento
                      </label>
                      <Input
                        type="date"
                        {...register("data_nascimento")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium">
                          Idade
                        </label>
                        <Input
                          type="number"
                          {...register("idade")}
                          className="h-9 text-xs sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium">
                          Sexo
                        </label>
                        <select
                          {...register("sexo")}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
                        >
                          <option value="">Selecione</option>
                          <option value="F">Feminino</option>
                          <option value="M">Masculino</option>
                          <option value="O">Outro</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Informações de Internação */}
              <Card className="rounded-3xl border-slate-100 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">
                    2. Informações de Internação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs sm:text-sm">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Convênio / Plano
                      </label>
                      <Input
                        {...register("convenio_plano")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Setor
                      </label>
                      <Input
                        {...register("setor")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Leito
                      </label>
                      <Input
                        {...register("leito")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Data e hora de admissão
                      </label>
                      <Input
                        type="datetime-local"
                        {...register("dthr_admissao")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Informações Iniciais da Cirurgia */}
              <Card className="rounded-3xl border-slate-100 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">
                    3. Informações Iniciais da Cirurgia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs sm:text-sm">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Status
                      </label>
                      <select
                        {...register("status")}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
                      >
                        <option value="AGUARDANDO">Aguardando</option>
                        <option value="CONFIRMADO">Confirmado</option>
                        <option value="EM_FATURAMENTO">Em faturamento</option>
                        <option value="PAGO">Pago</option>
                        <option value="EM_GLOSA">Em glosa</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Tipo de cirurgia
                      </label>
                      <select
                        {...register("tipo_cirurgia")}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
                      >
                        <option value="">Selecione</option>
                        <option value="ELETIVA">Eletiva</option>
                        <option value="URGENCIA">Urgência</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Data início procedimento
                      </label>
                      <Input
                        type="date"
                        {...register("data_inicio_procedimento")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Hora início
                      </label>
                      <Input
                        type="time"
                        {...register("hora_inicio_procedimento")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Data fim procedimento
                      </label>
                      <Input
                        type="date"
                        {...register("data_fim_procedimento")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Hora fim
                      </label>
                      <Input
                        type="time"
                        {...register("hora_fim_procedimento")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Diagnóstico pré-operatório
                      </label>
                      <Textarea
                        rows={2}
                        {...register("diagnostico_pre_operatorio")}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Diagnóstico pós-operatório
                      </label>
                      <Textarea
                        rows={2}
                        {...register("diagnostico_pos_operatorio")}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Procedimentos Realizados */}
              <Card className="rounded-3xl border-slate-100 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">
                    4. Procedimentos Realizados
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Informe um ou mais procedimentos cirúrgicos realizados.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs sm:text-sm">
                  {procedimentosArray.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-100">
                          Procedimento #{index + 1}
                        </span>
                        {procedimentosArray.fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => procedimentosArray.remove(index)}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-600 ring-1 ring-rose-100 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remover
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium">
                            ID / Código interno
                          </label>
                          <Input
                            {...register(
                              `procedimentos.${index}.procedimento_id`,
                            )}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-[11px] font-medium">
                            Descrição do procedimento
                          </label>
                          <Input
                            {...register(
                              `procedimentos.${index}.descricao_procedimento`,
                            )}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium">
                            Código (TUSS/CBHPM)
                          </label>
                          <Input
                            {...register(
                              `procedimentos.${index}.codigo_procedimento`,
                            )}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium">
                            Tipo de procedimento
                          </label>
                          <select
                            {...register(
                              `procedimentos.${index}.tipo_procedimento`,
                            )}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
                          >
                            <option value="">Selecione</option>
                            <option value="PRINCIPAL">Principal</option>
                            <option value="SECUNDARIO">Secundário</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium">
                            Quantidade
                          </label>
                          <Input
                            type="number"
                            {...register(
                              `procedimentos.${index}.quantidade`,
                            )}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 inline-flex items-center gap-2 rounded-full"
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
                    <Plus className="h-4 w-4" />
                    Adicionar procedimento
                  </Button>
                </CardContent>
              </Card>

              {/* 5. Equipe Cirúrgica */}
              <Card className="rounded-3xl border-slate-100 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">
                    5. Equipe Cirúrgica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs sm:text-sm">
                  {equipeArray.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-100">
                          Membro da equipe #{index + 1}
                        </span>
                        {equipeArray.fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => equipeArray.remove(index)}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-600 ring-1 ring-rose-100 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remover
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-[11px] font-medium">
                            Nome do profissional
                          </label>
                          <Input
                            {...register(
                              `equipe.${index}.nome_profissional`,
                            )}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium">
                            Função
                          </label>
                          <Input
                            placeholder="Cirurgião, 1º auxiliar..."
                            {...register(`equipe.${index}.funcao`)}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium">
                            Conselho (CRM/COREN/INST)
                          </label>
                          <Input
                            {...register(`equipe.${index}.conselho`)}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium">
                            Nº do conselho
                          </label>
                          <Input
                            {...register(`equipe.${index}.numero_conselho`)}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium">
                            UF
                          </label>
                          <Input
                            {...register(`equipe.${index}.uf_conselho`)}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 inline-flex items-center gap-2 rounded-full"
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
                    <Plus className="h-4 w-4" />
                    Adicionar membro da equipe
                  </Button>
                </CardContent>
              </Card>

              {/* 6. Texto da Descrição Cirúrgica */}
              <Card className="rounded-3xl border-slate-100 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">
                    6. Texto da Descrição Cirúrgica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs sm:text-sm">
                  <Textarea
                    rows={8}
                    placeholder="Descreva aqui o procedimento cirúrgico realizado, técnica utilizada, achados, hemostasia, síntese, etc."
                    {...register("descricao_cirurgica")}
                    className="text-xs sm:text-sm"
                  />
                </CardContent>
              </Card>

              {/* 7. Informações de Auditoria */}
              <Card className="rounded-3xl border-slate-100 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">
                    7. Informações de Auditoria
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs sm:text-sm">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Cirurgião responsável
                      </label>
                      <Input
                        {...register("cirurgiao_responsavel")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        CRM do cirurgião
                      </label>
                      <Input
                        {...register("cirurgiao_responsavel_crm")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Data/hora aferição
                      </label>
                      <Input
                        type="datetime-local"
                        {...register("data_hora_afere")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Usuário de impressão
                      </label>
                      <Input
                        {...register("usuario_impressao")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Data/hora impressão
                      </label>
                      <Input
                        type="datetime-local"
                        {...register("data_hora_impressao")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 8. Materiais Utilizados (OPME) */}
              <Card className="rounded-3xl border-slate-100 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">
                    8. Materiais Utilizados (OPME)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs sm:text-sm">
                  {materiaisArray.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-100">
                          Material #{index + 1}
                        </span>
                        {materiaisArray.fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => materiaisArray.remove(index)}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-600 ring-1 ring-rose-100 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remover
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium">
                            ID / Código material
                          </label>
                          <Input
                            {...register(`materiais.${index}.material_id`)}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-[11px] font-medium">
                            Nome do material
                          </label>
                          <Input
                            {...register(`materiais.${index}.nome_material`)}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium">
                            Quantidade
                          </label>
                          <Input
                            type="number"
                            {...register(`materiais.${index}.quantidade`)}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-[11px] font-medium">
                            Descrição / Observações
                          </label>
                          <Input
                            {...register(
                              `materiais.${index}.descricao_material`,
                            )}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium">
                            Lote
                          </label>
                          <Input
                            {...register(`materiais.${index}.lote`)}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium">
                            Fabricante
                          </label>
                          <Input
                            {...register(`materiais.${index}.fabricante`)}
                            className="h-9 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 inline-flex items-center gap-2 rounded-full"
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
                    <Plus className="h-4 w-4" />
                    Adicionar material
                  </Button>
                </CardContent>
              </Card>

              {/* 9. Informações Adicionais */}
              <Card className="rounded-3xl border-slate-100 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">
                    9. Informações Adicionais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs sm:text-sm">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Diagnóstico pré igual ao pós?
                      </label>
                      <select
                        {...register("diagnostico_pre_igual_pos")}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
                      >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Houve complicações?
                      </label>
                      <select
                        {...register("houve_complicacoes")}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
                      >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Possui peça para anatomopatológico?
                      </label>
                      <select
                        {...register("possui_peca_anatomo")}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
                      >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Descrição das complicações
                      </label>
                      <Textarea
                        rows={2}
                        {...register("descricao_complicacoes")}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Sangramento estimado
                      </label>
                      <Input
                        placeholder="Ex.: 200ml, moderado, etc."
                        {...register("sangramento_estimado")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium">
                      Observações adicionais
                    </label>
                    <Textarea
                      rows={2}
                      {...register("observacoes_adicionais")}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 10. Plano Terapêutico Pós-operatório */}
              <Card className="rounded-3xl border-slate-100 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">
                    10. Plano Terapêutico Pós-operatório
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs sm:text-sm">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Uso de antibióticos
                      </label>
                      <Input
                        {...register("uso_antibioticos")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Profilaxia TEV/TVP
                      </label>
                      <Input
                        {...register("profilaxia_tev_tvp")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Troca de curativo
                      </label>
                      <Input
                        {...register("troca_curativo")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Dieta
                      </label>
                      <Input
                        {...register("dieta")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Deambulação
                      </label>
                      <Input
                        {...register("deambulacao")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Previsão de alta
                      </label>
                      <Input
                        {...register("previsao_alta")}
                        className="h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Acompanhamento pela instituição?
                      </label>
                      <select
                        {...register("acompanhamento_pela_instituicao")}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
                      >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium">
                        Outras orientações
                      </label>
                      <Textarea
                        rows={2}
                        {...register("outras_orientacoes")}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ações finais */}
              <div className="sticky bottom-0 mt-2 flex flex-col items-center gap-3 bg-gradient-to-t from-white/95 to-white/40 py-3 backdrop-blur dark:from-slate-900/95 dark:to-slate-900/40 sm:flex-row sm:justify-end sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full sm:w-auto"
                  onClick={() => navigate("/admin/dashboard")}
                  disabled={disabled}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="w-full rounded-full sm:w-auto"
                  disabled={disabled}
                >
                  {disabled ? "Salvando..." : "Salvar descrição cirúrgica"}
                </Button>
              </div>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DescricaoCirurgicaPage;
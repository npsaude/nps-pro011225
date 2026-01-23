import React, { useEffect, useState } from "react";
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
  ArrowLeft,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SadtResumo, SadtCadastroStatus, SadtEstagio } from "@/components/sadt/types";
import { showSuccess } from "@/utils/toast";

const SadtEditar: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [sadt, setSadt] = useState<SadtResumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!id) {
      setLoading(false);
      return;
    }

    const stored = window.localStorage.getItem("sadt-list");
    if (!stored) {
      setLoading(false);
      return;
    }

    const lista = JSON.parse(stored) as SadtResumo[];
    const encontrada = lista.find((item) => item.id === id) || null;
    setSadt(encontrada);
    setLoading(false);
  }, [id]);

  const handleBack = () => {
    navigate("/sadt/cadastro");
  };

  const handleChangeCampo = (campo: keyof SadtResumo, valor: string) => {
    setSadt((prev) =>
      prev
        ? {
            ...prev,
            [campo]: valor,
          }
        : prev,
    );
  };

  const handleChangeStatus = (valor: SadtCadastroStatus) => {
    setSadt((prev) =>
      prev
        ? {
            ...prev,
            status: valor,
          }
        : prev,
    );
  };

  const handleChangeEstagio = (valor: SadtEstagio) => {
    setSadt((prev) =>
      prev
        ? {
            ...prev,
            estagio: valor,
          }
        : prev,
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!sadt || typeof window === "undefined") return;

    const stored = window.localStorage.getItem("sadt-list");
    const lista = stored ? (JSON.parse(stored) as SadtResumo[]) : [];

    const novaLista = lista.map((item) =>
      item.id === sadt.id ? sadt : item,
    );

    window.localStorage.setItem("sadt-list", JSON.stringify(novaLista));

    showSuccess("SADT atualizada com sucesso.");
    navigate("/sadt/cadastro");
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[#f4f7ff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Fundo em gradiente suave */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#e5f0ff] via-[#f8fbff] to-[#e3eeff] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />

      {/* Container principal */}
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        {/* Sidebar */}
        <aside className="hidden w-60 flex-col justify-between rounded-3xl bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:bg-slate-900/90 lg:flex">
          <div className="flex flex-col gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#135bec]">
                <img
                  src="/logo.jpeg"
                  alt="Logo CONMEDIC"
                  className="h-8 w-8 rounded-xl object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-50">
                  CONMEDIC
                </span>
                <span className="text-xs text-slate-400">
                  Painel administrativo
                </span>
              </div>
            </div>

            {/* Menu */}
            <nav className="flex flex-col gap-1">
              {/* Home */}
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

              {/* SADT's - ativo */}
              <button
                className="flex items-center justify-between rounded-2xl bg-[#135bec] px-3 py-2.5 text-sm text-white shadow-md shadow-blue-500/40 transition-all"
                onClick={() => navigate("/sadt/cadastro")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="font-medium">SADT&apos;s</span>
                </span>
              </button>

              {/* Recursos */}
              <button className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Recursos</span>
                </span>
              </button>

              {/* Cadastro com subitens */}
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
                  <button className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                    <span className="ml-7">Clínicas</span>
                  </button>
                  <button className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                    <span className="ml-7">Médicos</span>
                  </button>
                  <button className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                    <span className="ml-7">Planos de Saúde</span>
                  </button>
                </div>
              </div>

              {/* Mensagens */}
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

              {/* Configurações */}
              <button className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Settings className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Configurações</span>
                </span>
              </button>

              {/* Ajuda */}
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

          {/* Logout */}
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
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                Editar SADT
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Atualize os dados principais da guia de SADT.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Campo de busca */}
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
                  alt="Foto de Jurandy Pessoa"
                  className="h-8 w-8 rounded-full object-cover"
                />
                <div className="hidden flex-col text-left sm:flex">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                    Jurandy Pessoa
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Administrador
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Conteúdo principal */}
          <main className="flex-1 overflow-y-auto pb-2">
            <div className="mt-2 flex flex-col gap-4">
              <section className="flex flex-col gap-3 rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100/80 dark:bg-slate-900/90 dark:ring-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Guia SADT</span>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 sm:text-lg">
                      Editar SADT
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                      Ajuste o número da guia, datas, profissional, operadora, status e estágio.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    Voltar para lista
                  </Button>
                </div>
              </section>

              <section className="rounded-3xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-100/80 dark:bg-slate-900/90 dark:ring-slate-800">
                {loading ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Carregando dados da SADT...
                  </p>
                ) : !sadt ? (
                  <div className="space-y-3 text-sm">
                    <p className="font-medium text-slate-900 dark:text-slate-50">
                      SADT não encontrada.
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Verifique se a guia ainda existe na lista ou tente novamente.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-full"
                      onClick={handleBack}
                    >
                      Voltar para lista
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="numeroGuiaPrincipal">
                          Nº Guia Principal
                        </Label>
                        <Input
                          id="numeroGuiaPrincipal"
                          value={sadt.numeroGuiaPrincipal}
                          onChange={(e) =>
                            handleChangeCampo(
                              "numeroGuiaPrincipal",
                              e.target.value,
                            )
                          }
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="dataAutorizacao">
                          Data da Autorização
                        </Label>
                        <Input
                          id="dataAutorizacao"
                          type="date"
                          value={sadt.dataAutorizacao}
                          onChange={(e) =>
                            handleChangeCampo("dataAutorizacao", e.target.value)
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="nomeProfissionalSolicitante">
                        Profissional Solicitante
                      </Label>
                      <Input
                        id="nomeProfissionalSolicitante"
                        value={sadt.nomeProfissionalSolicitante}
                        onChange={(e) =>
                          handleChangeCampo(
                            "nomeProfissionalSolicitante",
                            e.target.value,
                          )
                        }
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="identificacaoOperadora">
                        Identificação da Operadora
                      </Label>
                      <Input
                        id="identificacaoOperadora"
                        value={sadt.identificacaoOperadora}
                        onChange={(e) =>
                          handleChangeCampo(
                            "identificacaoOperadora",
                            e.target.value,
                          )
                        }
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Status</Label>
                        <Select
                          value={sadt.status}
                          onValueChange={(value) =>
                            handleChangeStatus(value as SadtCadastroStatus)
                          }
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ATIVO">Ativo</SelectItem>
                            <SelectItem value="INATIVO">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Estágio</Label>
                        <Select
                          value={sadt.estagio}
                          onValueChange={(value) =>
                            handleChangeEstagio(value as SadtEstagio)
                          }
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Selecione o estágio" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AGUARDANDO">
                              Aguardando
                            </SelectItem>
                            <SelectItem value="RECEBIDO">Recebido</SelectItem>
                            <SelectItem value="EM_FATURAMENTO">
                              Em faturamento
                            </SelectItem>
                            <SelectItem value="PAGO">Pago</SelectItem>
                            <SelectItem value="RETORNO_POR_GLOSA">
                              Retorno por Glosa
                            </SelectItem>
                            <SelectItem value="DEFESA_POR_GLOSA">
                              Defesa por Glosa
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={handleBack}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="rounded-full bg-indigo-600 px-5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
                      >
                        Salvar alterações
                      </Button>
                    </div>
                  </form>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SadtEditar;
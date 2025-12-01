import { useEffect, useState } from "react";
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
  KeyRound,
  FileSignature,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { carregarAppSettings, salvarTokenOpenAI } from "@/services/app-settings-service";
import { showError, showSuccess } from "@/utils/toast";

const AdminConfiguracoes = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const load = async () => {
      setCarregando(true);
      try {
        const settings = await carregarAppSettings();
        if (settings?.openaiApiToken) {
          setToken(settings.openaiApiToken);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Não foi possível carregar as configurações.";
        showError(message);
      } finally {
        setCarregando(false);
      }
    };

    void load();
  }, []);

  const handleSalvar = async (event: React.FormEvent) => {
    event.preventDefault();
    setSalvando(true);
    try {
      await salvarTokenOpenAI(token.trim());
      showSuccess("Token OpenAI salvo com sucesso.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o Token OpenAI.";
      showError(message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[#f4f7ff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#e5f0ff] via-[#f8fbff] to-[#e3eeff] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />

      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        {/* Sidebar (mesmo padrão das telas admin) */}
        <aside className="hidden w-60 flex-col justify-between rounded-3xl bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:bg-slate-900/90 lg:flex">
          <div className="flex flex-col gap-8">
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

              {/* Descrição Cirúrgica */}
              <button
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                onClick={() => navigate("/descricao-cirurgica")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
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

              {/* Configurações - item ativo nesta tela */}
              <button
                className="flex items-center justify-between rounded-2xl bg-slate-900 px-3 py-2.5 text-sm text-white transition-all dark:bg-slate-100 dark:text-slate-900"
                onClick={() => navigate("/admin/configuracoes")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-900">
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
          <header className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                Configurações da aplicação
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Somente administradores podem visualizar e alterar essas informações.
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

          <main className="flex-1 overflow-y-auto pb-2">
            <div className="mt-2 flex flex-col gap-4">
              <section className="rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100/80 dark:bg-slate-900/90 dark:ring-slate-800">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                  <Settings className="h-4 w-4 text-sky-600" />
                  <span>Integrações e chaves de API</span>
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Configure aqui o Token OpenAI utilizado pelos recursos de leitura automática de guias e documentos.
                </p>
              </section>

              <Card className="rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <span>Token OpenAI</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Informe o token de API da OpenAI para habilitar a leitura automática de documentos (OCR inteligente das guias SADT).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    className="space-y-4 text-xs sm:text-sm"
                    onSubmit={handleSalvar}
                  >
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Token OpenAI
                      </label>
                      <Input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="sk-..."
                        className="h-10 rounded-xl border-slate-200 bg-slate-50 text-xs sm:text-sm dark:border-slate-700 dark:bg-slate-900"
                        disabled={carregando}
                      />
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Use um token com permissão para o modelo que será utilizado na leitura das guias.
                        Guarde esta informação em local seguro. Apenas administradores devem ter acesso.
                      </p>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        disabled={salvando || carregando}
                        className="h-9 rounded-full px-5 text-xs sm:text-sm"
                      >
                        {salvando ? "Salvando..." : "Salvar configurações"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminConfiguracoes;
import { useEffect, useState } from "react";
import {
  Bell,
  Search,
  KeyRound,
  FileSignature,
  Database,
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
import AdminSidebar from "@/components/admin/AdminSidebar";
import { criarDadosExemplo } from "@/services/demo-data-service";

const AdminConfiguracoes = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [criandoDemo, setCriandoDemo] = useState(false);

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

  const handleCriarDadosExemplo = async () => {
    setCriandoDemo(true);
    try {
      await criarDadosExemplo();
      showSuccess("Dados de exemplo criados/atualizados com sucesso.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível criar os dados de exemplo.";
      showError(message);
    } finally {
      setCriandoDemo(false);
    }
  };

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
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="config" />

        {/* Área principal */}
        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl dark:bg-slate-900/90">
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
                  <FileSignature className="h-4 w-4 text-sky-600" />
                  <span>Integrações e chaves de API</span>
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Configure aqui o Token OpenAI utilizado pelos recursos de leitura automática de guias e documentos.
                </p>
              </section>

              {/* Bloco para criação de dados de exemplo */}
              <Card className="rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                      <Database className="h-4 w-4" />
                    </span>
                    <span>Dados de exemplo</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Crie automaticamente clínicas, médicos e uma descrição cirúrgica aprovada para demonstrar o funcionamento do sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start justify-between gap-3 text-xs sm:flex-row sm:items-center sm:text-sm">
                    <p className="max-w-xl text-slate-500 dark:text-slate-400">
                      Este recurso cria registros apenas se as tabelas ainda estiverem vazias. Você pode utilizá-lo com segurança em ambiente de desenvolvimento para popular os cadastros com exemplos reais.
                    </p>
                    <Button
                      type="button"
                      className="h-9 rounded-full px-4 text-xs sm:text-sm"
                      onClick={handleCriarDadosExemplo}
                      disabled={criandoDemo}
                    >
                      {criandoDemo ? "Criando dados..." : "Criar dados de exemplo"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

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
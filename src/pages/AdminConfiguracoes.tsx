import { useEffect, useState } from "react";
import {
  Bell,
  Search,
  KeyRound,
  FileSignature,
  Database,
  FileType2,
  Mail,
  Save,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import {
  carregarAppSettings,
  salvarTokenOpenAI,
  salvarTokenAsaas,
} from "@/services/app-settings-service";
import {
  carregarModelosEmail,
  salvarModeloEmail,
  type EmailTemplateType,
} from "@/services/email-templates-service";
import { showError, showSuccess } from "@/utils/toast";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { criarDadosExemplo } from "@/services/demo-data-service";

type EmailFormState = {
  assunto: string;
  corpo_html: string;
};

const ensureDefaults = (templates: { tipo: string; assunto: string; corpo_html: string }[]) => {
  const byType = new Map(templates.map((t) => [t.tipo, t] as const));

  const defaults: Record<string, EmailFormState> = {
    FATURAR: {
      assunto: "[FATURAMENTO] {{nome_usuario}} - {{paciente_nome}}",
      corpo_html:
        "<p>Prezado(a) {{contato}}.</p>\n\n<p>Solicitamos faturamento do(a) paciente <strong>{{paciente_nome}}</strong>, realizado pelo convênio <strong>{{convenio}}</strong>, na data <strong>{{data_cirurgia}}</strong>, horário de início <strong>{{hora_inicio}}</strong>, que ocorreu no <strong>{{hospital_nome}}</strong>.</p>\n\n<p>Em anexo, envio os documentos para consulta.</p>\n\n<p>Atenciosamente,</p>\n<p><strong>{{nome_usuario}}</strong></p>",
    },
    NAO_FATURAR: {
      assunto: "[NÃO FATURAR] {{nome_usuario}} - {{paciente_nome}}",
      corpo_html:
        "<p>Prezado(a) {{contato}}.</p>\n\n<p>Informamos que o faturamento do(a) paciente <strong>{{paciente_nome}}</strong>, realizado pelo convênio <strong>{{convenio}}</strong>, na data <strong>{{data_cirurgia}}</strong>, horário de início <strong>{{hora_inicio}}</strong>, <strong>NÃO</strong> deverá ser realizado por essa instituição.</p>\n\n<p>Em anexo, envio os documentos para consulta.</p>\n\n<p>Atenciosamente,</p>\n<p><strong>{{nome_usuario}}</strong></p>",
    },
  };

  return {
    FATURAR: {
      assunto: byType.get("FATURAR")?.assunto ?? defaults.FATURAR.assunto,
      corpo_html: byType.get("FATURAR")?.corpo_html ?? defaults.FATURAR.corpo_html,
    },
    NAO_FATURAR: {
      assunto: byType.get("NAO_FATURAR")?.assunto ?? defaults.NAO_FATURAR.assunto,
      corpo_html:
        byType.get("NAO_FATURAR")?.corpo_html ?? defaults.NAO_FATURAR.corpo_html,
    },
  };
};

const AdminConfiguracoes = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [asaasToken, setAsaasToken] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoAsaas, setSalvandoAsaas] = useState(false);
  const [criandoDemo, setCriandoDemo] = useState(false);

  const [emailModels, setEmailModels] = useState<{
    FATURAR: EmailFormState;
    NAO_FATURAR: EmailFormState;
  }>({
    FATURAR: { assunto: "", corpo_html: "" },
    NAO_FATURAR: { assunto: "", corpo_html: "" },
  });
  const [salvandoEmails, setSalvandoEmails] = useState<
    EmailTemplateType | "ALL" | null
  >(null);

  useEffect(() => {
    const load = async () => {
      setCarregando(true);
      try {
        const [settings, templates] = await Promise.all([
          carregarAppSettings(),
          carregarModelosEmail(),
        ]);

        if (settings?.openaiApiToken) {
          setToken(settings.openaiApiToken);
        }
        if (settings?.asaasToken) {
          setAsaasToken(settings.asaasToken);
        }

        setEmailModels(ensureDefaults(templates));
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

  const handleSalvarAsaas = async (event: React.FormEvent) => {
    event.preventDefault();
    setSalvandoAsaas(true);
    try {
      await salvarTokenAsaas(asaasToken.trim());
      showSuccess("Token Asaas salvo com sucesso.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o Token Asaas.";
      showError(message);
    } finally {
      setSalvandoAsaas(false);
    }
  };

  const handleSalvarModeloEmail = async (tipo: EmailTemplateType) => {
    setSalvandoEmails(tipo);
    try {
      await salvarModeloEmail({
        tipo,
        assunto: emailModels[tipo].assunto,
        corpo_html: emailModels[tipo].corpo_html,
      });
      showSuccess("Modelo de email salvo com sucesso.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o modelo de email.";
      showError(message);
    } finally {
      setSalvandoEmails(null);
    }
  };

  const handleSalvarTodosModelosEmail = async () => {
    setSalvandoEmails("ALL");
    try {
      await salvarModeloEmail({
        tipo: "FATURAR",
        assunto: emailModels.FATURAR.assunto,
        corpo_html: emailModels.FATURAR.corpo_html,
      });
      await salvarModeloEmail({
        tipo: "NAO_FATURAR",
        assunto: emailModels.NAO_FATURAR.assunto,
        corpo_html: emailModels.NAO_FATURAR.corpo_html,
      });
      showSuccess("Modelos de email salvos com sucesso.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar os modelos de email.";
      showError(message);
    } finally {
      setSalvandoEmails(null);
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
                  Configure aqui os tokens utilizados pelas integrações do sistema (OpenAI e Asaas).
                </p>
              </section>

              {/* Submenu/atalhos de Configurações */}
              <div className="grid gap-3 md:grid-cols-2">
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

                {/* Novo card: Converter PDF */}
                <Card className="rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-slate-50 dark:bg-slate-800">
                        <FileType2 className="h-4 w-4" />
                      </span>
                      <span>Converter PDF</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Acesse a ferramenta de upload e conversão de PDFs em tabela de dados, preparada para uso com Docling ou outros motores de extração.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                      <p className="max-w-xs text-slate-500 dark:text-slate-400">
                        Envie um arquivo PDF e visualize os dados estruturados em formato tabular na tela seguinte.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-full border-slate-200 px-4 text-xs sm:text-sm dark:border-slate-700"
                        onClick={() => navigate("/admin/configuracoes/converter-pdf")}
                      >
                        Ir para Converter PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                      <Mail className="h-4 w-4" />
                    </span>
                    <span>Modelos de email (faturamento)</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure os textos padrão (assunto e corpo em HTML) usados nos emails de faturamento.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="rounded-2xl bg-slate-50/70 p-4 ring-1 ring-slate-200/70 dark:bg-slate-950/40 dark:ring-slate-800">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Variáveis disponíveis
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Use estas variáveis no assunto e no corpo HTML:{" "}
                        <span className="font-mono">{"{{contato}}"}</span>,{" "}
                        <span className="font-mono">{"{{paciente_nome}}"}</span>,{" "}
                        <span className="font-mono">{"{{convenio}}"}</span>,{" "}
                        <span className="font-mono">{"{{data_cirurgia}}"}</span>,{" "}
                        <span className="font-mono">{"{{hora_inicio}}"}</span>,{" "}
                        <span className="font-mono">{"{{hospital_nome}}"}</span>,{" "}
                        <span className="font-mono">{"{{nome_usuario}}"}</span>.
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                        <CardHeader>
                          <CardTitle className="text-sm sm:text-base">Email faturar</CardTitle>
                          <CardDescription className="text-xs sm:text-sm">
                            Será enviado para a instituição de faturamento.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                              Assunto
                            </label>
                            <Input
                              value={emailModels.FATURAR.assunto}
                              onChange={(e) =>
                                setEmailModels((prev) => ({
                                  ...prev,
                                  FATURAR: {
                                    ...prev.FATURAR,
                                    assunto: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Assunto do email"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                              Corpo (HTML)
                            </label>
                            <Textarea
                              value={emailModels.FATURAR.corpo_html}
                              onChange={(e) =>
                                setEmailModels((prev) => ({
                                  ...prev,
                                  FATURAR: {
                                    ...prev.FATURAR,
                                    corpo_html: e.target.value,
                                  },
                                }))
                              }
                              className="min-h-[220px] font-mono text-[11px]"
                            />
                          </div>
                          <Button
                            type="button"
                            className="h-9 w-full rounded-full"
                            onClick={() => handleSalvarModeloEmail("FATURAR")}
                            disabled={salvandoEmails !== null}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {salvandoEmails === "FATURAR" ? "Salvando..." : "Salvar modelo"}
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                        <CardHeader>
                          <CardTitle className="text-sm sm:text-base">Email não faturar</CardTitle>
                          <CardDescription className="text-xs sm:text-sm">
                            Será enviado para a instituição informando o não-faturamento.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                              Assunto
                            </label>
                            <Input
                              value={emailModels.NAO_FATURAR.assunto}
                              onChange={(e) =>
                                setEmailModels((prev) => ({
                                  ...prev,
                                  NAO_FATURAR: {
                                    ...prev.NAO_FATURAR,
                                    assunto: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Assunto do email"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                              Corpo (HTML)
                            </label>
                            <Textarea
                              value={emailModels.NAO_FATURAR.corpo_html}
                              onChange={(e) =>
                                setEmailModels((prev) => ({
                                  ...prev,
                                  NAO_FATURAR: {
                                    ...prev.NAO_FATURAR,
                                    corpo_html: e.target.value,
                                  },
                                }))
                              }
                              className="min-h-[220px] font-mono text-[11px]"
                            />
                          </div>
                          <Button
                            type="button"
                            className="h-9 w-full rounded-full"
                            onClick={() => handleSalvarModeloEmail("NAO_FATURAR")}
                            disabled={salvandoEmails !== null}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {salvandoEmails === "NAO_FATURAR" ? "Salvando..." : "Salvar modelo"}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-full border-slate-200 px-4 text-xs sm:text-sm dark:border-slate-700"
                        onClick={handleSalvarTodosModelosEmail}
                        disabled={salvandoEmails !== null}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {salvandoEmails === "ALL" ? "Salvando..." : "Salvar tudo"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3 md:grid-cols-2">
                <Card className="rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                        <KeyRound className="h-4 w-4" />
                      </span>
                      <span>Token OpenAI</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Token para habilitar a leitura automática de documentos.
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
                          disabled={carregando}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="h-9 w-full rounded-full"
                        disabled={salvando || carregando}
                      >
                        {salvando ? "Salvando..." : "Salvar Token"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                        <KeyRound className="h-4 w-4" />
                      </span>
                      <span>Token Asaas (Sandbox)</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Token do ambiente sandbox que será usado pelo motor de assinatura (Edge Functions).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      className="space-y-4 text-xs sm:text-sm"
                      onSubmit={handleSalvarAsaas}
                    >
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Token Asaas
                        </label>
                        <Input
                          type="password"
                          value={asaasToken}
                          onChange={(e) => setAsaasToken(e.target.value)}
                          placeholder="$aact_..."
                          className="h-10 rounded-xl border-slate-200 bg-slate-50 text-xs sm:text-sm dark:border-slate-700 dark:bg-slate-900"
                          disabled={carregando}
                        />
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Este token não é exposto para o fluxo de assinatura no front-end; apenas a Edge Function usa.
                        </p>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          type="submit"
                          disabled={salvandoAsaas || carregando}
                          className="h-9 rounded-full px-5 text-xs sm:text-sm"
                        >
                          {salvandoAsaas ? "Salvando..." : "Salvar"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminConfiguracoes;
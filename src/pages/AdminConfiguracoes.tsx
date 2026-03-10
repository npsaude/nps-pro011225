import { useEffect, useState } from "react";
import {
  KeyRound,
  FileSignature,
  Database,
  FileType2,
  Mail,
  Save,
  Upload,
  Bot,
  Zap,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  carregarAppSettings,
  salvarTokenOpenAI,
  salvarModeloOpenAI,
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
import CbhpmCsvImportCard from "@/components/admin/CbhpmCsvImportCard";

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

// ─── Componente de seção com título ──────────────────────────────────────────
function SectionHeader({
  icon,
  title,
  description,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-3 pb-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {badge && (
            <Badge variant="secondary" className="text-[10px]">
              {badge}
            </Badge>
          )}
        </div>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Card de configuração ─────────────────────────────────────────────────────
function ConfigCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Label de campo ───────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </label>
  );
}

const AdminConfiguracoes = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4");
  const [asaasToken, setAsaasToken] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoModelo, setSalvandoModelo] = useState(false);
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

        if (settings?.openaiApiToken) setToken(settings.openaiApiToken);
        if (settings?.openaiModel) setOpenaiModel(settings.openaiModel);
        if (settings?.asaasToken) setAsaasToken(settings.asaasToken);

        setEmailModels(ensureDefaults(templates));
      } catch (err) {
        showError(
          err instanceof Error ? err.message : "Não foi possível carregar as configurações."
        );
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
      showError(err instanceof Error ? err.message : "Não foi possível criar os dados de exemplo.");
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
      showError(err instanceof Error ? err.message : "Não foi possível salvar o Token OpenAI.");
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarModelo = async () => {
    setSalvandoModelo(true);
    try {
      await salvarModeloOpenAI(openaiModel);
      showSuccess("Modelo OpenAI salvo com sucesso.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Não foi possível salvar o Modelo OpenAI.");
    } finally {
      setSalvandoModelo(false);
    }
  };

  const handleSalvarAsaas = async (event: React.FormEvent) => {
    event.preventDefault();
    setSalvandoAsaas(true);
    try {
      await salvarTokenAsaas(asaasToken.trim());
      showSuccess("Token Asaas salvo com sucesso.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Não foi possível salvar o Token Asaas.");
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
      showError(err instanceof Error ? err.message : "Não foi possível salvar o modelo de email.");
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
      showError(err instanceof Error ? err.message : "Não foi possível salvar os modelos de email.");
    } finally {
      setSalvandoEmails(null);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="config" />

        {/* Área principal */}
        <div className="flex flex-1 flex-col gap-6 overflow-hidden rounded-3xl bg-card lg:p-6 lg:shadow-[0_18px_60px_rgba(0,0,0,0.4)]">

          {/* Header da página */}
          <header className="flex flex-col gap-1 border-b border-border pb-5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Painel</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-primary">Configurações</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Configurações da aplicação
            </h1>
            <p className="text-sm text-muted-foreground">
              Somente administradores podem visualizar e alterar essas informações.
            </p>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-8">

              {/* ── Seção: Ferramentas ─────────────────────────────────── */}
              <section>
                <SectionHeader
                  icon={<Database className="h-5 w-5" />}
                  title="Ferramentas"
                  description="Utilitários para gerenciamento e importação de dados."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Dados de exemplo */}
                  <ConfigCard>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                        <Database className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">Dados de exemplo</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Crie automaticamente clínicas, médicos e uma descrição cirúrgica aprovada para demonstrar o funcionamento do sistema.
                        </p>
                      </div>
                    </div>
                    <Separator className="mb-4" />
                    <p className="text-xs text-muted-foreground mb-4">
                      Este recurso cria registros apenas se as tabelas ainda estiverem vazias. Você pode utilizá-lo com segurança em ambiente de desenvolvimento.
                    </p>
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleCriarDadosExemplo}
                      disabled={criandoDemo}
                    >
                      {criandoDemo ? "Criando dados..." : "Criar dados de exemplo"}
                    </Button>
                  </ConfigCard>

                  {/* Converter PDF */}
                  <ConfigCard>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                        <FileType2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">Converter PDF</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ferramenta de upload e conversão de PDFs em tabela de dados, preparada para uso com Docling ou outros motores de extração.
                        </p>
                      </div>
                    </div>
                    <Separator className="mb-4" />
                    <p className="text-xs text-muted-foreground mb-4">
                      Envie um arquivo PDF e visualize os dados estruturados em formato tabular na tela seguinte.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/admin/configuracoes/converter-pdf")}
                    >
                      Ir para Converter PDF
                    </Button>
                  </ConfigCard>
                </div>
              </section>

              {/* ── Seção: Importar CBHPM ──────────────────────────────── */}
              <section>
                <SectionHeader
                  icon={<Upload className="h-5 w-5" />}
                  title="Importar tabela CBHPM"
                  description="Importe procedimentos cirúrgicos via arquivo CSV."
                />
                <CbhpmCsvImportCard />
              </section>

              {/* ── Seção: Modelos de email ────────────────────────────── */}
              <section>
                <SectionHeader
                  icon={<Mail className="h-5 w-5" />}
                  title="Modelos de email (faturamento)"
                  description="Configure os textos padrão (assunto e corpo em HTML) usados nos emails de faturamento."
                />

                <ConfigCard>
                  {/* Variáveis disponíveis */}
                  <div className="mb-5 rounded-xl border border-border bg-muted/40 p-4">
                    <p className="mb-1.5 text-xs font-semibold text-foreground">
                      Variáveis disponíveis
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Use estas variáveis no assunto e no corpo HTML:{" "}
                      {[
                        "{{contato}}",
                        "{{paciente_nome}}",
                        "{{convenio}}",
                        "{{data_cirurgia}}",
                        "{{hora_inicio}}",
                        "{{hospital_nome}}",
                        "{{nome_usuario}}",
                      ].map((v) => (
                        <code
                          key={v}
                          className="mx-0.5 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary"
                        >
                          {v}
                        </code>
                      ))}
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {/* Email faturar */}
                    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/50 p-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400" />
                        <p className="text-sm font-semibold text-foreground">Email faturar</p>
                      </div>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Será enviado para a instituição de faturamento.
                      </p>
                      <div>
                        <FieldLabel>Assunto</FieldLabel>
                        <Input
                          value={emailModels.FATURAR.assunto}
                          onChange={(e) =>
                            setEmailModels((prev) => ({
                              ...prev,
                              FATURAR: { ...prev.FATURAR, assunto: e.target.value },
                            }))
                          }
                          placeholder="Assunto do email"
                        />
                      </div>
                      <div>
                        <FieldLabel>Corpo (HTML)</FieldLabel>
                        <Textarea
                          value={emailModels.FATURAR.corpo_html}
                          onChange={(e) =>
                            setEmailModels((prev) => ({
                              ...prev,
                              FATURAR: { ...prev.FATURAR, corpo_html: e.target.value },
                            }))
                          }
                          className="min-h-[200px] font-mono text-[11px]"
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => handleSalvarModeloEmail("FATURAR")}
                        disabled={salvandoEmails !== null}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {salvandoEmails === "FATURAR" ? "Salvando..." : "Salvar modelo"}
                      </Button>
                    </div>

                    {/* Email não faturar */}
                    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/50 p-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-400" />
                        <p className="text-sm font-semibold text-foreground">Email não faturar</p>
                      </div>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Será enviado para a instituição informando o não-faturamento.
                      </p>
                      <div>
                        <FieldLabel>Assunto</FieldLabel>
                        <Input
                          value={emailModels.NAO_FATURAR.assunto}
                          onChange={(e) =>
                            setEmailModels((prev) => ({
                              ...prev,
                              NAO_FATURAR: { ...prev.NAO_FATURAR, assunto: e.target.value },
                            }))
                          }
                          placeholder="Assunto do email"
                        />
                      </div>
                      <div>
                        <FieldLabel>Corpo (HTML)</FieldLabel>
                        <Textarea
                          value={emailModels.NAO_FATURAR.corpo_html}
                          onChange={(e) =>
                            setEmailModels((prev) => ({
                              ...prev,
                              NAO_FATURAR: { ...prev.NAO_FATURAR, corpo_html: e.target.value },
                            }))
                          }
                          className="min-h-[200px] font-mono text-[11px]"
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => handleSalvarModeloEmail("NAO_FATURAR")}
                        disabled={salvandoEmails !== null}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {salvandoEmails === "NAO_FATURAR" ? "Salvando..." : "Salvar modelo"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSalvarTodosModelosEmail}
                      disabled={salvandoEmails !== null}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {salvandoEmails === "ALL" ? "Salvando..." : "Salvar todos os modelos"}
                    </Button>
                  </div>
                </ConfigCard>
              </section>

              {/* ── Seção: Integrações de API ──────────────────────────── */}
              <section>
                <SectionHeader
                  icon={<FileSignature className="h-5 w-5" />}
                  title="Integrações e chaves de API"
                  description="Configure aqui os tokens utilizados pelas integrações do sistema (OpenAI e Asaas)."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Token OpenAI */}
                  <ConfigCard>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">Token da API da OpenAI</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Insira o token gerado na plataforma da OpenAI para processamento de guias e descrições cirúrgicas.
                        </p>
                      </div>
                    </div>
                    <Separator className="mb-4" />
                    <form className="flex flex-col gap-4" onSubmit={handleSalvar}>
                      <div>
                        <FieldLabel>Token OpenAI</FieldLabel>
                        <Input
                          type="password"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          disabled={carregando}
                          placeholder="sk-..."
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={salvando || carregando}
                      >
                        {salvando ? "Salvando..." : "Salvar Token"}
                      </Button>
                    </form>
                  </ConfigCard>

                  {/* Modelo OpenAI */}
                  <ConfigCard>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">Modelo OpenAI</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Selecione a versão do GPT para utilizar nas requisições.
                        </p>
                      </div>
                    </div>
                    <Separator className="mb-4" />
                    <div className="flex flex-col gap-4">
                      <div>
                        <FieldLabel>Versão do modelo</FieldLabel>
                        <select
                          value={openaiModel}
                          onChange={(e) => setOpenaiModel(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="gpt-4">gpt-4</option>
                          <option value="gpt-4-32k">gpt-4-32k</option>
                          <option value="gpt-4-turbo">gpt-4-turbo</option>
                          <option value="gpt-4-vision">gpt-4-vision</option>
                          <option value="gpt-4o">gpt-4o</option>
                          <option value="gpt-4o-mini">gpt-4o-mini</option>
                          <option value="gpt-4.1">gpt-4.1</option>
                          <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                          <option value="gpt-4.1-nano">gpt-4.1-nano</option>
                          <option value="gpt-5">gpt-5</option>
                          <option value="gpt-5-turbo">gpt-5-turbo</option>
                          <option value="gpt-5-mini">gpt-5-mini</option>
                        </select>
                      </div>
                      <Button
                        type="button"
                        className="w-full"
                        onClick={handleSalvarModelo}
                        disabled={salvandoModelo}
                      >
                        {salvandoModelo ? "Salvando..." : "Salvar Modelo"}
                      </Button>
                    </div>
                  </ConfigCard>

                  {/* Token Asaas */}
                  <ConfigCard className="md:col-span-2">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">Token Asaas (Sandbox)</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Token do ambiente sandbox que será usado pelo motor de assinatura (Edge Functions).
                        </p>
                      </div>
                    </div>
                    <Separator className="mb-4" />
                    <form className="flex flex-col gap-4" onSubmit={handleSalvarAsaas}>
                      <div>
                        <FieldLabel>Token Asaas</FieldLabel>
                        <Input
                          type="password"
                          value={asaasToken}
                          onChange={(e) => setAsaasToken(e.target.value)}
                          placeholder="$aact_..."
                          disabled={carregando}
                        />
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Este token não é exposto para o fluxo de assinatura no front-end; apenas a Edge Function usa.
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={salvandoAsaas || carregando}
                          className="min-w-[120px]"
                        >
                          {salvandoAsaas ? "Salvando..." : "Salvar Token"}
                        </Button>
                      </div>
                    </form>
                  </ConfigCard>
                </div>
              </section>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminConfiguracoes;

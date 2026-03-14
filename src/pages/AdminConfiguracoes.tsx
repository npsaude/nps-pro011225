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
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
import { useSystemUser } from "@/hooks/use-system-user";
import { purgeUserByEmail } from "@/services/user-purge-service";

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
  const { systemUser } = useSystemUser();

  const role = String((systemUser as any)?.regra ?? "").trim().toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";

  const [token, setToken] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4");
  const [asaasToken, setAsaasToken] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const [salvandoAsaas, setSalvandoAsaas] = useState(false);
  const [criandoDemo, setCriandoDemo] = useState(false);

  const [purgeEmail, setPurgeEmail] = useState("");
  const [purgeConfirmEmail, setPurgeConfirmEmail] = useState("");
  const [purgingUser, setPurgingUser] = useState(false);

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
          err instanceof Error ? err.message : "Não foi possível carregar as configurações.",
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
      showError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar os dados de exemplo.",
      );
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
      showError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o Token OpenAI.",
      );
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
      showError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o Modelo OpenAI.",
      );
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
      showError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o Token Asaas.",
      );
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
      showError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o modelo de email.",
      );
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
      showError(
        err instanceof Error ? err.message : "Não foi possível salvar os modelos de email.",
      );
    } finally {
      setSalvandoEmails(null);
    }
  };

  const canPurge =
    isSuperAdmin &&
    purgeEmail.trim().length > 3 &&
    purgeEmail.trim().toLowerCase() === purgeConfirmEmail.trim().toLowerCase();

  const handlePurgeUser = async () => {
    if (!canPurge) return;

    setPurgingUser(true);
    try {
      const res = await purgeUserByEmail(purgeEmail);
      showSuccess(
        `Usuário excluído: ${res.email} (arquivos removidos: ${res.deletedStorageObjects}).`,
      );
      setPurgeEmail("");
      setPurgeConfirmEmail("");
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir todo o conteúdo do usuário.",
      );
    } finally {
      setPurgingUser(false);
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
              {/* ── Seção: Zona de perigo (super admin) ───────────────── */}
              <section>
                <SectionHeader
                  icon={<Trash2 className="h-5 w-5" />}
                  title="Zona de perigo"
                  description="Exclusão total de um usuário por e-mail (inclui tabelas, Auth e arquivos em Storage)."
                  badge="SUPER_ADMIN"
                />

                <ConfigCard className="border-destructive/30">
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Ação irreversível
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Esta ação remove todos os registros associados ao usuário e também apaga a conta no
                      Auth e os arquivos nos buckets (pelo padrão de pastas com o user_id). Use somente
                      em casos extremos.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel>Email do usuário</FieldLabel>
                      <Input
                        value={purgeEmail}
                        onChange={(e) => setPurgeEmail(e.target.value)}
                        placeholder="usuario@exemplo.com"
                        disabled={!isSuperAdmin || purgingUser}
                      />
                    </div>
                    <div>
                      <FieldLabel>Confirmar email</FieldLabel>
                      <Input
                        value={purgeConfirmEmail}
                        onChange={(e) => setPurgeConfirmEmail(e.target.value)}
                        placeholder="repita o email"
                        disabled={!isSuperAdmin || purgingUser}
                      />
                    </div>
                  </div>

                  {!isSuperAdmin && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Faça login como <strong>super_admin</strong> para usar esta área.
                    </p>
                  )}

                  <div className="mt-5 flex justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={!canPurge || purgingUser}
                        >
                          {purgingUser ? "Excluindo..." : "Excluir usuário e todo conteúdo"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Confirmar exclusão total do usuário?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Você está prestes a excluir permanentemente o usuário:
                            <span className="mt-2 block font-medium text-foreground">
                              {purgeEmail.trim() || "(sem email)"}
                            </span>
                            <span className="mt-2 block">
                              Isso removerá registros do banco, a conta no Auth e arquivos em Storage.
                            </span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={purgingUser}>
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            disabled={!canPurge || purgingUser}
                            onClick={(e) => {
                              e.preventDefault();
                              void handlePurgeUser();
                            }}
                          >
                            Confirmar exclusão
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </ConfigCard>
              </section>

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
                        <p className="font-semibold text-foreground text-sm">Modelo da OpenAI</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Defina o modelo base usado nos prompts de extração e revisão de documentos.
                        </p>
                      </div>
                    </div>
                    <Separator className="mb-4" />
                    <div className="flex flex-col gap-4">
                      <div>
                        <FieldLabel>Modelo</FieldLabel>
                        <Select
                          value={openaiModel}
                          onValueChange={setOpenaiModel}
                          disabled={carregando}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um modelo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-4.5-preview">GPT-4.5 Preview — Mais recente (fev/2025)</SelectItem>
                            <SelectItem value="gpt-4.1">GPT-4.1 — Alta precisão</SelectItem>
                            <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini — Rápido e econômico</SelectItem>
                            <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano — Ultra rápido</SelectItem>
                            <SelectItem value="gpt-4o">GPT-4o — Multimodal, visão avançada</SelectItem>
                            <SelectItem value="gpt-4o-mini">GPT-4o Mini — Econômico com visão</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo — Alta capacidade</SelectItem>
                            <SelectItem value="gpt-4">GPT-4 — Clássico, confiável</SelectItem>
                            <SelectItem value="o3-mini">O3 Mini — Raciocínio avançado</SelectItem>
                            <SelectItem value="o1-mini">O1 Mini — Raciocínio rápido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        className="w-full"
                        onClick={handleSalvarModelo}
                        disabled={salvandoModelo || carregando}
                      >
                        {salvandoModelo ? "Salvando..." : "Salvar Modelo"}
                      </Button>
                    </div>
                  </ConfigCard>

                  {/* Token Asaas */}
                  <ConfigCard>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">Token Asaas</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Token de integração com o Asaas (assinaturas e cobranças).
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
                          disabled={carregando}
                          placeholder="..."
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={salvandoAsaas || carregando}
                      >
                        {salvandoAsaas ? "Salvando..." : "Salvar Token"}
                      </Button>
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
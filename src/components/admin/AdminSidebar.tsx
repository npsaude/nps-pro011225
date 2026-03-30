import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Stethoscope,
  MessageCircle,
  Settings,
  HelpCircle,
  LineChart,
  CreditCard,
  BarChart3,
  FolderOpen,
  LogOut,
  FileText,
  ClipboardList,
  ShieldCheck,
  Building2,
  UserRound,
  Upload,
  Scissors,
} from "lucide-react";
import { logout } from "@/services/auth-service";
import { showError, showSuccess } from "@/utils/toast";
import { useSystemUser } from "@/hooks/use-system-user";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { LockedMenuItem } from "@/components/sidebar/LockedMenuItem";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminSidebarProps {
  section?:
    | "home"
    | "faturamento"
    | "documentos"
    | "guia-solicitacao"
    | "guia-autorizacao"
    | "descricao-cirurgica"
    | "cadastro"
    | "config"
    | "assinaturas";
  cadastroSubsection?: "clinicas" | "hospitais" | "medicos" | "gft" | "modelos-descricao";
  documentosSubsection?:
    | "guia-solicitacao"
    | "guia-autorizacao"
    | "descricao-cirurgica"
    | "guia-honorarios"
    | "relatorio-repasse";
  assinaturasSubsection?: "dashboard" | "assinantes" | "planos" | "formulario-site";
}

const LOGO_URL =
  "https://pokyribuibmbeorrcsgk.supabase.co/storage/v1/object/sign/NPS-pro/site/logo-conmagic-favicon.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZDc4YzM5NC1hMTFlLTQ3MTEtYTVmNi1lMjU4ZGU4MGRiYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJOUFMtcHJvL3NpdGUvbG9nby1jb25tYWdpYy1mYXZpY29uLnBuZyIsImlhdCI6MTc3MTAwMjQxMywiZXhwIjoyNDAxNzIyNDEzfQ.EFdbCwJ0scnjf4oFCJRg5YA_JtHfA2LZf_gugIB4WcY";

// ─── Estilos reutilizáveis ────────────────────────────────────────────────────
const baseButton =
  "flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all";
const inactiveMain =
  baseButton + " text-sidebar-foreground/80 hover:bg-sidebar-accent/50";
const activeMain =
  baseButton + " bg-primary text-primary-foreground shadow-md";

const iconWrapperActive =
  "flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary-foreground";
const iconWrapperInactive =
  "flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-accent/60 text-sidebar-foreground";

const blockContainer =
  "mt-1 rounded-2xl bg-sidebar-accent/40 p-2 text-xs text-sidebar-foreground ring-1 ring-sidebar-border";

const blockItemBase =
  "flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs transition-colors";
const blockItemActive =
  blockItemBase + " bg-primary text-primary-foreground shadow-sm";
const blockItemInactive =
  blockItemBase + " text-sidebar-foreground/80 hover:bg-sidebar-accent/60";

// ─── Skeleton do menu (exibido enquanto o role carrega) ───────────────────────
function SidebarSkeleton() {
  return (
    <nav className="flex flex-col gap-2 px-1">
      {[...Array(7)].map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-2xl bg-sidebar-accent/50" />
      ))}
    </nav>
  );
}

// ─── Menu para SUPER_ADMIN ────────────────────────────────────────────────────
function SuperAdminMenu({
  currentSection,
  currentAssinaturasSub,
  currentCadastroSub,
  currentDocumentosSub,
  navigate,
}: {
  currentSection: AdminSidebarProps["section"];
  currentAssinaturasSub: AdminSidebarProps["assinaturasSubsection"];
  currentCadastroSub: AdminSidebarProps["cadastroSubsection"];
  currentDocumentosSub: AdminSidebarProps["documentosSubsection"];
  navigate: (path: string) => void;
}) {
  return (
    <nav className="flex flex-col gap-1 text-sm">

      {/* Dashboard */}
      <button
        className={currentSection === "home" ? activeMain : inactiveMain}
        onClick={() => navigate("/admin/dashboard")}
      >
        <span className="flex items-center gap-3">
          <span className={currentSection === "home" ? iconWrapperActive : iconWrapperInactive}>
            <Home className="h-4 w-4" />
          </span>
          <span className="font-medium">Dashboard</span>
        </span>
      </button>

      {/* Gestão de Assinaturas */}
      <div className={blockContainer}>
        <div className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground">
            <CreditCard className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold text-sidebar-foreground">
            Gestão de Assinaturas
          </span>
        </div>
        <div className="mt-1 space-y-1">
          <button
            className={currentAssinaturasSub === "dashboard" ? blockItemActive : blockItemInactive}
            onClick={() => navigate("/admin/assinaturas/dashboard")}
          >
            <span className="ml-7 inline-flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 opacity-80" />
              Dashboard
            </span>
          </button>
          <button
            className={currentAssinaturasSub === "assinantes" ? blockItemActive : blockItemInactive}
            onClick={() => navigate("/admin/assinaturas/assinantes")}
          >
            <span className="ml-7 inline-flex items-center gap-2">
              <Users className="h-3.5 w-3.5 opacity-80" />
              Assinantes
            </span>
          </button>
          <button
            className={currentAssinaturasSub === "planos" ? blockItemActive : blockItemInactive}
            onClick={() => navigate("/admin/assinaturas/planos")}
          >
            <span className="ml-7 inline-flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 opacity-80" />
              Planos
            </span>
          </button>
          <button
            className={currentAssinaturasSub === "formulario-site" ? blockItemActive : blockItemInactive}
            onClick={() => navigate("/admin/assinaturas/formulario-site")}
          >
            <span className="ml-7 inline-flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 opacity-80" />
              Formulário do Site
            </span>
          </button>
        </div>
      </div>

      {/* Cadastro */}
      <div className={blockContainer}>
        <div className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground">
            <Users className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold text-sidebar-foreground">Cadastro</span>
        </div>
        <div className="mt-1 space-y-1">
          <button
            className={
              currentCadastroSub === "clinicas" || currentCadastroSub === "hospitais"
                ? blockItemActive
                : blockItemInactive
            }
            onClick={() => navigate("/cadastro/clinicas")}
          >
            <span className="ml-7 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 opacity-70" />
              Clínicas / Hospitais
            </span>
          </button>
          <button
            className={currentCadastroSub === "medicos" ? blockItemActive : blockItemInactive}
            onClick={() => navigate("/cadastro/medicos")}
          >
            <span className="ml-7 flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 opacity-70" />
              Médicos
            </span>
          </button>
          <button
            className={currentCadastroSub === "gft" ? blockItemActive : blockItemInactive}
            onClick={() => navigate("/cadastro/gft")}
          >
            <span className="ml-7 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 opacity-70" />
              Modelos GFT
            </span>
          </button>
          <button
            className={currentCadastroSub === "modelos-descricao" ? blockItemActive : blockItemInactive}
            onClick={() => navigate("/admin/modelos-descricao-cirurgica")}
          >
            <span className="ml-7 flex items-center gap-1.5 whitespace-nowrap">
              <Scissors className="h-3.5 w-3.5 opacity-70 flex-shrink-0" />
              <span className="truncate">Modelos Descrição</span>
            </span>
          </button>
        </div>
      </div>

      {/* Documentos */}
      <div className={blockContainer}>
        <div className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground">
            <FolderOpen className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold text-sidebar-foreground">Documentos</span>
        </div>
        <div className="mt-1 space-y-1">
          <button
            className={currentDocumentosSub === "guia-solicitacao" ? blockItemActive : blockItemInactive}
            onClick={() => navigate("/admin/guia-solicitacao")}
          >
            <span className="ml-7 flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5 opacity-70" />
              Guia de Solicitação
            </span>
          </button>
          <button
            className={currentDocumentosSub === "guia-autorizacao" ? blockItemActive : blockItemInactive}
            onClick={() => navigate("/admin/guia-autorizacao")}
          >
            <span className="ml-7 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 opacity-70" />
              Guia de Autorização
            </span>
          </button>
          <button
            className={currentDocumentosSub === "descricao-cirurgica" ? blockItemActive : blockItemInactive}
            onClick={() => navigate("/admin/descricao-cirurgica")}
          >
            <span className="ml-7 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 opacity-70" />
              Descrição Cirúrgica
            </span>
          </button>
          <button
            className={currentDocumentosSub === "guia-honorarios" ? blockItemActive : blockItemInactive}
            onClick={() => navigate("/admin/guia-honorarios")}
          >
            <span className="ml-7 flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 opacity-70" />
              Guia de Honorários
            </span>
          </button>
          <LockedMenuItem label="Relatório de Repasse" isSubItem className={blockItemInactive} />
        </div>
      </div>

      {/* Faturamento */}
      <button
        className={currentSection === "faturamento" ? activeMain : inactiveMain}
        onClick={() => navigate("/admin/faturamento")}
      >
        <span className="flex items-center gap-3">
          <span className={currentSection === "faturamento" ? iconWrapperActive : iconWrapperInactive}>
            <LineChart className="h-4 w-4" />
          </span>
          <span className="font-medium">Faturamento</span>
        </span>
      </button>

      {/* Recursos */}
      <button className={inactiveMain}>
        <span className="flex items-center gap-3">
          <span className={iconWrapperInactive}>
            <Stethoscope className="h-4 w-4" />
          </span>
          <span className="font-medium">Recursos</span>
        </span>
      </button>

      {/* Mensagens */}
      <button className={inactiveMain}>
        <span className="flex items-center gap-3">
          <span className={iconWrapperInactive}>
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="font-medium">Mensagens</span>
        </span>
      </button>

      {/* Configurações */}
      <button
        className={currentSection === "config" ? activeMain : inactiveMain}
        onClick={() => navigate("/admin/configuracoes")}
      >
        <span className="flex items-center gap-3">
          <span className={currentSection === "config" ? iconWrapperActive : iconWrapperInactive}>
            <Settings className="h-4 w-4" />
          </span>
          <span className="font-medium">Configuração</span>
        </span>
      </button>

      {/* Ajuda */}
      <button className={inactiveMain}>
        <span className="flex items-center gap-3">
          <span className={iconWrapperInactive}>
            <HelpCircle className="h-4 w-4" />
          </span>
          <span className="font-medium">Ajuda</span>
        </span>
      </button>

    </nav>
  );
}

// ─── Menu para ADMIN / MEDICO ─────────────────────────────────────────────────
function DefaultMenu({
  currentSection,
  currentCadastroSub,
  currentDocumentosSub,
  navigate,
  isMedico,
  featureEnabled,
}: {
  currentSection: AdminSidebarProps["section"];
  currentCadastroSub: AdminSidebarProps["cadastroSubsection"];
  currentDocumentosSub: AdminSidebarProps["documentosSubsection"];
  navigate: (path: string) => void;
  isMedico: boolean;
  featureEnabled: (key: Parameters<ReturnType<typeof usePlanFeatures>["hasFeature"]>[0]) => boolean;
}) {
  return (
    <nav className="flex flex-col gap-1 text-sm">

      {/* Dashboard */}
      <button
        className={currentSection === "home" ? activeMain : inactiveMain}
        onClick={() => navigate("/admin/dashboard")}
      >
        <span className="flex items-center gap-3">
          <span className={currentSection === "home" ? iconWrapperActive : iconWrapperInactive}>
            <Home className="h-4 w-4" />
          </span>
          <span className="font-medium">Dashboard</span>
        </span>
      </button>

      {/* Faturamento */}
      {featureEnabled("menu_faturamento") ? (
        <button
          className={currentSection === "faturamento" ? activeMain : inactiveMain}
          onClick={() => navigate("/admin/faturamento")}
        >
          <span className="flex items-center gap-3">
            <span className={currentSection === "faturamento" ? iconWrapperActive : iconWrapperInactive}>
              <LineChart className="h-4 w-4" />
            </span>
            <span className="font-medium">Faturamento</span>
          </span>
        </button>
      ) : (
        <LockedMenuItem
          label="Faturamento"
          icon={<span className={iconWrapperInactive}><LineChart className="h-4 w-4" /></span>}
          className={inactiveMain}
        />
      )}

      {/* Documentos */}
      <div className={blockContainer}>
        <div className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground">
            <FolderOpen className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold text-sidebar-foreground">Documentos</span>
        </div>
        <div className="mt-1 space-y-1">
          {featureEnabled("menu_documentos_guia_solicitacao") ? (
            <button
              className={currentDocumentosSub === "guia-solicitacao" ? blockItemActive : blockItemInactive}
              onClick={() => navigate("/admin/guia-solicitacao")}
            >
              <span className="ml-7 flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 opacity-70" />
                Guia de Solicitação
              </span>
            </button>
          ) : (
            <LockedMenuItem label="Guia de Solicitação" isSubItem className={blockItemInactive} />
          )}

          {featureEnabled("menu_documentos_guia_autorizacao") ? (
            <button
              className={currentDocumentosSub === "guia-autorizacao" ? blockItemActive : blockItemInactive}
              onClick={() => navigate("/admin/guia-autorizacao")}
            >
              <span className="ml-7 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 opacity-70" />
                Guia de Autorização
              </span>
            </button>
          ) : (
            <LockedMenuItem label="Guia de Autorização" isSubItem className={blockItemInactive} />
          )}

          {featureEnabled("menu_documentos_descricao_cirurgica") ? (
            <button
              className={currentDocumentosSub === "descricao-cirurgica" ? blockItemActive : blockItemInactive}
              onClick={() => navigate("/admin/descricao-cirurgica")}
            >
              <span className="ml-7 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 opacity-70" />
                Descrição Cirúrgica
              </span>
            </button>
          ) : (
            <LockedMenuItem label="Descrição Cirúrgica" isSubItem className={blockItemInactive} />
          )}

          {featureEnabled("menu_documentos_guia_honorarios") ? (
            <button
              className={currentDocumentosSub === "guia-honorarios" ? blockItemActive : blockItemInactive}
              onClick={() => navigate("/admin/guia-honorarios")}
            >
              <span className="ml-7 flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5 opacity-70" />
                Guia de Honorários
              </span>
            </button>
          ) : (
            <LockedMenuItem label="Guia de Honorários" isSubItem className={blockItemInactive} />
          )}

          <LockedMenuItem label="Relatório de Repasse" isSubItem className={blockItemInactive} />
        </div>
      </div>

      {/* Cadastro */}
      <div className={blockContainer}>
        <div className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground">
            <Users className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold text-sidebar-foreground">Cadastro</span>
        </div>
        <div className="mt-1 space-y-1">
          {featureEnabled("menu_cadastro_clinicas_hospitais") ? (
            <button
              className={
                currentCadastroSub === "clinicas" || currentCadastroSub === "hospitais"
                  ? blockItemActive
                  : blockItemInactive
              }
              onClick={() => navigate("/cadastro/clinicas")}
            >
              <span className="ml-7 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 opacity-70" />
                Clínicas / Hospitais
              </span>
            </button>
          ) : (
            <LockedMenuItem label="Clínicas / Hospitais" isSubItem className={blockItemInactive} />
          )}

          {featureEnabled("menu_cadastro_medicos") ? (
            <button
              className={currentCadastroSub === "medicos" ? blockItemActive : blockItemInactive}
              onClick={() => navigate("/cadastro/medicos")}
            >
              <span className="ml-7 flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5 opacity-70" />
                Médicos
              </span>
            </button>
          ) : (
            <LockedMenuItem label="Médicos" isSubItem className={blockItemInactive} />
          )}

          {!isMedico && (
            <button
              className={currentCadastroSub === "gft" ? blockItemActive : blockItemInactive}
              onClick={() => navigate("/cadastro/gft")}
            >
              <span className="ml-7 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 opacity-70" />
                Modelos GFT
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Recursos */}
      {featureEnabled("menu_recursos") ? (
        <button className={inactiveMain}>
          <span className="flex items-center gap-3">
            <span className={iconWrapperInactive}>
              <Stethoscope className="h-4 w-4" />
            </span>
            <span className="font-medium">Recursos</span>
          </span>
        </button>
      ) : (
        <LockedMenuItem
          label="Recursos"
          icon={<span className={iconWrapperInactive}><Stethoscope className="h-4 w-4" /></span>}
          className={inactiveMain}
        />
      )}

      {/* Mensagens */}
      <button className={inactiveMain}>
        <span className="flex items-center gap-3">
          <span className={iconWrapperInactive}>
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="font-medium">Mensagens</span>
        </span>
      </button>

      {/* Configurações */}
      {featureEnabled("menu_configuracoes") ? (
        <button
          className={currentSection === "config" ? activeMain : inactiveMain}
          onClick={() => navigate("/admin/configuracoes")}
        >
          <span className="flex items-center gap-3">
            <span className={currentSection === "config" ? iconWrapperActive : iconWrapperInactive}>
              <Settings className="h-4 w-4" />
            </span>
            <span className="font-medium">Configuração</span>
          </span>
        </button>
      ) : (
        <LockedMenuItem
          label="Configuração"
          icon={<span className={iconWrapperInactive}><Settings className="h-4 w-4" /></span>}
          className={inactiveMain}
        />
      )}

      {/* Ajuda */}
      <button className={inactiveMain}>
        <span className="flex items-center gap-3">
          <span className={iconWrapperInactive}>
            <HelpCircle className="h-4 w-4" />
          </span>
          <span className="font-medium">Ajuda</span>
        </span>
      </button>

    </nav>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
const AdminSidebar = ({
  section,
  cadastroSubsection,
  documentosSubsection,
  assinaturasSubsection,
}: AdminSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { systemUser, loading: systemUserLoading } = useSystemUser();
  const { hasFeature, isLoading: featuresLoading } = usePlanFeatures();

  const role = String((systemUser as any)?.regra ?? "").trim().toUpperCase();
  const isMedico = role === "MEDICO";
  const isSuperAdmin = role === "SUPER_ADMIN";

  // Para ADMIN/SUPER_ADMIN todas as features estão liberadas.
  // Para MEDICO, respeita o plano. Durante o carregamento, libera tudo (evita flash de cadeado).
  const featureEnabled = (key: Parameters<typeof hasFeature>[0]): boolean => {
    if (!isMedico) return true;
    if (featuresLoading) return true;
    return hasFeature(key);
  };

  const handleLogout = () => {
    void logout()
      .then(() => {
        showSuccess("Sessão encerrada.");
        navigate("/login");
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "Erro ao encerrar sessão.";
        showError(message);
      });
  };

  const currentSection: AdminSidebarProps["section"] = useMemo(() => {
    if (section) return section;
    const path = location.pathname;
    if (path.startsWith("/admin/assinaturas")) return "assinaturas";
    if (path.startsWith("/admin/faturamento")) return "faturamento";
    if (path.startsWith("/admin/guia-solicitacao")) return "documentos";
    if (path.startsWith("/admin/guia-autorizacao")) return "documentos";
    if (path.startsWith("/admin/guia-honorarios")) return "documentos";
    if (path.startsWith("/admin/descricao-cirurgica")) return "documentos";
    if (path.startsWith("/descricao-cirurgica")) return "documentos";
    if (path.startsWith("/cadastro/clinicas")) return "cadastro";
    if (path.startsWith("/cadastro/hospitais")) return "cadastro";
    if (path.startsWith("/cadastro/medicos")) return "cadastro";
    if (path.startsWith("/admin/configuracoes")) return "config";
    if (path.startsWith("/admin")) return "home";
    return "home";
  }, [location.pathname, section]);

  const currentCadastroSub: AdminSidebarProps["cadastroSubsection"] = useMemo(() => {
    if (cadastroSubsection) return cadastroSubsection;
    const path = location.pathname;
    if (path.startsWith("/cadastro/clinicas")) return "clinicas";
    if (path.startsWith("/cadastro/hospitais")) return "hospitais";
    if (path.startsWith("/cadastro/medicos")) return "medicos";
    if (path.startsWith("/cadastro/gft")) return "gft";
    if (path.startsWith("/admin/modelos-descricao-cirurgica")) return "modelos-descricao";
    return undefined;
  }, [location.pathname, cadastroSubsection]);

  const currentDocumentosSub: AdminSidebarProps["documentosSubsection"] = useMemo(() => {
    if (documentosSubsection) return documentosSubsection;
    const path = location.pathname;
    if (path.startsWith("/admin/guia-solicitacao")) return "guia-solicitacao";
    if (path.startsWith("/admin/guia-autorizacao")) return "guia-autorizacao";
    if (path.startsWith("/admin/guia-honorarios")) return "guia-honorarios";
    if (path.startsWith("/admin/descricao-cirurgica")) return "descricao-cirurgica";
    return undefined;
  }, [location.pathname, documentosSubsection]);

  const currentAssinaturasSub: AdminSidebarProps["assinaturasSubsection"] = useMemo(() => {
    if (assinaturasSubsection) return assinaturasSubsection;
    const path = location.pathname;
    if (path.startsWith("/admin/assinaturas/dashboard")) return "dashboard";
    if (path.startsWith("/admin/assinaturas/assinantes")) return "assinantes";
    if (path.startsWith("/admin/assinaturas/planos")) return "planos";
    if (path.startsWith("/admin/assinaturas/formulario-site")) return "formulario-site";
    return undefined;
  }, [location.pathname, assinaturasSubsection]);

  return (
    <aside className="hidden w-60 flex-col justify-between rounded-3xl bg-sidebar p-4 text-sidebar-foreground shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:flex">
      <div className="flex flex-col gap-8">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sidebar-accent">
            <img
              src={LOGO_URL}
              alt="Logo CONMEDIC"
              className="h-8 w-8 rounded-xl object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none text-sidebar-foreground">
              CONMEDIC
            </span>
            <span className="text-xs text-sidebar-foreground/70">
              Painel administrativo
            </span>
          </div>
        </div>

        {/* Menu — skeleton enquanto o role não chegou */}
        {systemUserLoading ? (
          <SidebarSkeleton />
        ) : isSuperAdmin ? (
          <SuperAdminMenu
            currentSection={currentSection}
            currentAssinaturasSub={currentAssinaturasSub}
            currentCadastroSub={currentCadastroSub}
            currentDocumentosSub={currentDocumentosSub}
            navigate={navigate}
          />
        ) : (
          <DefaultMenu
            currentSection={currentSection}
            currentCadastroSub={currentCadastroSub}
            currentDocumentosSub={currentDocumentosSub}
            navigate={navigate}
            isMedico={isMedico}
            featureEnabled={featureEnabled}
          />
        )}
      </div>

      {/* Sair */}
      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground">
          <LogOut className="h-4 w-4" />
        </span>
        <span>Sair</span>
      </button>
    </aside>
  );
};

export default AdminSidebar;
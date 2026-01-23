import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Stethoscope,
  MessageCircle,
  Settings,
  HelpCircle,
  FileSignature,
  LineChart,
  Wallet,
  CreditCard,
  BarChart3,
} from "lucide-react";
import { logout } from "@/services/auth-service";
import { showError, showSuccess } from "@/utils/toast";
import { useSystemUser } from "@/hooks/use-system-user";

interface AdminSidebarProps {
  section?:
    | "home"
    | "descricao"
    | "faturamento"
    | "financas"
    | "cadastro"
    | "config"
    | "assinaturas";
  cadastroSubsection?: "clinicas" | "hospitais" | "medicos";
  assinaturasSubsection?: "dashboard" | "assinantes" | "planos";
}

const LOGO_URL =
  "https://pokyribuibmbeorrcsgk.supabase.co/storage/v1/object/sign/NPS-pro/site/logo-conmagic-favicon.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZDc4YzM5NC1hMTFlLTQ3MTEtYTVmNi1lMjU4ZGU4MGRiYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJOUFMtcHJvL3NpdGUvbG9nby1jb25tYWdpYy1mYXZpY29uLnBuZyIsImlhdCI6MTc2OTE4NTA3OSwiZXhwIjoxNzcwMDQ5MDc5fQ.jSiOZo0BFqGup9t3gAzfohZbOwBKpvHRUCGrb_1Fbeg";

const AdminSidebar = ({
  section,
  cadastroSubsection,
  assinaturasSubsection,
}: AdminSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { systemUser } = useSystemUser();

  const cachedRole =
    typeof window !== "undefined" ? window.localStorage.getItem("conmedic_role") : null;

  const role = String((systemUser as any)?.regra ?? cachedRole ?? "")
    .trim()
    .toUpperCase();

  const canSeeSubscriptionsMenu = role === "ADMIN" || role === "SUPER_ADMIN";

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
    if (path.startsWith("/descricao-cirurgica")) return "descricao";
    if (path.startsWith("/admin/faturamento")) return "faturamento";
    if (path.startsWith("/admin/financas")) return "financas";
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
    return undefined;
  }, [location.pathname, cadastroSubsection]);

  const currentAssinaturasSub: AdminSidebarProps["assinaturasSubsection"] = useMemo(() => {
    if (assinaturasSubsection) return assinaturasSubsection;
    const path = location.pathname;
    if (path.startsWith("/admin/assinaturas/dashboard")) return "dashboard";
    if (path.startsWith("/admin/assinaturas/assinantes")) return "assinantes";
    if (path.startsWith("/admin/assinaturas/planos")) return "planos";
    return undefined;
  }, [location.pathname, assinaturasSubsection]);

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
  const blockItemActive = blockItemBase + " bg-sidebar-accent text-sidebar-foreground";
  const blockItemInactive =
    blockItemBase + " text-sidebar-foreground/80 hover:bg-sidebar-accent/60";

  return (
    <aside className="hidden w-60 flex-col justify-between rounded-3xl bg-sidebar p-4 text-sidebar-foreground shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:flex">
      <div className="flex flex-col gap-8">
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

        <nav className="flex flex-col gap-1 text-sm">
          {/* Gestão de Assinaturas (somente ADMIN/SUPER_ADMIN) */}
          {canSeeSubscriptionsMenu ? (
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
                  className={
                    currentAssinaturasSub === "dashboard"
                      ? blockItemActive
                      : blockItemInactive
                  }
                  onClick={() => navigate("/admin/assinaturas/dashboard")}
                >
                  <span className="ml-7 inline-flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 opacity-80" />
                    Dashboard
                  </span>
                </button>

                <button
                  className={
                    currentAssinaturasSub === "assinantes"
                      ? blockItemActive
                      : blockItemInactive
                  }
                  onClick={() => navigate("/admin/assinaturas/assinantes")}
                >
                  <span className="ml-7">Assinantes</span>
                </button>

                <button
                  className={
                    currentAssinaturasSub === "planos"
                      ? blockItemActive
                      : blockItemInactive
                  }
                  onClick={() => navigate("/admin/assinaturas/planos")}
                >
                  <span className="ml-7">Planos</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Home */}
          <button
            className={currentSection === "home" ? activeMain : inactiveMain}
            onClick={() => navigate("/admin/dashboard")}
          >
            <span className="flex items-center gap-3">
              <span className={currentSection === "home" ? iconWrapperActive : iconWrapperInactive}>
                <Home className="h-4 w-4" />
              </span>
              <span className="font-medium">Home</span>
            </span>
          </button>

          {/* Desc. Cirúrgica */}
          <button
            className={currentSection === "descricao" ? activeMain : inactiveMain}
            onClick={() => navigate("/descricao-cirurgica")}
          >
            <span className="flex items-center gap-3">
              <span className={currentSection === "descricao" ? iconWrapperActive : iconWrapperInactive}>
                <FileSignature className="h-4 w-4" />
              </span>
              <span className="font-medium">Desc. Cirúrgica</span>
            </span>
          </button>

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

          {/* Finanças */}
          <button
            className={currentSection === "financas" ? activeMain : inactiveMain}
            onClick={() => navigate("/admin/financas")}
          >
            <span className="flex items-center gap-3">
              <span className={currentSection === "financas" ? iconWrapperActive : iconWrapperInactive}>
                <Wallet className="h-4 w-4" />
              </span>
              <span className="font-medium">Finanças</span>
            </span>
          </button>

          {/* Recursos (placeholder) */}
          <button className={inactiveMain}>
            <span className="flex items-center gap-3">
              <span className={iconWrapperInactive}>
                <Stethoscope className="h-4 w-4" />
              </span>
              <span className="font-medium">Recursos</span>
            </span>
          </button>

          {/* Cadastro */}
          <div className={blockContainer}>
            <div className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground">
                <Users className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-sidebar-foreground">
                Cadastro
              </span>
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
                <span className="ml-7">Clínicas / Hospitais</span>
              </button>

              <button
                className={
                  currentCadastroSub === "medicos" ? blockItemActive : blockItemInactive
                }
                onClick={() => navigate("/cadastro/medicos")}
              >
                <span className="ml-7">Médicos</span>
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <button className={inactiveMain}>
            <span className="flex items-center gap-3">
              <span className={iconWrapperInactive}>
                <MessageCircle className="h-4 w-4" />
              </span>
              <span className="font-medium">Mensagens</span>
            </span>
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive text-[11px] font-semibold text-destructive-foreground">
              2
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
              <span className="font-medium">Configurações</span>
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
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground">
          <HelpCircle className="h-4 w-4" />
        </span>
        <span>Sair</span>
      </button>
    </aside>
  );
};

export default AdminSidebar;
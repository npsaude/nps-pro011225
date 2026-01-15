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
} from "lucide-react";

interface AdminSidebarProps {
  section?: "home" | "descricao" | "faturamento" | "financas" | "cadastro" | "config";
  cadastroSubsection?: "clinicas" | "hospitais" | "medicos" | "planos";
}

const AdminSidebar = ({
  section,
  cadastroSubsection,
}: AdminSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentSection: AdminSidebarProps["section"] = useMemo(() => {
    if (section) return section;
    const path = location.pathname;
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

  const currentCadastroSub: AdminSidebarProps["cadastroSubsection"] =
    useMemo(() => {
      if (cadastroSubsection) return cadastroSubsection;
      const path = location.pathname;
      if (path.startsWith("/cadastro/clinicas")) return "clinicas";
      if (path.startsWith("/cadastro/hospitais")) return "hospitais";
      if (path.startsWith("/cadastro/medicos")) return "medicos";
      if (path.includes("planos")) return "planos";
      return undefined;
    }, [location.pathname, cadastroSubsection]);

  const baseButton =
    "flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all";
  const inactiveMain =
    baseButton + " text-slate-200 hover:bg-slate-900/40";
  const activeMain =
    baseButton +
    " bg-[#1D4E77] text-white shadow-md shadow-slate-900/50";

  const iconWrapperActive =
    "flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white";
  const iconWrapperInactive =
    "flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/40 text-slate-100";

  const cadastroContainer =
    "mt-1 rounded-2xl bg-slate-900/40 p-2 text-xs text-slate-200 ring-1 ring-slate-800";
  const cadastroItemBase =
    "flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs transition-colors";
  const cadastroItemActive =
    cadastroItemBase + " bg-slate-900 text-slate-100";
  const cadastroItemInactive =
    cadastroItemBase + " text-slate-200 hover:bg-slate-900/60";

  return (
    <aside className="hidden w-60 flex-col justify-between rounded-3xl bg-[#0F2A43] p-4 text-slate-50 shadow-[0_18px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:flex">
      <div className="flex flex-col gap-8">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1D4E77]">
            <img
              src="/logo.jpeg"
              alt="Logo NP Saúde Pró"
              className="h-8 w-8 rounded-xl object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none text-slate-50">
              NP Saúde Pró
            </span>
            <span className="text-xs text-slate-300">
              Painel administrativo
            </span>
          </div>
        </div>

        {/* Menu principal */}
        <nav className="flex flex-col gap-1 text-sm">
          {/* Home */}
          <button
            className={currentSection === "home" ? activeMain : inactiveMain}
            onClick={() => navigate("/admin/dashboard")}
          >
            <span className="flex items-center gap-3">
              <span
                className={
                  currentSection === "home"
                    ? iconWrapperActive
                    : iconWrapperInactive
                }
              >
                <Home className="h-4 w-4" />
              </span>
              <span className="font-medium">Home</span>
            </span>
          </button>

          {/* Desc. Cirúrgica */}
          <button
            className={
              currentSection === "descricao" ? activeMain : inactiveMain
            }
            onClick={() => navigate("/descricao-cirurgica")}
          >
            <span className="flex items-center gap-3">
              <span
                className={
                  currentSection === "descricao"
                    ? iconWrapperActive
                    : iconWrapperInactive
                }
              >
                <FileSignature className="h-4 w-4" />
              </span>
              <span className="font-medium">Desc. Cirúrgica</span>
            </span>
          </button>

          {/* Faturamento */}
          <button
            className={
              currentSection === "faturamento" ? activeMain : inactiveMain
            }
            onClick={() => navigate("/admin/faturamento")}
          >
            <span className="flex items-center gap-3">
              <span
                className={
                  currentSection === "faturamento"
                    ? iconWrapperActive
                    : iconWrapperInactive
                }
              >
                <LineChart className="h-4 w-4" />
              </span>
              <span className="font-medium">Faturamento</span>
            </span>
          </button>

          {/* Finanças */}
          <button
            className={
              currentSection === "financas" ? activeMain : inactiveMain
            }
            onClick={() => navigate("/admin/financas")}
          >
            <span className="flex items-center gap-3">
              <span
                className={
                  currentSection === "financas"
                    ? iconWrapperActive
                    : iconWrapperInactive
                }
              >
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
          <div className={cadastroContainer}>
            <div className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-slate-100">
                <Users className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-slate-50">
                Cadastro
              </span>
            </div>
            <div className="mt-1 space-y-1">
              {/* Clínicas / Hospitais unificado */}
              <button
                className={
                  currentCadastroSub === "clinicas" ||
                  currentCadastroSub === "hospitais"
                    ? cadastroItemActive
                    : cadastroItemInactive
                }
                onClick={() => navigate("/cadastro/clinicas")}
              >
                <span className="ml-7">Clínicas / Hospitais</span>
              </button>

              {/* Médicos */}
              <button
                className={
                  currentCadastroSub === "medicos"
                    ? cadastroItemActive
                    : cadastroItemInactive
                }
                onClick={() => navigate("/cadastro/medicos")}
              >
                <span className="ml-7">Médicos</span>
              </button>

              {/* Planos de Saúde (placeholder de rota) */}
              <button
                className={
                  currentCadastroSub === "planos"
                    ? cadastroItemActive
                    : cadastroItemInactive
                }
                onClick={() => navigate("/admin/assinaturas/planos")}
              >
                <span className="ml-7">Planos de assinatura</span>
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
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 text-[11px] font-semibold text-white">
              2
            </span>
          </button>

          {/* Configurações */}
          <button
            className={currentSection === "config" ? activeMain : inactiveMain}
            onClick={() => navigate("/admin/configuracoes")}
          >
            <span className="flex items-center gap-3">
              <span
                className={
                  currentSection === "config"
                    ? iconWrapperActive
                    : iconWrapperInactive
                }
              >
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
      <button className="mt-4 flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-900/60">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/50 text-slate-100">
          <HelpCircle className="h-4 w-4" />
        </span>
        <span>Sair</span>
      </button>
    </aside>
  );
};

export default AdminSidebar;
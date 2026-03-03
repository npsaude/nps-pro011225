import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  ReceiptText,
  FolderOpen,
  Settings,
  HelpCircle,
  MessageCircle,
  LogOut,
} from "lucide-react";
import { logout } from "@/services/auth-service";
import { showError, showSuccess } from "@/utils/toast";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import LockedMenuItem from "@/components/sidebar/LockedMenuItem";
import { MEDICO_LOGO_URL } from "@/constants/medico-brand";

const MedicoSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasFeature, isLoading } = usePlanFeatures();

  const handleLogout = () => {
    void logout()
      .then(() => {
        showSuccess("Sessão encerrada.");
        navigate("/login-medico");
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Erro ao encerrar sessão.";
        showError(message);
      });
  };

  const path = location.pathname;

  const isHome = path === "/medico/dashboard";
  const isFaturamentos = path.startsWith("/medico/faturamentos");
  const isDocumentos =
    path.startsWith("/documentos/") ||
    path.startsWith("/medico/guia-autorizacao") ||
    path.startsWith("/medico/descricao-cirurgica");
  const isConfig = path.startsWith("/medico/configuracoes");

  const currentDocSub = useMemo(() => {
    if (path.startsWith("/documentos/guia-solicitacao")) return "guia-solicitacao";
    if (path.startsWith("/documentos/guia-autorizacao") || path.startsWith("/medico/guia-autorizacao")) return "guia-autorizacao";
    if (path.startsWith("/documentos/descricao-cirurgica") || path.startsWith("/medico/descricao-cirurgica")) return "descricao-cirurgica";
    if (path.startsWith("/documentos/guia-honorarios")) return "guia-honorarios";
    if (path.startsWith("/documentos/relatorio-repasse")) return "relatorio-repasse";
    return undefined;
  }, [path]);

  // Estilos base
  const baseBtn =
    "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all";
  const inactiveMain = baseBtn + " text-sidebar-foreground/80 hover:bg-sidebar-accent/50";
  const activeMain = baseBtn + " bg-primary text-primary-foreground shadow-md";

  const iconActive =
    "flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary-foreground";
  const iconInactive =
    "flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-accent/60 text-sidebar-foreground";

  const blockContainer =
    "mt-1 rounded-2xl bg-sidebar-accent/40 p-2 text-xs text-sidebar-foreground ring-1 ring-sidebar-border";
  const blockItemBase =
    "flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs transition-colors";
  const blockItemActive = blockItemBase + " bg-sidebar-accent text-sidebar-foreground";
  const blockItemInactive =
    blockItemBase + " text-sidebar-foreground/80 hover:bg-sidebar-accent/60";
  const blockItemLocked = blockItemBase + " opacity-60 cursor-pointer";

  return (
    <aside className="hidden w-60 flex-col justify-between rounded-3xl bg-sidebar p-4 text-sidebar-foreground shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:flex">
      <div className="flex flex-col gap-8">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sidebar-accent">
            <img
              src={MEDICO_LOGO_URL}
              alt="Logo CONMEDIC"
              className="h-8 w-8 rounded-xl object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none text-sidebar-foreground">
              CONMEDIC
            </span>
            <span className="text-xs text-sidebar-foreground/70">Portal do Médico</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 text-sm">
          {/* Dashboard — nunca bloqueado */}
          <button
            className={isHome ? activeMain : inactiveMain}
            onClick={() => navigate("/medico/dashboard")}
          >
            <span className="flex items-center gap-3">
              <span className={isHome ? iconActive : iconInactive}>
                <Home className="h-4 w-4" />
              </span>
              <span className="font-medium">Dashboard</span>
            </span>
          </button>

          {/* Faturamentos — controlado por feature */}
          {!isLoading && !hasFeature("faturamento") ? (
            <LockedMenuItem
              label="Faturamentos"
              icon={
                <span className={iconInactive}>
                  <ReceiptText className="h-4 w-4" />
                </span>
              }
              className={inactiveMain + " gap-3"}
            />
          ) : (
            <button
              className={isFaturamentos ? activeMain : inactiveMain}
              onClick={() => navigate("/medico/faturamentos")}
            >
              <span className="flex items-center gap-3">
                <span className={isFaturamentos ? iconActive : iconInactive}>
                  <ReceiptText className="h-4 w-4" />
                </span>
                <span className="font-medium">Faturamentos</span>
              </span>
            </button>
          )}

          {/* Documentos — submenu com controle por feature */}
          <div className={blockContainer}>
            <div className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground">
                <FolderOpen className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-sidebar-foreground">
                Documentos
              </span>
            </div>

            <div className="mt-1 space-y-1">
              {/* Guia de Solicitação */}
              {!isLoading && !hasFeature("documentos_guia_solicitacao") ? (
                <LockedMenuItem
                  label="Guia de Solicitação"
                  className={blockItemLocked}
                />
              ) : (
                <button
                  className={currentDocSub === "guia-solicitacao" ? blockItemActive : blockItemInactive}
                  onClick={() => navigate("/documentos/guia-solicitacao")}
                >
                  <span className="ml-7">Guia de Solicitação</span>
                </button>
              )}

              {/* Guia de Autorização */}
              {!isLoading && !hasFeature("documentos_guia_autorizacao") ? (
                <LockedMenuItem
                  label="Guia de Autorização"
                  className={blockItemLocked}
                />
              ) : (
                <button
                  className={currentDocSub === "guia-autorizacao" ? blockItemActive : blockItemInactive}
                  onClick={() => navigate("/medico/guia-autorizacao/enviar")}
                >
                  <span className="ml-7">Guia de Autorização</span>
                </button>
              )}

              {/* Descrição Cirúrgica */}
              {!isLoading && !hasFeature("documentos_descricao_cirurgica") ? (
                <LockedMenuItem
                  label="Descrição Cirúrgica"
                  className={blockItemLocked}
                />
              ) : (
                <button
                  className={currentDocSub === "descricao-cirurgica" ? blockItemActive : blockItemInactive}
                  onClick={() => navigate("/medico/faturamentos/enviar")}
                >
                  <span className="ml-7">Descrição Cirúrgica</span>
                </button>
              )}

              {/* Guia de Honorários */}
              {!isLoading && !hasFeature("documentos_guia_honorarios") ? (
                <LockedMenuItem
                  label="Guia de Honorários"
                  className={blockItemLocked}
                />
              ) : (
                <button
                  className={currentDocSub === "guia-honorarios" ? blockItemActive : blockItemInactive}
                  onClick={() => navigate("/documentos/guia-honorarios")}
                >
                  <span className="ml-7">Guia de Honorários</span>
                </button>
              )}

              {/* Relatório de Repasse — bloqueado no plano BASICO */}
              {!isLoading && !hasFeature("documentos_relatorio_repasse") ? (
                <LockedMenuItem
                  label="Relatório de Repasse"
                  className={blockItemLocked}
                />
              ) : (
                <button
                  className={currentDocSub === "relatorio-repasse" ? blockItemActive : blockItemInactive}
                  onClick={() => navigate("/documentos/relatorio-repasse")}
                >
                  <span className="ml-7">Relatório de Repasse</span>
                </button>
              )}
            </div>
          </div>

          {/* Mensagens — nunca bloqueado */}
          <button className={inactiveMain}>
            <span className="flex items-center gap-3">
              <span className={iconInactive}>
                <MessageCircle className="h-4 w-4" />
              </span>
              <span className="font-medium">Mensagens</span>
            </span>
          </button>

          {/* Configurações — nunca bloqueado */}
          <button
            className={isConfig ? activeMain : inactiveMain}
            onClick={() => navigate("/medico/configuracoes")}
          >
            <span className="flex items-center gap-3">
              <span className={isConfig ? iconActive : iconInactive}>
                <Settings className="h-4 w-4" />
              </span>
              <span className="font-medium">Configurações</span>
            </span>
          </button>

          {/* Ajuda — nunca bloqueado */}
          <button className={inactiveMain}>
            <span className="flex items-center gap-3">
              <span className={iconInactive}>
                <HelpCircle className="h-4 w-4" />
              </span>
              <span className="font-medium">Ajuda</span>
            </span>
          </button>
        </nav>
      </div>

      {/* Sair — nunca bloqueado */}
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

export default MedicoSidebar;

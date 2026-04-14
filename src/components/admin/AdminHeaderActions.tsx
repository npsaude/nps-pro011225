import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Send } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSystemUser } from "@/hooks/use-system-user";
import { useSubscriptionStatus } from "@/hooks/use-subscription-status";
import { showError, showSuccess } from "@/utils/toast";
import { subscribeAvatarUpdated } from "@/utils/avatar-events";
import {
  getCachedAvatarSignedUrl,
  setCachedAvatarSignedUrl,
} from "@/utils/avatar-signed-url-cache";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import BellButton from "@/components/admin/BellButton";
import UserAvatarButton from "@/components/admin/UserAvatarButton";
import SurgeryQuotaBadge from "@/components/admin/SurgeryQuotaBadge";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminHeaderActions(props: { notificationsCount?: number }) {
  const { notificationsCount = 0 } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const { systemUser } = useSystemUser();
  const { status: subscriptionStatus } = useSubscriptionStatus();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fecha o menu mobile automaticamente ao mudar de rota
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const role = String((systemUser as any)?.regra ?? "").trim().toUpperCase();
  const isMedico = role === "MEDICO";
  const isSuperAdmin = role === "SUPER_ADMIN";

  const displayName = useMemo(() => {
    return systemUser?.nome?.trim() || systemUser?.email?.trim() || "Usuário";
  }, [systemUser?.email, systemUser?.nome]);

  const subscriptionCanceled =
    String(subscriptionStatus ?? "").toUpperCase() === "CANCELED";

  useEffect(() => {
    const unsubscribe = subscribeAvatarUpdated((url) => {
      setAvatarUrl(url);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const path = (systemUser as any)?.avatar_url as string | null | undefined;
      if (!path) {
        setAvatarUrl(null);
        return;
      }

      const cached = getCachedAvatarSignedUrl(path);
      if (cached) {
        setAvatarUrl(cached);
        return;
      }

      const { data, error } = await supabase.storage
        .from("NPS-pro")
        .createSignedUrl(path, 60 * 60);

      if (cancelled) return;

      if (error) {
        setAvatarUrl(null);
        return;
      }

      const signedUrl = data?.signedUrl ?? null;
      setAvatarUrl(signedUrl);
      if (signedUrl) {
        setCachedAvatarSignedUrl(path, signedUrl, 60 * 60);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [systemUser]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError(error.message || "Não foi possível sair.");
      return;
    }
    showSuccess("Sessão encerrada.");
    navigate("/login");
  };

  return (
    <div className="flex items-center gap-2">
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden h-9 w-9 border-slate-200 bg-white/50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar text-sidebar-foreground border-r-slate-200 dark:border-r-slate-800">
          <AdminSidebar isMobile />
        </SheetContent>
      </Sheet>

      <BellButton count={notificationsCount} onClick={() => {}} />

      {!isSuperAdmin && (
        <button
          type="button"
          onClick={() => navigate("/medico/faturamentos/enviar")}
          className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] px-5 text-sm font-bold text-black shadow-[0_0_14px_rgba(212,160,23,0.45)] transition-all hover:shadow-[0_0_24px_rgba(212,160,23,0.65)] hover:scale-[1.03] animate-pulse-gold"
        >
          <Send className="h-4 w-4" />
          Enviar Guias
        </button>
      )}

      {isMedico && <SurgeryQuotaBadge />}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span>
            <UserAvatarButton
              displayName={displayName}
              avatarUrl={avatarUrl}
              subscriptionCanceled={subscriptionCanceled}
            />
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">{displayName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/perfil")}>
            Meu perfil
          </DropdownMenuItem>
          {isMedico && (
            <DropdownMenuItem onClick={() => navigate("/medico/dashboard")}>
              Ir para mobile
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleSignOut}>Sair</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
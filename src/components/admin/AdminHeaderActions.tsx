import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
import BellButton from "@/components/admin/BellButton";
import UserAvatarButton from "@/components/admin/UserAvatarButton";
import SurgeryQuotaBadge from "@/components/admin/SurgeryQuotaBadge";

export default function AdminHeaderActions(props: { notificationsCount?: number }) {
  const { notificationsCount = 0 } = props;
  const navigate = useNavigate();
  const { systemUser } = useSystemUser();
  const { status: subscriptionStatus } = useSubscriptionStatus();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const role = String((systemUser as any)?.regra ?? "").trim().toUpperCase();
  const isMedico = role === "MEDICO";

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
      <BellButton count={notificationsCount} onClick={() => {}} />

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
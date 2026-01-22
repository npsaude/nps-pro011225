import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSystemUser } from "@/hooks/use-system-user";
import { showError, showSuccess } from "@/utils/toast";
import { subscribeAvatarUpdated } from "@/utils/avatar-events";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminHeaderActions(props: { notificationsCount?: number }) {
  const { notificationsCount = 0 } = props;
  const navigate = useNavigate();
  const { systemUser } = useSystemUser();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const displayName = useMemo(() => {
    return systemUser?.nome?.trim() || systemUser?.email?.trim() || "Usuário";
  }, [systemUser?.email, systemUser?.nome]);

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

      const { data, error } = await supabase.storage
        .from("NPS-pro")
        .createSignedUrl(path, 60 * 60);

      if (cancelled) return;

      if (error) {
        setAvatarUrl(null);
        return;
      }

      setAvatarUrl(data?.signedUrl ?? null);
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
      <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-muted hover:text-foreground">
        {notificationsCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-semibold text-destructive-foreground">
            {notificationsCount > 9 ? "9+" : notificationsCount}
          </span>
        ) : null}
        <Bell className="h-4 w-4" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary ring-1 ring-border transition-colors hover:bg-muted"
            aria-label="Menu do usuário"
            type="button"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-secondary text-xs text-foreground">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">{displayName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>Sair</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
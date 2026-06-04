import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Calendar, Camera, Shield } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSystemUser } from "@/hooks/use-system-user";
import { showError, showSuccess } from "@/utils/toast";
import { emitAvatarUpdated } from "@/utils/avatar-events";
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import { setUserAvatar } from "@/services/user-avatar-service";
import { atualizarMeuUsuarioSistema } from "@/services/system-user-profile-service";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatMonthYear(dateIso?: string | null) {
  if (!dateIso) return "—";
  const dt = new Date(dateIso);
  return dt.toLocaleString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
}

type Props = {
  planLabel?: string | null;
};

export default function ProfileHeaderCard({ planLabel }: Props) {
  const { systemUser } = useSystemUser();
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [cropOpen, setCropOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const displayName = useMemo(() => {
    return systemUser?.nome?.trim() || systemUser?.email?.trim() || "Usuário";
  }, [systemUser?.email, systemUser?.nome]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    // se o usuário mudar (login/logout), limpa preview local
    setAvatarPreviewUrl(null);
  }, [systemUser?.id_user]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const path = systemUser?.avatar_url as string | null | undefined;
      if (!path) {
        setAvatarSignedUrl(null);
        return;
      }

      const { data, error } = await supabase.storage
        .from("NPS-pro")
        .createSignedUrl(path, 60 * 60);

      if (cancelled) return;

      if (error) {
        setAvatarSignedUrl(null);
        return;
      }

      setAvatarSignedUrl(data?.signedUrl ?? null);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [systemUser]);

  const handleAvatarPicked = (file: File | null) => {
    if (!file || !systemUser) return;
    setSelectedFile(file);
    setCropOpen(true);
  };

  const handleAvatarCropped = async (blob: Blob) => {
    if (!systemUser) return;

    const nextPreview = URL.createObjectURL(blob);
    setAvatarPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextPreview;
    });
    emitAvatarUpdated(nextPreview);

    setSaving(true);
    try {
      const { path, signedUrl } = await setUserAvatar({ blob });
      await atualizarMeuUsuarioSistema({ avatar_url: path });

      setAvatarSignedUrl(signedUrl);
      emitAvatarUpdated(signedUrl);

      showSuccess("Foto atualizada.");
    } catch (e) {
      emitAvatarUpdated(avatarSignedUrl);
      showError(e instanceof Error ? e.message : "Não foi possível enviar a foto.");
    } finally {
      setSaving(false);
      setSelectedFile(null);
    }
  };

  return (
    <Card className="rounded-3xl border border-border bg-card/70 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20 ring-2 ring-border shadow-sm">
              <AvatarImage src={(avatarPreviewUrl ?? avatarSignedUrl) ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-secondary text-lg text-foreground">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>

            <label className="absolute -bottom-1 -right-1">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={saving}
                onChange={(e) => handleAvatarPicked(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                size="icon"
                className="h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-95"
                disabled={saving}
                asChild
              >
                <span aria-label="Alterar foto">
                  <Camera className="h-4 w-4" />
                </span>
              </Button>
            </label>
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                {displayName}
              </h2>
              {planLabel ? (
                <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                  {planLabel}
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" />
                {systemUser?.regra ?? "—"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-emerald-400" />
                {systemUser?.crm ? `CRM ${systemUser.crm}` : "CRM —"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Membro desde {formatMonthYear(systemUser?.criado_em)}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden sm:block">
          <div className="h-10 w-10 rounded-full bg-secondary/60" />
        </div>
      </div>

      <AvatarCropDialog
        open={cropOpen}
        file={selectedFile}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open) setSelectedFile(null);
        }}
        onConfirm={(blob) => void handleAvatarCropped(blob)}
      />
    </Card>
  );
}
import { useEffect, useMemo, useState } from "react";
import { Camera, Save } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { useSystemUser } from "@/hooks/use-system-user";
import { showError, showSuccess } from "@/utils/toast";
import { emitAvatarUpdated } from "@/utils/avatar-events";
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import { setUserAvatar } from "@/services/user-avatar-service";
import {
  atualizarMeuUsuarioSistema,
} from "@/services/system-user-profile-service";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserProfileForm() {
  const { loading, systemUser } = useSystemUser();
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [crm, setCrm] = useState("");
  const [empresaClinicaBase, setEmpresaClinicaBase] = useState("");
  const [saving, setSaving] = useState(false);

  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const avatarPath = (systemUser as any)?.avatar_url as string | null | undefined;

  const displayName = useMemo(() => {
    return systemUser?.nome?.trim() || systemUser?.email?.trim() || "Usuário";
  }, [systemUser?.email, systemUser?.nome]);

  useEffect(() => {
    if (!systemUser) return;
    setNome(systemUser.nome ?? "");
    setCelular(systemUser.celular ?? "");
    setCrm(systemUser.crm ?? "");
    setEmpresaClinicaBase(systemUser.empresa_clinica_base ?? "");
  }, [systemUser]);

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
      if (!avatarPath) {
        setAvatarSignedUrl(null);
        return;
      }
      const { data, error } = await supabase.storage
        .from("NPS-pro")
        .createSignedUrl(avatarPath, 60 * 60);

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
  }, [avatarPath]);

  const handleSave = async () => {
    if (!systemUser) return;

    setSaving(true);
    try {
      await atualizarMeuUsuarioSistema({
        nome: nome.trim(),
        celular: celular.trim() || null,
        crm: crm.trim() || null,
        empresa_clinica_base: empresaClinicaBase.trim() || null,
      });
      showSuccess("Perfil atualizado.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

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

      // mantém compatibilidade com telas que ainda leem usuarios_sistema.avatar_url
      await atualizarMeuUsuarioSistema({ avatar_url: path });

      setAvatarSignedUrl(signedUrl);
      emitAvatarUpdated(signedUrl);

      showSuccess("Foto atualizada.");
    } catch (e) {
      // fallback: volta para o avatar salvo (ou nenhum)
      emitAvatarUpdated(avatarSignedUrl);
      showError(e instanceof Error ? e.message : "Não foi possível enviar a foto.");
    } finally {
      setSaving(false);
      setSelectedFile(null);
    }
  };

  return (
    <Card className="rounded-3xl border border-border bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Perfil</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16 ring-1 ring-border">
              <AvatarImage src={(avatarPreviewUrl ?? avatarSignedUrl) ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-secondary text-lg text-foreground">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{displayName}</span>
              <span className="text-xs text-muted-foreground">{systemUser?.email}</span>
              <span className="mt-1 text-[11px] text-muted-foreground">
                Regra: <span className="font-medium text-foreground">{systemUser?.regra}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label
              htmlFor="avatar-input"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground ring-1 ring-border hover:bg-muted"
            >
              <Camera className="h-4 w-4" />
              Alterar foto
            </Label>
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              className="hidden"
              disabled={saving}
              onChange={(e) => handleAvatarPicked(e.target.files?.[0] ?? null)}
            />
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={loading || saving}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Celular</Label>
            <Input
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              disabled={loading || saving}
              className="h-10"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">CRM</Label>
            <Input
              value={crm}
              onChange={(e) => setCrm(e.target.value)}
              disabled={loading || saving}
              className="h-10"
              placeholder="Ex.: 12345-SP"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Empresa / clínica base
            </Label>
            <Input
              value={empresaClinicaBase}
              onChange={(e) => setEmpresaClinicaBase(e.target.value)}
              disabled={loading || saving}
              className="h-10"
              placeholder="Ex.: Clínica XPTO"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="h-10 rounded-full px-5"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
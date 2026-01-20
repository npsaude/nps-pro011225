import { useEffect, useMemo, useState } from "react";
import { KeyRound, Mail, Phone, ShieldCheck, User2 } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";
import { useSystemUser } from "@/hooks/use-system-user";
import { showError, showSuccess } from "@/utils/toast";
import { atualizarMeuUsuarioSistema } from "@/services/system-user-profile-service";
import { sendPasswordReset } from "@/services/auth-service";

function formatLastAccess(iso?: string | null) {
  if (!iso) return "—";
  const dt = new Date(iso);
  return dt.toLocaleString("pt-BR");
}

export default function ProfileAccountAndSecurity() {
  const { loading, systemUser } = useSystemUser();
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [crm, setCrm] = useState("");
  const [empresa, setEmpresa] = useState("");

  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);

  const email = useMemo(() => systemUser?.email ?? "", [systemUser?.email]);

  useEffect(() => {
    if (!systemUser) return;
    setNome(systemUser.nome ?? "");
    setCelular(systemUser.celular ?? "");
    setCrm((systemUser as any)?.crm ?? "");
    setEmpresa((systemUser as any)?.empresa_clinica_base ?? "");
  }, [systemUser]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) return;
      setLastSignInAt((data.user as any)?.last_sign_in_at ?? null);
    };
    void load();
  }, []);

  const handleSave = async () => {
    if (!systemUser) return;

    setSaving(true);
    try {
      await atualizarMeuUsuarioSistema({
        nome: nome.trim(),
        celular: celular.trim() || null,
        crm: crm.trim() || null,
        empresa_clinica_base: empresa.trim() || null,
      });

      showSuccess("Alterações salvas.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async () => {
    if (!email) return;
    setSaving(true);
    try {
      await sendPasswordReset(email);
      showSuccess("Enviamos um e-mail para redefinir sua senha.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Não foi possível enviar o e-mail.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOutAll = async () => {
    setSaving(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setSaving(false);

    if (error) {
      showError(error.message || "Não foi possível encerrar as sessões.");
      return;
    }

    showSuccess("Sessões encerradas.");
    window.location.href = "/login";
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      {/* Informações da Conta */}
      <Card className="rounded-3xl border border-border bg-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <span className="h-6 w-1 rounded-full bg-primary" />
            <div className="flex flex-col">
              <h3 className="text-base font-semibold text-foreground">
                Informações da Conta
              </h3>
              <p className="text-xs text-muted-foreground">
                Atualize seus dados pessoais e corporativos.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Nome completo
              </Label>
              <div className="relative">
                <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={loading || saving}
                  className="h-11 rounded-2xl pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                E-mail corporativo
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={email}
                  disabled
                  className="h-11 rounded-2xl pl-9 opacity-80"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                CRM
              </Label>
              <Input
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                disabled={loading || saving}
                className="h-11 rounded-2xl"
                placeholder="123456/SP"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Telefone
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  disabled={loading || saving}
                  className="h-11 rounded-2xl pl-9"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Empresa / Clínica base
            </Label>
            <Input
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              disabled={loading || saving}
              className="h-11 rounded-2xl"
              placeholder="Ex.: CONMEDIC Matriz"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="h-11 rounded-2xl bg-primary px-6 text-primary-foreground shadow-[0_14px_30px_rgba(0,0,0,0.35)] hover:opacity-95"
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card className="rounded-3xl border border-border bg-gradient-to-b from-secondary to-card shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
        <CardHeader className="pb-2">
          <h3 className="text-base font-semibold text-foreground">Segurança</h3>
          <p className="text-xs text-muted-foreground">
            Informações e ações da conta.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 pt-3">
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="text-xs text-muted-foreground">Status da Conta</div>
            <div className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              {systemUser?.ativo ? "Verificada" : "Inativa"}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="text-xs text-muted-foreground">Último Acesso</div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              {formatLastAccess(lastSignInAt)}
            </div>
          </div>

          <Button
            type="button"
            onClick={handlePassword}
            disabled={saving}
            className="h-11 w-full rounded-2xl bg-secondary text-secondary-foreground ring-1 ring-border hover:bg-muted"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Alterar Senha
          </Button>

          <button
            type="button"
            onClick={handleSignOutAll}
            disabled={saving}
            className="w-full text-center text-xs font-semibold text-destructive underline-offset-4 hover:underline disabled:opacity-60"
          >
            Encerrar todas as sessões
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
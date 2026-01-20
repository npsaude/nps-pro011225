import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Mail,
  Phone,
  User,
  Award,
  CreditCard,
  CheckCircle2,
  Download,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Star,
  ArrowLeft,
  KeyRound,
} from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";

import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useSystemUser } from "@/hooks/use-system-user";
import {
  atualizarMeuUsuarioSistema,
  uploadAvatar,
} from "@/services/system-user-profile-service";
import { sendPasswordReset } from "@/services/auth-service";
import { cancelarAssinatura } from "@/services/subscription-cancel-service";
import {
  listarFaturasAssinatura,
  type SubscriptionInvoice,
} from "@/services/subscription-invoices-service";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ActiveTab = "info" | "subscription";

type Enrollment = {
  id: string;
  status: string | null;
  asaas_subscription_id: string | null;
  current_period_end: string | null;
  plan: {
    id: string;
    name: string | null;
    code: string | null;
    price_cents: number | null;
    features?: unknown;
    billing_interval?: string | null;
    interval_count?: number | null;
  } | null;
};

type Plan = {
  id: string;
  name: string;
  code: string;
  price_cents: number;
  billing_interval?: string | null;
  interval_count?: number | null;
  features?: unknown;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatBRLFromCents(cents?: number | null) {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatShortMonthYear(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
}

function formatDateBR(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function planPeriodText(plan?: Plan | Enrollment["plan"] | null) {
  const interval = String((plan as any)?.billing_interval ?? "MONTH").toUpperCase();
  const n = Number((plan as any)?.interval_count ?? 1);
  if (interval === "YEAR") return n === 1 ? "Plano Anual" : `A cada ${n} anos`;
  if (interval === "WEEK") return n === 1 ? "Plano Semanal" : `A cada ${n} semanas`;
  if (interval === "DAY") return n === 1 ? "Plano Diário" : `A cada ${n} dias`;
  return n === 1 ? "Plano Mensal" : `A cada ${n} meses`;
}

function normalizeFeatureList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x)).filter(Boolean).slice(0, 3);
  return [];
}

export default function AdminProfile() {
  const navigate = useNavigate();
  const { loading, systemUser } = useSystemUser();

  const [activeTab, setActiveTab] = useState<ActiveTab>("info");
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);

  const displayName = useMemo(() => {
    return systemUser?.nome?.trim() || systemUser?.email?.trim() || "Usuário";
  }, [systemUser?.email, systemUser?.nome]);

  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [crm, setCrm] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [saving, setSaving] = useState(false);

  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);

  const [currentEnrollment, setCurrentEnrollment] = useState<Enrollment | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const planLabel = useMemo(() => {
    const nameOrCode = currentEnrollment?.plan?.name ?? currentEnrollment?.plan?.code ?? null;
    return nameOrCode ? String(nameOrCode) : null;
  }, [currentEnrollment?.plan?.code, currentEnrollment?.plan?.name]);

  useEffect(() => {
    if (!systemUser) return;
    setNome(systemUser.nome ?? "");
    setCelular(systemUser.celular ?? "");
    setCrm(((systemUser as any)?.crm ?? "") as string);
    setEmpresa(((systemUser as any)?.empresa_clinica_base ?? "") as string);
  }, [systemUser]);

  useEffect(() => {
    const loadLastSignIn = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) return;
      setLastSignInAt(((data.user as any)?.last_sign_in_at ?? null) as string | null);
    };
    void loadLastSignIn();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAvatar = async () => {
      const path = (systemUser as any)?.avatar_url as string | null | undefined;
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

    void loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [systemUser]);

  useEffect(() => {
    let cancelled = false;

    const loadSubscription = async () => {
      setLoadingSubscription(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        showError(authError.message);
        setLoadingSubscription(false);
        return;
      }

      const email = authData.user?.email?.trim();
      if (!email) {
        setLoadingSubscription(false);
        return;
      }

      const [{ data: enrollmentData, error: enrollmentError }, { data: plansData, error: plansError }] =
        await Promise.all([
          supabase
            .from("subscription_enrollments")
            .select(
              "id,status,asaas_subscription_id,current_period_end,plan:subscription_plans(id,name,code,price_cents,features,billing_interval,interval_count)",
            )
            .ilike("user_email", email)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("subscription_plans")
            .select("id,name,code,price_cents,features,billing_interval,interval_count,active")
            .eq("active", true)
            .order("price_cents", { ascending: true }),
        ]);

      if (enrollmentError) showError(enrollmentError.message);
      if (plansError) showError(plansError.message);

      const row = (enrollmentData as any) ?? null;
      const plan = Array.isArray(row?.plan) ? row.plan[0] ?? null : row?.plan ?? null;

      if (!cancelled) {
        setCurrentEnrollment(
          row
            ? {
                id: row.id,
                status: row.status ?? null,
                asaas_subscription_id: row.asaas_subscription_id ?? null,
                current_period_end: row.current_period_end ?? null,
                plan,
              }
            : null,
        );

        setPlans(
          ((plansData ?? []) as any[]).map((p) => ({
            id: p.id,
            name: p.name,
            code: p.code,
            price_cents: p.price_cents,
            billing_interval: p.billing_interval ?? null,
            interval_count: p.interval_count ?? null,
            features: p.features ?? null,
          })),
        );
      }

      setLoadingSubscription(false);
    };

    void loadSubscription();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInvoices = async () => {
      if (!currentEnrollment?.id) return;
      try {
        const res = await listarFaturasAssinatura({ enrollmentId: currentEnrollment.id });
        if (!cancelled) setInvoices(res);
      } catch (e) {
        if (!cancelled) {
          setInvoices([]);
          showError(e instanceof Error ? e.message : "Não foi possível carregar faturas.");
        }
      }
    };

    void loadInvoices();

    return () => {
      cancelled = true;
    };
  }, [currentEnrollment?.id]);

  const handleAvatarChange = async (file: File | null) => {
    if (!file || !systemUser) return;

    setSaving(true);
    try {
      const path = await uploadAvatar({ file, userId: systemUser.id_user });
      await atualizarMeuUsuarioSistema({ avatar_url: path });
      showSuccess("Foto atualizada.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Não foi possível atualizar a foto.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInfo = async () => {
    if (!systemUser) return;

    setSaving(true);
    try {
      await atualizarMeuUsuarioSistema({
        nome: nome.trim(),
        celular: celular.trim() || null,
        crm: crm.trim() || null,
        empresa_clinica_base: empresa.trim() || null,
      });
      showSuccess("Salvar alterações: OK");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = systemUser?.email?.trim();
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

  const handleCancelSubscription = async () => {
    if (!currentEnrollment) return;

    if (!currentEnrollment.asaas_subscription_id) {
      showError("Assinatura sem vínculo Asaas (asaas_subscription_id vazio).");
      return;
    }

    setCanceling(true);
    try {
      await cancelarAssinatura(currentEnrollment.id);
      showSuccess("Assinatura cancelada.");
      setCurrentEnrollment((prev) => (prev ? { ...prev, status: "CANCELED" } : prev));
      setCancelOpen(false);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Não foi possível cancelar.");
    } finally {
      setCanceling(false);
    }
  };

  const currentPlanId = currentEnrollment?.plan?.id ?? null;
  const currentFeatures = normalizeFeatureList(currentEnrollment?.plan?.features);

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(254,230,122,0.08)_0,rgba(18,18,18,0.0)_45%),radial-gradient(circle_at_100%_50%,rgba(212,160,23,0.06)_0,rgba(18,18,18,0.0)_45%)]" />

      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="home" />

        <div className="flex flex-1 flex-col gap-4">
          <header className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex-1" />

            <AdminHeaderActions />
          </header>

          <div className="flex flex-col gap-8 pb-12">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 p-8 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="pointer-events-none absolute right-6 top-6 opacity-10">
                <User size={200} />
              </div>

              <div className="flex flex-col items-center gap-8 md:flex-row">
                <div className="relative group">
                  <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-primary/15 shadow-xl">
                    <img
                      src={avatarSignedUrl ?? "/perfil.jpeg"}
                      alt="Profile"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <label
                    className="absolute bottom-1 right-1 cursor-pointer rounded-full border-2 border-background bg-primary p-2.5 text-primary-foreground shadow-lg transition-all hover:opacity-95 active:scale-95"
                    title="Alterar foto"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={saving}
                      onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
                    />
                    <Camera size={16} />
                  </label>
                </div>

                <div className="z-10 flex-1 text-center md:text-left">
                  <div className="mb-2 flex items-center justify-center gap-3 md:justify-start">
                    <h2 className="text-2xl font-bold text-foreground">{displayName}</h2>
                    {planLabel ? (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary ring-1 ring-primary/25">
                        {planLabel}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-muted-foreground md:justify-start">
                    <span className="flex items-center gap-1.5">
                      <Award size={16} className="text-primary" />
                      {(systemUser as any)?.empresa_clinica_base ?? "CONMEDIC"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-emerald-400" />
                      CRM {(systemUser as any)?.crm ?? "—"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={16} className="text-muted-foreground" />
                      Membro desde {formatShortMonthYear(systemUser?.criado_em)}
                    </span>
                  </div>
                </div>

                <div className="z-10 flex gap-3">
                  <button
                    onClick={() => setActiveTab("info")}
                    className={`rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
                      activeTab === "info"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    type="button"
                  >
                    Dados Pessoais
                  </button>

                  <button
                    onClick={() => setActiveTab("subscription")}
                    className={`rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
                      activeTab === "subscription"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    type="button"
                  >
                    Assinatura
                  </button>
                </div>
              </div>
            </div>

            {activeTab === "info" ? (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* General Info Form */}
                <div className="rounded-2xl border border-border bg-card/70 p-8 shadow-sm lg:col-span-2">
                  <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-foreground">
                    <div className="h-6 w-1.5 rounded-full bg-primary"></div>
                    Informações da Conta
                  </h3>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Nome Completo
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                          type="text"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          className="w-full rounded-xl border border-border bg-secondary/30 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        E-mail Corporativo
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                          type="email"
                          value={systemUser?.email ?? ""}
                          disabled
                          className="w-full rounded-xl border border-border bg-secondary/20 py-3 pl-10 pr-4 text-sm opacity-80 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        CRM
                      </label>
                      <div className="relative">
                        <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                          type="text"
                          value={crm}
                          onChange={(e) => setCrm(e.target.value)}
                          className="w-full rounded-xl border border-border bg-secondary/30 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Telefone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                          type="text"
                          value={celular}
                          onChange={(e) => setCelular(e.target.value)}
                          className="w-full rounded-xl border border-border bg-secondary/30 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Empresa / Clínica Base
                      </label>
                      <input
                        type="text"
                        value={empresa}
                        onChange={(e) => setEmpresa(e.target.value)}
                        className="w-full rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end border-t border-border/60 pt-8">
                    <button
                      className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                      disabled={saving || loading}
                      onClick={handleSaveInfo}
                      type="button"
                    >
                      {saving ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </div>

                {/* Security Info */}
                <div className="relative h-fit overflow-hidden rounded-2xl bg-[#0f172a] p-8 text-white shadow-xl">
                  <div className="pointer-events-none absolute -bottom-10 -right-10 opacity-10">
                    <ShieldCheck size={200} />
                  </div>

                  <h3 className="mb-6 flex items-center gap-2 text-lg font-bold">
                    Segurança
                  </h3>

                  <div className="relative z-10 space-y-6">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-1 text-xs text-slate-400">Status da Conta</p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
                        <span className="text-sm font-bold text-emerald-400">
                          {systemUser?.ativo ? "Verificada" : "Inativa"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-1 text-xs text-slate-400">Último Acesso</p>
                      <p className="text-sm font-mono">
                        {lastSignInAt ? new Date(lastSignInAt).toLocaleString("pt-BR") : "—"}
                      </p>
                    </div>

                    <button
                      className="w-full rounded-xl border border-white/10 bg-white/10 py-3 text-sm font-bold transition-colors hover:bg-white/20 disabled:opacity-60"
                      onClick={handlePasswordReset}
                      disabled={saving || !systemUser?.email}
                      type="button"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <KeyRound size={16} />
                        Alterar Senha
                      </span>
                    </button>

                    <button
                      className="w-full py-3 text-xs font-medium text-red-400 transition-colors hover:text-red-300 disabled:opacity-60"
                      onClick={handleSignOutAll}
                      disabled={saving}
                      type="button"
                    >
                      Encerrar todas as sessões
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {/* Current Plan Overview */}
                <div className="relative flex flex-col items-center justify-between gap-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b1b3a] to-[#1f2a44] p-8 text-white shadow-xl md:flex-row">
                  <div className="pointer-events-none absolute right-0 top-0 p-8 opacity-10">
                    <Star size={120} />
                  </div>

                  <div className="z-10">
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary/90">
                      <CreditCard size={18} />
                      Plano Atual
                    </div>

                    <h3 className="mb-1 text-3xl font-black tracking-tight">
                      {currentEnrollment?.plan?.name ?? "Sem assinatura"}
                    </h3>

                    <p className="text-sm text-white/70">
                      {currentEnrollment?.current_period_end
                        ? `Próximo faturamento em ${formatDateBR(currentEnrollment.current_period_end)}`
                        : "Próximo faturamento: não informado"}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {(currentFeatures.length
                        ? currentFeatures
                        : ["Médicos Ilimitados", "Suporte 24/7", "Conciliação Bancária"]
                      ).map((f) => (
                        <span
                          key={f}
                          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium"
                        >
                          <CheckCircle2 size={14} className="text-primary" />
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="z-10 text-center md:text-right">
                    <div className="text-4xl font-mono font-bold">
                      {formatBRLFromCents(currentEnrollment?.plan?.price_cents)}
                    </div>
                    <p className="mt-1 text-xs text-white/70">
                      por mês ({planPeriodText(currentEnrollment?.plan)})
                    </p>

                    <button
                      className="mt-6 rounded-xl bg-white px-8 py-3 text-sm font-bold text-slate-900 shadow-lg transition-all hover:bg-blue-50 active:scale-95 disabled:opacity-60"
                      type="button"
                      onClick={() => setCancelOpen(true)}
                      disabled={
                        !currentEnrollment ||
                        canceling ||
                        String(currentEnrollment.status ?? "")
                          .toUpperCase()
                          .includes("CANCEL")
                      }
                    >
                      Gerenciar Assinatura
                    </button>
                  </div>
                </div>

                {/* Change Plan Options */}
                <div>
                  <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-foreground">
                    <div className="h-6 w-1.5 rounded-full bg-primary"></div>
                    Alterar seu Plano
                  </h3>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {plans.map((p) => {
                      const isCurrent = currentPlanId && p.id === currentPlanId;
                      const features = normalizeFeatureList(p.features);
                      return (
                        <div
                          key={p.id}
                          className={`group rounded-2xl border-2 bg-card/70 p-6 transition-all ${
                            isCurrent
                              ? "border-primary shadow-xl scale-[1.02]"
                              : "border-border hover:border-muted"
                          }`}
                        >
                          <div className="mb-4 flex items-start justify-between">
                            <div>
                              <h4 className="text-xl font-bold text-foreground">
                                {p.name}
                              </h4>
                              <div className="mt-2">
                                <span className="text-2xl font-black text-foreground">
                                  {formatBRLFromCents(p.price_cents)}
                                </span>
                                <span className="ml-1 text-xs text-muted-foreground">
                                  / {planPeriodText(p)}
                                </span>
                              </div>
                            </div>

                            {isCurrent ? (
                              <div className="rounded-full bg-primary/15 p-1.5 text-primary ring-1 ring-primary/20">
                                <CheckCircle2 size={20} />
                              </div>
                            ) : null}
                          </div>

                          <ul className="mb-8 space-y-3">
                            {(features.length
                              ? features
                              : ["Benefício do plano", "Benefício do plano", "Benefício do plano"]
                            ).map((feature, i) => (
                              <li
                                key={`${p.id}-${i}`}
                                className="flex items-start gap-2 text-sm text-muted-foreground"
                              >
                                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                                {feature}
                              </li>
                            ))}
                          </ul>

                          <button
                            disabled={isCurrent}
                            type="button"
                            onClick={() => showSuccess("Para alterar o plano, fale com o suporte.")}
                            className={`w-full rounded-xl py-3 text-sm font-bold transition-all ${
                              isCurrent
                                ? "bg-secondary text-muted-foreground"
                                : "bg-foreground text-background hover:opacity-90"
                            }`}
                          >
                            {isCurrent ? "Plano Atual" : "Selecionar Plano"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Billing History */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card/70 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border px-6 py-6">
                    <h3 className="text-lg font-bold text-foreground">
                      Histórico de Faturamento
                    </h3>
                    <button
                      className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                      type="button"
                      onClick={() => showSuccess("Em breve: página completa de faturamento.")}
                    >
                      Ver tudo <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="border-b border-border bg-secondary/30">
                        <tr className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <th className="px-6 py-4">Fatura</th>
                          <th className="px-6 py-4">Data</th>
                          <th className="px-6 py-4">Valor</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {loadingSubscription ? (
                          <tr>
                            <td className="px-6 py-6 text-sm text-muted-foreground" colSpan={5}>
                              Carregando...
                            </td>
                          </tr>
                        ) : invoices.length === 0 ? (
                          <tr>
                            <td className="px-6 py-6 text-sm text-muted-foreground" colSpan={5}>
                              Nenhuma fatura encontrada.
                            </td>
                          </tr>
                        ) : (
                          invoices.map((inv) => (
                            <tr
                              key={inv.id}
                              className="transition-colors hover:bg-secondary/20"
                            >
                              <td className="px-6 py-4 text-sm font-bold text-foreground">
                                {inv.id}
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">
                                {inv.dueDate ? formatDateBR(inv.dueDate) : "—"}
                              </td>
                              <td className="px-6 py-4 text-sm font-mono font-medium text-foreground">
                                {typeof inv.value === "number"
                                  ? inv.value.toLocaleString("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    })
                                  : "—"}
                              </td>
                              <td className="px-6 py-4">
                                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground ring-1 ring-border">
                                  {inv.status ?? "—"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  className="p-2 text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
                                  title="Download"
                                  type="button"
                                  disabled={!inv.invoiceUrl}
                                  onClick={() => {
                                    if (inv.invoiceUrl) window.open(inv.invoiceUrl, "_blank", "noopener,noreferrer");
                                  }}
                                >
                                  <Download size={18} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Gerenciar assinatura</AlertDialogTitle>
                      <AlertDialogDescription>
                        Você pode cancelar sua assinatura. Isso acionará o Asaas e o status ficará como “CANCELED” no sistema.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={canceling}>Voltar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          void handleCancelSubscription();
                        }}
                        disabled={canceling}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {canceling ? "Cancelando..." : "Cancelar assinatura"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
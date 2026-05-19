import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User2, Scissors, TrendingUp, FileText, Activity, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MedicoHeader from "@/components/medico/MedicoHeader";
import MedicoFloatingNav from "@/components/medico/MedicoFloatingNav";
import { useBillingQuota } from "@/hooks/use-billing-quota";

type DashboardStats = {
  loading: boolean;
  faturamentosMes: number;
  acompanhamentosMes: number;
  valorRecebidoMes: number;
};

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MedicoInicio: React.FC = () => {
  const navigate = useNavigate();
  const [medicoNome, setMedicoNome] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const billingQuota = useBillingQuota();
  const [stats, setStats] = useState<DashboardStats>({
    loading: true,
    faturamentosMes: 0,
    acompanhamentosMes: 0,
    valorRecebidoMes: 0,
  });

  useEffect(() => {
    const carregarDadosMedico = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const email = authData.user?.email;
      const userId = authData.user?.id;
      if (!email || !userId) return;

      const { data } = await supabase
        .from("usuarios_sistema")
        .select("nome, avatar_url")
        .eq("email", email)
        .maybeSingle();

      if (data?.nome) {
        const primeiroNome = (data.nome as string).split(" ")[0];
        setMedicoNome(primeiroNome);
      }

      const path = data?.avatar_url as string | null | undefined;
      if (path) {
        const { data: signedData, error } = await supabase.storage
          .from("NPS-pro")
          .createSignedUrl(path, 60 * 60);

        if (!error && signedData?.signedUrl) {
          setAvatarUrl(signedData.signedUrl);
        }
      }

      // Carrega estatísticas do mês atual
      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const lastDay = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

      const [
        { count: countFaturamentos },
        { count: countAcompanhamentos },
        { data: pagos },
      ] = await Promise.all([
        supabase
          .from("faturamentos")
          .select("id", { count: "exact", head: true })
          .eq("medico_id", userId)
          .gte("created_at", firstDay)
          .lt("created_at", lastDay),
        supabase
          .from("sadt_acompanhamento")
          .select("id", { count: "exact", head: true })
          .eq("medico_id", userId)
          .gte("created_at", firstDay)
          .lt("created_at", lastDay),
        supabase
          .from("faturamentos")
          .select("valor_total_repasse, valor_total_liquido, data_pagamento")
          .eq("medico_id", userId)
          .eq("status_pagamento", "pago")
          .gte("data_pagamento", firstDay)
          .lt("data_pagamento", lastDay),
      ]);

      const valorRecebido = (pagos ?? []).reduce((acc, row: any) => {
        const repasse = Number(row.valor_total_repasse ?? 0);
        const liquido = Number(row.valor_total_liquido ?? 0);
        return acc + (repasse > 0 ? repasse : liquido);
      }, 0);

      setStats({
        loading: false,
        faturamentosMes: countFaturamentos ?? 0,
        acompanhamentosMes: countAcompanhamentos ?? 0,
        valorRecebidoMes: valorRecebido,
      });
    };

    void carregarDadosMedico();
  }, []);

  const saudacao = medicoNome ? `Olá, Dr. ${medicoNome}.` : "Olá, Doutor(a).";

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[#F5F5F5] relative overflow-hidden pb-32 lg:pb-0">
      {/* Fundo premium */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,23,0.10)_0,#0b0b0b_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-[#121212]/80" />

      <div className="relative z-10">
        <MedicoHeader
          statusLabel="Dashboard"
          containerClassName="max-w-sm"
          onStatusClick={() => navigate("/admin/dashboard")}
        />

        <div className="mx-auto flex w-full max-w-sm flex-col px-4 py-6 sm:px-5">
          {/* Avatar + saudação */}
          <section className="mb-6 flex flex-col gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/60 border border-[#D4A017]/20 text-[#D4A017] shadow-[0_18px_55px_rgba(0,0,0,0.55)] overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Foto do médico"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User2 className="h-7 w-7" />
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-semibold sm:text-[26px]">
                {saudacao}
              </h1>
              <p className="text-sm text-[#9CA3AF]">O que você deseja fazer hoje?</p>
            </div>
          </section>

          {/* PAINEL */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#F5F5F5]">Painel</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#D4A017]/80">
              {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
          </div>

          {/* Quota de faturamentos do mês */}
          {!billingQuota.loading && billingQuota.limit !== null && (
            <div className={`mb-3 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
              billingQuota.isOverLimit
                ? "border-rose-500/40 bg-[#2a0a0a]"
                : billingQuota.isNearLimit
                  ? "border-amber-500/40 bg-amber-950/20"
                  : "border-[#D4A017]/20 bg-black/50"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${
                  billingQuota.isOverLimit
                    ? "border-rose-500/30 bg-rose-500/15 text-rose-400"
                    : billingQuota.isNearLimit
                      ? "border-amber-500/30 bg-amber-500/15 text-amber-400"
                      : "border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]"
                }`}>
                  <Scissors className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#F5F5F5]">Faturamentos do mês</p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    {billingQuota.used} de {billingQuota.limit} do seu plano
                  </p>
                </div>
              </div>
              <span className={`text-sm font-bold flex-shrink-0 ${
                billingQuota.isOverLimit ? "text-rose-400" : billingQuota.isNearLimit ? "text-amber-400" : "text-[#D4A017]"
              }`}>
                {billingQuota.used}/{billingQuota.limit}
              </span>
            </div>
          )}

          {/* Acompanhamentos do mês (espelha visual do card de faturamentos) */}
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[#D4A017]/20 bg-black/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#F5F5F5]">Acompanhamentos do mês</p>
                <p className="text-[11px] text-[#9CA3AF]">SADTs enviadas neste mês</p>
              </div>
            </div>
            <span className="text-sm font-bold text-[#D4A017] flex-shrink-0">
              {stats.loading ? "..." : stats.acompanhamentosMes}
            </span>
          </div>

          {/* Upgrade banner se limite excedido */}
          {!billingQuota.loading && billingQuota.isOverLimit && (
            <a
              href="https://site.conmedic.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] px-4 py-4 text-left text-black shadow-[0_0_30px_rgba(212,160,23,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(212,160,23,0.2)]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/25 text-black shadow-inner">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold sm:text-base">
                    Fazer Upgrade do Plano
                  </span>
                  <span className="text-[11px] text-black/80">
                    Limite mensal atingido.
                  </span>
                </div>
              </div>
            </a>
          )}

          {/* 3 cards de números */}
          <div className="mb-4 grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-[#D4A017]/20 bg-black/50 px-3 py-3 text-center">
              <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl border border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]">
                <FileText className="h-4 w-4" />
              </div>
              <p className="text-lg font-bold text-[#F5F5F5] leading-none">
                {stats.loading ? "..." : stats.faturamentosMes}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-[#9CA3AF]">
                Faturamentos
              </p>
            </div>

            <div className="rounded-2xl border border-[#D4A017]/20 bg-black/50 px-3 py-3 text-center">
              <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl border border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]">
                <Activity className="h-4 w-4" />
              </div>
              <p className="text-lg font-bold text-[#F5F5F5] leading-none">
                {stats.loading ? "..." : stats.acompanhamentosMes}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-[#9CA3AF]">
                Acompanhamentos
              </p>
            </div>

            <div className="rounded-2xl border border-[#D4A017]/20 bg-black/50 px-3 py-3 text-center">
              <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl border border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]">
                <Wallet className="h-4 w-4" />
              </div>
              <p className="text-[13px] font-bold text-[#F5F5F5] leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                {stats.loading ? "..." : formatBRL(stats.valorRecebidoMes)}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-[#9CA3AF]">
                Recebido
              </p>
            </div>
          </div>

          {/* Atalho secundário - Informações */}
          <button
            type="button"
            onClick={() => navigate("/medico/informacoes")}
            className="flex w-full items-center justify-between rounded-2xl bg-black/60 px-4 py-4 text-left text-[#F5F5F5] border border-[#D4A017]/20 shadow-[0_18px_55px_rgba(0,0,0,0.55)] transition-all duration-300 hover:border-[#D4A017]/40 hover:bg-black/70"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20">
                <Activity className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold sm:text-base">
                  Ver Minhas Informações
                </span>
                <span className="text-[11px] text-[#9CA3AF]">
                  Financeiro e glosas
                </span>
              </div>
            </div>
          </button>

          <footer className="mt-8 text-center text-[11px] text-[#6B7280]">
            Ambiente Seguro · Criptografia de ponta a ponta
          </footer>
        </div>
      </div>

      {/* Menu flutuante mobile */}
      <MedicoFloatingNav />
    </div>
  );
};

export default MedicoInicio;

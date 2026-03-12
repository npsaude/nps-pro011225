import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText, ClipboardList } from "lucide-react";

import RevenueChart from "../components/dashboard/RevenueChart";
import HospitalRankingChart from "../components/dashboard/HospitalRankingChart";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useSystemUser } from "@/hooks/use-system-user";

type Period = "mes" | "trimestre" | "ano";

type GuiaRow = {
  data_fim_faturamento: string | null;
  created_at: string;
  valor_total_honorarios: string | number | null;
};

type FatRow = {
  created_at: string;
  data_pagamento: string | null;
  status_pagamento: string;
  valor_total_faturado: string | number;
  valor_total_liquido: string | number;
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toDateOrNull(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildRangeStart(period: Period): Date {
  const count = period === "mes" ? 3 : period === "trimestre" ? 6 : 12;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
}

function getInitials(name: string): string {
  const cleaned = name
    .trim()
    .replace(/^\s*(dra\.?|dr\.?)\s+/i, "")
    .trim();

  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getFirstName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/^\s*(dra\.?|dr\.?)\s+/i, "")
    .trim();
  return cleaned.split(" ").filter(Boolean)[0] ?? "";
}

const DashboardMedico: React.FC = () => {
  const navigate = useNavigate();
  const { systemUser } = useSystemUser();

  const [period, setPeriod] = useState<Period>("ano");

  const [faturado, setFaturado] = useState<string>("—");
  const [recebido, setRecebido] = useState<string>("—");
  const [totalAReceber, setTotalAReceber] = useState<string>("—");

  const [hospitalModalOpen, setHospitalModalOpen] = useState(false);
  const [hospitaisMedico, setHospitaisMedico] = useState<
    { id: string; nome_fantasia: string }[]
  >([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("");
  const [loadingHospitais, setLoadingHospitais] = useState(false);

  const saudacao = useMemo(() => {
    const nome = (systemUser as any)?.nome ? String((systemUser as any).nome) : "";
    const firstName = nome ? getFirstName(nome) : "";
    return firstName ? `Olá, Dr. ${firstName}.` : "Olá, Doutor(a).";
  }, [systemUser]);

  const avatarInitials = useMemo(() => {
    const nome = (systemUser as any)?.nome ? String((systemUser as any).nome) : "";
    return nome ? getInitials(nome) : "";
  }, [systemUser]);

  // Garante sessão no portal médico (RLS depende do auth.uid())
  useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        navigate("/login-medico", { replace: true });
      }
    }

    void ensureSession();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    async function loadTotals() {
      const start = buildRangeStart(period);
      const startIso = start.toISOString();
      const startDate = startIso.slice(0, 10);

      const [guiaRes, fatRes] = await Promise.all([
        supabase
          .from("guia_solicitacao")
          .select("created_at,data_fim_faturamento,valor_total_honorarios")
          .or(
            `data_inicio_faturamento.gte.${startDate},data_emissao.gte.${startDate},created_at.gte.${startIso}`,
          ),
        supabase
          .from("faturamentos")
          .select(
            "created_at,data_pagamento,status_pagamento,valor_total_faturado,valor_total_liquido,data_atendimento,data_cirurgia",
          )
          .or(
            `data_atendimento.gte.${startDate},data_cirurgia.gte.${startDate},created_at.gte.${startIso}`,
          ),
      ]);

      if (cancelled) return;

      if (guiaRes.error) {
        console.error("[DashboardMedico] Erro ao buscar guia_solicitacao:", guiaRes.error);
      }
      if (fatRes.error) {
        console.error("[DashboardMedico] Erro ao buscar faturamentos:", fatRes.error);
      }

      const guiaRows = (guiaRes.data ?? []) as GuiaRow[];
      const fatRows = (fatRes.data ?? []) as FatRow[];

      // Faturado: soma guia_solicitacao.valor_total_honorarios + faturamentos.valor_total_faturado
      let total = 0;
      for (const r of guiaRows) {
        const v = toNumber(r.valor_total_honorarios);
        if (v > 0) total += v;
      }
      for (const r of fatRows) {
        const v = toNumber(r.valor_total_faturado);
        if (v > 0) total += v;
      }

      // Recebido: ainda não implementada a etapa de conciliação — sempre 0
      const received = 0;

      // Total a Receber = valor faturado (conciliação pendente)
      const toReceive = total;

      setFaturado(total > 0 ? formatCurrency(total) : "—");
      setRecebido(formatCurrency(0));
      setTotalAReceber(total > 0 ? formatCurrency(toReceive) : "—");

      if (guiaRes.error && fatRes.error) {
        showError("Não foi possível atualizar os indicadores de faturamento.");
        setFaturado("—");
        setRecebido("—");
        setTotalAReceber("—");
      }
    }

    void loadTotals();

    return () => {
      cancelled = true;
    };
  }, [period]);

  const carregarHospitaisDoMedico = async () => {
    setLoadingHospitais(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        showError("Faça login para enviar a descrição cirúrgica.");
        navigate("/login-medico");
        return;
      }

      const email = authData.user.email;
      if (!email) {
        showError(
          "Não foi possível identificar seu e-mail. Tente novamente ou contate o suporte.",
        );
        return;
      }

      const { data: medico, error: medicoError } = await supabase
        .from("medicos")
        .select("hospitais_ids")
        .eq("email", email)
        .maybeSingle();

      if (medicoError) {
        throw new Error(
          medicoError.message ||
            "Não foi possível carregar os hospitais vinculados ao seu cadastro.",
        );
      }

      const hospitaisIds: string[] = (medico?.hospitais_ids as string[]) ?? [];

      if (!hospitaisIds.length) {
        setHospitaisMedico([]);
        return;
      }

      const { data: hospitaisData, error: hospitaisError } = await supabase
        .from("hospitais")
        .select("id, nome_fantasia")
        .in("id", hospitaisIds)
        .order("nome_fantasia", { ascending: true });

      if (hospitaisError) {
        throw new Error(
          hospitaisError.message ||
            "Não foi possível carregar a lista de hospitais.",
        );
      }

      setHospitaisMedico(
        (hospitaisData ?? []) as { id: string; nome_fantasia: string }[],
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os hospitais vinculados ao seu cadastro.";
      showError(message);
    } finally {
      setLoadingHospitais(false);
    }
  };

  const handleAbrirModalHospitais = () => {
    setHospitalModalOpen(true);
    void carregarHospitaisDoMedico();
  };

  const handleContinuarEnvio = () => {
    if (!selectedHospitalId) {
      showError("Selecione um hospital para continuar.");
      return;
    }

    navigate(`/medico/faturamentos/enviar?hospitalId=${selectedHospitalId}`);
    setHospitalModalOpen(false);
  };

  const handleChangePeriod = (value: Period) => {
    setPeriod(value);
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[#F5F5F5] relative overflow-hidden">
      <Dialog open={hospitalModalOpen} onOpenChange={setHospitalModalOpen}>
        <DialogContent className="bg-[#0b0b0b] border border-[#D4A017]/20 text-[#F5F5F5]">
          <DialogHeader>
            <DialogTitle>Selecione o hospital</DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Escolha o hospital para o qual você deseja enviar a descrição cirúrgica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Hospital</Label>
            <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingHospitais ? "Carregando..." : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {hospitaisMedico.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.nome_fantasia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              disabled={
                loadingHospitais ||
                hospitaisMedico.length === 0 ||
                !selectedHospitalId
              }
              onClick={handleContinuarEnvio}
              className="bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.35)] hover:shadow-[0_0_30px_rgba(212,160,23,0.55)] transition-shadow"
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fundo premium */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,23,0.10)_0,#0b0b0b_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-[#121212]/80" />

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col px-4 py-5 sm:px-5 sm:py-6">
        {/* Topo */}
        <header className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-black/60 px-3 py-2 text-xs text-[#F5F5F5] shadow-sm border border-[#D4A017]/20 hover:border-[#D4A017]/40 transition-colors"
            onClick={() => navigate("/medico/dashboard")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-2 rounded-full bg-[#D4A017]/10 px-3 py-1.5 text-[11px] text-[#D4A017] border border-[#D4A017]/25">
            <span className="h-2 w-2 rounded-full bg-[#D4A017] shadow-[0_0_8px_rgba(212,160,23,0.8)]" />
            <span>Portal do Médico</span>
          </div>
        </header>

        {/* Card de saudação */}
        <section className="mb-4">
          <div className="flex items-center justify-between rounded-2xl bg-black/70 backdrop-blur-xl px-4 py-3.5 text-sm border border-[#D4A017]/20 shadow-lg">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#D4A017]/90">
                Bem-vindo
              </span>
              <p className="text-sm font-semibold text-[#F5F5F5]">{saudacao}</p>
              <p className="text-[11px] text-[#9CA3AF]">
                Acompanhe seu faturamento de um só lugar
              </p>
            </div>
            <div className="ml-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-base font-semibold text-black shadow-[0_0_22px_rgba(212,160,23,0.45)]">
              {avatarInitials}
            </div>
          </div>
        </section>

        {/* Ações principais */}
        <section className="mb-4 flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/medico/faturamentos/enviar")}
            className="flex h-24 min-w-0 flex-1 flex-col justify-center rounded-2xl bg-gradient-to-br from-[#FFD700] via-[#D4A017] to-[#B8860B] px-4 py-3 text-left text-black shadow-[0_0_30px_rgba(212,160,23,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(212,160,23,0.2)]"
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-black/20 text-black shadow-inner">
              <Upload className="h-4.5 w-4.5" />
            </div>
            <span className="text-sm font-semibold">Enviar Faturamento</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/medico/faturamentos")}
            className="flex h-24 min-w-0 flex-1 flex-col justify-center rounded-2xl bg-black/70 backdrop-blur-xl px-4 py-3 text-left text-[#F5F5F5] border border-[#D4A017]/20 shadow-lg hover:border-[#D4A017]/40 transition-colors"
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <span className="text-sm font-semibold">
              Acompanhar Faturamentos
            </span>
          </button>
        </section>

        {/* Filtro de período */}
        <section className="mb-4">
          <div className="flex rounded-2xl bg-black/60 p-1 text-[11px] text-[#9CA3AF] border border-[#D4A017]/15">
            <button
              type="button"
              onClick={() => handleChangePeriod("mes")}
              className={`flex-1 rounded-xl px-3 py-2 transition-all duration-300 ${
                period === "mes"
                  ? "bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black shadow-[0_0_18px_rgba(212,160,23,0.3)]"
                  : "bg-transparent hover:text-[#F5F5F5]"
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => handleChangePeriod("trimestre")}
              className={`flex-1 rounded-xl px-3 py-2 transition-all duration-300 ${
                period === "trimestre"
                  ? "bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black shadow-[0_0_18px_rgba(212,160,23,0.3)]"
                  : "bg-transparent hover:text-[#F5F5F5]"
              }`}
            >
              Trimestre
            </button>
            <button
              type="button"
              onClick={() => handleChangePeriod("ano")}
              className={`flex-1 rounded-xl px-3 py-2 transition-all duration-300 ${
                period === "ano"
                  ? "bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black shadow-[0_0_18px_rgba(212,160,23,0.3)]"
                  : "bg-transparent hover:text-[#F5F5F5]"
              }`}
            >
              Ano
            </button>
          </div>
        </section>

        {/* Receita do período */}
        <section className="mb-4 rounded-2xl bg-black/70 backdrop-blur-xl px-4 py-4 shadow-lg border border-[#D4A017]/20">
          <div className="mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4A017]/90">
              Faturamento
            </span>
            <h2 className="text-sm font-semibold text-[#F5F5F5]">
              Receita do Período
            </h2>
          </div>
          <RevenueChart period={period} />
        </section>

        {/* Cards */}
        <section className="mb-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-black/70 backdrop-blur-xl px-4 py-3.5 shadow-lg border border-[#D4A017]/15">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
                Faturado
              </span>
              <p className="mt-1 text-base font-semibold bg-gradient-to-r from-[#FFD700] to-[#D4A017] bg-clip-text text-transparent">
                {faturado}
              </p>
            </div>
            <div className="rounded-2xl bg-black/70 backdrop-blur-xl px-4 py-3.5 shadow-lg border border-[#D4A017]/25">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4A017]/90">
                Recebido
              </span>
              <p className="mt-1 text-base font-semibold bg-gradient-to-r from-[#FFD700] to-[#D4A017] bg-clip-text text-transparent">
                {recebido}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-black/70 backdrop-blur-xl px-4 py-3.5 shadow-lg border border-[#D4A017]/15">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
                  Total a Receber
                </span>
                <p className="mt-1 text-lg font-semibold bg-gradient-to-r from-[#FFD700] to-[#D4A017] bg-clip-text text-transparent">
                  {totalAReceber}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
          </div>
        </section>

        {/* Ranking */}
        <section className="mb-4 rounded-2xl bg-black/70 backdrop-blur-xl px-4 py-4 shadow-lg border border-[#D4A017]/15">
          <div className="mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4A017]/90">
              Ranking
            </span>
            <h2 className="text-sm font-semibold text-[#F5F5F5]">
              Faturamento por Hospital/Clínica
            </h2>
            <p className="mt-1 text-[11px] text-[#9CA3AF]">
              Instituições com maior volume de descrições.
            </p>
          </div>
          <HospitalRankingChart period={period} />
        </section>

        <section className="border-t border-[#D4A017]/15 pt-3 text-[11px] text-[#6B7280]">
          <p>
            Este painel é um resumo das suas Descrições Cirúrgicas e valores do
            ano.
          </p>
        </section>
      </div>
    </div>
  );
};

export default DashboardMedico;
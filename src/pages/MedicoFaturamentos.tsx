import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  CalendarDays,
  ReceiptText,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MedicoBillingCard, {
  type MedicoBillingCardRecord,
} from "@/components/faturamento/MedicoBillingCard";
import { MEDICO_LOGO_URL } from "@/constants/medico-brand";
import { listAdminFaturamentos } from "@/services/admin-faturamento-service";
import type { BillingDocStep } from "@/components/faturamento/BillingDocsProgress";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import MedicoFaturamentosSummary from "@/components/faturamento/MedicoFaturamentosSummary";

function hasAny(arr: string[] | null | undefined): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

function buildSteps(item: {
  guia_solicitacao_id: string | null;
  url_guia_autorizacao: string[];
  url_descricao_cirurgica: string[];
  guia_honorarios_id: string | null;
  email_status: string;
}): BillingDocStep[] {
  return [
    {
      id: "guia_solicitacao",
      label: "Guia de Solicitação",
      sent: Boolean(item.guia_solicitacao_id),
    },
    {
      id: "guia_autorizacao",
      label: "Guia de Autorização",
      sent: hasAny(item.url_guia_autorizacao),
    },
    {
      id: "descricao_cirurgica",
      label: "Descrição Cirurgica",
      sent: hasAny(item.url_descricao_cirurgica),
    },
    {
      id: "guia_honorarios",
      label: "Guia de Honorários",
      sent: Boolean(item.guia_honorarios_id),
    },
    {
      id: "email_faturamento",
      label: "Email para Faturamento",
      sent: item.email_status === "ENVIADO",
    },
  ];
}

function getDocsTotals(item: MedicoBillingCardRecord) {
  const docsSent = item.steps.filter((s) => s.sent).length;
  const docsTotal = item.steps.length;
  const emailSent = Boolean(item.steps.find((s) => s.id === "email_faturamento")?.sent);
  return { docsSent, docsTotal, emailSent };
}

export default function MedicoFaturamentos() {
  const navigate = useNavigate();

  const [items, setItems] = useState<MedicoBillingCardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [patientQuery, setPatientQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");
  const [onlyPendingEmail, setOnlyPendingEmail] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate("/login-medico", { replace: true });
        return;
      }

      try {
        const data = await listAdminFaturamentos();
        if (cancelled) return;

        setItems(
          data.map((d) => ({
            id: d.id,
            pacienteNome: d.paciente_nome?.trim() || "Paciente não informado",
            dataCirurgia: d.data_cirurgia,
            horaCirurgia: d.hora_inicio,
            hospitalNome: d.hospital_nome,
            procedimentos: d.procedimentos,
            profissionais: d.profissionais,
            qtdSolicitada: d.qtdSolicitada,
            qtdAutorizada: d.qtdAutorizada,
            valorFaturamento: d.valorFaturamento,
            steps: buildSteps(d),
          })),
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Não foi possível carregar seus faturamentos.";
        if (!cancelled) {
          setItems([]);
          setLoadError(message);
        }
        showError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const filteredItems = useMemo(() => {
    const pq = patientQuery.trim().toLowerCase();
    const dq = dateQuery.trim();

    return items.filter((i) => {
      if (pq && !i.pacienteNome.toLowerCase().includes(pq)) return false;

      if (dq) {
        const dateIso = i.dataCirurgia ?? "";
        const datePt = dateIso
          ? new Date(`${dateIso}T00:00:00`).toLocaleDateString("pt-BR")
          : "";
        if (!dateIso.includes(dq) && !datePt.includes(dq)) return false;
      }

      if (onlyPendingEmail) {
        const { emailSent } = getDocsTotals(i);
        if (emailSent) return false;
      }

      return true;
    });
  }, [items, patientQuery, dateQuery, onlyPendingEmail]);

  const summary = useMemo(() => {
    const totals = filteredItems.reduce(
      (acc, item) => {
        const t = getDocsTotals(item);
        acc.total += 1;
        acc.docsSent += t.docsSent;
        acc.docsTotal += t.docsTotal;
        acc.emailsTotal += 1;
        acc.emailsSent += t.emailSent ? 1 : 0;
        return acc;
      },
      { total: 0, docsSent: 0, docsTotal: 0, emailsSent: 0, emailsTotal: 0 },
    );

    return totals;
  }, [filteredItems]);

  const activeFiltersCount =
    (patientQuery.trim() ? 1 : 0) +
    (dateQuery.trim() ? 1 : 0) +
    (onlyPendingEmail ? 1 : 0);

  const clearFilters = () => {
    setPatientQuery("");
    setDateQuery("");
    setOnlyPendingEmail(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[#F5F5F5] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,23,0.10)_0,#0b0b0b_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-[#121212]/80" />

      <div className="relative z-10 flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Topo */}
        <header className="sticky top-0 z-40 -mx-4 mb-4 border-b border-[#D4A017]/20 bg-black/70 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] flex items-center justify-center shadow-[0_0_20px_rgba(212,160,23,0.35)]">
                <img
                  src={MEDICO_LOGO_URL}
                  alt="Logo Conmedic"
                  className="h-6 w-6 object-contain"
                  loading="eager"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] bg-clip-text text-transparent">
                  CONMEDIC
                </span>
                <span className="text-[11px] text-[#9CA3AF]">Acompanhar faturamentos</span>
              </div>
            </div>

            <button
              type="button"
              className="flex items-center gap-2 rounded-xl bg-black/60 px-3 py-2 text-xs text-[#F5F5F5] shadow-sm border border-[#D4A017]/20 hover:border-[#D4A017]/40 transition-colors"
              onClick={() => navigate("/medico/dashboard")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar</span>
            </button>
          </div>
        </header>

        {/* Cabeçalho */}
        <section className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] shadow-[0_0_20px_rgba(212,160,23,0.25)]">
              <ReceiptText className="h-6 w-6 text-black" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold leading-tight sm:text-xl">Faturamentos</h1>
              <p className="text-[11px] text-[#9CA3AF] sm:text-xs">
                Visão executiva e acompanhamento por caso.
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => navigate("/medico/faturamentos/enviar")}
            className="rounded-xl bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.35)] hover:shadow-[0_0_30px_rgba(212,160,23,0.55)] transition-shadow"
          >
            Enviar
          </Button>
        </section>

        {/* KPIs */}
        <section className="mb-4">
          <MedicoFaturamentosSummary summary={summary} />
        </section>

        {/* Filtros (moderno / compacto) */}
        <section className="mb-4">
          <Card className="rounded-2xl border border-[#D4A017]/15 bg-black/40 backdrop-blur-xl">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-1 lg:items-center">
                  <div className="relative lg:max-w-sm lg:flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <Input
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      placeholder="Paciente"
                      className="h-11 rounded-xl border border-[#D4A017]/15 bg-black/50 pl-9 text-[13px] text-[#F5F5F5] placeholder:text-[#9CA3AF] focus-visible:ring-[#D4A017]/40"
                    />
                  </div>

                  <div className="relative lg:max-w-sm lg:flex-1">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <Input
                      value={dateQuery}
                      onChange={(e) => setDateQuery(e.target.value)}
                      placeholder="Data (dd/mm/aaaa ou yyyy-mm-dd)"
                      className="h-11 rounded-xl border border-[#D4A017]/15 bg-black/50 pl-9 text-[13px] text-[#F5F5F5] placeholder:text-[#9CA3AF] focus-visible:ring-[#D4A017]/40"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => setOnlyPendingEmail((v) => !v)}
                    className={
                      "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors " +
                      (onlyPendingEmail
                        ? "border-[#D4A017]/40 bg-[#D4A017]/10 text-[#F5F5F5]"
                        : "border-[#D4A017]/15 bg-black/40 text-[#9CA3AF] hover:text-[#F5F5F5]")
                    }
                    aria-pressed={onlyPendingEmail}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Email pendente
                  </button>

                  {activeFiltersCount > 0 ? (
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-full border border-[#D4A017]/25 bg-[#D4A017]/10 text-[#D4A017] hover:bg-[#D4A017]/10">
                        {activeFiltersCount} filtro{activeFiltersCount > 1 ? "s" : ""}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-9 rounded-xl border border-[#D4A017]/15 bg-black/30 text-[#9CA3AF] hover:bg-black/40 hover:text-[#F5F5F5]"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Limpar
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Lista */}
        <main className="flex-1 space-y-3 pb-10">
          {loading ? (
            <Card className="rounded-2xl border border-[#D4A017]/20 bg-black/60">
              <CardContent className="p-4 text-[13px] text-[#9CA3AF]">
                Carregando...
              </CardContent>
            </Card>
          ) : loadError ? (
            <Card className="rounded-2xl border border-[#D4A017]/20 bg-black/60">
              <CardContent className="p-4 text-[13px] text-[#9CA3AF]">
                {loadError}
              </CardContent>
            </Card>
          ) : filteredItems.length === 0 ? (
            <Card className="rounded-2xl border border-[#D4A017]/20 bg-black/60">
              <CardContent className="p-4 text-[13px] text-[#9CA3AF]">
                Nenhum faturamento encontrado.
              </CardContent>
            </Card>
          ) : (
            filteredItems.map((record) => (
              <MedicoBillingCard key={record.id} record={record} />
            ))
          )}
        </main>
      </div>
    </div>
  );
}
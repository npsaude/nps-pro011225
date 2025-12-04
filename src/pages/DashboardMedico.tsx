import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  FileText,
  ClipboardList,
} from "lucide-react";

import GlosaGauge from "../components/dashboard/GlosaGauge";
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

type Period = "mes" | "trimestre" | "ano";

const DashboardMedico: React.FC = () => {
  const navigate = useNavigate();

  const faturado = "R$ 702.000,00";
  const recebido = "R$ 668.300,00";
  const totalAReceber = "R$ 72.500,00";
  const percentualGlosaRecuperadoNumero = 83;

  const [period, setPeriod] = useState<Period>("ano");

  const [hospitalModalOpen, setHospitalModalOpen] = useState(false);
  const [hospitaisMedico, setHospitaisMedico] = useState<
    { id: string; nome_fantasia: string }[]
  >([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("");
  const [loadingHospitais, setLoadingHospitais] = useState(false);

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

    setHospitalModalOpen(false);
    navigate("/medico/descricao-cirurgica/enviar", {
      state: { hospitalId: selectedHospitalId },
    });
  };

  const handleChangePeriod = (value: Period) => {
    setPeriod(value);
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#020617] text-slate-50">
      {/* Modal de seleção de hospital */}
      <Dialog open={hospitalModalOpen} onOpenChange={setHospitalModalOpen}>
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-50">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Selecione o hospital
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 sm:text-sm">
              Escolha o hospital onde a cirurgia será realizada para continuar
              com o envio da descrição cirúrgica.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-2">
            {loadingHospitais ? (
              <p className="text-sm text-slate-300">
                Carregando hospitais onde você atua...
              </p>
            ) : hospitaisMedico.length === 0 ? (
              <p className="text-sm text-slate-300">
                Não encontramos hospitais vinculados ao seu cadastro. Entre em
                contato com o administrador do sistema.
              </p>
            ) : (
              <div className="space-y-2">
                <Label
                  htmlFor="hospital"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200/80"
                >
                  Hospital
                </Label>
                <Select
                  value={selectedHospitalId}
                  onValueChange={setSelectedHospitalId}
                >
                  <SelectTrigger
                    id="hospital"
                    className="border-emerald-500/40 bg-slate-900 text-slate-50 placeholder:text-slate-400 focus:ring-emerald-500"
                  >
                    <SelectValue placeholder="Selecione o hospital" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-slate-50">
                    {hospitaisMedico.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.nome_fantasia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setHospitalModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={
                loadingHospitais ||
                hospitaisMedico.length === 0 ||
                !selectedHospitalId
              }
              onClick={handleContinuarEnvio}
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fundo gradiente */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,#1F8A70_0,#020617_55%),radial-gradient(circle_at_100%_100%,#1D4E77_0,#020617_60%)]" />

      <div className="relative z-10 flex w-full max-w-sm flex-col px-4 py-5 sm:px-5 sm:py-6">
        {/* Topo com voltar e status */}
        <header className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl bg-slate-950/70 px-3 py-2 text-xs text-emerald-100 shadow-sm ring-1 ring-slate-800 backdrop-blur"
            onClick={() => navigate("/medico/dashboard")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-2 rounded-2xl bg-slate-950/80 px-3 py-2 text-[11px] text-emerald-100/90 shadow-sm ring-1 ring-emerald-500/40 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Portal do Médico</span>
          </div>
        </header>

        {/* Card de saudação */}
        <section className="mb-4">
          <div className="flex items-center justify-between rounded-3xl bg-slate-950/90 px-4 py-3.5 text-sm shadow-[0_18px_40px_rgba(0,0,0,0.7)] ring-1 ring-slate-900/70 backdrop-blur">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200/90">
                Bem-vindo
              </span>
              <p className="text-sm font-semibold text-slate-50">
                Olá, Dr. Adriano.
              </p>
              <p className="text-[11px] text-emerald-100/85">
                Acompanhe suas Descrições Cirúrgicas,
                <br />
                valores pagos e glosas em um só lugar.
              </p>
            </div>
            <div className="ml-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-base font-semibold text-slate-950 shadow-[0_0_22px_rgba(16,185,129,0.8)]">
              AD
            </div>
          </div>
        </section>

        {/* Ações principais */}
        <section className="mb-4 flex gap-3">
          <button
            type="button"
            onClick={handleAbrirModalHospitais}
            className="flex h-24 min-w-0 flex-1 flex-col justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-400 px-4 py-3 text-left text-slate-50 shadow-[0_22px_55px_rgba(16,185,129,0.8)]"
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600/95 text-slate-50 shadow-inner">
              <Upload className="h-4.5 w-4.5" />
            </div>
            <span className="text-sm font-semibold">Enviar Descrição</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/medico/descricao-cirurgica")}
            className="flex h-24 min-w-0 flex-1 flex-col justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-400 px-4 py-3 text-left text-slate-50 shadow-[0_22px_55px_rgba(79,70,229,0.75)]"
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600/95 text-slate-50 shadow-inner">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <span className="text-sm font-semibold">
              Acompanhar Descrições
            </span>
          </button>
        </section>

        {/* Filtro de período */}
        <section className="mb-4">
          <div className="flex rounded-3xl bg-slate-950/90 p-1 text-[11px] text-slate-300 ring-1 ring-slate-800">
            <button
              type="button"
              onClick={() => handleChangePeriod("mes")}
              className={`flex-1 rounded-2xl px-3 py-2 transition ${
                period === "mes"
                  ? "bg-slate-200 text-slate-900"
                  : "bg-transparent text-slate-300"
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => handleChangePeriod("trimestre")}
              className={`flex-1 rounded-2xl px-3 py-2 transition ${
                period === "trimestre"
                  ? "bg-slate-200 text-slate-900"
                  : "bg-transparent text-slate-300"
              }`}
            >
              Trimestre
            </button>
            <button
              type="button"
              onClick={() => handleChangePeriod("ano")}
              className={`flex-1 rounded-2xl px-3 py-2 transition ${
                period === "ano"
                  ? "bg-slate-200 text-slate-900"
                  : "bg-transparent text-slate-300"
              }`}
            >
              Ano
            </button>
          </div>
        </section>

        {/* Receita do período */}
        <section className="mb-4 rounded-3xl bg-slate-950/95 px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.7)] ring-1 ring-slate-900/80">
          <div className="mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
              Faturamento
            </span>
            <h2 className="text-sm font-semibold text-slate-50">
              Receita do Período
            </h2>
          </div>
          <RevenueChart period={period} />
        </section>

        {/* Cards de faturamento e glosa */}
        <section className="mb-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-950/95 px-4 py-3.5 shadow-md ring-1 ring-slate-900/80">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Faturado
              </span>
              <p className="mt-1 text-base font-semibold text-emerald-100">
                {faturado}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-950/95 px-4 py-3.5 shadow-md ring-1 ring-emerald-600/70">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Recebido
              </span>
              <p className="mt-1 text-base font-semibold text-emerald-100">
                {recebido}
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950/95 px-4 py-3.5 shadow-md ring-1 ring-slate-900/80">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Total a Receber
                </span>
                <p className="mt-1 text-lg font-semibold text-emerald-100">
                  {totalAReceber}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-emerald-300">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950/95 px-4 py-4 shadow-md ring-1 ring-emerald-500/60">
            <div className="mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
                % de Glosa Recuperado
              </span>
              <p className="mt-1 text-[11px] text-slate-200">
                Percentual do valor glosado que já foi revertido em pagamento.
              </p>
            </div>
            <GlosaGauge value={percentualGlosaRecuperadoNumero} />
          </div>
        </section>

        {/* Ranking por hospital/clínica */}
        <section className="mb-4 rounded-3xl bg-slate-950/95 px-4 py-4 shadow-md ring-1 ring-slate-900/80">
          <div className="mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
              Ranking
            </span>
            <h2 className="text-sm font-semibold text-slate-50">
              Faturamento por Hospital/Clínica
            </h2>
            <p className="mt-1 text-[11px] text-slate-300">
              Instituições com maior volume de descrições.
            </p>
          </div>
          <HospitalRankingChart />
        </section>

        {/* Rodapé explicativo */}
        <section className="border-t border-slate-800 pt-3 text-[11px] text-slate-400">
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
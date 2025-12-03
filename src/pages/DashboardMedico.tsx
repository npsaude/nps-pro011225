import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Wallet,
  Activity,
  FileHeart,
  AlertCircle,
} from "lucide-react";
import GlosaGauge from "../components/dashboard/GlosaGauge";
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

const DashboardMedico = () => {
  const navigate = useNavigate();

  const receitaTotalAno = "R$ 485.200,00";
  const numeroCirurgiasAno = "96";
  const totalAReceber = "R$ 72.500,00";
  const valorGlosa = "R$ 18.300,00";
  const percentualGlosaRecuperadoNumero = 83; // 0–100

  const [hospitalModalOpen, setHospitalModalOpen] = useState(false);
  const [hospitaisMedico, setHospitaisMedico] = useState<
    { id: string; nome_fantasia: string }[]
  >([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("");
  const [loadingHospitais, setLoadingHospitais] = useState(false);

  useEffect(() => {
    if (!hospitalModalOpen) return;

    const carregarHospitaisDoMedico = async () => {
      setLoadingHospitais(true);
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

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

    void carregarHospitaisDoMedico();
  }, [hospitalModalOpen, navigate]);

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

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#0F172A] text-slate-50">
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
                  <SelectTrigger id="hospital">
                    <SelectValue placeholder="Selecione o hospital" />
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

      {/* Fundo gradiente inspirado no app mobile */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,#1F8A70_0,#020617_50%),radial-gradient(circle_at_100%_100%,#1D4E77_0,#020617_55%)]" />

      <div className="relative z-10 flex w-full max-w-sm flex-col px-4 py-5 sm:px-5 sm:py-6">
        {/* Topo com voltar e status */}
        <header className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl bg-slate-950/70 px-3 py-2 text-xs text-emerald-100 shadow-sm ring-1 ring-emerald-500/40 backdrop-blur"
            onClick={() => navigate("/login-medico")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-2 rounded-2xl bg-slate-950/70 px-3 py-2 text-[11px] text-emerald-100/80 shadow-sm ring-1 ring-emerald-500/30 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Portal do Médico</span>
          </div>
        </header>

        {/* Card de saudação + info do médico (similar ao DashboardView de referência) */}
        <section className="mb-4">
          <div className="flex items-center justify-between rounded-3xl bg-slate-950/85 px-4 py-3.5 text-sm shadow-[0_18px_40px_rgba(0,0,0,0.6)] ring-1 ring-slate-900/60 backdrop-blur">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200/90">
                Bem-vindo
              </span>
              <p className="text-sm font-semibold text-slate-50">
                Olá, Adriano.
              </p>
              <p className="text-[11px] text-emerald-100/80">
                Acompanhe suas cirurgias, valores pagos e glosas em um só lugar.
              </p>
            </div>
            <div className="ml-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-base font-semibold text-slate-950 shadow-[0_0_22px_rgba(16,185,129,0.8)]">
              AD
            </div>
          </div>
        </section>

        {/* Conteúdo principal */}
        <main className="flex-1 space-y-4">
          {/* CTA principal: Enviar Descrição Cirúrgica (botão grande, como no protótipo) */}
          <section>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-3xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-3.5 text-left text-sm font-semibold text-white shadow-[0_22px_55px_rgba(16,185,129,0.7)] transition-transform hover:translate-y-0.5"
              onClick={() => setHospitalModalOpen(true)}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600/90 shadow-inner">
                  <Upload className="h-4.5 w-4.5" />
                </span>
                <div className="flex flex-col">
                  <span>Enviar Descrição Cirúrgica</span>
                  <span className="text-[11px] font-normal text-emerald-100/95">
                    Fotos da guia, laudos ou PDFs completos.
                  </span>
                </div>
              </div>
            </button>
          </section>

          {/* Acompanhamento das descrições */}
          <section>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-3xl bg-slate-950/85 px-4 py-3 text-left text-xs font-medium text-emerald-100 shadow-md ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-950/70"
              onClick={() => navigate("/medico/descricao-cirurgica")}
            >
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/90">
                  Acompanhamento
                </span>
                <span className="mt-1 text-sm font-semibold text-slate-50">
                  Minhas descrições cirúrgicas
                </span>
                <span className="text-[11px] text-emerald-100/80">
                  Veja o status e o resultado dos envios recentes.
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-300">
                Abrir
              </span>
            </button>
          </section>

          {/* Cards de indicadores financeiros + velocímetro de glosa */}
          <section className="space-y-3">
            {/* Linha 1: Receita e Cirurgias */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-3xl bg-slate-950/80 px-4 py-3 shadow-md ring-1 ring-emerald-500/25">
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-200/80">
                    Receita total no ano
                  </span>
                  <span className="mt-1 text-base font-semibold text-emerald-100 sm:text-lg whitespace-nowrap">
                    {receitaTotalAno}
                  </span>
                </div>
                <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-3xl bg-slate-950/80 px-4 py-3 shadow-md ring-1 ring-emerald-500/25">
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-200/80">
                    Cirurgias no ano
                  </span>
                  <span className="mt-1 text-lg font-semibold text-emerald-100 sm:text-xl">
                    {numeroCirurgiasAno}
                  </span>
                </div>
                <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Linha 2: Total a receber e valor em glosa */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-3xl bg-slate-950/80 px-4 py-3 shadow-md ring-1 ring-emerald-500/25">
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-200/80">
                    Total a receber
                  </span>
                  <span className="mt-1 text-base font-semibold text-emerald-100 sm:text-lg whitespace-nowrap">
                    {totalAReceber}
                  </span>
                </div>
                <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                  <FileHeart className="h-5 w-5" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-3xl bg-slate-950/80 px-4 py-3 shadow-md ring-1 ring-rose-500/35">
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-rose-200/80">
                    Valor em glosa
                  </span>
                  <span className="mt-1 text-base font-semibold text-rose-100 sm:text-lg whitespace-nowrap">
                    {valorGlosa}
                  </span>
                </div>
                <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-200">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Linha 3: Velocímetro de glosa recuperada */}
            <div className="flex flex-col rounded-3xl bg-slate-950/90 px-4 py-3 shadow-md ring-1 ring-emerald-400/45">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-200/80">
                    % de glosa recuperado
                  </span>
                  <span className="mt-1 text-[11px] text-emerald-100/80">
                    Percentual do valor glosado que já foi revertido em
                    pagamento.
                  </span>
                </div>
              </div>

              <GlosaGauge value={percentualGlosaRecuperadoNumero} />
            </div>
          </section>

          {/* Rodapé explicativo */}
          <section className="border-t border-emerald-500/25 pt-3 text-[11px] text-emerald-100/80">
            <p>
              Este painel é um resumo das suas cirurgias e valores do ano. Em
              breve você poderá filtrar por período, convênio e tipo de
              procedimento.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DashboardMedico;
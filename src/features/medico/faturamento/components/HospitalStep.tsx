import React from "react";
import { X, Building2, CircleDollarSign, ChevronDown, ArrowLeft, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useFaturamentoFlow } from "../context/flow-context";

/**
 * Tela inicial de seleção: hospital onde a cirurgia foi realizada, instituição
 * de faturamento, opção de "mesma instituição" e verificação de consistência.
 * Possui três sub-visões: seleção, lista de hospitais e lista de clínicas.
 *
 * Por concentrar bastante estado de seleção carregado pela página, recebe esse
 * estado e os handlers por props; apenas medicoNome vem do contexto de fluxo.
 * Extraída sem alterar o comportamento.
 */
type Instituicao = { id: string; nome_fantasia: string };
type StepView = "selector" | "list";

type HospitalStepProps = {
  hospitalStepView: StepView;
  clinicaStepView: StepView;
  hospitaisMedico: Instituicao[];
  loadingHospitais: boolean;
  selectedHospitalId?: string;
  selectedHospitalName: string;
  clinicasMedico: Instituicao[];
  loadingClinicas: boolean;
  selectedClinicaId?: string;
  selectedClinicaName: string;
  useSameAsHospital: boolean;
  consistencyCheckEnabled: boolean;
  favoritosIds: Set<string>;
  setHospitalStepView: React.Dispatch<React.SetStateAction<StepView>>;
  setClinicaStepView: React.Dispatch<React.SetStateAction<StepView>>;
  setSelectedClinicaId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setSelectedClinicaName: React.Dispatch<React.SetStateAction<string>>;
  setConsistencyCheckEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  handleFecharSelecaoHospital: () => void;
  handleAbrirListaHospitais: () => void;
  handleAbrirListaClinicas: () => void;
  handleUseSameAsHospitalChange: (checked: boolean) => void;
  handleContinuarAposHospitalClinica: () => void;
  handleVoltarListaParaSelector: () => void;
  handleSelecionarHospital: (h: Instituicao) => void;
  handleVoltarListaClinicasParaSelector: () => void;
  handleSelecionarClinica: (c: Instituicao) => void;
};

export const HospitalStep: React.FC<HospitalStepProps> = ({
  hospitalStepView,
  clinicaStepView,
  hospitaisMedico,
  loadingHospitais,
  selectedHospitalId,
  selectedHospitalName,
  clinicasMedico,
  loadingClinicas,
  selectedClinicaId,
  selectedClinicaName,
  useSameAsHospital,
  consistencyCheckEnabled,
  favoritosIds,
  setHospitalStepView,
  setClinicaStepView,
  setSelectedClinicaId,
  setSelectedClinicaName,
  setConsistencyCheckEnabled,
  handleFecharSelecaoHospital,
  handleAbrirListaHospitais,
  handleAbrirListaClinicas,
  handleUseSameAsHospitalChange,
  handleContinuarAposHospitalClinica,
  handleVoltarListaParaSelector,
  handleSelecionarHospital,
  handleVoltarListaClinicasParaSelector,
  handleSelecionarClinica,
}) => {
  const { medicoNome } = useFaturamentoFlow();

  return (
    <div className="flex w-full flex-1 items-start justify-center pt-4">
      {hospitalStepView === "selector" && clinicaStepView === "selector" ? (
        <div className="w-full max-w-sm rounded-2xl bg-black/70 backdrop-blur-xl px-6 py-6 shadow-[0_0_40px_rgba(212,160,23,0.12)] border border-[#D4A017]/20">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#F5F5F5]">
                {medicoNome ? `Dr. ${medicoNome},` : "Doutor(a),"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleFecharSelecaoHospital}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-[#9CA3AF] border border-[#D4A017]/15 hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 1. Seleção de Hospital */}
          <div className="mb-5">
            <p className="mb-3 text-xs text-[#9CA3AF]">
              <span className="font-semibold text-[#F5F5F5]">1.</span>{" "}
              Informe o Hospital que a{" "}
              <span className="text-[#D4A017] font-semibold">cirurgia</span>{" "}
              foi realizada
            </p>
            <button
              type="button"
              onClick={handleAbrirListaHospitais}
              disabled={
                loadingHospitais ||
                (!hospitaisMedico.length && !selectedHospitalId)
              }
              className="flex w-full items-center justify-between rounded-2xl border border-[#D4A017]/30 bg-[#121212] px-4 py-3 text-left text-[#F5F5F5] hover:border-[#D4A017]/50 transition-colors disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_18px_rgba(212,160,23,0.25)]">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D4A017]/80">
                    Cirurgia realizada em:
                  </span>
                  <span className="text-sm font-semibold">
                    {selectedHospitalName ||
                      (loadingHospitais
                        ? "Carregando hospitais..."
                        : hospitaisMedico.length
                          ? "Selecionar Hospital"
                          : "Nenhum hospital disponível")}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
            </button>
          </div>

          {/* 2. Seleção de Clínica/Hospital para Faturamento */}
          <div className="mb-4">
            <p className="mb-3 text-xs text-[#9CA3AF]">
              <span className="font-semibold text-[#F5F5F5]">2.</span>{" "}
              Informe o Hospital/Clínica que a cirurgia será{" "}
              <span className="text-[#D4A017] font-semibold">faturada</span>
            </p>

            <button
              type="button"
              onClick={handleAbrirListaClinicas}
              disabled={
                useSameAsHospital ||
                loadingClinicas ||
                (!clinicasMedico.length && !selectedClinicaId)
              }
              className={`flex w-full items-center justify-between rounded-2xl border border-[#D4A017]/30 bg-[#121212] px-4 py-3 text-left text-[#F5F5F5] transition-colors ${
                useSameAsHospital
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:border-[#D4A017]/50"
              } disabled:opacity-60`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20">
                  <CircleDollarSign className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D4A017]/80">
                    Faturamento por
                  </span>
                  <span className="text-sm font-semibold">
                    {selectedClinicaName ||
                      (loadingClinicas
                        ? "Carregando instituições..."
                        : clinicasMedico.length
                          ? "Selecionar Instituição"
                          : "Nenhuma instituição disponível")}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
            </button>

            <label className="mt-3 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useSameAsHospital}
                onChange={(e) => handleUseSameAsHospitalChange(e.target.checked)}
                disabled={!selectedHospitalId}
                className="h-4 w-4 rounded border-[#D4A017]/30 bg-[#121212] text-[#D4A017] focus:ring-[#D4A017]/50 focus:ring-offset-0 disabled:opacity-50"
              />
              <span className="text-[11px] text-[#9CA3AF]">
                Mesma instituição que foi realizada a cirurgia
              </span>
            </label>
          </div>

          {/* Verificação de consistência entre documentos (movida da tela "Iniciar Agora") */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#D4A017]/20 bg-black/40 px-4 py-3">
            <Checkbox
              id="consistency-check-hospital"
              checked={consistencyCheckEnabled}
              onCheckedChange={(v) => setConsistencyCheckEnabled(!!v)}
              className="border-[#D4A017]/50 data-[state=checked]:bg-[#D4A017] data-[state=checked]:border-[#D4A017]"
            />
            <label htmlFor="consistency-check-hospital" className="text-sm text-[#F5F5F5] cursor-pointer leading-snug">
              Verificar consistência entre documentos
              <span className="block text-xs text-[#9CA3AF] mt-0.5">
                O sistema compara os dados de cada documento ao longo do processo
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleContinuarAposHospitalClinica}
            disabled={!selectedHospitalId || !selectedClinicaId}
            className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300 ${
              selectedHospitalId && selectedClinicaId
                ? "bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black shadow-[0_0_20px_rgba(212,160,23,0.35)] hover:shadow-[0_0_30px_rgba(212,160,23,0.55)] hover:scale-[1.01]"
                : "cursor-not-allowed bg-black/50 text-[#6B7280] border border-[#D4A017]/10"
            }`}
          >
            Continuar
          </button>
        </div>
      ) : hospitalStepView === "list" ? (
        <div className="w-full max-w-sm rounded-2xl bg-black/70 backdrop-blur-xl px-5 py-5 shadow-[0_0_40px_rgba(212,160,23,0.12)] border border-[#D4A017]/20">
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={handleVoltarListaParaSelector}
              className="flex items-center gap-2 text-xs text-[#9CA3AF] hover:text-[#D4A017]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={() => setHospitalStepView("selector")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-[#9CA3AF] border border-[#D4A017]/15 hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mb-4 text-xs text-[#9CA3AF]">
            Selecione o hospital onde a cirurgia foi realizada:
          </p>

          <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1 pb-1">
            {loadingHospitais && (
              <p className="text-xs text-[#9CA3AF]">
                Carregando hospitais...
              </p>
            )}

            {(() => {
              if (loadingHospitais) return null;
              const hospitaisOrdenados = [
                ...hospitaisMedico.filter((h) => favoritosIds.has(h.id)),
                ...hospitaisMedico.filter((h) => !favoritosIds.has(h.id)),
              ];

              return (
                <>
                  {hospitaisOrdenados.map((h) => {
                    const isFavorito = favoritosIds.has(h.id);

                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          handleSelecionarHospital(h);
                          if (useSameAsHospital) {
                            setSelectedClinicaId(h.id);
                            setSelectedClinicaName(h.nome_fantasia);
                          }
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl bg-[#121212] px-4 py-3 text-left text-[#F5F5F5] transition-colors ${
                          isFavorito
                            ? "border border-[#D4A017]/30 hover:border-[#D4A017]/60 hover:bg-black/40"
                            : "border border-[#D4A017]/15 hover:border-[#D4A017]/35 hover:bg-black/40"
                        }`}
                      >
                        {isFavorito && (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4A017]/15 text-[#D4A017] border border-[#D4A017]/30">
                            <Star className="h-4 w-4" fill="currentColor" />
                          </span>
                        )}
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#D4A017] ${
                          isFavorito
                            ? "bg-[#D4A017]/15 border border-[#D4A017]/30 shadow-[0_0_15px_rgba(212,160,23,0.15)]"
                            : "bg-[#D4A017]/10 border border-[#D4A017]/20"
                        }`}>
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium">
                          {h.nome_fantasia}
                        </span>
                      </button>
                    );
                  })}

                  {!hospitaisMedico.length && (
                    <p className="text-xs text-[#6B7280]">
                      Não encontramos hospitais disponíveis.
                      Entre em contato com o administrador.
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      ) : clinicaStepView === "list" ? (
        <div className="w-full max-w-sm rounded-2xl bg-black/70 backdrop-blur-xl px-5 py-5 shadow-[0_0_40px_rgba(212,160,23,0.12)] border border-[#D4A017]/20">
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={handleVoltarListaClinicasParaSelector}
              className="flex items-center gap-2 text-xs text-[#9CA3AF] hover:text-[#D4A017]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={() => setClinicaStepView("selector")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-[#9CA3AF] border border-[#D4A017]/15 hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mb-4 text-xs text-[#9CA3AF]">
            Selecione a instituição para faturamento:
          </p>

          <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1 pb-1">
            {loadingClinicas && (
              <p className="text-xs text-[#9CA3AF]">
                Carregando instituições...
              </p>
            )}

            {(() => {
              if (loadingClinicas) return null;
              const clinicasOrdenadas = [
                ...clinicasMedico.filter((c) => favoritosIds.has(c.id)),
                ...clinicasMedico.filter((c) => !favoritosIds.has(c.id)),
              ];

              return (
                <>
                  {clinicasOrdenadas.map((c) => {
                    const isFavorito = favoritosIds.has(c.id);

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelecionarClinica(c)}
                        className={`flex w-full items-center gap-3 rounded-2xl bg-[#121212] px-4 py-3 text-left text-[#F5F5F5] transition-colors ${
                          isFavorito
                            ? "border border-[#D4A017]/30 hover:border-[#D4A017]/60 hover:bg-black/40"
                            : "border border-[#D4A017]/15 hover:border-[#D4A017]/35 hover:bg-black/40"
                        }`}
                      >
                        {isFavorito && (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4A017]/15 text-[#D4A017] border border-[#D4A017]/30">
                            <Star className="h-4 w-4" fill="currentColor" />
                          </span>
                        )}
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#D4A017] ${
                          isFavorito
                            ? "bg-[#D4A017]/15 border border-[#D4A017]/30 shadow-[0_0_15px_rgba(212,160,23,0.15)]"
                            : "bg-[#D4A017]/10 border border-[#D4A017]/20"
                        }`}>
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium">
                          {c.nome_fantasia}
                        </span>
                      </button>
                    );
                  })}

                  {!clinicasMedico.length && (
                    <p className="text-xs text-[#6B7280]">
                      Não encontramos instituições disponíveis.
                      Entre em contato com o administrador.
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default HospitalStep;

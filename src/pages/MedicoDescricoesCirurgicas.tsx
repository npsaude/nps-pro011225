import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileHeart, RefreshCw, Stethoscope } from "lucide-react";

import MedicoDescricaoCirurgicaList from "@/components/descricao-cirurgica/MedicoDescricaoCirurgicaList";
import {
  listarDescricoesCirurgicasDoMedicoLogado,
  type DescricaoCirurgicaResumoMedico,
} from "@/services/descricao-cirurgica-service";
import { Button } from "@/components/ui/button";
import { showError } from "@/utils/toast";

const MedicoDescricoesCirurgicas: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<DescricaoCirurgicaResumoMedico[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const carregarDescricoes = async () => {
    setIsLoading(true);
    try {
      const data = await listarDescricoesCirurgicasDoMedicoLogado();
      setItems(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as descrições cirúrgicas.";
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void carregarDescricoes();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[#F5F5F5] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,23,0.10)_0,#0b0b0b_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-[#121212]/80" />

      <div className="relative z-10 flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Topo */}
        <header className="sticky top-0 z-40 -mx-4 mb-5 border-b border-[#D4A017]/20 bg-black/70 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] flex items-center justify-center shadow-[0_0_20px_rgba(212,160,23,0.35)]">
                <Stethoscope className="h-6 w-6 text-black" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] bg-clip-text text-transparent">
                CONMEDIC
              </span>
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

        {/* Cabeçalho da página */}
        <section className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] shadow-[0_0_20px_rgba(212,160,23,0.25)]">
              <FileHeart className="h-6 w-6 text-black" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold leading-tight sm:text-xl">
                Minhas descrições cirúrgicas
              </h1>
              <p className="text-[11px] text-[#9CA3AF] sm:text-xs">
                Acompanhe as descrições geradas pela IA a partir dos documentos
                que você enviou.
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void carregarDescricoes()}
            disabled={isLoading}
            className="hidden items-center gap-1.5 rounded-lg border-[#D4A017]/30 bg-black/40 text-[11px] text-[#D4A017] hover:bg-[#D4A017]/10 hover:text-[#FFD700] sm:inline-flex"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {isLoading ? "Atualizando..." : "Atualizar"}
          </Button>
        </section>

        {/* Conteúdo principal */}
        <main className="flex-1">
          <div className="mb-3 sm:hidden">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void carregarDescricoes()}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border-[#D4A017]/30 bg-black/40 text-[11px] text-[#D4A017] hover:bg-[#D4A017]/10 hover:text-[#FFD700]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {isLoading ? "Atualizando..." : "Atualizar lista"}
            </Button>
          </div>

          <MedicoDescricaoCirurgicaList items={items} isLoading={isLoading} />
        </main>
      </div>
    </div>
  );
};

export default MedicoDescricoesCirurgicas;
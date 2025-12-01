import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileHeart, RefreshCw } from "lucide-react";

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
    <div className="relative flex min-h-screen w-full bg-slate-950 text-slate-50">
      {/* Fundo em gradiente médico, mobile-first */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,#0f766e_0,#020617_55%),radial-gradient(circle_at_100%_100%,#22c55e_0,#020617_50%)] opacity-90" />

      <div className="flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Topo */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl bg-slate-950/70 px-3 py-2 text-xs text-emerald-100 shadow-sm ring-1 ring-emerald-500/40 backdrop-blur"
            onClick={() => navigate("/medico/dashboard")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-2 rounded-2xl bg-slate-950/70 px-3 py-2 text-[11px] text-emerald-100/80 shadow-sm ring-1 ring-emerald-500/30 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Acompanhamento · Descrição Cirúrgica</span>
          </div>
        </header>

        {/* Cabeçalho da página */}
        <section className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 shadow-md shadow-emerald-400/40">
              <FileHeart className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold leading-tight text-slate-50 sm:text-xl">
                Minhas descrições cirúrgicas
              </h1>
              <p className="text-[11px] text-emerald-100/80 sm:text-xs">
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
            className="hidden items-center gap-1.5 rounded-full border-emerald-500/40 bg-slate-950/70 text-[11px] text-emerald-100 hover:bg-emerald-500/20 sm:inline-flex"
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
              className="flex w-full items-center justify-center gap-1.5 rounded-full border-emerald-500/40 bg-slate-950/70 text-[11px] text-emerald-100 hover:bg-emerald-500/20"
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
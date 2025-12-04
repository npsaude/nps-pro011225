import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Activity, User2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MedicoInicio: React.FC = () => {
  const navigate = useNavigate();
  const [medicoNome, setMedicoNome] = useState<string>("");

  useEffect(() => {
    const carregarNomeMedico = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const email = authData.user?.email;
      if (!email) return;

      const { data } = await supabase
        .from("usuarios_sistema")
        .select("nome")
        .eq("email", email)
        .maybeSingle();

      if (data?.nome) {
        const primeiroNome = (data.nome as string).split(" ")[0];
        setMedicoNome(primeiroNome);
      }
    };

    void carregarNomeMedico();
  }, []);

  const saudacao = medicoNome ? `Olá, Dr. ${medicoNome}.` : "Olá, Doutor(a).";

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#020817] text-slate-50">
      {/* Fundo gradiente suave */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,#10B981_0,#020617_55%),radial-gradient(circle_at_100%_100%,#1D4ED8_0,#020617_55%)] opacity-80" />

      <div className="relative z-10 flex w-full max-w-sm flex-col px-4 py-7 sm:px-5 sm:py-8">
        {/* Badge topo */}
        <div className="mb-6 flex justify-start">
          <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1.5 text-[11px] text-emerald-100 shadow-sm ring-1 ring-emerald-500/40 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Portal do Médico</span>
          </div>
        </div>

        {/* Avatar + saudação */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/90 text-emerald-300 shadow-lg shadow-black/40">
            <User2 className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-50 sm:text-[26px]">
              {saudacao}
            </h1>
            <p className="text-sm text-slate-300">
              O que você deseja fazer hoje?
            </p>
          </div>
        </div>

        {/* Card Nova Descrição Cirúrgica */}
        <button
          type="button"
          onClick={() => navigate("/medico/descricao-cirurgica/enviar")}
          className="mb-4 flex w-full items-center justify-between rounded-[26px] bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-4 text-left text-slate-50 shadow-[0_24px_70px_rgba(16,185,129,0.9)] transition-transform hover:translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600/95 text-slate-50 shadow-inner shadow-emerald-700/70">
              <Upload className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold sm:text-base">
                Nova Descrição Cirúrgica
              </span>
              <span className="text-[11px] text-emerald-100/95">
                Enviar Descrição Cirúrgica
              </span>
            </div>
          </div>
        </button>

        {/* Card Ver Minhas Informações */}
        <button
          type="button"
          onClick={() => navigate("/medico/informacoes")}
          className="flex w-full items-center justify-between rounded-[26px] bg-slate-900/90 px-4 py-4 text-left text-slate-100 shadow-[0_22px_55px_rgba(15,23,42,0.9)] ring-1 ring-slate-800/80 transition-colors hover:bg-slate-900"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 text-emerald-300">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold sm:text-base">
                Ver Minhas Informações
              </span>
              <span className="text-[11px] text-slate-300">
                Financeiro e Glosas
              </span>
            </div>
          </div>
        </button>

        {/* Rodapé de segurança */}
        <div className="mt-8 text-center text-[11px] text-slate-400">
          Ambiente Seguro · Criptografia de ponta a ponta
        </div>
      </div>
    </div>
  );
};

export default MedicoInicio;
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Activity, User2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MedicoHeader from "@/components/medico/MedicoHeader";

const MedicoInicio: React.FC = () => {
  const navigate = useNavigate();
  const [medicoNome, setMedicoNome] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const carregarDadosMedico = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const email = authData.user?.email;
      if (!email) return;

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
    };

    void carregarDadosMedico();
  }, []);

  const saudacao = medicoNome ? `Olá, Dr. ${medicoNome}.` : "Olá, Doutor(a).";

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[#F5F5F5] relative overflow-hidden">
      {/* Fundo premium */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,23,0.10)_0,#0b0b0b_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-[#121212]/80" />

      <div className="relative z-10">
        <MedicoHeader
          statusLabel="Portal do Médico"
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

          {/* CTA - Novo faturamento */}
          <button
            type="button"
            onClick={() => navigate("/medico/faturamentos/enviar")}
            className="mb-4 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] px-4 py-4 text-left text-black shadow-[0_0_30px_rgba(212,160,23,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(212,160,23,0.2)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/25 text-black shadow-inner">
                <Upload className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold sm:text-base">
                  Novo Faturamento
                </span>
                <span className="text-[11px] text-black/80">
                  Faça o upload dos documentos.
                </span>
              </div>
            </div>
          </button>

          {/* Secundário - Informações */}
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

          <footer className="mt-auto pt-8 text-center text-[11px] text-[#6B7280]">
            Ambiente Seguro · Criptografia de ponta a ponta
          </footer>
        </div>
      </div>
    </div>
  );
};

export default MedicoInicio;
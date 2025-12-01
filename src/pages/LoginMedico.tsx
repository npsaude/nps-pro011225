import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRightCircle, Stethoscope, HeartPulse } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const LoginMedico = () => {
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Aqui no futuro você pode autenticar o médico e marcar role = MEDICO.
    // Por enquanto, direciona para o dashboard existente.
    navigate("/admin/dashboard");
  };

  return (
    <div className="relative flex min-h-screen w-full items-stretch bg-slate-950 text-slate-50">
      {/* Fundo médico em gradiente, mobile-first */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,#0f766e_0,#020617_55%),radial-gradient(circle_at_100%_100%,#22c55e_0,#020617_50%)] opacity-90" />

      <div className="flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Topo: logo e voltar */}
        <header className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-3 rounded-2xl bg-slate-900/70 px-3 py-2 text-xs shadow-sm ring-1 ring-emerald-500/30 backdrop-blur"
            onClick={() => navigate("/")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 shadow-md shadow-emerald-400/40">
              <img
                src="/logo.jpeg"
                alt="Logo NP Saúde Pró"
                className="h-7 w-7 rounded-lg object-cover"
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-50">
                NP Saúde Pró
              </span>
              <span className="text-[11px] text-emerald-200">
                Portal do Médico
              </span>
            </div>
          </button>

          <div className="hidden text-right text-[11px] text-emerald-100/80 sm:block">
            <p className="font-medium">Suporte ao médico</p>
            <p>(00) 0000-0000</p>
          </div>
        </header>

        {/* Conteúdo principal - mobile first */}
        <main className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Coluna: formulário */}
          <section className="w-full max-w-md rounded-3xl bg-slate-950/80 px-5 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.75)] ring-1 ring-emerald-500/25 backdrop-blur-md sm:px-6 sm:py-7">
            <div className="mb-5 space-y-1">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Acesso do Médico
              </p>
              <h1 className="text-xl font-semibold leading-tight text-slate-50 sm:text-2xl">
                Entre para acompanhar suas SADTs.
              </h1>
              <p className="text-xs text-emerald-100/80 sm:text-sm">
                Acesse com seu e-mail ou CRM cadastrado e acompanhe o status de
                envio, faturamento e glosas dos seus atendimentos.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* E-mail ou CRM */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-emerald-100/90">
                  E-mail ou CRM
                </label>
                <div className="flex items-center rounded-xl bg-slate-900/70 ring-1 ring-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-400">
                  <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-emerald-500/30 text-emerald-300">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    type="text"
                    placeholder="seuemail@exemplo.com ou CRM"
                    className="h-11 border-none bg-transparent text-sm text-slate-50 placeholder:text-emerald-300/60 focus-visible:ring-0"
                    required
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-emerald-100/90">
                  Senha
                </label>
                <div className="flex items-center rounded-xl bg-slate-900/70 ring-1 ring-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-400">
                  <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-emerald-500/30 text-emerald-300">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type="password"
                    placeholder="Digite sua senha"
                    className="h-11 border-none bg-transparent text-sm text-slate-50 placeholder:text-emerald-300/60 focus-visible:ring-0"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-100/80">
                <p>Médico vinculado à tabela de usuários do sistema.</p>
                <button
                  type="button"
                  className="font-semibold text-emerald-300 underline-offset-2 hover:underline"
                >
                  Esqueci a senha
                </button>
              </div>

              {/* Botão login médico */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 transition-transform hover:translate-y-0.5 hover:bg-emerald-400"
                >
                  <ArrowRightCircle className="h-4 w-4" />
                  <span>Entrar como médico</span>
                </Button>
              </div>
            </form>

            {/* Rodapé pequeno */}
            <p className="mt-4 text-[11px] text-emerald-100/80">
              Em caso de dúvidas sobre seu acesso, entre em contato com a
              coordenação da clínica.
            </p>

            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 text-[11px] text-emerald-200/90 underline-offset-2 hover:underline"
              onClick={() => navigate("/login")}
            >
              <span>Sou administrador</span>
            </button>
          </section>

          {/* Coluna lateral (exibida melhor em telas maiores) */}
          <section className="mt-6 flex flex-1 flex-col items-center justify-center gap-5 text-center lg:mt-0 lg:items-end lg:text-right">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/20 ring-2 ring-emerald-400/40">
              <HeartPulse className="h-9 w-9 text-emerald-300" />
            </div>
            <div className="max-w-sm space-y-2">
              <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">
                Pensado para o dia a dia do médico.
              </h2>
              <p className="text-xs text-emerald-100/85 sm:text-sm">
                Centralize o acompanhamento das suas SADTs, visualize status de
                faturamento e organize seu fluxo com mais segurança e
                transparência.
              </p>
            </div>
            <ul className="mt-1 space-y-1.5 text-left text-xs text-emerald-100/90 sm:text-sm lg:text-right">
              <li>• Acesso seguro, vinculado ao seu cadastro de usuário.</li>
              <li>• Visualização rápida de SADTs em análise, pagas ou com glosa.</li>
              <li>• Ambiente preparado para integração com prontuário e faturamento.</li>
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
};

export default LoginMedico;
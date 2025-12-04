import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRightCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const Login = () => {
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Aqui poderíamos validar credenciais; por enquanto apenas navega para o painel.
    navigate("/admin/dashboard");
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#f4f7ff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Fundo geral com bordas arredondadas, similar ao mockup */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[88vh] w-[94vw] max-w-6xl rounded-[2.5rem] bg-gradient-to-br from-[#e8f1ff] via-[#f8fbff] to-[#e3eeff] shadow-[0_20px_70px_rgba(15,23,42,0.25)] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />
      </div>

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center px-4">
        {/* Texto discreto acima */}
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
          Seja bem vindo ao NP Saúde Pró
        </p>

        {/* Container principal: login + CTA */}
        <div className="grid w-full max-w-4xl grid-cols-1 gap-0 overflow-hidden rounded-[1.75rem] bg-transparent md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Coluna branca: formulário de login */}
          <div className="flex h-full flex-col justify-between bg-white/95 px-7 py-7 text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.18)] dark:bg-slate-900/95">
            {/* Logo + título */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#135bec] shadow-md shadow-blue-500/40">
                <img
                  src="/logo.jpeg"
                  alt="Logo NP Saúde Pró"
                  className="h-8 w-8 rounded-xl object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  NP Saúde Pró
                </span>
                <span className="text-[11px] text-slate-400">
                  Acesso à área administrativa
                </span>
              </div>
            </div>

            {/* Formulário */}
            <div className="flex-1">
              <h1 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">
                Faça login para continuar
              </h1>
              <p className="mb-5 text-xs text-slate-400 sm:text-sm">
                Use seu e-mail e senha cadastrados para acessar o painel.
              </p>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Campo usuário/e-mail */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500">
                    Usuário ou e-mail
                  </label>
                  <div className="flex items-center rounded-xl bg-slate-50 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-[#135bec]/70 dark:bg-slate-900 dark:ring-slate-700">
                    <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-300">
                      <Mail className="h-4 w-4" />
                    </span>
                    <Input
                      type="email"
                      placeholder="Insira seu usuário ou e-mail"
                      className="h-11 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 dark:text-slate-50 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Campo senha */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500">
                    Senha
                  </label>
                  <div className="flex items-center rounded-xl bg-slate-50 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-[#135bec]/70 dark:bg-slate-900 dark:ring-slate-700">
                    <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-300">
                      <Lock className="h-4 w-4" />
                    </span>
                    <Input
                      type="password"
                      placeholder="Insira sua senha"
                      className="h-11 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 dark:text-slate-50 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Lembrar / Esqueceu senha */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <Checkbox className="h-3.5 w-3.5" />
                    <span>Lembrar de mim</span>
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-[#135bec] hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                {/* Botão de login */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#135bec] text-sm font-semibold text-white shadow-md shadow-blue-500/40 transition-transform hover:translate-y-0.5 hover:bg-[#135bec]/90"
                  >
                    <ArrowRightCircle className="h-4 w-4" />
                    <span>Entrar no painel</span>
                  </Button>
                </div>
              </form>
            </div>

            {/* Rodapé pequeno */}
            <p className="mt-5 text-[11px] text-slate-400">
              Acesso exclusivo para administradores autorizados da NP Saúde Pró.
            </p>
          </div>

          {/* Coluna azul: call to action GHI */}
          <div className="relative flex h-full items-center justify-center bg-[#135bec] px-6 py-8 text-white">
            {/* Fundo com formas, inspirado no mockup */}
            <div
              className="absolute inset-0 -z-10 rounded-[1.75rem]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at top left, rgba(96,165,250,0.5), transparent 45%), radial-gradient(circle at bottom right, rgba(37,99,235,0.9), transparent 45%)",
              }}
            />
            <div className="absolute inset-0 -z-10 rounded-[1.75rem] bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.6),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(37,99,235,0.7),transparent_55%)] opacity-80" />

            <div className="relative flex flex-col items-center text-center">
              <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-sky-100/80">
                GHI ONLINE
              </p>
              <h2 className="text-xl font-semibold leading-tight sm:text-2xl">
                Envie sua GHI em poucos passos.
              </h2>
              <p className="mt-2 max-w-xs text-xs text-sky-100/90 sm:text-sm">
                Anexe documentos, informe os dados necessários e acompanhe todo
                o fluxo diretamente pelo painel da NP Saúde Pró.
              </p>

              <Button
                type="button"
                className="mt-6 flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-xs font-semibold text-[#135bec] shadow-lg shadow-blue-900/40 hover:bg-sky-50 sm:text-sm"
                onClick={() => navigate("/sadt/enviar")}
              >
                <ArrowRightCircle className="h-4 w-4" />
                <span>Enviar GHI agora</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
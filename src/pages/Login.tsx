import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRightCircle, Stethoscope } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const Login = () => {
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Aqui poderíamos validar credenciais; por enquanto apenas navega para o painel administrativo.
    navigate("/admin/dashboard");
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#f4f7ff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Fundo geral */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[88vh] w-[94vw] max-w-4xl rounded-[2.5rem] bg-gradient-to-br from-[#e8f1ff] via-[#f8fbff] to-[#e3eeff] shadow-[0_20px_70px_rgba(15,23,42,0.25)] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-4">
        {/* Logo / título */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#135bec] shadow-md shadow-blue-500/40">
            <img
              src="/logo.jpeg"
              alt="Logo NP Saúde Pró"
              className="h-9 w-9 rounded-xl object-cover"
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

        {/* Card de login */}
        <div className="w-full rounded-[1.75rem] bg-white/95 px-6 py-6 text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.18)] dark:bg-slate-900/95 sm:px-7 sm:py-7">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
            ADMINISTRADOR
          </p>
          <h1 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">
            Faça login para continuar
          </h1>
          <p className="mb-5 text-xs text-slate-400 sm:text-sm">
            Use seu e-mail e senha cadastrados para acessar o painel
            administrativo da clínica.
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

            {/* Botão de login admin */}
            <div className="pt-2">
              <Button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#135bec] text-sm font-semibold text-white shadow-md shadow-blue-500/40 transition-transform hover:translate-y-0.5 hover:bg-[#135bec]/90"
              >
                <ArrowRightCircle className="h-4 w-4" />
                <span>Entrar como administrador</span>
              </Button>
            </div>
          </form>

          {/* Separador e link para médico */}
          <div className="mt-5 border-t border-slate-100 pt-4 text-center text-xs text-slate-400 dark:border-slate-800">
            <p className="mb-2">Você é médico e deseja acessar suas SADTs?</p>
            <Button
              type="button"
              variant="outline"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border-[#0f766e]/30 bg-teal-50/70 px-4 text-xs font-semibold text-[#0f766e] shadow-sm hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-200"
              onClick={() => navigate("/login-medico")}
            >
              <Stethoscope className="h-4 w-4" />
              <span>Acessar como médico</span>
            </Button>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-slate-400">
          Acesso exclusivo para administradores autorizados da NP Saúde Pró.
        </p>
      </div>
    </div>
  );
};

export default Login;
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/admin/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#f4f7ff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Fundo gradiente */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#e5f0ff] via-[#f8fbff] to-[#e3eeff] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />

      <div className="flex w-full justify-center px-4">
        <div className="flex w-full max-w-md flex-col items-center rounded-3xl bg-white/90 px-6 py-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.14)] ring-1 ring-slate-100/80 backdrop-blur-xl dark:bg-slate-900/90 dark:ring-slate-800 sm:px-8 sm:py-9">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#135bec] shadow-md shadow-blue-500/40">
              <img
                src="/logo.jpeg"
                alt="Logo NP Saúde Pró"
                className="h-8 w-8 rounded-xl object-cover"
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                NP Saúde Pró
              </span>
              <span className="text-[11px] text-slate-400">
                Área Administrativa
              </span>
            </div>
          </div>

          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
            Redirecionando para o painel
          </h1>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-300 sm:text-sm">
            Aguarde um instante enquanto preparamos o dashboard para Jurandy
            Pessoa.
          </p>

          <div className="mt-5 flex h-2 w-full max-w-[180px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="animate-pulse-slow h-full w-1/2 rounded-full bg-[#135bec]" />
          </div>

          <p className="mt-4 text-[11px] text-slate-400">
            Caso o redirecionamento não ocorra, atualize a página ou tente
            novamente mais tarde.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
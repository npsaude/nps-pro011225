import { useNavigate } from "react-router-dom";
import { ArrowRightCircle, Lock } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center bg-[#101622] text-slate-100">
      {/* Fundo com gradientes */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at top left, rgba(19, 91, 236, 0.25), transparent 40%), radial-gradient(circle at bottom right, rgba(19, 91, 236, 0.22), transparent 40%)",
        }}
      />

      <div className="flex h-full w-full max-w-5xl flex-col px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex w-full items-center justify-between py-4">
          <div className="flex items-center gap-3 text-white">
            <div className="h-6 w-6 text-[#135bec]">
              <svg
                viewBox="0 0 48 48"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M6 6H42L36 24L42 42H6L12 24L6 6Z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold tracking-[-0.015em]">
              NPS-Pro SADT
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-slate-300 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/20">
              <span className="sr-only">Idioma</span>
              <span>🌐</span>
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-slate-300 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/20">
              <span className="sr-only">Ajuda</span>
              <span>?</span>
            </button>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="flex w-full max-w-xl flex-col items-center gap-8 rounded-xl bg-black/40 p-6 text-center shadow-xl shadow-black/60 ring-1 ring-white/10 backdrop-blur-2xl sm:p-10">
            <div className="flex flex-col gap-3">
              <p className="text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
                NPS-Pro SADT
              </p>
              <p className="text-base font-normal leading-normal text-slate-300">
                Inicie uma nova solicitação de SADT ou acesse a área
                administrativa.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-4">
              <button
                className="flex h-12 flex-1 items-center justify-center gap-2.5 rounded-lg bg-[#135bec] px-5 text-base font-bold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => navigate("/sadt/enviar")}
              >
                <ArrowRightCircle className="h-5 w-5" />
                <span className="truncate">Enviar SADT</span>
              </button>
              <button
                className="flex h-12 flex-1 items-center justify-center gap-2.5 rounded-lg bg-slate-700 px-5 text-base font-bold text-slate-50 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => navigate("/login")}
              >
                <Lock className="h-5 w-5" />
                <span className="truncate">Área Administrativa (Login)</span>
              </button>
            </div>
          </div>
        </main>

        {/* Rodapé */}
        <footer className="flex w-full flex-col items-center gap-4 px-5 pb-8 text-center text-sm text-slate-500">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            <button className="transition-colors hover:text-[#135bec]">
              Suporte
            </button>
            <button className="transition-colors hover:text-[#135bec]">
              Termos de Uso
            </button>
          </div>
          <p>© {new Date().getFullYear()} NPS-Pro SADT. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
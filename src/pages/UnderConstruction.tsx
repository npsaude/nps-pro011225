import { useNavigate } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

const LOGO_URL =
  "https://pokyribuibmbeorrcsgk.supabase.co/storage/v1/object/sign/NPS-pro/site/logo-conmagic-favicon.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZDc4YzM5NC1hMTFlLTQ3MTEtYTVmNi1lMjU4ZGU4MGRiYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJOUFMtcHJvL3NpdGUvbG9nby1jb25tYWdpYy1mYXZpY29uLnBuZyIsImlhdCI6MTc2OTE4NTA3OSwiZXhwIjoxNzcwMDQ5MDc5fQ.jSiOZo0BFqGup9t3gAzfohZbOwBKpvHRUCGrb_1Fbeg";

export default function UnderConstruction() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(254,230,122,0.14)_0,rgba(18,18,18,1)_55%),radial-gradient(circle_at_100%_100%,rgba(212,160,23,0.10)_0,rgba(18,18,18,1)_55%)]" />

      <div className="w-full max-w-lg px-4">
        <div className="rounded-[32px] bg-card p-6 ring-1 ring-border shadow-[0_24px_70px_rgba(0,0,0,0.55)] sm:p-8">
          <header className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background ring-1 ring-border">
              <img
                src={LOGO_URL}
                alt="Logo CONMEDIC"
                className="h-8 w-8 object-contain"
              />
            </div>

            <div className="flex-1">
              <h1 className="flex items-center gap-2 text-base font-semibold sm:text-lg">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Construction className="h-4 w-4" />
                </span>
                Plataforma em construção
              </h1>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Estamos finalizando essa etapa. Em breve você poderá continuar
                por aqui.
              </p>
            </div>
          </header>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="h-11 rounded-xl"
              onClick={() => navigate("/boas-vindas")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            <Button
              className="h-11 rounded-xl bg-primary text-primary-foreground hover:opacity-95"
              onClick={() => navigate("/login")}
            >
              Ir para login
            </Button>
          </div>

          <p className="mt-4 text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} CONMEDIC.
          </p>
        </div>
      </div>
    </div>
  );
}
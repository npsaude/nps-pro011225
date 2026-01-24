import { AlertTriangle, MailCheck } from "lucide-react";

const LOGO_URL =
  "https://pokyribuibmbeorrcsgk.supabase.co/storage/v1/object/sign/NPS-pro/site/logo-conmagic-favicon.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZDc4YzM5NC1hMTFlLTQ3MTEtYTVmNi1lMjU4ZGU4MGRiYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJOUFMtcHJvL3NpdGUvbG9nby1jb25tYWdpYy1mYXZpY29uLnBuZyIsImlhdCI6MTc2OTE4NTA3OSwiZXhwIjoxNzcwMDQ5MDc5fQ.jSiOZo0BFqGup9t3gAzfohZbOwBKpvHRUCGrb_1Fbeg";

export default function Welcome() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(254,230,122,0.14)_0,rgba(18,18,18,1)_55%),radial-gradient(circle_at_100%_100%,rgba(212,160,23,0.10)_0,rgba(18,18,18,1)_55%)]" />

      <div className="w-full max-w-lg px-4">
        <div className="rounded-[32px] bg-card p-6 ring-1 ring-border shadow-[0_24px_70px_rgba(0,0,0,0.55)] sm:p-8">
          <header className="flex items-center gap-3 border-b border-border/40 pb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background ring-1 ring-border">
              <img
                src={LOGO_URL}
                alt="Logo CONMEDIC"
                className="h-8 w-8 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold leading-none sm:text-xl">
                Bem-vindo ao CONMEDIC
              </h1>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Seu parceiro em gestão médica.
              </p>
            </div>
          </header>

          <div className="mt-6 flex flex-col gap-6 text-center sm:text-left">
            <div className="flex flex-col gap-3">
              <h2 className="flex items-center justify-center gap-2 text-lg font-bold text-foreground sm:justify-start sm:text-xl">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <MailCheck className="h-6 w-6" />
                </span>
                Parabéns!
              </h2>
              <p className="text-sm font-medium leading-relaxed text-foreground sm:text-base">
                Você adquiriu a melhor solução para acompanhamento de
                faturamento.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl bg-secondary/30 p-5 ring-1 ring-border">
              <p className="text-sm text-foreground/90">
                Você está quase lá.
              </p>
              <p className="text-sm text-foreground/90">
                Agora, basta acessar seu e-mail e <strong>confirmar sua assinatura</strong>.
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-500">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex flex-col gap-1 text-left text-xs sm:text-sm">
                <span className="font-bold">ATENÇÃO</span>
                <p className="text-amber-500/90 leading-relaxed">
                  Se não encontrar nosso e-mail na caixa de entrada principal,
                  verifique também sua pasta de <strong>spam</strong> ou lixo
                  eletrônico.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] text-muted-foreground">
          © 2026 CONMEDIC.
        </p>
      </div>
    </div>
  );
}

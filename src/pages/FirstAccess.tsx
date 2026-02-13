import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowRightCircle, ArrowLeft, KeyRound } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { sendPasswordReset } from "@/services/auth-service";

const LOGO_URL =
  "https://pokyribuibmbeorrcsgk.supabase.co/storage/v1/object/sign/NPS-pro/site/logo-conmagic-favicon.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZDc4YzM5NC1hMTFlLTQ3MTEtYTVmNi1lMjU4ZGU4MGRiYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJOUFMtcHJvL3NpdGUvbG9nby1jb25tYWdpYy1mYXZpY29uLnBuZyIsImlhdCI6MTc3MTAwMjQxMywiZXhwIjoyNDAxNzIyNDEzfQ.EFdbCwJ0scnjf4oFCJRg5YA_JtHfA2LZf_gugIB4WcY";

export default function FirstAccess() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim()) {
      showError("Informe seu e-mail para continuar.");
      return;
    }

    setSending(true);
    try {
      await sendPasswordReset(email.trim());
      showSuccess(
        "Enviamos um e-mail com o link para você cadastrar sua senha.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível iniciar o primeiro acesso.";
      showError(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(254,230,122,0.14)_0,rgba(18,18,18,1)_55%),radial-gradient(circle_at_100%_100%,rgba(212,160,23,0.10)_0,rgba(18,18,18,1)_55%)]" />

      <div className="w-full max-w-md px-4">
        <div className="rounded-[32px] bg-card p-6 ring-1 ring-border shadow-[0_24px_70px_rgba(0,0,0,0.55)] sm:p-8">
          <button
            type="button"
            onClick={() => navigate("/boas-vindas")}
            className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>

          <header className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background ring-1 ring-border">
              <img
                src={LOGO_URL}
                alt="Logo CONMEDIC"
                className="h-8 w-8 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-base font-semibold leading-none sm:text-lg">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <KeyRound className="h-4 w-4" />
                </span>
                Primeiro acesso
              </h1>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Informe seu e-mail para receber o link de cadastro de senha.
              </p>
            </div>
          </header>

          <form className="mt-6 space-y-4" onSubmit={handleSend}>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground">
                E-mail
              </label>
              <div className="flex items-center rounded-xl bg-background ring-1 ring-border focus-within:ring-2 focus-within:ring-ring">
                <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-border text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </span>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  className="h-11 border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                O cadastro já existe; você só vai definir a senha pelo link.
              </p>
            </div>

            <Button
              type="submit"
              disabled={sending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-70"
            >
              <ArrowRightCircle className="h-4 w-4" />
              {sending ? "Enviando..." : "Enviar link de cadastro de senha"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full rounded-xl"
              onClick={() => navigate("/login")}
            >
              Já tenho senha, ir para login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, KeyRound, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showError, showSuccess } from "@/utils/toast";
import { updatePassword } from "@/services/auth-service";
import { useRecoverySession } from "@/hooks/use-recovery-session";

const LOGO_URL =
  "https://pokyribuibmbeorrcsgk.supabase.co/storage/v1/object/sign/NPS-pro/site/logo-conmagic-favicon.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZDc4YzM5NC1hMTFlLTQ3MTEtYTVmNi1lMjU4ZGU4MGRiYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJOUFMtcHJvL3NpdGUvbG9nby1jb25tYWdpYy1mYXZpY29uLnBuZyIsImlhdCI6MTc2OTIwNDM1NCwiZXhwIjoyMDg0NTY0MzU0fQ.y5UC4nwVw4JpRIEJgL9oZTAWV7oMij0kT5Fvm8bMm8o";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const { ready, checking, error: recoveryError } = useRecoverySession();

  useEffect(() => {
    if (recoveryError) showError(recoveryError);
  }, [recoveryError]);

  const canSubmit = useMemo(() => {
    if (!ready) return false;
    if (isLoading) return false;
    if (!senha || !confirmacao) return false;
    return true;
  }, [confirmacao, isLoading, ready, senha]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ready) {
      showError(
        "Aguarde a validação do link de recuperação para salvar a nova senha.",
      );
      return;
    }

    if (senha.length < 6) {
      showError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmacao) {
      showError("As senhas não conferem.");
      return;
    }

    setIsLoading(true);
    try {
      await updatePassword(senha);
      showSuccess("Senha atualizada com sucesso.");
      setDone(true);
      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      let message =
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar a senha. Tente novamente.";

      if (message.toLowerCase().includes("different from the old password")) {
        message = "A nova senha deve ser diferente da senha atual.";
      } else if (message.toLowerCase().includes("password should be at least")) {
        message = "A senha deve ter pelo menos 6 caracteres.";
      } else if (
        message.toLowerCase().includes("session expired") ||
        message.toLowerCase().includes("invalid session")
      ) {
        message = "Sessão expirada. Solicite um novo link de recuperação.";
      }

      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-3xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/70 dark:ring-slate-800">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
              <img
                src={LOGO_URL}
                alt="Logo CONMEDIC"
                className="h-8 w-8 object-contain"
              />
            </div>

            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                CONMEDIC
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Redefinição de senha
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 backdrop-blur dark:bg-slate-900/90 dark:ring-slate-800 sm:p-6">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Senha atualizada!
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Você será redirecionado para o login em instantes.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">
                    Defina uma nova senha
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                    Digite a nova senha que deseja utilizar para acessar o
                    sistema.
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200 dark:ring-indigo-900/40">
                  <KeyRound className="h-5 w-5" />
                </div>
              </div>

              {checking ? (
                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                  Validando link de recuperação...
                </div>
              ) : recoveryError ? (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                  {recoveryError}
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-200">
                    Nova senha
                  </label>
                  <div className="flex items-center rounded-2xl bg-white ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-indigo-300/70 dark:bg-slate-950 dark:ring-slate-800 dark:focus-within:ring-indigo-500/30">
                    <span className="flex h-11 w-11 items-center justify-center rounded-l-2xl border-r border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-300">
                      <Lock className="h-4 w-4" />
                    </span>
                    <Input
                      type="password"
                      placeholder="Digite a nova senha"
                      className="h-11 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 dark:text-slate-50 dark:placeholder:text-slate-500"
                      required
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      disabled={!ready || isLoading}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Mínimo de 6 caracteres.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-200">
                    Confirme a nova senha
                  </label>
                  <Input
                    type="password"
                    placeholder="Repita a nova senha"
                    className="h-11 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-300/70 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
                    required
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    disabled={!ready || isLoading}
                  />
                </div>

                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="h-11 w-full rounded-2xl bg-indigo-600 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? "Salvando..." : "Salvar nova senha"}
                  </Button>
                </div>

                {!ready ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 w-full rounded-2xl"
                    onClick={() => navigate("/primeiro-acesso")}
                  >
                    Solicitar novo link
                  </Button>
                ) : null}
              </form>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-500 dark:text-slate-400">
          Se você não solicitou a redefinição, ignore este e-mail.
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
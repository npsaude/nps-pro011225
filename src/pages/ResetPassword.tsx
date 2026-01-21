import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { updatePassword } from "@/services/auth-service";
import { useRecoverySession } from "@/hooks/use-recovery-session";

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

      // Traduz mensagens comuns do Supabase Auth
      if (message.toLowerCase().includes("different from the old password")) {
        message = "A nova senha deve ser diferente da senha atual.";
      } else if (message.toLowerCase().includes("password should be at least")) {
        message = "A senha deve ter pelo menos 6 caracteres.";
      } else if (message.toLowerCase().includes("session expired") || message.toLowerCase().includes("invalid session")) {
        message = "Sessão expirada. Solicite um novo link de recuperação.";
      }

      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#f4f7ff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#e5f0ff] via-[#f8fbff] to-[#e3eeff] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/90 px-6 py-7 shadow-sm ring-1 ring-slate-100/80 backdrop-blur-sm dark:bg-slate-900/95 dark:ring-slate-800 sm:px-7">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#135bec] shadow-sm shadow-blue-500/30">
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
            <span className="text-[11px] text-slate-500">
              Redefinição de senha
            </span>
          </div>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
              Senha atualizada!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Você será redirecionado para o login em instantes.
            </p>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">
              Defina uma nova senha
            </h1>
            <p className="mb-5 text-xs text-slate-500 sm:text-sm">
              Digite a nova senha que deseja utilizar para acessar o sistema.
            </p>

            {checking ? (
              <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                Validando link de recuperação...
              </div>
            ) : recoveryError ? (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/20">
                {recoveryError}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-200">
                  Nova senha
                </label>
                <div className="flex items-center rounded-xl bg-slate-50 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-[#135bec]/70 dark:bg-slate-900 dark:ring-slate-700">
                  <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-300">
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
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-200">
                  Confirme a nova senha
                </label>
                <Input
                  type="password"
                  placeholder="Repita a nova senha"
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#135bec]/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500"
                  required
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  disabled={!ready || isLoading}
                />
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={isLoading || !ready}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#135bec] text-sm font-semibold text-white shadow-sm shadow-blue-500/40 hover:bg-[#135bec]/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </div>

              {!ready ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 w-full rounded-xl"
                  onClick={() => navigate("/primeiro-acesso")}
                >
                  Solicitar novo link
                </Button>
              ) : null}
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
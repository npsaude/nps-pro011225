import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRightCircle,
  Eye,
  EyeOff,
  Phone,
  Hash,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import {
  loginWithRole,
  registerUser,
  sendPasswordReset,
} from "@/services/auth-service";
import { supabase } from "@/integrations/supabase/client";
import SubscriptionExpiredDialog from "@/components/auth/SubscriptionExpiredDialog";
import { SUBSCRIPTION_EXPIRED_CODE } from "@/services/subscription-validity-service";

type Mode = "login" | "register";

const LoginMedico = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");

  const [subscriptionExpiredOpen, setSubscriptionExpiredOpen] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Register state
  const [registerNome, setRegisterNome] = useState("");
  const [registerCrmUf, setRegisterCrmUf] = useState("");
  const [registerWhatsapp, setRegisterWhatsapp] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerSenha, setRegisterSenha] = useState("");
  const [registerPasswordVisible, setRegisterPasswordVisible] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const isLogin = mode === "login";

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!loginEmail.trim() || !loginSenha) {
      showError("Informe e-mail e senha para acessar.");
      return;
    }

    setIsLoading(true);
    try {
      await loginWithRole({
        email: loginEmail.trim(),
        password: loginSenha,
        allowedRole: "MEDICO",
      });

      showSuccess("Login realizado com sucesso.");
      navigate("/medico/dashboard");
    } catch (err) {
      const code = (err as any)?.code as string | undefined;
      if (code === SUBSCRIPTION_EXPIRED_CODE) {
        setSubscriptionExpiredOpen(true);
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível fazer login. Verifique seus dados.";
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!registerNome.trim()) {
      showError("Informe o nome completo.");
      return;
    }
    if (!registerEmail.trim()) {
      showError("Informe o e-mail.");
      return;
    }
    if (registerSenha.length < 6) {
      showError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setRegisterLoading(true);
    try {
      await registerUser({
        nome: registerNome.trim(),
        email: registerEmail.trim(),
        password: registerSenha,
        role: "MEDICO",
      });

      void registerCrmUf;
      void registerWhatsapp;

      showSuccess(
        "Usuário médico criado. Verifique seu e-mail e confirme o cadastro antes do primeiro acesso.",
      );

      setLoginEmail(registerEmail.trim());
      setLoginSenha(registerSenha);
      setMode("login");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível criar o usuário. Verifique os dados.";
      showError(message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail.trim()) {
      showError("Informe o e-mail no campo de login para recuperar a senha.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordReset(loginEmail.trim());
      showSuccess(
        "Enviamos um e-mail com instruções para redefinir sua senha.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o e-mail de recuperação.";
      showError(message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleMedicoShortcutLogin = async () => {
    if (isLoading) return;

    const shortcutEmail = "adriano.dapv@gmail.com";
    const shortcutSenha = "123456";

    setLoginEmail(shortcutEmail);
    setLoginSenha(shortcutSenha);
    setIsLoading(true);

    try {
      await loginWithRole({
        email: shortcutEmail,
        password: shortcutSenha,
        allowedRole: "MEDICO",
      });

      showSuccess("Login rápido (médico) realizado com sucesso.");
      navigate("/medico/dashboard");
    } catch (err) {
      const code = (err as any)?.code as string | undefined;
      if (code === SUBSCRIPTION_EXPIRED_CODE) {
        setSubscriptionExpiredOpen(true);
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível fazer login rápido. Verifique o usuário de teste.";
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.code === "Digit2") {
        event.preventDefault();
        void handleMedicoShortcutLogin();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background text-foreground">
      <SubscriptionExpiredDialog
        open={subscriptionExpiredOpen}
        onOpenChange={setSubscriptionExpiredOpen}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(254,230,122,0.14)_0,rgba(18,18,18,1)_60%),radial-gradient(circle_at_100%_100%,rgba(212,160,23,0.10)_0,rgba(18,18,18,1)_60%)]" />

      <div className="relative z-10 flex w-full max-w-sm flex-col px-4 py-8 sm:py-10">
        <div className="mb-7 flex flex-col items-center gap-1">
          <span className="text-lg font-semibold sm:text-xl">
            CONMEDIC
          </span>
          <span className="text-xs text-muted-foreground sm:text-[13px]">
            Portal do Médico
          </span>
        </div>

        <div className="w-full rounded-[32px] bg-card px-5 py-6 text-card-foreground shadow-[0_24px_80px_rgba(0,0,0,0.70)] ring-1 ring-border sm:px-6 sm:py-7">
          <div className="mb-6 flex rounded-2xl bg-secondary p-1 text-xs font-medium text-secondary-foreground">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-xl px-3 py-2 transition ${
                isLogin
                  ? "bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(212,160,23,0.35)]"
                  : "bg-transparent opacity-80"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-xl px-3 py-2 transition ${
                !isLogin
                  ? "bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(212,160,23,0.35)]"
                  : "bg-transparent opacity-80"
              }`}
            >
              Criar conta
            </button>
          </div>

          {isLogin && (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  E-mail
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-background px-3 py-2 ring-1 ring-border focus-within:ring-ring">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Senha
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-background px-3 py-2 ring-1 ring-border focus-within:ring-ring">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type={loginPasswordVisible ? "text" : "password"}
                    placeholder="Digite sua senha"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                    value={loginSenha}
                    onChange={(e) => setLoginSenha(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLoginPasswordVisible((visible) => !visible)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground hover:opacity-90"
                    aria-label={
                      loginPasswordVisible ? "Ocultar senha" : "Mostrar senha"
                    }
                  >
                    {loginPasswordVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {resetLoading ? "Enviando..." : "Esqueci a senha"}
                </button>
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_45px_rgba(0,0,0,0.40)] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <ArrowRightCircle className="h-4 w-4" />
                  <span>
                    {isLoading ? "Entrando..." : "Entrar como Médico"}
                  </span>
                </Button>
              </div>
            </form>
          )}

          {!isLogin && (
            <form className="space-y-3.5" onSubmit={handleRegisterSubmit}>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Nome Completo
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-background px-3 py-2 ring-1 ring-border focus-within:ring-ring">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <span className="text-[11px] font-semibold">Dr</span>
                  </span>
                  <Input
                    type="text"
                    placeholder="Ex: Dr. Adriano"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                    value={registerNome}
                    onChange={(e) => setRegisterNome(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  CRM / UF
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-background px-3 py-2 ring-1 ring-border focus-within:ring-ring">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Hash className="h-4 w-4" />
                  </span>
                  <Input
                    type="text"
                    placeholder="123456 / SP"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                    value={registerCrmUf}
                    onChange={(e) => setRegisterCrmUf(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Telefone / WhatsApp
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-background px-3 py-2 ring-1 ring-border focus-within:ring-ring">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Phone className="h-4 w-4" />
                  </span>
                  <Input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                    value={registerWhatsapp}
                    onChange={(e) => setRegisterWhatsapp(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  E-mail
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-background px-3 py-2 ring-1 ring-border focus-within:ring-ring">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Senha
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-background px-3 py-2 ring-1 ring-border focus-within:ring-ring">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type={registerPasswordVisible ? "text" : "password"}
                    placeholder="Crie uma senha segura"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                    value={registerSenha}
                    onChange={(e) => setRegisterSenha(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRegisterPasswordVisible((visible) => !visible)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground hover:opacity-90"
                    aria-label={
                      registerPasswordVisible
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                  >
                    {registerPasswordVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={registerLoading}
                  className="flex h-11 w-full items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_45px_rgba(0,0,0,0.40)] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {registerLoading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-5 text-center text-[11px] text-muted-foreground">
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => navigate("/login")}
          >
            Acessar como administrador
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginMedico;
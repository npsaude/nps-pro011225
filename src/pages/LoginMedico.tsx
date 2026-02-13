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
  Stethoscope,
  ShieldCheck,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import {
  loginWithRole,
  registerUser,
  sendPasswordReset,
} from "@/services/auth-service";
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
    <div className="min-h-screen bg-[#0b0b0b] text-[#F5F5F5] relative overflow-hidden">
      <SubscriptionExpiredDialog
        open={subscriptionExpiredOpen}
        onOpenChange={setSubscriptionExpiredOpen}
      />

      {/* Overlay + glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-[#121212]/90 backdrop-blur-sm" />
      <div className="pointer-events-none absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(212,160,23,0.18)_0,transparent_62%)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(212,160,23,0.10)_0,transparent_60%)] blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-sm flex-col items-stretch justify-center px-4 py-10">
        {/* Marca */}
        <div className="mb-7 flex flex-col items-center">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] flex items-center justify-center shadow-[0_0_20px_rgba(212,160,23,0.4)]">
              <Stethoscope className="h-6 w-6 text-black" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] bg-clip-text text-transparent">
              CONMEDIC
            </span>
          </div>

          <div className="inline-flex items-center gap-2 bg-[#D4A017]/10 border border-[#D4A017]/30 text-[#D4A017] rounded-full px-4 py-1.5 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="font-medium">Acesso seguro · Portal Médico</span>
          </div>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl bg-[#1a1a1a]/95 border border-[#D4A017]/20 shadow-[0_0_40px_rgba(212,160,23,0.15)] backdrop-blur-xl px-5 py-6 sm:px-6">
          <div className="mb-6 space-y-1">
            <h1 className="bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] bg-clip-text text-transparent text-3xl font-bold leading-tight">
              Portal Médico
            </h1>
            <p className="text-xs text-[#9CA3AF]">
              Acesse seus envios, descrições cirúrgicas e indicadores.
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex rounded-2xl bg-black/40 p-1 text-xs font-semibold text-[#9CA3AF] ring-1 ring-[#D4A017]/15">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-xl px-3 py-2 transition-all duration-300 ${
                isLogin
                  ? "bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black shadow-[0_0_20px_rgba(212,160,23,0.35)]"
                  : "hover:text-[#F5F5F5]"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-xl px-3 py-2 transition-all duration-300 ${
                !isLogin
                  ? "bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black shadow-[0_0_20px_rgba(212,160,23,0.35)]"
                  : "hover:text-[#F5F5F5]"
              }`}
            >
              Criar conta
            </button>
          </div>

          {isLogin && (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F5F5F5]">
                  E-mail
                </label>
                <div className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 border border-[#D4A017]/20 focus-within:border-[#D4A017] focus-within:ring-2 focus-within:ring-[#D4A017]/20 transition-colors">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] text-black shadow-[0_0_18px_rgba(212,160,23,0.25)]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-[#F5F5F5] placeholder:text-[#6B7280] focus-visible:ring-0"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F5F5F5]">
                  Senha
                </label>
                <div className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 border border-[#D4A017]/20 focus-within:border-[#D4A017] focus-within:ring-2 focus-within:ring-[#D4A017]/20 transition-colors">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] text-black shadow-[0_0_18px_rgba(212,160,23,0.25)]">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type={loginPasswordVisible ? "text" : "password"}
                    placeholder="Digite sua senha"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-[#F5F5F5] placeholder:text-[#6B7280] focus-visible:ring-0"
                    value={loginSenha}
                    onChange={(e) => setLoginSenha(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLoginPasswordVisible((visible) => !visible)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/30 text-[#9CA3AF] hover:text-[#D4A017] hover:bg-[#D4A017]/10 transition-colors"
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
                  className="font-semibold text-[#D4A017] underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {resetLoading ? "Enviando..." : "Esqueci a senha"}
                </button>
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] hover:scale-[1.01] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70"
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
                <label className="block text-xs font-semibold text-[#F5F5F5]">
                  Nome Completo
                </label>
                <div className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 border border-[#D4A017]/20 focus-within:border-[#D4A017] focus-within:ring-2 focus-within:ring-[#D4A017]/20 transition-colors">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] text-black shadow-[0_0_18px_rgba(212,160,23,0.25)]">
                    <span className="text-[11px] font-bold">Dr</span>
                  </span>
                  <Input
                    type="text"
                    placeholder="Ex: Dr. Adriano"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-[#F5F5F5] placeholder:text-[#6B7280] focus-visible:ring-0"
                    value={registerNome}
                    onChange={(e) => setRegisterNome(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F5F5F5]">
                  CRM / UF
                </label>
                <div className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 border border-[#D4A017]/20 focus-within:border-[#D4A017] focus-within:ring-2 focus-within:ring-[#D4A017]/20 transition-colors">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] text-black shadow-[0_0_18px_rgba(212,160,23,0.25)]">
                    <Hash className="h-4 w-4" />
                  </span>
                  <Input
                    type="text"
                    placeholder="123456 / SP"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-[#F5F5F5] placeholder:text-[#6B7280] focus-visible:ring-0"
                    value={registerCrmUf}
                    onChange={(e) => setRegisterCrmUf(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F5F5F5]">
                  Telefone / WhatsApp
                </label>
                <div className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 border border-[#D4A017]/20 focus-within:border-[#D4A017] focus-within:ring-2 focus-within:ring-[#D4A017]/20 transition-colors">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] text-black shadow-[0_0_18px_rgba(212,160,23,0.25)]">
                    <Phone className="h-4 w-4" />
                  </span>
                  <Input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-[#F5F5F5] placeholder:text-[#6B7280] focus-visible:ring-0"
                    value={registerWhatsapp}
                    onChange={(e) => setRegisterWhatsapp(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F5F5F5]">
                  E-mail
                </label>
                <div className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 border border-[#D4A017]/20 focus-within:border-[#D4A017] focus-within:ring-2 focus-within:ring-[#D4A017]/20 transition-colors">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] text-black shadow-[0_0_18px_rgba(212,160,23,0.25)]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-[#F5F5F5] placeholder:text-[#6B7280] focus-visible:ring-0"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F5F5F5]">
                  Senha
                </label>
                <div className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 border border-[#D4A017]/20 focus-within:border-[#D4A017] focus-within:ring-2 focus-within:ring-[#D4A017]/20 transition-colors">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] text-black shadow-[0_0_18px_rgba(212,160,23,0.25)]">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type={registerPasswordVisible ? "text" : "password"}
                    placeholder="Crie uma senha segura"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-[#F5F5F5] placeholder:text-[#6B7280] focus-visible:ring-0"
                    value={registerSenha}
                    onChange={(e) => setRegisterSenha(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRegisterPasswordVisible((visible) => !visible)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/30 text-[#9CA3AF] hover:text-[#D4A017] hover:bg-[#D4A017]/10 transition-colors"
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
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] hover:scale-[1.01] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {registerLoading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-[11px] text-[#9CA3AF]">
          <button
            type="button"
            className="hover:text-[#D4A017] transition-colors"
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
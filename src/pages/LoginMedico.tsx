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

type Mode = "login" | "register";

const LoginMedico = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");

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

      // Por enquanto CRM/WhatsApp são apenas coletados na UI.
      void registerCrmUf;
      void registerWhatsapp;

      showSuccess(
        "Usuário médico criado. Verifique seu e-mail e confirme o cadastro antes do primeiro acesso.",
      );

      // Preenche o formulário de login com os dados recém-cadastrados
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

  const handleSocialLogin = async (
    provider: "google" | "apple" | "azure",
  ) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/medico/dashboard`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível iniciar o login social.";
      showError(message);
    }
  };

  // Login rápido de desenvolvimento: Ctrl + Shift + 2
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
      if (event.ctrlKey && event.shiftKey && event.key === "2") {
        event.preventDefault();
        void handleMedicoShortcutLogin();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#050B14] text-slate-50">
      {/* Fundo gradiente suave */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,#10B981_0,#050B14_60%),radial-gradient(circle_at_100%_100%,#1D4ED8_0,#020617_60%)] opacity-80" />

      <div className="relative z-10 flex w-full max-w-sm flex-col px-4 py-8 sm:py-10">
        {/* Título */}
        <div className="mb-7 flex flex-col items-center gap-1">
          <span className="text-lg font-semibold sm:text-xl">
            NP Saúde Pró
          </span>
          <span className="text-xs text-slate-300 sm:text-[13px]">
            Portal do Médico
          </span>
        </div>

        {/* Card principal */}
        <div className="w-full rounded-[32px] bg-[#0F172A] px-5 py-6 text-slate-50 shadow-[0_24px_80px_rgba(0,0,0,0.85)] ring-1 ring-emerald-500/15 sm:px-6 sm:py-7">
          {/* Tabs Entrar / Criar conta */}
          <div className="mb-6 flex rounded-2xl bg-slate-900/60 p-1 text-xs font-medium text-slate-200">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-xl px-3 py-2 transition ${
                isLogin
                  ? "bg-emerald-500 text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.7)]"
                  : "bg-transparent text-slate-300"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-xl px-3 py-2 transition ${
                !isLogin
                  ? "bg-emerald-500 text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.7)]"
                  : "bg-transparent text-slate-300"
              }`}
            >
              Criar conta
            </button>
          </div>

          {/* FORM LOGIN */}
          {isLogin && (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              {/* Campo e-mail */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-100">
                  E-mail
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-900/70 px-3 py-2 ring-1 ring-slate-700 focus-within:ring-emerald-500">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-300">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:ring-0"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Campo senha */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-100">
                  Senha
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-900/70 px-3 py-2 ring-1 ring-slate-700 focus-within:ring-emerald-500">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-300">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type={loginPasswordVisible ? "text" : "password"}
                    placeholder="Digite sua senha"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:ring-0"
                    value={loginSenha}
                    onChange={(e) => setLoginSenha(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLoginPasswordVisible((visible) => !visible)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-300 hover:text-slate-100"
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

              {/* Esqueci a senha */}
              <div className="flex justify-end pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="font-semibold text-emerald-400 underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {resetLoading ? "Enviando..." : "Esqueci a senha"}
                </button>
              </div>

              {/* Botão de login */}
              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(16,185,129,0.9)] hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <ArrowRightCircle className="h-4 w-4" />
                  <span>
                    {isLoading ? "Entrando..." : "Entrar como Médico"}
                  </span>
                </Button>
              </div>

              {/* Separador social */}
              <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-400">
                <div className="h-px flex-1 bg-slate-700" />
                <span>OU CONTINUE COM</span>
                <div className="h-px flex-1 bg-slate-700" />
              </div>

              {/* Botões sociais */}
              <div className="mt-3 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => handleSocialLogin("google")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-slate-50 ring-1 ring-slate-700 hover:bg-slate-800"
                  aria-label="Entrar com Google"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4">
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-1.9 3.1l3.1 2.4C20.7 18.3 22 15.6 22 12.5 22 11.7 21.9 11 21.8 10.2H12z"
                    />
                    <path
                      fill="#34A853"
                      d="M6.5 14.3l-.8.7-2.5 1.9C4.4 19.9 8 22 12 22c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 1-3.6 1-2.8 0-5.2-1.9-6.1-4.5z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M3.2 7.9C2.4 9.4 2 11.1 2 12.8c0 1.7.4 3.4 1.2 4.9l3.3-2.6C6.2 14.3 6 13.6 6 12.8c0-.7.1-1.4.4-2.1L3.2 7.9z"
                    />
                    <path
                      fill="#4285F4"
                      d="M12 6.1c1.5 0 2.8.5 3.9 1.6l2.9-2.9C17 2.9 14.7 2 12 2 8 2 4.4 4.1 3.2 7.9l3.2 2.8C7.8 8 9.2 6.1 12 6.1z"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin("apple")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white ring-1 ring-black/60 hover:bg-[#111111]"
                  aria-label="Entrar com Apple"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M16.365 2c-.978.067-2.14.692-2.828 1.508-.616.729-1.143 1.9-.999 3.01 1.077.083 2.192-.548 2.853-1.372.646-.81 1.111-1.945.974-3.146zM19.42 8.352c-1.553-.097-2.872.878-3.616.878-.762 0-1.927-.857-3.176-.833-1.634.024-3.144.948-3.978 2.415-1.697 2.94-.434 7.283 1.213 9.666.803 1.155 1.757 2.45 3.02 2.403 1.22-.048 1.676-.776 3.15-.776 1.457 0 1.875.776 3.15.748 1.305-.021 2.13-1.155 2.93-2.316.914-1.335 1.291-2.63 1.309-2.697-.027-.01-2.52-.967-2.547-3.842-.021-2.405 1.966-3.536 2.056-3.597-1.125-1.651-2.86-1.836-3.534-1.874z" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin("azure")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-slate-50 ring-1 ring-slate-700 hover:bg-slate-800"
                  aria-label="Entrar com Microsoft"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4">
                    <rect x="2" y="2" width="9" height="9" fill="#F35325" />
                    <rect x="13" y="2" width="9" height="9" fill="#81BC06" />
                    <rect x="2" y="13" width="9" height="9" fill="#05A6F0" />
                    <rect x="13" y="13" width="9" height="9" fill="#FFBA08" />
                  </svg>
                </button>
              </div>
            </form>
          )}

          {/* FORM CRIAÇÃO CONTA */}
          {!isLogin && (
            <form className="space-y-3.5" onSubmit={handleRegisterSubmit}>
              {/* Nome completo */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-100">
                  Nome Completo
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-900/70 px-3 py-2 ring-1 ring-slate-700 focus-within:ring-emerald-500">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-300">
                    {/* Ícone de usuário simples usando letra D como placeholder */}
                    <span className="text-[11px] font-semibold">Dr</span>
                  </span>
                  <Input
                    type="text"
                    placeholder="Ex: Dr. Adriano"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:ring-0"
                    value={registerNome}
                    onChange={(e) => setRegisterNome(e.target.value)}
                  />
                </div>
              </div>

              {/* CRM / UF */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-100">
                  CRM / UF
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-900/70 px-3 py-2 ring-1 ring-slate-700 focus-within:ring-emerald-500">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-300">
                    <Hash className="h-4 w-4" />
                  </span>
                  <Input
                    type="text"
                    placeholder="123456 / SP"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:ring-0"
                    value={registerCrmUf}
                    onChange={(e) => setRegisterCrmUf(e.target.value)}
                  />
                </div>
              </div>

              {/* Telefone / WhatsApp */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-100">
                  Telefone / WhatsApp
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-900/70 px-3 py-2 ring-1 ring-slate-700 focus-within:ring-emerald-500">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-300">
                    <Phone className="h-4 w-4" />
                  </span>
                  <Input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:ring-0"
                    value={registerWhatsapp}
                    onChange={(e) => setRegisterWhatsapp(e.target.value)}
                  />
                </div>
              </div>

              {/* E-mail */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-100">
                  E-mail
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-900/70 px-3 py-2 ring-1 ring-slate-700 focus-within:ring-emerald-500">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-300">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:ring-0"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-100">
                  Senha
                </label>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-900/70 px-3 py-2 ring-1 ring-slate-700 focus-within:ring-emerald-500">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-300">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type={registerPasswordVisible ? "text" : "password"}
                    placeholder="Crie uma senha segura"
                    className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:ring-0"
                    value={registerSenha}
                    onChange={(e) => setRegisterSenha(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRegisterPasswordVisible((visible) => !visible)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-300 hover:text-slate-100"
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

              {/* Botão Criar Conta */}
              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={registerLoading}
                  className="flex h-11 w-full items-center justify-center rounded-2xl bg-emerald-500 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(16,185,129,0.9)] hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {registerLoading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </div>

              {/* Separador social */}
              <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-400">
                <div className="h-px flex-1 bg-slate-700" />
                <span>OU CONTINUE COM</span>
                <div className="h-px flex-1 bg-slate-700" />
              </div>

              {/* Botões sociais */}
              <div className="mt-3 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => handleSocialLogin("google")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-slate-50 ring-1 ring-slate-700 hover:bg-slate-800"
                  aria-label="Criar conta com Google"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4">
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-1.9 3.1l3.1 2.4C20.7 18.3 22 15.6 22 12.5 22 11.7 21.9 11 21.8 10.2H12z"
                    />
                    <path
                      fill="#34A853"
                      d="M6.5 14.3l-.8.7-2.5 1.9C4.4 19.9 8 22 12 22c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 1-3.6 1-2.8 0-5.2-1.9-6.1-4.5z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M3.2 7.9C2.4 9.4 2 11.1 2 12.8c0 1.7.4 3.4 1.2 4.9l3.3-2.6C6.2 14.3 6 13.6 6 12.8c0-.7.1-1.4.4-2.1L3.2 7.9z"
                    />
                    <path
                      fill="#4285F4"
                      d="M12 6.1c1.5 0 2.8.5 3.9 1.6l2.9-2.9C17 2.9 14.7 2 12 2 8 2 4.4 4.1 3.2 7.9l3.2 2.8C7.8 8 9.2 6.1 12 6.1z"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin("apple")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white ring-1 ring-black/60 hover:bg-[#111111]"
                  aria-label="Criar conta com Apple"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M16.365 2c-.978.067-2.14.692-2.828 1.508-.616.729-1.143 1.9-.999 3.01 1.077.083 2.192-.548 2.853-1.372.646-.81 1.111-1.945.974-3.146zM19.42 8.352c-1.553-.097-2.872.878-3.616.878-.762 0-1.927-.857-3.176-.833-1.634.024-3.144.948-3.978 2.415-1.697 2.94-.434 7.283 1.213 9.666.803 1.155 1.757 2.45 3.02 2.403 1.22-.048 1.676-.776 3.15-.776 1.457 0 1.875.776 3.15.748 1.305-.021 2.13-1.155 2.93-2.316.914-1.335 1.291-2.63 1.309-2.697-.027-.01-2.52-.967-2.547-3.842-.021-2.405 1.966-3.536 2.056-3.597-1.125-1.651-2.86-1.836-3.534-1.874z" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin("azure")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-slate-50 ring-1 ring-slate-700 hover:bg-slate-800"
                  aria-label="Criar conta com Microsoft"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4">
                    <rect x="2" y="2" width="9" height="9" fill="#F35325" />
                    <rect x="13" y="2" width="9" height="9" fill="#81BC06" />
                    <rect x="2" y="13" width="9" height="9" fill="#05A6F0" />
                    <rect x="13" y="13" width="9" height="9" fill="#FFBA08" />
                  </svg>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Link opcional para admin, fora do card */}
        <div className="mt-5 text-center text-[11px] text-slate-400">
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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRightCircle } from "lucide-react";

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
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Register state
  const [registerNome, setRegisterNome] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerSenha, setRegisterSenha] = useState("");
  const [registerSenhaConfirm, setRegisterSenhaConfirm] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !senha) {
      showError("Informe e-mail e senha para acessar.");
      return;
    }

    setIsLoading(true);
    try {
      await loginWithRole({
        email: email.trim(),
        password: senha,
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
    if (registerSenha !== registerSenhaConfirm) {
      showError("As senhas não conferem.");
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

      showSuccess(
        "Usuário médico criado. Verifique seu e-mail e confirme o cadastro antes do primeiro acesso.",
      );

      // Preenche o formulário de login com os dados recém-cadastrados
      setEmail(registerEmail.trim());
      setSenha(registerSenha);
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
    if (!email.trim()) {
      showError("Informe o e-mail no campo de login para recuperar a senha.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordReset(email.trim());
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

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#0F2A43] text-slate-50">
      {/* Fundo escuro usando Azul Carbônico + Obsidiano */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0F2A43] via-[#1D4E77] to-[#2B2F33]" />

      <div className="relative z-10 flex w-full max-w-sm flex-col px-4 py-8">
        {/* Logo / título */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F8A70] shadow-sm shadow-[#1F8A70]/50">
            <img
              src="/logo.jpeg"
              alt="Logo NP Saúde Pró"
              className="h-9 w-9 rounded-xl object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-50">
              NP Saúde Pró
            </span>
            <span className="text-[11px] text-slate-300">
              Portal do Médico
            </span>
          </div>
        </div>

        {/* Card principal mais escuro */}
        <div className="w-full rounded-3xl bg-[#1D4E77]/95 px-6 py-6 shadow-lg shadow-black/30 ring-1 ring-[#D9DEE3]/20 backdrop-blur-sm sm:px-7 sm:py-7">
          {/* Aba de modo: login x cadastro */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-50">
                {mode === "login"
                  ? "Acesse suas SADTs"
                  : "Crie seu acesso médico"}
              </h1>
              <p className="mt-1 text-xs text-slate-200/80">
                {mode === "login"
                  ? "Entre com seu e-mail e senha cadastrados."
                  : "Cadastro vinculado à tabela de usuários do sistema."}
              </p>
            </div>
          </div>

          <div className="mb-4 flex rounded-full bg-[#0F2A43]/50 p-1 text-xs font-medium text-slate-200">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full px-3 py-2 transition ${
                mode === "login"
                  ? "bg-[#F5F7F9] text-[#0F2A43] shadow-sm"
                  : "bg-transparent text-slate-200"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-full px-3 py-2 transition ${
                mode === "register"
                  ? "bg-[#F5F7F9] text-[#0F2A43] shadow-sm"
                  : "bg-transparent text-slate-200"
              }`}
            >
              Criar conta
            </button>
          </div>

          {/* Formulário de login */}
          {mode === "login" && (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F5F7F9]">
                  E-mail
                </label>
                <div className="flex items-center rounded-xl bg-[#0F2A43]/40 ring-1 ring-[#D9DEE3]/40 focus-within:ring-2 focus-within:ring-[#1F8A70]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-[#D9DEE3]/30 text-[#D9DEE3]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    className="h-11 border-none bg-transparent text-sm text-slate-50 placeholder:text-[#D9DEE3] focus-visible:ring-0"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F5F7F9]">
                  Senha
                </label>
                <div className="flex items-center rounded-xl bg-[#0F2A43]/40 ring-1 ring-[#D9DEE3]/40 focus-within:ring-2 focus-within:ring-[#1F8A70]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-[#D9DEE3]/30 text-[#D9DEE3]">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type="password"
                    placeholder="Digite sua senha"
                    className="h-11 border-none bg-transparent text-sm text-slate-50 placeholder:text-[#D9DEE3] focus-visible:ring-0"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-[#F5F7F9]/80">
                <span>Médico vinculado à tabela de usuários do sistema.</span>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="font-semibold text-[#E6EEF7] underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {resetLoading ? "Enviando..." : "Esqueci a senha"}
                </button>
              </div>

              <div className="pt-1.5">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1F8A70] text-sm font-semibold text-white shadow-md shadow-black/40 transition-transform hover:translate-y-0.5 hover:bg-[#166854] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <ArrowRightCircle className="h-4 w-4" />
                  <span>{isLoading ? "Entrando..." : "Entrar como médico"}</span>
                </Button>
              </div>
            </form>
          )}

          {/* Formulário de cadastro */}
          {mode === "register" && (
            <form className="space-y-3.5" onSubmit={handleRegisterSubmit}>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F5F7F9]">
                  Nome completo
                </label>
                <Input
                  type="text"
                  placeholder="Digite seu nome"
                  className="h-10 rounded-xl border border-[#D9DEE3]/40 bg-[#0F2A43]/40 text-sm text-slate-50 placeholder:text-[#D9DEE3] focus-visible:ring-2 focus-visible:ring-[#1F8A70]"
                  value={registerNome}
                  onChange={(e) => setRegisterNome(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F5F7F9]">
                  E-mail
                </label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  className="h-10 rounded-xl border border-[#D9DEE3]/40 bg-[#0F2A43]/40 text-sm text-slate-50 placeholder:text-[#D9DEE3] focus-visible:ring-2 focus-visible:ring-[#1F8A70]"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#F5F7F9]">
                    Senha
                  </label>
                  <Input
                    type="password"
                    className="h-10 rounded-xl border border-[#D9DEE3]/40 bg-[#0F2A43]/40 text-sm text-slate-50 placeholder:text-[#D9DEE3] focus-visible:ring-2 focus-visible:ring-[#1F8A70]"
                    value={registerSenha}
                    onChange={(e) => setRegisterSenha(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#F5F7F9]">
                    Confirmar senha
                  </label>
                  <Input
                    type="password"
                    className="h-10 rounded-xl border border-[#D9DEE3]/40 bg-[#0F2A43]/40 text-sm text-slate-50 placeholder:text-[#D9DEE3] focus-visible:ring-2 focus-visible:ring-[#1F8A70]"
                    value={registerSenhaConfirm}
                    onChange={(e) => setRegisterSenhaConfirm(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={registerLoading}
                  className="h-10 w-full rounded-full bg-[#1F8A70] text-xs font-semibold text-white shadow-md shadow-black/40 hover:bg-[#166854] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {registerLoading ? "Criando conta..." : "Criar usuário médico"}
                </Button>
              </div>
            </form>
          )}

          {/* Separador social */}
          <div className="mt-6 flex items-center gap-3 text-[11px] text-[#E6EEF7]/80">
            <div className="h-px flex-1 bg-[#D9DEE3]/30" />
            <span>ou continue com</span>
            <div className="h-px flex-1 bg-[#D9DEE3]/30" />
          </div>

          <div className="mt-4 flex items-center justify-center gap-4">
            {/* Google */}
            <button
              type="button"
              onClick={() => handleSocialLogin("google")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F7F9] shadow-sm ring-1 ring-[#D9DEE3]/70 hover:bg-[#E6EEF7]"
              aria-label="Entrar com Google"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5">
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

            {/* Apple */}
            <button
              type="button"
              onClick={() => handleSocialLogin("apple")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-sm ring-1 ring-black/60 hover:bg-[#111111]"
              aria-label="Entrar com Apple"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M16.365 2c-.978.067-2.14.692-2.828 1.508-.616.729-1.143 1.9-.999 3.01 1.077.083 2.192-.548 2.853-1.372.646-.81 1.111-1.945.974-3.146zM19.42 8.352c-1.553-.097-2.872.878-3.616.878-.762 0-1.927-.857-3.176-.833-1.634.024-3.144.948-3.978 2.415-1.697 2.94-.434 7.283 1.213 9.666.803 1.155 1.757 2.45 3.02 2.403 1.22-.048 1.676-.776 3.15-.776 1.457 0 1.875.776 3.15.748 1.305-.021 2.13-1.155 2.93-2.316.914-1.335 1.291-2.63 1.309-2.697-.027-.01-2.52-.967-2.547-3.842-.021-2.405 1.966-3.536 2.056-3.597-1.125-1.651-2.86-1.836-3.534-1.874z" />
              </svg>
            </button>

            {/* Microsoft */}
            <button
              type="button"
              onClick={() => handleSocialLogin("azure")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F7F9] shadow-sm ring-1 ring-[#D9DEE3]/70 hover:bg-[#E6EEF7]"
              aria-label="Entrar com Microsoft"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <rect x="2" y="2" width="9" height="9" fill="#F35325" />
                <rect x="13" y="2" width="9" height="9" fill="#81BC06" />
                <rect x="2" y="13" width="9" height="9" fill="#05A6F0" />
                <rect x="13" y="13" width="9" height="9" fill="#FFBA08" />
              </svg>
            </button>
          </div>

          <div className="mt-5 text-center text-[11px] text-[#E6EEF7]/80">
            <p>
              Em caso de dúvidas sobre seu acesso, entre em contato com a
              coordenação da clínica.
            </p>
            <button
              type="button"
              className="mt-2 font-medium text-[#E6EEF7] underline-offset-2 hover:underline"
              onClick={() => navigate("/login")}
            >
              Sou administrador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginMedico;
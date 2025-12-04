import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRightCircle,
  Stethoscope,
  UserPlus,
  ArrowLeft,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { showError, showSuccess } from "@/utils/toast";
import {
  loginWithRole,
  registerUser,
  sendPasswordReset,
} from "@/services/auth-service";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [showRegister, setShowRegister] = useState(false);
  const [registerNome, setRegisterNome] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerSenha, setRegisterSenha] = useState("");
  const [registerSenhaConfirm, setRegisterSenhaConfirm] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
        allowedRole: "ADMIN",
      });

      showSuccess("Login realizado com sucesso.");
      navigate("/admin/dashboard");
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

  const handleCreateAccount = async (
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
        role: "ADMIN",
      });

      showSuccess(
        "Usuário administrador criado. Verifique seu e-mail e confirme o cadastro antes do primeiro acesso.",
      );
      setEmail(registerEmail.trim());
      setSenha(registerSenha);
      setShowRegister(false);
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

  // Login rápido de desenvolvimento: Ctrl + Shift + 2
  const handleAdminShortcutLogin = async () => {
    if (isLoading) return;

    const shortcutEmail = "newpersonsaude@gmail.com";
    const shortcutSenha = "123456";

    setEmail(shortcutEmail);
    setSenha(shortcutSenha);
    setIsLoading(true);

    try {
      await loginWithRole({
        email: shortcutEmail,
        password: shortcutSenha,
        allowedRole: "ADMIN",
      });

      showSuccess("Login rápido (admin) realizado com sucesso.");
      navigate("/admin/dashboard");
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
        void handleAdminShortcutLogin();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_0%_0%,rgba(31,138,112,0.75)_0,rgba(6,78,59,0.95)_55%),radial-gradient(circle_at_100%_100%,rgba(34,197,94,0.6)_0,rgba(6,78,59,0.95)_55%)] text-slate-900">
      {/* leve overlay para 60% de opacidade do verde cirúrgico premium */}
      <div className="pointer-events-none absolute inset-0 bg-emerald-900/10" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-4 py-8 sm:py-10">
        {/* Logo / marca */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-[#0F2A43] shadow-[0_12px_30px_rgba(15,23,42,0.45)]">
            <img
              src="/logo.jpeg"
              alt="Logo NP Saúde Pró"
              className="h-10 w-10 rounded-2xl object-cover"
            />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-white">
              NP Saúde Pró
            </span>
            <span className="text-[11px] font-medium tracking-[0.22em] text-white/80">
              ACESSO ADMINISTRATIVO
            </span>
          </div>
        </div>

        {/* Card principal (login ou cadastro) */}
        <div className="w-full rounded-[32px] bg-white/95 px-6 py-7 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.30)] ring-1 ring-emerald-50 backdrop-blur-md sm:px-8 sm:py-8">
          {/* Header dinâmico */}
          {showRegister ? (
            <div className="mb-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voltar ao login</span>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  Criar conta
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  Solicite seu acesso administrativo.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-5">
              <h1 className="text-2xl font-semibold text-slate-900">Entrar</h1>
              <p className="mt-1 text-sm text-slate-500">
                Bem-vindo de volta ao portal administrativo.
              </p>
            </div>
          )}

          {/* Separador OU CONTINUE COM + botões sociais (decorativos) */}
          <div className="mb-5">
            <div className="mb-4 flex items-center gap-3 text-[11px] text-slate-300">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="whitespace-nowrap tracking-[0.22em]">
                OU CONTINUE COM
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {/* Google */}
              <button
                type="button"
                aria-label="Continuar com Google"
                className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="h-5 w-5"
                />
              </button>

              {/* Apple */}
              <button
                type="button"
                aria-label="Continuar com Apple"
                className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
                  alt="Apple"
                  className="h-5 w-5"
                />
              </button>

              {/* Microsoft */}
              <button
                type="button"
                aria-label="Continuar com Microsoft"
                className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
                  alt="Microsoft"
                  className="h-5 w-5"
                />
              </button>
            </div>
          </div>

          {/* Formulário principal: login ou cadastro */}
          {!showRegister ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* E-mail */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">
                  E-mail
                </label>
                <div className="flex items-center rounded-xl bg-slate-50 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-[#0F2A43]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-slate-200 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    className="h-11 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-0"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-600">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="text-[11px] font-medium text-slate-400 hover:text-[#0F2A43]"
                  >
                    {resetLoading ? "Enviando..." : "Esqueceu a senha?"}
                  </button>
                </div>
                <div className="flex items-center rounded-xl bg-slate-50 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-[#0F2A43]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-slate-200 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type="password"
                    placeholder="Sua senha"
                    className="h-11 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-0"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
              </div>

              {/* Lembrar acesso */}
              <div className="flex items-center gap-2 pt-1">
                <Checkbox className="h-3.5 w-3.5" />
                <span className="text-xs text-slate-500">Lembrar acesso</span>
              </div>

              {/* Botão entrar */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0F2A43] text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,42,67,0.55)] transition-transform hover:translate-y-0.5 hover:bg-[#123557] disabled:cursor-not-allowed disabled:opacity-75"
                >
                  <span>{isLoading ? "Acessando..." : "Acessar conta"}</span>
                  <ArrowRightCircle className="h-4 w-4" />
                </Button>
              </div>

              {/* Link para cadastro */}
              <p className="pt-1 text-center text-xs text-slate-500">
                Não tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => setShowRegister(true)}
                  className="font-semibold text-[#0F2A43] hover:underline"
                >
                  Cadastre-se
                </button>
              </p>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleCreateAccount}>
              {/* Nome completo */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">
                  Nome completo
                </label>
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={registerNome}
                  onChange={(e) => setRegisterNome(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#0F2A43]"
                />
              </div>

              {/* E-mail */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">
                  E-mail
                </label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#0F2A43]"
                />
              </div>

              {/* Senha / confirmar */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">
                    Senha
                  </label>
                  <Input
                    type="password"
                    placeholder="Mín. 6 caracteres"
                    value={registerSenha}
                    onChange={(e) => setRegisterSenha(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#0F2A43]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">
                    Confirmar
                  </label>
                  <Input
                    type="password"
                    placeholder="Repita a senha"
                    value={registerSenhaConfirm}
                    onChange={(e) =>
                      setRegisterSenhaConfirm(e.target.value)
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#0F2A43]"
                  />
                </div>
              </div>

              {/* Botão criar conta */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={registerLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0F2A43] text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,42,67,0.55)] transition-transform hover:translate-y-0.5 hover:bg-[#123557] disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {registerLoading ? "Criando conta..." : "Criar conta"}
                </Button>
              </div>

              {/* Termos / voltar login */}
              <p className="text-[11px] leading-snug text-slate-400">
                Ao se cadastrar, você concorda com nossos Termos de Serviço e
                Política de Privacidade.
              </p>
            </form>
          )}
        </div>

        {/* Acesso médico e rodapé de links */}
        <div className="mt-4 flex w-full max-w-md flex-col items-center gap-4">
          <div className="text-center text-xs text-slate-900/80">
            <p className="mb-2">
              Você é médico e deseja acompanhar suas cirurgias?
            </p>
            <Button
              type="button"
              variant="outline"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border-white/60 bg-emerald-50/80 px-4 text-[11px] font-semibold text-[#0F2A43] shadow-sm hover:bg-emerald-100/90"
              onClick={() => navigate("/login-medico")}
            >
              <Stethoscope className="h-4 w-4" />
              <span>Acessar como médico</span>
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-center gap-6 text-[11px] text-emerald-50/90">
            <button type="button" className="hover:underline">
              Privacidade
            </button>
            <button type="button" className="hover:underline">
              Termos
            </button>
            <button type="button" className="hover:underline">
              Ajuda
            </button>
          </div>

          <p className="text-[10px] text-emerald-50/90">
            © 2025 NP Saúde Pró. Plataforma segura.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
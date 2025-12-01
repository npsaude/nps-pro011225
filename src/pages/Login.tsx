import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRightCircle, Stethoscope, UserPlus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { showError, showSuccess } from "@/utils/toast";
import { loginWithRole, registerUser, sendPasswordReset } from "@/services/auth-service";

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

      showSuccess("Usuário administrador criado com sucesso.");
      setShowRegister(false);
      setRegisterNome("");
      setRegisterEmail("");
      setRegisterSenha("");
      setRegisterSenhaConfirm("");

      // Preenche o formulário principal com o novo usuário
      setEmail(registerEmail.trim());
      setSenha(registerSenha);
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
        "Simulamos o envio de instruções de redefinição de senha. Use a tela de redefinição após autenticar.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível simular o envio de recuperação.";
      showError(message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#f4f7ff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Fundo com gradiente suave, mais clean */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#e5f0ff] via-[#f8fbff] to-[#e3eeff] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-4 py-8 sm:py-10">
        {/* Logo / título */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#135bec] shadow-sm shadow-blue-500/30">
            <img
              src="/logo.jpeg"
              alt="Logo NP Saúde Pró"
              className="h-9 w-9 rounded-xl object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              NP Saúde Pró
            </span>
            <span className="text-[11px] text-slate-500">
              Acesso à área administrativa
            </span>
          </div>
        </div>

        {/* Card de login mais clean */}
        <div className="w-full rounded-2xl bg-white/90 px-6 py-6 text-slate-900 shadow-sm ring-1 ring-slate-100/80 backdrop-blur-sm dark:bg-slate-900/95 dark:ring-slate-800 sm:px-7 sm:py-7">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
            ADMINISTRADOR
          </p>
          <h1 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">
            Faça login para continuar
          </h1>
          <p className="mb-5 text-xs text-slate-500 sm:text-sm">
            Use seu e-mail e senha cadastrados para acessar o painel
            administrativo da clínica.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Campo usuário/e-mail */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">
                Usuário ou e-mail
              </label>
              <div className="flex items-center rounded-xl bg-slate-50 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-[#135bec]/70 dark:bg-slate-900 dark:ring-slate-700">
                <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-300">
                  <Mail className="h-4 w-4" />
                </span>
                <Input
                  type="email"
                  placeholder="Insira seu usuário ou e-mail"
                  className="h-11 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 dark:text-slate-50 dark:placeholder:text-slate-500"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Campo senha */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">
                Senha
              </label>
              <div className="flex items-center rounded-xl bg-slate-50 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-[#135bec]/70 dark:bg-slate-900 dark:ring-slate-700">
                <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-300">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  type="password"
                  placeholder="Insira sua senha"
                  className="h-11 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 dark:text-slate-50 dark:placeholder:text-slate-500"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
            </div>

            {/* Lembrar / Esqueceu senha */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <Checkbox className="h-3.5 w-3.5" />
                <span>Lembrar de mim</span>
              </label>
              <button
                type="button"
                className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-[#135bec] hover:underline"
                onClick={handleForgotPassword}
                disabled={resetLoading}
              >
                {resetLoading ? "Enviando..." : "Esqueceu a senha?"}
              </button>
            </div>

            {/* Botão de login admin */}
            <div className="pt-2 flex flex-col gap-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#135bec] text-sm font-semibold text-white shadow-sm shadow-blue-500/40 transition-transform hover:translate-y-0.5 hover:bg-[#135bec]/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <ArrowRightCircle className="h-4 w-4" />
                <span>
                  {isLoading ? "Entrando..." : "Entrar como administrador"}
                </span>
              </Button>

              <button
                type="button"
                onClick={() => setShowRegister((prev) => !prev)}
                className="inline-flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-[#135bec] hover:underline"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>
                  {showRegister
                    ? "Fechar criação de usuário"
                    : "Criar novo usuário administrador"}
                </span>
              </button>
            </div>
          </form>

          {/* Bloco de criação de usuário admin */}
          {showRegister && (
            <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-xs ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
              <p className="mb-2 text-[11px] font-semibold text-slate-600 dark:text-slate-200">
                Criar novo usuário administrador
              </p>
              <form className="space-y-2.5" onSubmit={handleCreateAccount}>
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-600 dark:text-slate-300">
                    Nome completo
                  </label>
                  <Input
                    type="text"
                    value={registerNome}
                    onChange={(e) => setRegisterNome(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Digite o nome"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-600 dark:text-slate-300">
                    E-mail
                  </label>
                  <Input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300">
                      Senha
                    </label>
                    <Input
                      type="password"
                      value={registerSenha}
                      onChange={(e) => setRegisterSenha(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] text-slate-600 dark:text-slate-300">
                      Confirmar senha
                    </label>
                    <Input
                      type="password"
                      value={registerSenhaConfirm}
                      onChange={(e) =>
                        setRegisterSenhaConfirm(e.target.value)
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={registerLoading}
                    className="h-8 w-full rounded-full bg-slate-900 text-[11px] font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {registerLoading ? "Criando..." : "Criar administrador"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Separador e link para médico */}
          <div className="mt-5 border-t border-slate-100 pt-4 text-center text-xs text-slate-400 dark:border-slate-800">
            <p className="mb-2">Você é médico e deseja acessar suas SADTs?</p>
            <Button
              type="button"
              variant="outline"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border-[#0f766e]/25 bg-teal-50/80 px-4 text-xs font-semibold text-[#0f766e] shadow-sm hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-200"
              onClick={() => navigate("/login-medico")}
            >
              <Stethoscope className="h-4 w-4" />
              <span>Acessar como médico</span>
            </Button>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          Acesso exclusivo para administradores autorizados da NP Saúde Pró.
        </p>
      </div>
    </div>
  );
};

export default Login;
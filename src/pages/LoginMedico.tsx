import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRightCircle,
  Stethoscope,
  HeartPulse,
  UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import {
  loginWithRole,
  registerUser,
  sendPasswordReset,
} from "@/services/auth-service";

const LoginMedico = () => {
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
        role: "MEDICO",
      });

      showSuccess(
        "Usuário médico criado. Verifique seu e-mail e confirme o cadastro antes do primeiro acesso.",
      );
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

  return (
    <div className="relative flex min-h-screen w-full items-stretch bg-slate-950 text-slate-50">
      {/* Fundo médico em gradiente, mobile-first */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,#0f766e_0,#020617_55%),radial-gradient(circle_at_100%_100%,#22c55e_0,#020617_50%)] opacity-90" />

      <div className="flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Topo: logo e voltar */}
        <header className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-3 rounded-2xl bg-slate-900/70 px-3 py-2 text-xs shadow-sm ring-1 ring-emerald-500/30 backdrop-blur"
            onClick={() => navigate("/")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 shadow-md shadow-emerald-400/40">
              <img
                src="/logo.jpeg"
                alt="Logo NP Saúde Pró"
                className="h-7 w-7 rounded-lg object-cover"
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-50">
                NP Saúde Pró
              </span>
              <span className="text-[11px] text-emerald-200">
                Portal do Médico
              </span>
            </div>
          </button>

          <div className="hidden text-right text-[11px] text-emerald-100/80 sm:block">
            <p className="font-medium">Suporte ao médico</p>
            <p>(00) 0000-0000</p>
          </div>
        </header>

        {/* Conteúdo principal - mobile first */}
        <main className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Coluna: formulário */}
          <section className="w-full max-w-md rounded-3xl bg-slate-950/80 px-5 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.75)] ring-1 ring-emerald-500/25 backdrop-blur-md sm:px-6 sm:py-7">
            <div className="mb-5 space-y-1">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Acesso do Médico
              </p>
              <h1 className="text-xl font-semibold leading-tight text-slate-50 sm:text-2xl">
                Entre para acompanhar suas SADTs.
              </h1>
              <p className="text-xs text-emerald-100/80 sm:text-sm">
                Acesse com seu e-mail e senha cadastrados e acompanhe o status de
                envio, faturamento e glosas dos seus atendimentos.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* E-mail */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-emerald-100/90">
                  E-mail
                </label>
                <div className="flex items-center rounded-xl bg-slate-900/70 ring-1 ring-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-400">
                  <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-emerald-500/30 text-emerald-300">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    className="h-11 border-none bg-transparent text-sm text-slate-50 placeholder:text-emerald-300/60 focus-visible:ring-0"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-emerald-100/90">
                  Senha
                </label>
                <div className="flex items-center rounded-xl bg-slate-900/70 ring-1 ring-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-400">
                  <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-emerald-500/30 text-emerald-300">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type="password"
                    placeholder="Digite sua senha"
                    className="h-11 border-none bg-transparent text-sm text-slate-50 placeholder:text-emerald-300/60 focus-visible:ring-0"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-100/80">
                <p>Médico vinculado à tabela de usuários do sistema.</p>
                <button
                  type="button"
                  className="font-semibold text-emerald-300 underline-offset-2 hover:underline"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? "Enviando..." : "Esqueci a senha"}
                </button>
              </div>

              {/* Botão login médico */}
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 transition-transform hover:translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <ArrowRightCircle className="h-4 w-4" />
                  <span>
                    {isLoading ? "Entrando..." : "Entrar como médico"}
                  </span>
                </Button>

                <button
                  type="button"
                  onClick={() => setShowRegister((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-200 underline-offset-2 hover:text-emerald-100 hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>
                    {showRegister
                      ? "Fechar criação de usuário"
                      : "Criar novo usuário médico"}
                  </span>
                </button>
              </div>
            </form>

            {/* Bloco de criação de usuário médico */}
            {showRegister && (
              <div className="mt-4 rounded-xl bg-slate-950/70 px-3 py-3 text-xs ring-1 ring-emerald-500/40">
                <p className="mb-2 text-[11px] font-semibold text-emerald-100">
                  Criar novo usuário médico
                </p>
                <form className="space-y-2.5" onSubmit={handleCreateAccount}>
                  <div className="space-y-1">
                    <label className="block text-[11px] text-emerald-100/90">
                      Nome completo
                    </label>
                    <Input
                      type="text"
                      value={registerNome}
                      onChange={(e) => setRegisterNome(e.target.value)}
                      className="h-8 border-emerald-500/30 bg-slate-950/80 text-xs text-slate-50"
                      placeholder="Digite o nome"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] text-emerald-100/90">
                      E-mail
                    </label>
                    <Input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="h-8 border-emerald-500/30 bg-slate-950/80 text-xs text-slate-50"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[11px] text-emerald-100/90">
                        Senha
                      </label>
                      <Input
                        type="password"
                        value={registerSenha}
                        onChange={(e) => setRegisterSenha(e.target.value)}
                        className="h-8 border-emerald-500/30 bg-slate-950/80 text-xs text-slate-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] text-emerald-100/90">
                        Confirmar senha
                      </label>
                      <Input
                        type="password"
                        value={registerSenhaConfirm}
                        onChange={(e) =>
                          setRegisterSenhaConfirm(e.target.value)
                        }
                        className="h-8 border-emerald-500/30 bg-slate-950/80 text-xs text-slate-50"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <Button
                      type="submit"
                      disabled={registerLoading}
                      className="h-8 w-full rounded-full bg-emerald-500 text-[11px] font-semibold text-white hover:bg-emerald-400"
                    >
                      {registerLoading ? "Criando..." : "Criar médico"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Rodapé pequeno */}
            <p className="mt-4 text-[11px] text-emerald-100/80">
              Em caso de dúvidas sobre seu acesso, entre em contato com a
              coordenação da clínica.
            </p>

            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 text-[11px] text-emerald-200/90 underline-offset-2 hover:underline"
              onClick={() => navigate("/login")}
            >
              <span>Sou administrador</span>
            </button>
          </section>

          {/* Coluna lateral */}
          <section className="mt-6 flex flex-1 flex-col items-center justify-center gap-5 text-center lg:mt-0 lg:items-end lg:text-right">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/20 ring-2 ring-emerald-400/40">
              <HeartPulse className="h-9 w-9 text-emerald-300" />
            </div>
            <div className="max-w-sm space-y-2">
              <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">
                Pensado para o dia a dia do médico.
              </h2>
              <p className="text-xs text-emerald-100/85 sm:text-sm">
                Centralize o acompanhamento das suas SADTs, visualize status de
                faturamento e organize seu fluxo com mais segurança e
                transparência.
              </p>
            </div>
            <ul className="mt-1 space-y-1.5 text-left text-xs text-emerald-100/90 sm:text-sm lg:text-right">
              <li>• Acesso seguro, vinculado ao seu cadastro de usuário.</li>
              <li>
                • Visualização rápida de SADTs em análise, pagas ou com glosa.
              </li>
              <li>
                • Ambiente preparado para integração com prontuário e
                faturamento.
              </li>
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
};

export default LoginMedico;
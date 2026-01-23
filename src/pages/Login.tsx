import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRightCircle,
  Stethoscope,
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
import SubscriptionExpiredDialog from "@/components/auth/SubscriptionExpiredDialog";
import { SUBSCRIPTION_EXPIRED_CODE } from "@/services/subscription-validity-service";

const LOGO_URL =
  "https://pokyribuibmbeorrcsgk.supabase.co/storage/v1/object/sign/NPS-pro/site/logo-conmagic-favicon.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZDc4YzM5NC1hMTFlLTQ3MTEtYTVmNi1lMjU4ZGU4MGRiYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJOUFMtcHJvL3NpdGUvbG9nby1jb25tYWdpYy1mYXZpY29uLnBuZyIsImlhdCI6MTc2OTE4NTA3OSwiZXhwIjoxNzcwMDQ5MDc5fQ.jSiOZo0BFqGup9t3gAzfohZbOwBKpvHRUCGrb_1Fbeg";

const YOUTUBE_VIDEO_ID = "5w1NdK6GtEE";
const YOUTUBE_EMBED_URL = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&controls=0&loop=1&playlist=${YOUTUBE_VIDEO_ID}&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3`;

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [subscriptionExpiredOpen, setSubscriptionExpiredOpen] = useState(false);

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
      const result = await loginWithRole({
        email: email.trim(),
        password: senha,
        allowedRole: "ADMIN",
      });

      showSuccess("Login realizado com sucesso.");

      if (result.role === "SUPER_ADMIN") {
        navigate("/admin/assinaturas/dashboard");
      } else {
        navigate("/admin/dashboard");
      }
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

  const handleAdminShortcutLogin = async () => {
    if (isLoading) return;

    const shortcutEmail = "newpersonsaude@gmail.com";
    const shortcutSenha = "123456";

    setEmail(shortcutEmail);
    setSenha(shortcutSenha);
    setIsLoading(true);

    try {
      const result = await loginWithRole({
        email: shortcutEmail,
        password: shortcutSenha,
        allowedRole: "ADMIN",
      });

      showSuccess("Login rápido (admin) realizado com sucesso.");

      // Redireciona conforme o role do usuário
      if (result.role === "SUPER_ADMIN") {
        navigate("/admin/assinaturas/dashboard");
      } else if (result.role === "MEDICO") {
        navigate("/medico/dashboard");
      } else {
        navigate("/admin/dashboard");
      }
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
        void handleAdminShortcutLogin();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background text-foreground">
      <SubscriptionExpiredDialog
        open={subscriptionExpiredOpen}
        onOpenChange={setSubscriptionExpiredOpen}
      />

      {/* Background video */}
      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <iframe
          className="absolute left-1/2 top-1/2 h-[56.25vw] w-[177.78vh] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2"
          src={YOUTUBE_EMBED_URL}
          title="CONMEDIC background"
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      </div>

      {/* Overlay for readability (keeps the new design feel) */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/55" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(254,230,122,0.18)_0,rgba(0,0,0,0.9)_55%),radial-gradient(circle_at_100%_100%,rgba(212,160,23,0.10)_0,rgba(0,0,0,0.9)_55%)]" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-4 py-8 sm:py-10">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-card shadow-[0_12px_30px_rgba(0,0,0,0.55)] ring-1 ring-border">
            <img
              src={LOGO_URL}
              alt="Logo CONMEDIC"
              className="h-10 w-10 rounded-2xl object-contain"
            />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-foreground">
              CONMEDIC
            </span>
            <span className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground">
              ACESSO ADMINISTRATIVO
            </span>
          </div>
        </div>

        <div className="w-full rounded-[32px] bg-card px-6 py-7 text-card-foreground shadow-[0_24px_70px_rgba(0,0,0,0.45)] ring-1 ring-border backdrop-blur-md sm:px-8 sm:py-8">
          {showRegister ? (
            <div className="mb-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voltar ao login</span>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Criar conta
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  Solicite seu acesso administrativo.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-5">
              <h1 className="text-2xl font-semibold text-foreground">Entrar</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Bem-vindo de volta ao portal administrativo.
              </p>
            </div>
          )}

          {!showRegister ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">
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
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    {resetLoading ? "Enviando..." : "Esqueceu a senha?"}
                  </button>
                </div>
                <div className="flex items-center rounded-xl bg-background ring-1 ring-border focus-within:ring-2 focus-within:ring-ring">
                  <span className="flex h-11 w-11 items-center justify-center rounded-l-xl border-r border-border text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    type="password"
                    placeholder="Sua senha"
                    className="h-11 border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox className="h-3.5 w-3.5" />
                <span className="text-xs text-muted-foreground">
                  Lembrar acesso
                </span>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground shadow-[0_14px_30px_rgba(0,0,0,0.35)] transition-transform hover:translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-75"
                >
                  <span>{isLoading ? "Acessando..." : "Acessar conta"}</span>
                  <ArrowRightCircle className="h-4 w-4" />
                </Button>
              </div>

              <p className="pt-1 text-center text-xs text-muted-foreground">
                Não tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => setShowRegister(true)}
                  className="font-semibold text-primary hover:underline"
                >
                  Cadastre-se
                </button>
              </p>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleCreateAccount}>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">
                  Nome completo
                </label>
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={registerNome}
                  onChange={(e) => setRegisterNome(e.target.value)}
                  className="h-10 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">
                  E-mail
                </label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="h-10 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Senha
                  </label>
                  <Input
                    type="password"
                    placeholder="Mín. 6 caracteres"
                    value={registerSenha}
                    onChange={(e) => setRegisterSenha(e.target.value)}
                    className="h-10 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Confirmar
                  </label>
                  <Input
                    type="password"
                    placeholder="Repita a senha"
                    value={registerSenhaConfirm}
                    onChange={(e) => setRegisterSenhaConfirm(e.target.value)}
                    className="h-10 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={registerLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground shadow-[0_14px_30px_rgba(0,0,0,0.35)] transition-transform hover:translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {registerLoading ? "Criando conta..." : "Criar conta"}
                </Button>
              </div>

              <p className="text-[11px] leading-snug text-muted-foreground">
                Ao se cadastrar, você concorda com nossos Termos de Serviço e
                Política de Privacidade.
              </p>
            </form>
          )}
        </div>

        <div className="mt-4 flex w-full max-w-md flex-col items-center gap-4">
          <div className="text-center text-xs text-muted-foreground">
            <p className="mb-2">
              Você é médico e deseja acompanhar suas cirurgias?
            </p>
            <Button
              type="button"
              variant="outline"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border-border bg-background px-4 text-[11px] font-semibold text-foreground shadow-sm hover:bg-secondary"
              onClick={() => navigate("/login-medico")}
            >
              <Stethoscope className="h-4 w-4" />
              <span>Acessar como médico</span>
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-center gap-6 text-[11px] text-muted-foreground">
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

          <p className="text-[10px] text-muted-foreground">
            © 2025 NP Saúde Pró. Plataforma segura.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
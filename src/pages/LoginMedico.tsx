import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRightCircle,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import {
  loginWithRole,
  sendPasswordReset,
} from "@/services/auth-service";
import SubscriptionExpiredDialog from "@/components/auth/SubscriptionExpiredDialog";
import { SUBSCRIPTION_EXPIRED_CODE } from "@/services/subscription-validity-service";
import { MEDICO_LOGO_URL } from "@/constants/medico-brand";
import { carregarAppSettings } from "@/services/app-settings-service";

const FALLBACK_YOUTUBE_VIDEO_ID = "5w1NdK6GtEE";

function extractYouTubeId(input: string | null | undefined): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace("/", "").trim();
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch?.[1]) return embedMatch[1];
      const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch?.[1]) return shortsMatch[1];
    }
  } catch {
    // ignore
  }
  return null;
}

const LoginMedico = () => {
  const navigate = useNavigate();
  const [subscriptionExpiredOpen, setSubscriptionExpiredOpen] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem("medicoLoginEmail") || "");
  const [loginSenha, setLoginSenha] = useState("");
  const [rememberLogin, setRememberLogin] = useState(() => !!localStorage.getItem("medicoLoginEmail"));
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Video background
  const [youtubeSetting, setYoutubeSetting] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const settings = await carregarAppSettings();
        if (!alive) return;
        setYoutubeSetting(settings?.videoYoutube ?? null);
      } catch {
        if (!alive) return;
        setYoutubeSetting(null);
      }
    };
    void load();
    return () => { alive = false; };
  }, []);

  const videoId = useMemo(() => {
    return (
      extractYouTubeId(youtubeSetting) ??
      extractYouTubeId(FALLBACK_YOUTUBE_VIDEO_ID)
    );
  }, [youtubeSetting]);

  const youtubeEmbedUrl = useMemo(() => {
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&disablekb=1`;
  }, [videoId]);

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!loginEmail.trim() || !loginSenha) {
      showError("Informe e-mail e senha para acessar.");
      return;
    }

    setIsLoading(true);
    try {
      if (rememberLogin) {
        localStorage.setItem("medicoLoginEmail", loginEmail);
      } else {
        localStorage.removeItem("medicoLoginEmail");
      }
      
      await loginWithRole({
        email: loginEmail,
        password: loginSenha,
        allowedRole: "MEDICO",
      });

      showSuccess("Login realizado com sucesso.");
      navigate("/medico/dashboard");
    } catch (err) {
      const code = (err as { code?: string })?.code as string | undefined;
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
      const code = (err as { code?: string })?.code as string | undefined;
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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0b0b0b] text-[#F5F5F5]">
      <SubscriptionExpiredDialog
        open={subscriptionExpiredOpen}
        onOpenChange={setSubscriptionExpiredOpen}
      />

      {/* Background video */}
      {youtubeEmbedUrl ? (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <iframe
            className="absolute left-1/2 top-1/2 h-[56.25vw] w-[177.78vh] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2"
            src={youtubeEmbedUrl}
            title="CONMEDIC background"
            frameBorder={0}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            tabIndex={-1}
          />
        </div>
      ) : null}

      {/* Máscara transparente */}
      <div className="absolute inset-0 z-10 h-full w-full bg-transparent" />

      {/* Overlays visuais */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-black/5" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(254,230,122,0.10)_0,rgba(0,0,0,0.25)_55%),radial-gradient(circle_at_100%_100%,rgba(212,160,23,0.06)_0,rgba(0,0,0,0.25)_55%)]" />

      <div className="relative z-20 mx-auto flex min-h-screen w-full max-w-sm flex-col items-stretch justify-center px-4 py-10">
        {/* Marca */}
        <div className="mb-7 flex flex-col items-center">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] flex items-center justify-center shadow-[0_0_20px_rgba(212,160,23,0.4)]">
              <img
                src={MEDICO_LOGO_URL}
                alt="Logo Conmedic"
                className="h-7 w-7 object-contain"
                loading="eager"
              />
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

        {/* Form Container */}
        <div className="relative z-10 mx-auto w-full max-w-sm rounded-2xl border border-[#D4A017]/30 bg-black/60 p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="mb-6 text-center">
            <h1 className="bg-gradient-to-br from-[#FFD700] via-[#D4A017] to-[#8B6508] bg-clip-text text-3xl font-black tracking-tight text-transparent drop-shadow-[0_2px_10px_rgba(212,160,23,0.3)]">
              Portal Médico
            </h1>
            <p className="mt-2 text-xs font-medium text-[#D1D5DB]">
              Acesse seus envios, descrições cirúrgicas e indicadores.
            </p>
          </div>

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

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(e) => setRememberLogin(e.target.checked)}
                  className="rounded border-[#D4A017]/30 bg-black/40 text-[#D4A017] focus:ring-[#D4A017]"
                />
                <span className="text-[11px] font-medium text-[#D1D5DB]">
                  Lembrar login
                </span>
              </label>
              
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-[11px] font-semibold text-[#D4A017] underline-offset-2 hover:underline disabled:opacity-60"
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

          {/* Footer Access Admin */}
          <div className="mt-8 text-center text-xs text-[#9CA3AF]">
            <button
              type="button"
              className="hover:text-[#D4A017] transition-colors"
              onClick={() => navigate("/login")}
            >
              Acessar como administrador
            </button>
            <p className="mt-4 text-[10px] text-[#6B7280]">
              Versão 1.1.3
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginMedico;
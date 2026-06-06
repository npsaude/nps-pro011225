import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRightCircle, Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { loginAny, sendPasswordReset } from "@/services/auth-service";
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

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => localStorage.getItem("loginEmail") || "");
  const [senha, setSenha] = useState("");
  const [rememberLogin, setRememberLogin] = useState(() => !!localStorage.getItem("loginEmail"));
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [subscriptionExpiredOpen, setSubscriptionExpiredOpen] = useState(false);
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !senha) {
      showError("Informe e-mail e senha para acessar.");
      return;
    }
    setIsLoading(true);
    try {
      if (rememberLogin) {
        localStorage.setItem("loginEmail", email.trim());
      } else {
        localStorage.removeItem("loginEmail");
      }

      const result = await loginAny({ email: email.trim(), password: senha });

      showSuccess("Login realizado com sucesso.");

      if (result.role === "SUPER_ADMIN") {
        navigate("/admin/assinaturas/dashboard");
      } else {
        navigate("/admin/dashboard");
      }
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
    if (!email.trim()) {
      showError("Informe o e-mail no campo acima para recuperar a senha.");
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordReset(email.trim());
      showSuccess("Enviamos um e-mail com instruções para redefinir sua senha.");
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

      {/* Overlays */}
      <div className="absolute inset-0 z-10 h-full w-full bg-transparent" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-black/40" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(254,230,122,0.10)_0,rgba(0,0,0,0.25)_55%),radial-gradient(circle_at_100%_100%,rgba(212,160,23,0.06)_0,rgba(0,0,0,0.25)_55%)]" />

      <div className="relative z-20 mx-auto flex min-h-screen w-full max-w-sm flex-col items-stretch justify-center px-4 py-10">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] flex items-center justify-center shadow-[0_0_30px_rgba(212,160,23,0.5)]">
            <img
              src={MEDICO_LOGO_URL}
              alt="Logo Conmedic"
              className="h-9 w-9 object-contain"
              loading="eager"
            />
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] bg-clip-text text-transparent tracking-wide">
            CONMEDIC
          </span>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-[#D4A017]/30 bg-black/65 p-7 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-[#F5F5F5]">Entrar</h1>
            <p className="mt-1 text-sm text-[#9CA3AF]">
              Bem-vindo de volta à plataforma.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* E-mail */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#9CA3AF]">
                E-mail
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 border border-[#D4A017]/20 focus-within:border-[#D4A017] focus-within:ring-2 focus-within:ring-[#D4A017]/20 transition-colors">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] text-black shadow-[0_0_14px_rgba(212,160,23,0.25)]">
                  <Mail className="h-4 w-4" />
                </span>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-[#F5F5F5] placeholder:text-[#6B7280] focus-visible:ring-0"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[#9CA3AF]">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-[11px] font-semibold text-[#D4A017] underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {resetLoading ? "Enviando..." : "Esqueceu a senha?"}
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 border border-[#D4A017]/20 focus-within:border-[#D4A017] focus-within:ring-2 focus-within:ring-[#D4A017]/20 transition-colors">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] text-black shadow-[0_0_14px_rgba(212,160,23,0.25)]">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  type={passwordVisible ? "text" : "password"}
                  placeholder="Sua senha"
                  className="h-9 flex-1 border-none bg-transparent px-0 text-sm text-[#F5F5F5] placeholder:text-[#6B7280] focus-visible:ring-0"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/30 text-[#9CA3AF] hover:text-[#D4A017] hover:bg-[#D4A017]/10 transition-colors"
                  aria-label={passwordVisible ? "Ocultar senha" : "Mostrar senha"}
                >
                  {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Lembrar */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={rememberLogin}
                onChange={(e) => setRememberLogin(e.target.checked)}
                className="rounded border-[#D4A017]/30 bg-black/40 text-[#D4A017] focus:ring-[#D4A017]"
              />
              <span className="text-xs text-[#9CA3AF]">Lembrar acesso</span>
            </label>

            {/* Botão */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] hover:scale-[1.01] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <ArrowRightCircle className="h-4 w-4" />
                <span>{isLoading ? "Acessando..." : "Acessar conta"}</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-6 text-[11px] text-white/70 font-medium">
            <button type="button" className="hover:text-white/90 transition-colors">Privacidade</button>
            <button type="button" className="hover:text-white/90 transition-colors">Termos</button>
            <button type="button" className="hover:text-white/90 transition-colors">Ajuda</button>
          </div>

          <p className="text-[10px] text-white/50">© ConMedic. Plataforma segura.</p>
          <p className="text-[9px] text-white/30">Versão 1.2.3</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  KeyRound,
  Lock,
  CheckCircle2,
  ShieldCheck,
  MailCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

const LOGO_URL =
  "https://pokyribuibmbeorrcsgk.supabase.co/storage/v1/object/sign/NPS-pro/site/logo-conmagic-favicon.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kZDc4YzM5NC1hMTFlLTQ3MTEtYTVmNi1lMjU4ZGU4MGRiYzgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJOUFMtcHJvL3NpdGUvbG9nby1jb25tYWdpYy1mYXZpY29uLnBuZyIsImlhdCI6MTc3MTAwMjQxMywiZXhwIjoyNDAxNzIyNDEzfQ.EFdbCwJ0scnjf4oFCJRg5YA_JtHfA2LZf_gugIB4WcY";

const FINISH_URL =
  "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/public-checkout-finish";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBva3lyaWJ1aWJtYmVvcnJjc2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzc3OTAsImV4cCI6MjA3OTg1Mzc5MH0.YRSDKlnIdJPkQCXjo9FEci_YvRXgO717PqbkZpm3h2k";

type Phase = "verificando" | "senha" | "email" | "codigo" | "concluido";

export default function Welcome() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("verificando");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const startedRef = useRef(false);

  // 1) Tenta autenticar automaticamente a partir do pagamento (ou do link mágico).
  const iniciar = useCallback(async () => {
    // a) Chegou via link mágico (hash com access_token) -> já vira sessão.
    const hash = window.location.hash || "";
    if (hash.includes("access_token") || hash.includes("type=magiclink")) {
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setEmail(data.session.user.email ?? "");
          setPhase("senha");
          return;
        }
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    // b) Fluxo automático pelo pagamento (Asaas anexa o id na URL).
    const params = new URLSearchParams(window.location.search);
    const candidates = Array.from(
      new Set([...params.values()].map((v) => v.trim()).filter(Boolean)),
    );

    if (candidates.length > 0) {
      for (let tentativa = 0; tentativa < 4; tentativa++) {
        try {
          const res = await fetch(FINISH_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: ANON_KEY,
              Authorization: `Bearer ${ANON_KEY}`,
            },
            body: JSON.stringify({ candidates }),
          });
          const json = await res.json().catch(() => null);

          if (res.ok && json?.ok && json?.token_hash) {
            const { error } = await supabase.auth.verifyOtp({
              token_hash: json.token_hash,
              type: "magiclink",
            });
            if (error) throw error;
            setEmail(json.email ?? "");
            setPhase("senha");
            return;
          }

          // Pagamento ainda processando: aguarda e tenta de novo.
          if (json?.code === "payment_not_paid" && tentativa < 3) {
            await new Promise((r) => setTimeout(r, 2500));
            continue;
          }
          break;
        } catch (_e) {
          break;
        }
      }
    }

    // c) Fallback: identificar pelo e-mail da compra.
    setAviso(
      "Confirme o e-mail usado na compra para criar sua senha de acesso.",
    );
    setPhase("email");
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void iniciar();
  }, [iniciar]);

  const enviarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    if (!mail) {
      showError("Informe seu e-mail.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: mail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: "https://conmedic.com.br/boas-vindas",
        },
      });
      if (error) throw error;
      showSuccess("Enviamos um código de acesso para o seu e-mail.");
      setPhase("codigo");
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o código. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    if (!codigo.trim()) {
      showError("Informe o código recebido por e-mail.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: mail,
        token: codigo.trim(),
        type: "email",
      });
      if (error) throw error;
      setPhase("senha");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Código inválido ou expirado.",
      );
    } finally {
      setBusy(false);
    }
  };

  const salvarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 6) {
      showError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      showError("As senhas não conferem.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      showSuccess("Senha criada com sucesso!");
      setPhase("concluido");
      setTimeout(() => navigate("/medico/dashboard"), 1500);
    } catch (err) {
      let message =
        err instanceof Error ? err.message : "Não foi possível salvar a senha.";
      if (message.toLowerCase().includes("session")) {
        message =
          "Sua sessão expirou. Recarregue a página de boas-vindas para tentar de novo.";
      }
      showError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#0f0f0f] px-4 py-10 text-[#F5F5F5]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(254,230,122,0.14)_0,rgba(18,18,18,1)_55%),radial-gradient(circle_at_100%_100%,rgba(212,160,23,0.10)_0,rgba(18,18,18,1)_55%)]" />

      <div className="w-full max-w-md">
        <div className="rounded-[32px] border border-[#D4A017]/20 bg-[#141414]/90 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-8">
          {/* Cabeçalho */}
          <header className="flex items-center gap-3 border-b border-white/5 pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f0f0f] ring-1 ring-[#D4A017]/30">
              <img src={LOGO_URL} alt="Logo CONMEDIC" className="h-8 w-8 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">CONMEDIC</span>
              <span className="text-[11px] text-[#9CA3AF]">Bem-vindo(a) — pagamento confirmado</span>
            </div>
          </header>

          <div className="pt-6">
            {/* Verificando */}
            {phase === "verificando" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#D4A017]" />
                <p className="text-sm font-medium">Confirmando seu pagamento...</p>
                <p className="text-xs text-[#9CA3AF]">Só um instante enquanto liberamos seu acesso.</p>
              </div>
            )}

            {/* Pedir e-mail (fallback) */}
            {phase === "email" && (
              <form onSubmit={enviarCodigo} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h1 className="text-lg font-semibold sm:text-xl">Criar sua senha</h1>
                    <p className="text-xs text-[#9CA3AF] sm:text-sm">
                      {aviso ?? "Confirme o e-mail usado na compra para continuar."}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D4A017]/15 text-[#D4A017] ring-1 ring-[#D4A017]/30">
                    <MailCheck className="h-5 w-5" />
                  </span>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#D1D5DB]">E-mail da compra</label>
                  <Input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 rounded-2xl border-white/10 bg-[#0f0f0f] text-sm text-[#F5F5F5] placeholder:text-[#6b7280]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] font-semibold text-black hover:opacity-95"
                >
                  {busy ? "Enviando..." : "Receber código de acesso"}
                </Button>
              </form>
            )}

            {/* Inserir código (fallback) */}
            {phase === "codigo" && (
              <form onSubmit={confirmarCodigo} className="space-y-4">
                <div className="space-y-1">
                  <h1 className="text-lg font-semibold sm:text-xl">Digite o código</h1>
                  <p className="text-xs text-[#9CA3AF] sm:text-sm">
                    Enviamos um código para <span className="text-[#F5F5F5]">{email}</span>.
                  </p>
                </div>
                <Input
                  inputMode="numeric"
                  placeholder="Código de 6 dígitos"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  required
                  className="h-11 rounded-2xl border-white/10 bg-[#0f0f0f] text-center text-base tracking-[0.3em] text-[#F5F5F5] placeholder:tracking-normal placeholder:text-[#6b7280]"
                />
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] font-semibold text-black hover:opacity-95"
                >
                  {busy ? "Validando..." : "Confirmar código"}
                </Button>
                <button
                  type="button"
                  onClick={() => setPhase("email")}
                  className="w-full text-center text-xs text-[#9CA3AF] hover:text-[#D4A017]"
                >
                  Reenviar / trocar e-mail
                </button>
              </form>
            )}

            {/* Criar senha */}
            {phase === "senha" && (
              <form onSubmit={salvarSenha} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h1 className="text-lg font-semibold sm:text-xl">Crie sua senha</h1>
                    <p className="text-xs text-[#9CA3AF] sm:text-sm">
                      {email ? (
                        <>Acesso de <span className="text-[#F5F5F5]">{email}</span>. Defina a senha que você usará para entrar.</>
                      ) : (
                        "Defina a senha que você usará para entrar."
                      )}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D4A017]/15 text-[#D4A017] ring-1 ring-[#D4A017]/30">
                    <KeyRound className="h-5 w-5" />
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#D1D5DB]">Nova senha</label>
                  <div className="flex items-center rounded-2xl bg-[#0f0f0f] ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-[#D4A017]/40">
                    <span className="flex h-11 w-11 items-center justify-center rounded-l-2xl border-r border-white/10 text-[#6b7280]">
                      <Lock className="h-4 w-4" />
                    </span>
                    <Input
                      type="password"
                      placeholder="Digite a senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      className="h-11 border-none bg-transparent text-sm text-[#F5F5F5] placeholder:text-[#6b7280] focus-visible:ring-0"
                    />
                  </div>
                  <p className="text-[11px] text-[#6b7280]">Mínimo de 6 caracteres.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#D1D5DB]">Confirme a senha</label>
                  <Input
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    required
                    className="h-11 rounded-2xl border-white/10 bg-[#0f0f0f] text-sm text-[#F5F5F5] placeholder:text-[#6b7280]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] font-semibold text-black hover:opacity-95"
                >
                  {busy ? "Salvando..." : "Criar senha e acessar"}
                </Button>
              </form>
            )}

            {/* Concluído */}
            {phase === "concluido" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold">Senha criada com sucesso!</p>
                <p className="text-xs text-[#9CA3AF]">Estamos te levando para a plataforma...</p>
              </div>
            )}
          </div>

          {(phase === "senha" || phase === "email" || phase === "codigo") && (
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#6b7280]">
              <ShieldCheck className="h-3.5 w-3.5" /> Acesso seguro — pagamento confirmado pelo Asaas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

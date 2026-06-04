import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

const LAST_ACTIVE_KEY = "conmedic_last_active_ms";

function nowMs() {
  return Date.now();
}

function readLastActive(): number {
  const raw = typeof window !== "undefined" ? window.localStorage.getItem(LAST_ACTIVE_KEY) : null;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : nowMs();
}

function writeLastActive(ms: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_ACTIVE_KEY, String(ms));
}

export default function InactivityLogout(props: { timeoutMinutes?: number }) {
  const { timeoutMinutes = 60 } = props;

  const navigate = useNavigate();
  const location = useLocation();

  const timeoutMs = useMemo(() => timeoutMinutes * 60 * 1000, [timeoutMinutes]);

  const logoutTimerRef = useRef<number | null>(null);
  const lastWriteRef = useRef<number>(0);
  const loggingOutRef = useRef(false);

  const clearTimer = () => {
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  };

  const schedule = async () => {
    clearTimer();

    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session) return;

    const last = readLastActive();
    const remaining = last + timeoutMs - nowMs();

    if (remaining <= 0) {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;

      await supabase.auth.signOut();

      const isMedicoArea = location.pathname.startsWith("/medico");
      showError("Sessão encerrada por inatividade.");
      navigate(isMedicoArea ? "/login-medico" : "/login", { replace: true });

      return;
    }

    logoutTimerRef.current = window.setTimeout(() => {
      void schedule();
    }, Math.min(remaining, 60_000)); // revalida no máximo a cada 60s
  };

  const touch = () => {
    const ms = nowMs();

    // evita escrever no localStorage a cada evento (melhora performance)
    if (ms - lastWriteRef.current < 5000) return;
    lastWriteRef.current = ms;

    writeLastActive(ms);
    void schedule();
  };

  useEffect(() => {
    // inicia/atualiza quando a rota muda (usuário ativo)
    touch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session) writeLastActive(nowMs());
      void schedule();
    };

    void init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      loggingOutRef.current = false;

      if (!session) {
        clearTimer();
        return;
      }

      writeLastActive(nowMs());
      void schedule();
    });

    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVE_KEY) {
        void schedule();
      }
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    const onVisibility = () => {
      if (document.visibilityState === "visible") touch();
    };

    events.forEach((evt) => window.addEventListener(evt, touch, { passive: true }));
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      events.forEach((evt) => window.removeEventListener(evt, touch));
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeoutMs]);

  return null;
}
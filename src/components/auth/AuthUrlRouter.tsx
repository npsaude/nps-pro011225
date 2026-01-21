import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Detecta tokens de recovery na URL e redireciona para /reset-password.
 * Funciona como fallback caso o script síncrono do index.html não tenha capturado.
 */
function hasRecoveryArtifacts(): boolean {
  try {
    const url = new URL(window.location.href);

    // Query params (PKCE / OTP)
    if (url.searchParams.get("type") === "recovery") return true;

    // Hash params (implicit flow)
    const rawHash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;

    if (rawHash) {
      const hashParams = new URLSearchParams(rawHash);
      if (hashParams.get("type") === "recovery") return true;
    }
  } catch {
    // ignora
  }
  return false;
}

export default function AuthUrlRouter() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/reset-password") return;

    if (hasRecoveryArtifacts()) {
      // Usa window.location para garantir que o hash seja preservado
      window.location.replace(
        "/reset-password" + window.location.search + window.location.hash
      );
    }
  }, [location.pathname]);

  return null;
}
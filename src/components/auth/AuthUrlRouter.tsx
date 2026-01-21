import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function hasRecoveryArtifacts() {
  const url = new URL(window.location.href);

  // Query params (PKCE/OTP redirect)
  const hasQuery =
    url.searchParams.get("type") === "recovery" ||
    url.searchParams.has("code") ||
    url.searchParams.has("token") ||
    url.searchParams.has("token_hash");

  // Hash params (implicit flow)
  const rawHash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  const hashParams = new URLSearchParams(rawHash);
  const hasHash =
    hashParams.get("type") === "recovery" ||
    hashParams.has("access_token") ||
    hashParams.has("refresh_token") ||
    hashParams.has("error") ||
    hashParams.has("error_description");

  // Só consideramos "recovery" quando realmente parece ser reset
  const isRecovery =
    url.searchParams.get("type") === "recovery" ||
    hashParams.get("type") === "recovery";

  return isRecovery && (hasQuery || hasHash);
}

export default function AuthUrlRouter() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/reset-password") return;

    // Se o usuário abriu a app com tokens de recovery (mesmo vindo para "/"),
    // enviamos para a tela correta.
    if (hasRecoveryArtifacts()) {
      navigate("/reset-password", { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { showError } from "@/utils/toast";
import { useSystemUser } from "@/hooks/use-system-user";

type Props = {
  children: React.ReactNode;
  redirectTo?: string;
};

export default function SuperAdminGuard({
  children,
  redirectTo = "/admin/dashboard",
}: Props) {
  const navigate = useNavigate();
  const { systemUser, loading } = useSystemUser();

  const role = String((systemUser as any)?.regra ?? "").trim().toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";

  useEffect(() => {
    if (loading) return;

    if (!systemUser) {
      showError("Faça login novamente para acessar esta área.");
      navigate("/login");
      return;
    }

    if (!isSuperAdmin) {
      showError("Acesso restrito: apenas super_admin.");
      navigate(redirectTo);
    }
  }, [loading, systemUser, isSuperAdmin, navigate, redirectTo]);

  // Enquanto carrega o contexto, renderiza nada (sem flash de texto)
  if (loading) return null;

  // Não autorizado — o useEffect já redireciona
  if (!isSuperAdmin) return null;

  return <>{children}</>;
}

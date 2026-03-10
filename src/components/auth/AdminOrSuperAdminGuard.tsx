import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { showError } from "@/utils/toast";
import { useSystemUser } from "@/hooks/use-system-user";

type Props = {
  children: React.ReactNode;
  redirectTo?: string;
};

export default function AdminOrSuperAdminGuard({
  children,
  redirectTo = "/admin/dashboard",
}: Props) {
  const navigate = useNavigate();
  const { systemUser, loading } = useSystemUser();

  const role = String((systemUser as any)?.regra ?? "").trim().toUpperCase();
  const isAllowed = role === "ADMIN" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (loading) return;

    if (!systemUser) {
      showError("Faça login novamente para acessar esta área.");
      navigate("/login");
      return;
    }

    if (!isAllowed) {
      showError("Acesso restrito: apenas admin e super_admin.");
      navigate(redirectTo);
    }
  }, [loading, systemUser, isAllowed, navigate, redirectTo]);

  if (loading) return null;

  if (!isAllowed) return null;

  return <>{children}</>;
}

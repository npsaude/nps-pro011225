import { useEffect, useState } from "react";
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
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    const role = String((systemUser as any)?.regra ?? "").trim().toUpperCase();

    if (!systemUser) {
      showError("Faça login novamente para acessar esta área.");
      navigate("/login");
      setAllowed(false);
      return;
    }

    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      showError("Acesso restrito: apenas admin e super_admin.");
      navigate(redirectTo);
      setAllowed(false);
      return;
    }

    setAllowed(true);
  }, [loading, systemUser, navigate, redirectTo]);

  if (allowed === null) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center text-sm text-muted-foreground">
        Validando permissões...
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

type Props = {
  children: React.ReactNode;
  redirectTo?: string;
};

export default function SuperAdminGuard({
  children,
  redirectTo = "/admin/dashboard",
}: Props) {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        showError("Faça login novamente para acessar esta área.");
        navigate("/login");
        setAllowed(false);
        return;
      }

      const { data: isSuperAdmin, error } = await supabase.rpc("is_super_admin", {
        p_user_id: userData.user.id,
      });

      if (error) {
        showError("Não foi possível validar seu acesso (super_admin).");
        navigate(redirectTo);
        setAllowed(false);
        return;
      }

      if (!isSuperAdmin) {
        showError("Acesso restrito: apenas super_admin.");
        navigate(redirectTo);
        setAllowed(false);
        return;
      }

      setAllowed(true);
    };

    void check();
  }, [navigate, redirectTo]);

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
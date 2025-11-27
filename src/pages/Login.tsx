import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/admin/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border bg-card/95 p-8 text-center shadow-2xl shadow-black/20 backdrop-blur-2xl">
        <h1 className="text-2xl font-bold tracking-tight">
          Área Administrativa - NP Saúde Pró
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Redirecionando para o painel administrativo...
        </p>
      </div>
    </div>
  );
};

export default Login;
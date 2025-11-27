import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  // Por enquanto, ao acessar /login redirecionamos direto para o dashboard
  useEffect(() => {
    navigate("/admin/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#101622] px-4 text-slate-100">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-black/40 p-8 text-center shadow-2xl shadow-black/60 backdrop-blur-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Área Administrativa
        </h1>
        <p className="mt-3 text-sm text-slate-300">
          Redirecionando para o painel administrativo...
        </p>
      </div>
    </div>
  );
};

export default Login;
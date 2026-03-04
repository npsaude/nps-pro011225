import { Building2 } from "lucide-react";
import ClinicasList from "@/components/clinicas/ClinicasList";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";

const ClinicasCadastro = () => {
  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="cadastro" cadastroSubsection="clinicas" />

        {/* Área principal */}
        <div className="flex flex-1 flex-col gap-5 rounded-3xl bg-white/90 p-4 lg:p-6 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          {/* Header */}
          <header className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">
                  Clínicas e hospitais
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">
                  Gerencie as unidades de atendimento utilizadas nas SADTs e no faturamento.
                </p>
              </div>
            </div>

            <AdminHeaderActions />
          </header>

          {/* Divider */}
          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* Content */}
          <main className="flex-1">
            <ClinicasList />
          </main>
        </div>
      </div>
    </div>
  );
};

export default ClinicasCadastro;

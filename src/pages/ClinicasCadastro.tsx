import {
  Home,
  FileText,
  Users,
  Stethoscope,
  MessageCircle,
  Settings,
  HelpCircle,
  Bell,
  Search,
  Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ClinicasList from "@/components/clinicas/ClinicasList";
import AdminSidebar from "@/components/admin/AdminSidebar";

const ClinicasCadastro = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="cadastro" cadastroSubsection="clinicas" />

        {/* Área principal */}
        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          {/* Header */}
          <header className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                  <Building2 className="h-4 w-4" />
                </span>
                <span>Cadastro de clínicas e hospitais</span>
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Gerencie as unidades de atendimento utilizadas nas SADTs e no faturamento.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200/80 focus-within:ring-[#135bec] dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 sm:flex">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <span className="h-7 w-40 bg-transparent text-xs text-slate-800 dark:text-slate-50 sm:w-52 sm:text-sm">
                  Clínicas e hospitais
                </span>
              </div>

              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm ring-1 ring-slate-200/70 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </header>

          <main className="flex-1">
            <ClinicasList />
          </main>
        </div>
      </div>
    </div>
  );
};

export default ClinicasCadastro;
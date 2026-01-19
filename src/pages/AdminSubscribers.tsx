import { Bell, Users } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import SubscriptionEnrollmentsList from "@/components/subscriptions/SubscriptionEnrollmentsList";
import { useSystemUser } from "@/hooks/use-system-user";

export default function AdminSubscribers() {
  const { loading, systemUser, error } = useSystemUser();

  const blocked =
    !loading && (!systemUser || systemUser.regra !== "SUPER_ADMIN");

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="assinaturas" assinaturasSubsection="assinantes" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          <header className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                  <Users className="h-4 w-4" />
                </span>
                <span>Assinantes</span>
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Área exclusiva para super_admin: lista, cadastro e edição de assinantes.
              </p>
            </div>

            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm ring-1 ring-slate-200/70 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
              <Bell className="h-4 w-4" />
            </button>
          </header>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
              Erro ao validar permissões: {error.message}
            </div>
          ) : blocked ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Acesso restrito: esta área é exclusiva para super_admin.
            </div>
          ) : (
            <main className="flex-1">
              <SubscriptionEnrollmentsList />
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
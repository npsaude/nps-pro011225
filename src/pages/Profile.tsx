import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { useSystemUser } from "@/hooks/use-system-user";
import ProfileHeaderCard from "@/components/profile/ProfileHeaderCard";
import ProfileAccountAndSecurity from "@/components/profile/ProfileAccountAndSecurity";
import UserSubscriptionPanel from "@/components/profile/UserSubscriptionPanel";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const navigate = useNavigate();
  const { loading } = useSystemUser();

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar />

        <div className="flex flex-1 flex-col gap-5 rounded-3xl bg-transparent lg:py-1">
          {/* Header */}
          <header className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                disabled={loading}
                className="h-9 w-9 rounded-2xl p-0 text-slate-500 hover:bg-slate-200/60 hover:text-slate-900 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Voltar</span>
              </Button>
              <div className="flex flex-col">
                <h1 className="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  Perfil
                </h1>
                <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
                  Gerencie suas informações pessoais e assinatura.
                </p>
              </div>
            </div>
            <AdminHeaderActions notificationsCount={0} />
          </header>

          {/* Conteúdo */}
          <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:bg-slate-900/90">
            <ProfileHeaderCard planLabel={null} />
            <ProfileAccountAndSecurity />
            <UserSubscriptionPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

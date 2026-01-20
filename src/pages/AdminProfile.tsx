import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

import ProfileHeaderCard from "@/components/profile/ProfileHeaderCard";
import ProfileAccountAndSecurity from "@/components/profile/ProfileAccountAndSecurity";
import UserSubscriptionPanel from "@/components/profile/UserSubscriptionPanel";

export default function AdminProfile() {
  const navigate = useNavigate();
  const [planLabel, setPlanLabel] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) return;

      const email = authData.user?.email?.trim();
      if (!email) return;

      const { data, error } = await supabase
        .from("subscription_enrollments")
        .select("status,plan:subscription_plans(name,code)")
        .ilike("user_email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        showError(error.message);
        return;
      }

      const plan = Array.isArray((data as any)?.plan) ? (data as any).plan[0] : (data as any)?.plan;
      const name = (plan?.name ?? plan?.code ?? null) as string | null;
      setPlanLabel(name ? String(name).toUpperCase() : null);
    };

    void load();
  }, []);

  const tabsClass =
    "rounded-2xl bg-secondary/50 p-1 ring-1 ring-border";

  const triggerClass =
    "rounded-xl text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm";

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(254,230,122,0.10)_0,rgba(18,18,18,0.0)_45%),radial-gradient(circle_at_100%_50%,rgba(212,160,23,0.08)_0,rgba(18,18,18,0.0)_45%)]" />

      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="home" />

        <div className="flex flex-1 flex-col gap-4">
          <header className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex-1" />

            <AdminHeaderActions />
          </header>

          <div className="flex flex-col gap-4 rounded-3xl bg-card/50 p-4 ring-1 ring-border backdrop-blur-xl">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <ProfileHeaderCard planLabel={planLabel} />

              <Tabs defaultValue="perfil" className="w-full lg:w-[320px]">
                <TabsList className={`grid w-full grid-cols-2 ${tabsClass}`}>
                  <TabsTrigger value="perfil" className={triggerClass}>
                    Dados Pessoais
                  </TabsTrigger>
                  <TabsTrigger value="assinatura" className={triggerClass}>
                    Assinatura
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="perfil" className="mt-4">
                  <ProfileAccountAndSecurity />
                </TabsContent>

                <TabsContent value="assinatura" className="mt-4">
                  <UserSubscriptionPanel />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
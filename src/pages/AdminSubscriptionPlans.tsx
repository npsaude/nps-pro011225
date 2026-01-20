import { BadgeDollarSign, Bell } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import SubscriptionPlansList from "@/components/subscriptions/SubscriptionPlansList";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";

export default function AdminSubscriptionPlans() {
  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="assinaturas" assinaturasSubsection="planos" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-card/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(0,0,0,0.35)] lg:backdrop-blur-xl">
          <header className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <BadgeDollarSign className="h-4 w-4" />
                </span>
                <span>Planos de assinatura</span>
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Área exclusiva para super_admin: criação e manutenção de planos.
              </p>
            </div>

            <AdminHeaderActions />
          </header>

          <main className="flex-1">
            <SubscriptionPlansList />
          </main>
        </div>
      </div>
    </div>
  );
}
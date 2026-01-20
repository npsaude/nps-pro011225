import { Bell, Users } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import SubscriptionEnrollmentsList from "@/components/subscriptions/SubscriptionEnrollmentsList";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";

export default function AdminSubscribers() {
  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground">
      <div className="flex flex-1 max-w-7xl mx-auto gap-4 px-4 py-6">
        <AdminSidebar section="assinaturas" assinaturasSubsection="assinantes" />

        <div className="flex-1 flex-col space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Assinantes</h1>
            <AdminHeaderActions />
          </header>

          <SubscriptionEnrollmentsList />
        </div>
      </div>
    </div>
  );
}
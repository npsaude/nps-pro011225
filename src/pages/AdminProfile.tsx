import { useNavigate } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserProfileForm from "@/components/profile/UserProfileForm";
import UserSubscriptionPanel from "@/components/profile/UserSubscriptionPanel";

export default function AdminProfile() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(254,230,122,0.10)_0,rgba(18,18,18,0.0)_45%),radial-gradient(circle_at_100%_50%,rgba(212,160,23,0.08)_0,rgba(18,18,18,0.0)_45%)]" />

      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap_toggle px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="home" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-card/70 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.45)] ring-1 ring-border backdrop-blur-xl">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="flex flex-col">
                <h1 className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/15">
                    <User className="h-4 w-4" />
                  </span>
                  Meu perfil
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Dados do usuário e informações de assinatura.
                </p>
              </div>
            </div>

            <AdminHeaderActions />
          </header>

          <Tabs defaultValue="perfil" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-secondary/50">
              <TabsTrigger value="perfil" className="rounded-xl">
                Perfil
              </TabsTrigger>
              <TabsTrigger value="assinatura" className="rounded-xl">
                Assinatura
              </TabsTrigger>
            </TabsList>

            <TabsContent value="perfil" className="mt-4">
              <UserProfileForm />
            </TabsContent>

            <TabsContent value="assinatura" className="mt-4">
              <UserSubscriptionPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
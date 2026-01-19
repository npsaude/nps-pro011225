import { Bell, Users } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSubscribers() {
  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="assinaturas" assinaturasSubsection="assinantes" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-card/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(0,0,0,0.35)] lg:backdrop-blur-xl">
          <header className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Users className="h-4 w-4" />
                </span>
                <span>Assinantes</span>
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Área de assinantes (subscription_enrollments).
              </p>
            </div>

            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-muted">
              <Bell className="h-4 w-4" />
            </button>
          </header>

          <Card className="rounded-3xl border border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Lista de assinantes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Esta tela está habilitada para acesso; se você quiser, eu já conecto a listagem completa com filtros e edição (CRUD) nos próximos passos.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
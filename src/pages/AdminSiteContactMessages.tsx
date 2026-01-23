import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import AdminSidebar from "@/components/admin/AdminSidebar";
import SiteContactMessagesList from "@/components/site-contact/SiteContactMessagesList.tsx";

export default function AdminSiteContactMessages() {
  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground">
      <div className="flex flex-1 max-w-7xl mx-auto gap-4 px-4 py-6">
        <AdminSidebar section="assinaturas" assinaturasSubsection="formulario-site" />

        <div className="flex-1 flex-col space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Formulário do Site</h1>
            <AdminHeaderActions />
          </header>

          <SiteContactMessagesList />
        </div>
      </div>
    </div>
  );
}
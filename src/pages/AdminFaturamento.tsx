import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const AdminFaturamento = () => {
  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="faturamento" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.12)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          <header className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                Faturamento
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Visão geral do faturamento por período, médico e unidade.
              </p>
            </div>
          </header>

          <main className="flex-1">
            <Card className="border-[#D9DEE3] bg-white/95 dark:border-slate-800 dark:bg-slate-900/90">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Em breve
                </CardTitle>
                <CardDescription className="text-xs">
                  Área de análises de faturamento será configurada aqui.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-300">
                Use esta seção para acompanhar o faturamento consolidado, por
                médico, convênio ou unidade. Podemos adicionar gráficos e
                filtros conforme sua necessidade.
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminFaturamento;
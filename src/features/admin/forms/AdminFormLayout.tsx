import React from "react";
import { ArrowLeft } from "lucide-react";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { accentTokens, type FormAccent } from "./accent";

/**
 * Shell de página dos formulários administrativos de guia: fundo em
 * gradiente, container, sidebar (injetada), painel branco e header com
 * botão de voltar, badge do ícone, título/subtítulo e AdminHeaderActions.
 *
 * Markup preservado a partir das páginas GuiaSolicitacao/GuiaAutorizacao/
 * GuiaHonorarios. A sidebar é recebida como nó para que cada página
 * mantenha a escolha de prop (section= vs documentosSubsection=).
 */
export default function AdminFormLayout({
  sidebar,
  accent,
  icon: Icon,
  title,
  subtitle,
  onBack,
  children,
}: {
  sidebar: React.ReactNode;
  accent: FormAccent;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const tokens = accentTokens(accent);

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        {sidebar}

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tokens.titleBadge}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {title}
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">{subtitle}</p>
              </div>
            </div>
            <AdminHeaderActions notificationsCount={0} />
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Bell, Search, FileText } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import GftList from "@/components/gft/GftList";
import GftForm from "@/components/gft/GftForm";
import { showError } from "@/utils/toast";
import {
  listarGuiasFaturamento,
  type GuiaFaturamentoHonorarios,
} from "@/services/gft-service";

const GftCadastro: React.FC = () => {
  const [guias, setGuias] = useState<GuiaFaturamentoHonorarios[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<GuiaFaturamentoHonorarios | null>(
    null
  );

  const carregarGuias = async () => {
    setCarregando(true);
    try {
      const data = await listarGuiasFaturamento();
      setGuias(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as guias de faturamento.";
      showError(message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregarGuias();
  }, []);

  const handleNovaGuia = () => {
    setEditingItem(null);
    setShowForm(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleEditar = (item: GuiaFaturamentoHonorarios) => {
    setEditingItem(item);
    setShowForm(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingItem(null);
    void carregarGuias();
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="cadastro" cadastroSubsection="gft" />

        {/* Área principal */}
        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          {/* Header */}
          <header className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
                  <FileText className="h-4 w-4" />
                </span>
                <span>Guias de Faturamento</span>
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Gerencie os modelos de guias de faturamento de honorários (GFT).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200/80 focus-within:ring-[#135bec] dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 sm:flex">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <span className="h-7 w-40 bg-transparent text-xs text-slate-800 dark:text-slate-50 sm:w-52 sm:text-sm">
                  Guias cadastradas
                </span>
              </div>

              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm ring-1 ring-slate-200/70 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-2">
            {showForm ? (
              <GftForm
                editingItem={editingItem}
                onCancel={handleCancelForm}
                onSuccess={handleFormSuccess}
              />
            ) : (
              <GftList
                items={guias}
                isLoading={carregando}
                onNovaGuia={handleNovaGuia}
                onEditar={handleEditar}
                onRefresh={carregarGuias}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default GftCadastro;

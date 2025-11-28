import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import SadtForm, { SadtFormValues } from "@/components/sadt/SadtForm";
import { showSuccess } from "@/utils/toast";

const SadtNova: React.FC = () => {
  const navigate = useNavigate();

  const handleNewSadt = (values: SadtFormValues) => {
    // Futuramente, integrar com API/Banco de dados.
    showSuccess("SADT cadastrada com sucesso.");
  };

  const handleBack = () => {
    navigate("/sadt/cadastro");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 px-3 py-4 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50 sm:px-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
              <FileText className="h-3.5 w-3.5" />
              <span>Guia SADT</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold sm:text-2xl">
                Nova SADT
              </h1>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Preencha os dados da guia SADT. Você poderá acompanhar o status
                e o estágio do faturamento depois do cadastro.
              </p>
            </div>
          </div>

          <div className="flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-end sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={handleBack}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Voltar para lista
            </Button>
          </div>
        </header>

        <main className="pb-4">
          <SadtForm onSubmit={handleNewSadt} />
        </main>
      </div>
    </div>
  );
};

export default SadtNova;
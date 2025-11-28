import React from "react";
import SadtForm, { SadtFormValues } from "@/components/sadt/SadtForm";
import { showSuccess } from "@/utils/toast";

const SadtNova: React.FC = () => {
  const handleNewSadt = (values: SadtFormValues) => {
    // Aqui você pode futuramente integrar com API/Banco de dados.
    // No momento, apenas exibimos um toast de sucesso.
    showSuccess("SADT cadastrada com sucesso.");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 px-3 py-4 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50 sm:px-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">
              Nova SADT
            </h1>
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Preencha os dados para cadastrar uma nova guia de SADT.
            </p>
          </div>
        </header>

        <main>
          <SadtForm onSubmit={handleNewSadt} />
        </main>
      </div>
    </div>
  );
};

export default SadtNova;
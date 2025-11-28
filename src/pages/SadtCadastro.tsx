import React, { useState } from "react";
import SadtList from "@/components/sadt/SadtList";
import SadtForm, { SadtFormValues } from "@/components/sadt/SadtForm";
import { SadtResumo } from "@/components/sadt/types";
import { showSuccess } from "@/utils/toast";

const initialSadtList: SadtResumo[] = [
  {
    id: "1",
    numeroGuiaPrincipal: "2024-000123",
    dataAutorizacao: "2024-07-01",
    nomeProfissionalSolicitante: "Dra. Maria Silva",
    identificacaoOperadora: "Vida Mais Saúde",
    status: "ATIVO",
    estagio: "AGUARDANDO",
  },
  {
    id: "2",
    numeroGuiaPrincipal: "2024-000124",
    dataAutorizacao: "2024-07-02",
    nomeProfissionalSolicitante: "Dr. Carlos Pereira",
    identificacaoOperadora: "Bem Estar Saúde",
    status: "ATIVO",
    estagio: "EM_FATURAMENTO",
  },
  {
    id: "3",
    numeroGuiaPrincipal: "2024-000125",
    dataAutorizacao: "2024-06-28",
    nomeProfissionalSolicitante: "Dra. Ana Costa",
    identificacaoOperadora: "Plano Total",
    status: "INATIVO",
    estagio: "PAGO",
  },
];

const SadtCadastro: React.FC = () => {
  const [sadtList, setSadtList] = useState<SadtResumo[]>(initialSadtList);

  const handleNewSadt = (values: SadtFormValues) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const novoRegistro: SadtResumo = {
      id,
      numeroGuiaPrincipal: values.numeroGuiaPrincipal,
      dataAutorizacao: values.dataAutorizacao,
      nomeProfissionalSolicitante: values.nomeProfissionalSolicitante,
      identificacaoOperadora: values.identificacaoOperadora,
      status: values.status,
      estagio: values.estagio,
    };

    setSadtList((prev) => [novoRegistro, ...prev]);
    showSuccess("SADT cadastrada com sucesso.");
  };

  const scrollToForm = () => {
    const formSection = document.getElementById("sadt-form-section");
    if (formSection) {
      formSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 px-3 py-4 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50 sm:px-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">
              Cadastro de SADT
            </h1>
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Gerencie as guias de SADT da sua clínica. Ao entrar, você vê a
              lista de SADTs já cadastradas.
            </p>
          </div>
        </header>

        <main className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)]">
          <SadtList items={sadtList} onNewClick={scrollToForm} />
          <section id="sadt-form-section" className="scroll-mt-4">
            <SadtForm onSubmit={handleNewSadt} />
          </section>
        </main>
      </div>
    </div>
  );
};

export default SadtCadastro;
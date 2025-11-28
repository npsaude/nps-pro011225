import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SadtList from "@/components/sadt/SadtList";
import { SadtResumo } from "@/components/sadt/types";

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
  const [sadtList] = useState<SadtResumo[]>(initialSadtList);
  const navigate = useNavigate();

  const handleNovaSadt = () => {
    navigate("/sadt/nova");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 px-3 py-4 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50 sm:px-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">
              SADT&apos;s
            </h1>
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Gerencie as guias de SADT da sua clínica. Você vê a lista de SADTs já cadastradas e pode criar novas.
            </p>
          </div>
        </header>

        <main>
          <SadtList items={sadtList} onNewClick={handleNovaSadt} />
        </main>
      </div>
    </div>
  );
};

export default SadtCadastro;
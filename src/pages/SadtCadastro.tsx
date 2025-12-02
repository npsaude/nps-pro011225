import React, { useState, useEffect } from "react";
import {
  FileText,
  Bell,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import SadtList from "@/components/sadt/SadtList";
import { SadtResumo } from "@/components/sadt/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { showSuccess } from "@/utils/toast";
import AdminSidebar from "@/components/admin/AdminSidebar";

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
  const [selectedSadt, setSelectedSadt] = useState<SadtResumo | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem("sadt-list");

    if (!stored) {
      window.localStorage.setItem("sadt-list", JSON.stringify(initialSadtList));
      return;
    }

    const listaLocal = JSON.parse(stored) as SadtResumo[];

    setSadtList((prev) => {
      const idsExistentes = new Set(prev.map((s) => s.id));
      const novasNaoDuplicadas = listaLocal.filter(
        (s) => !idsExistentes.has(s.id),
      );
      const merged = [...novasNaoDuplicadas, ...prev];
      window.localStorage.setItem("sadt-list", JSON.stringify(merged));
      return merged;
    });
  }, []);

  const handleNovaSadt = () => {
    navigate("/sadt/nova");
  };

  const handleViewSadt = (sadt: SadtResumo) => {
    setSelectedSadt(sadt);
    setIsViewOpen(true);
  };

  const handleEditSadt = (sadt: SadtResumo) => {
    navigate(`/sadt/editar/${sadt.id}`);
  };

  const handleDeleteSadt = (sadt: SadtResumo) => {
    if (typeof window === "undefined") return;

    const confirmar = window.confirm(
      `Deseja realmente excluir a SADT ${sadt.numeroGuiaPrincipal || ""}?`,
    );
    if (!confirmar) return;

    setSadtList((prev) => {
      const novaLista = prev.filter((item) => item.id !== sadt.id);
      window.localStorage.setItem("sadt-list", JSON.stringify(novaLista));
      return novaLista;
    });

    showSuccess("SADT excluída com sucesso.");
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Container principal */}
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="sadt" />

        {/* Área principal */}
        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.12)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          {/* Header */}
          <header className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E6EEF7] text-[#1D4E77] dark:bg-slate-800 dark:text-slate-100">
                  <FileText className="h-4 w-4" />
                </span>
                <span>Cadastro de SADTs</span>
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Liste, crie e gerencie as guias SADT da sua operação.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-[#F5F7F9] px-3 py-1 text-sm text-slate-600 ring-1 ring-[#D9DEE3] focus-within:ring-[#1D4E77] dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 sm:flex">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <span className="h-7 w-40 bg-transparent text-xs text-slate-800 dark:text-slate-50 sm:w-52 sm:text-sm">
                  SADTs cadastradas
                </span>
              </div>

              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E6EEF7] text-slate-600 shadow-sm ring-1 ring-[#D9DEE3]/70 transition-colors hover:bg-[#D9DEE3] dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </header>

          <main className="flex-1">
            <SadtList
              items={sadtList}
              onNewClick={handleNovaSadt}
              onView={handleViewSadt}
              onEdit={handleEditSadt}
              onDelete={handleDeleteSadt}
            />
          </main>
        </div>
      </div>

      {/* Modal de visualização */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da SADT</DialogTitle>
            <DialogDescription>
              Visualize as principais informações da guia SADT selecionada.
            </DialogDescription>
          </DialogHeader>
          {selectedSadt && (
            <div className="mt-2 space-y-2 text-xs sm:text-sm">
              <p>
                <span className="font-semibold">Nº Guia Principal: </span>
                {selectedSadt.numeroGuiaPrincipal}
              </p>
              <p>
                <span className="font-semibold">Data Autorização: </span>
                {selectedSadt.dataAutorizacao}
              </p>
              <p>
                <span className="font-semibold">Profissional Solicitante: </span>
                {selectedSadt.nomeProfissionalSolicitante}
              </p>
              <p>
                <span className="font-semibold">Operadora: </span>
                {selectedSadt.identificacaoOperadora}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SadtCadastro;
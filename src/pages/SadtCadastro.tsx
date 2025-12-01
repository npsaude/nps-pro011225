import React, { useState, useEffect } from "react";
import {
  Home,
  FileText,
  Users,
  Stethoscope,
  MessageCircle,
  Settings,
  HelpCircle,
  Bell,
  Search,
  FileSignature,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import SadtList from "@/components/sadt/SadtList";
import { SadtResumo } from "@/components/sadt/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const [selectedSadt, setSelectedSadt] = useState<SadtResumo | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const navigate = useNavigate();

  // Carrega SADTs do localStorage (criadas via GPT ou cadastro) e junta com as mocks,
  // além de garantir que tudo fique salvo em localStorage.
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
    <div className="relative flex min-h-screen w-full bg-[#f4f7ff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Fundo em gradiente suave */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#e5f0ff] via-[#f8fbff] to-[#e3eeff] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />

      {/* Container principal */}
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        {/* Sidebar */}
        <aside className="hidden w-60 flex-col justify-between rounded-3xl bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:bg-slate-900/90 lg:flex">
          <div className="flex flex-col gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#135bec]">
                <img
                  src="/logo.jpeg"
                  alt="Logo NP Saúde Pró"
                  className="h-8 w-8 rounded-xl object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-50">
                  NP Saúde Pró
                </span>
                <span className="text-xs text-slate-400">
                  Painel administrativo
                </span>
              </div>
            </div>

            {/* Menu */}
            <nav className="flex flex-col gap-1">
              {/* Home */}
              <button
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                onClick={() => navigate("/admin/dashboard")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Home className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Home</span>
                </span>
              </button>

              {/* SADT's - ativo */}
              <button
                className="flex items-center justify-between rounded-2xl bg-[#135bec] px-3 py-2.5 text-sm text-white shadow-md shadow-blue-500/40 transition-all"
                onClick={() => navigate("/sadt/cadastro")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="font-medium">SADT&apos;s</span>
                </span>
              </button>

              {/* Descrição Cirúrgica */}
              <button
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                onClick={() => navigate("/descricao-cirurgica")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <FileSignature className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Descrição Cirúrgica</span>
                </span>
              </button>

              {/* Recursos */}
              <button className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Recursos</span>
                </span>
              </button>

              {/* Cadastro com subitens */}
              <div className="mt-1 rounded-2xl bg-slate-50/80 p-2 text-xs text-slate-500 ring-1 ring-slate-100/80 dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-800">
                <div className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Users className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-100">
                    Cadastro
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  <button
                    className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                    onClick={() => navigate("/cadastro/clinicas")}
                  >
                    <span className="ml-7">Clínicas</span>
                  </button>
                  <button
                    className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                    onClick={() => navigate("/cadastro/medicos")}
                  >
                    <span className="ml-7">Médicos</span>
                  </button>
                  <button className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                    <span className="ml-7">Planos de Saúde</span>
                  </button>
                </div>
              </div>

              {/* Mensagens */}
              <button className="mt-1 flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Mensagens</span>
                </span>
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 text-[11px] font-semibold text-white">
                  2
                </span>
              </button>

              {/* Configurações -> navega para tela nova */}
              <button
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                onClick={() => navigate("/admin/configuracoes")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Settings className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Configurações</span>
                </span>
              </button>

              {/* Ajuda */}
              <button className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <HelpCircle className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Ajuda</span>
                </span>
              </button>
            </nav>
          </div>

          {/* Logout */}
          <button className="mt-4 flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <HelpCircle className="h-4 w-4" />
            </span>
            <span>Sair</span>
          </button>
        </aside>

        {/* Área principal */}
        {/* ...restante da tela permanece igual... */}
      </div>

      {/* Modal de visualização */}
      {/* ...restante da tela permanece igual... */}
    </div>
  );
};

export default SadtCadastro;
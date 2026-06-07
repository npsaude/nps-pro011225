import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SystemUserProvider } from "@/contexts/SystemUserContext";

import NotFound from "./pages/NotFound";
import SadtEnviar from "./pages/SadtEnviar";
import SadtSucesso from "./pages/SadtSucesso";
import Login from "./pages/Login";
import LoginMedico from "./pages/LoginMedico";
import Dashboard from "./pages/Dashboard";
import SadtCadastro from "./pages/SadtCadastro";
import SadtNova from "./pages/SadtNova";
import SadtEditar from "./pages/SadtEditar";
import ResetPassword from "./pages/ResetPassword";
import ClinicasCadastro from "./pages/ClinicasCadastro";
import MedicosCadastro from "./pages/MedicosCadastro";
import DashboardMedico from "./pages/DashboardMedico";
import AdminConfiguracoes from "./pages/AdminConfiguracoes";
import AdminConverterPdf from "./pages/AdminConverterPdf";
import DescricaoCirurgicaPage from "./pages/DescricaoCirurgica";
import MedicoUploadDescricaoCirurgica from "./pages/MedicoUploadDescricaoCirurgica";
import MedicoUploadGuiaAutorizacao from "./pages/MedicoUploadGuiaAutorizacao";
import MedicoDescricoesCirurgicas from "./pages/MedicoDescricoesCirurgicas";
import MedicoFaturamentos from "./pages/MedicoFaturamentos";
import DescricaoCirurgicaArquivosPage from "./pages/DescricaoCirurgicaArquivos";
import HospitaisCadastro from "./pages/HospitaisCadastro";
import MedicoInicio from "./pages/MedicoInicio";
import AdminFaturamento from "./pages/AdminFaturamento";
import AdminFinancas from "./pages/AdminFinancas";
import AdminSubscriptionPlans from "./pages/AdminSubscriptionPlans";
import Welcome from "./pages/Welcome";
import FirstAccess from "./pages/FirstAccess";
import UnderConstruction from "./pages/UnderConstruction";
import SuperAdminGuard from "@/components/auth/SuperAdminGuard";
import AdminSubscriptionsDashboard from "./pages/AdminSubscriptionsDashboard";
import AdminSubscribers from "./pages/AdminSubscribers";
import AuthUrlRouter from "@/components/auth/AuthUrlRouter";
import InactivityLogout from "@/components/auth/InactivityLogout";
import Profile from "./pages/Profile";
import AdminSiteContactMessages from "./pages/AdminSiteContactMessages";
import GuiaSolicitacaoPage from "./pages/GuiaSolicitacao";
import GuiaSolicitacaoFormPage from "./pages/GuiaSolicitacaoForm";
import GuiaAutorizacaoPage from "./pages/GuiaAutorizacao";
import GuiaAutorizacaoFormPage from "./pages/GuiaAutorizacaoForm";
import GuiaHonorariosPage from "./pages/GuiaHonorarios";
import GuiaHonorariosFormPage from "./pages/GuiaHonorariosForm";
import DescricaoCirurgicaAdminPage from "./pages/DescricaoCirurgicaAdmin";
import DescricaoCirurgicaAdminFormPage from "./pages/DescricaoCirurgicaAdminForm";
import GftCadastro from "./pages/GftCadastro";
import AdminOrSuperAdminGuard from "@/components/auth/AdminOrSuperAdminGuard";
import AdminModelosDescricaoCirurgica from "./pages/AdminModelosDescricaoCirurgica";
import AdminModelosDescricaoCirurgicaForm from "./pages/AdminModelosDescricaoCirurgicaForm";
import AdminEmailTemplates from "./pages/AdminEmailTemplates";
import AdminEmailTemplateForm from "./pages/AdminEmailTemplateForm";
import SadtAcompanhamentoPage from "./pages/SadtAcompanhamento";
import SadtAcompanhamentoFormPage from "./pages/SadtAcompanhamentoForm";
import SadtAcompanhamentoLote from "./pages/SadtAcompanhamentoLote";
import MedicoUploadSadtAcompanhamento from "./pages/MedicoUploadSadtAcompanhamento";
import AdminRetorno from "./pages/AdminRetorno";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SystemUserProvider>
        <AuthUrlRouter />
        <InactivityLogout timeoutMinutes={60} />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login-medico" element={<Navigate to="/login" replace />} />

          <Route path="/boas-vindas" element={<Welcome />} />
          <Route path="/plataforma-em-construcao" element={<UnderConstruction />} />
          <Route path="/primeiro-acesso" element={<FirstAccess />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/perfil" element={<Profile />} />

          <Route path="/sadt/enviar" element={<SadtEnviar />} />
          <Route path="/sadt/sucesso" element={<SadtSucesso />} />
          <Route path="/sadt/cadastro" element={<SadtCadastro />} />
          <Route path="/sadt/nova" element={<SadtNova />} />
          <Route path="/sadt/editar/:id" element={<SadtEditar />} />

          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/faturamento" element={<AdminFaturamento />} />
          <Route path="/admin/financas" element={<AdminFinancas />} />
          <Route path="/admin/retorno" element={<AdminRetorno />} />

          <Route path="/descricao-cirurgica" element={<DescricaoCirurgicaPage />} />
          <Route
            path="/descricao-cirurgica/:id/arquivos"
            element={<DescricaoCirurgicaArquivosPage />}
          />

          <Route path="/medico/dashboard" element={<MedicoInicio />} />
          <Route path="/medico/informacoes" element={<DashboardMedico />} />

          {/* Novo fluxo (renomeado) */}
          <Route
            path="/medico/faturamentos/enviar"
            element={<MedicoUploadDescricaoCirurgica />}
          />
          <Route
            path="/medico/guia-autorizacao/enviar"
            element={<MedicoUploadGuiaAutorizacao />}
          />
          <Route path="/medico/faturamentos" element={<MedicoFaturamentos />} />

          {/* Compatibilidade: rotas antigas */}
          <Route
            path="/medico/descricao-cirurgica/enviar"
            element={<Navigate to="/medico/faturamentos/enviar" replace />}
          />
          <Route
            path="/medico/descricao-cirurgica"
            element={<Navigate to="/medico/faturamentos" replace />}
          />

          <Route path="/cadastro/clinicas" element={<ClinicasCadastro />} />
          <Route path="/cadastro/hospitais" element={<HospitaisCadastro />} />
          <Route path="/cadastro/medicos" element={<MedicosCadastro />} />
          <Route
            path="/cadastro/gft"
            element={
              <AdminOrSuperAdminGuard>
                <GftCadastro />
              </AdminOrSuperAdminGuard>
            }
          />

          {/* Modelos de Descrição Cirúrgica (super_admin) */}
          <Route
            path="/admin/modelos-descricao-cirurgica"
            element={
              <SuperAdminGuard>
                <AdminModelosDescricaoCirurgica />
              </SuperAdminGuard>
            }
          />
          <Route
            path="/admin/modelos-descricao-cirurgica/novo"
            element={
              <SuperAdminGuard>
                <AdminModelosDescricaoCirurgicaForm />
              </SuperAdminGuard>
            }
          />
          <Route
            path="/admin/modelos-descricao-cirurgica/editar/:id"
            element={
              <SuperAdminGuard>
                <AdminModelosDescricaoCirurgicaForm />
              </SuperAdminGuard>
            }
          />

          {/* Gestão de Assinaturas (super_admin) */}
          <Route
            path="/admin/assinaturas/dashboard"
            element={
              <SuperAdminGuard>
                <AdminSubscriptionsDashboard />
              </SuperAdminGuard>
            }
          />
          <Route
            path="/admin/assinaturas/assinantes"
            element={
              <SuperAdminGuard>
                <AdminSubscribers />
              </SuperAdminGuard>
            }
          />
          <Route
            path="/admin/assinaturas/planos"
            element={
              <SuperAdminGuard>
                <AdminSubscriptionPlans />
              </SuperAdminGuard>
            }
          />
          <Route
            path="/admin/assinaturas/formulario-site"
            element={
              <SuperAdminGuard>
                <AdminSiteContactMessages />
              </SuperAdminGuard>
            }
          />

          <Route path="/admin/guia-solicitacao" element={<GuiaSolicitacaoPage />} />
          <Route path="/admin/guia-solicitacao/nova" element={<GuiaSolicitacaoFormPage />} />
          <Route path="/admin/guia-solicitacao/editar/:id" element={<GuiaSolicitacaoFormPage />} />

          <Route path="/admin/guia-autorizacao" element={<GuiaAutorizacaoPage />} />
          <Route path="/admin/guia-autorizacao/nova" element={<GuiaAutorizacaoFormPage />} />
          <Route path="/admin/guia-autorizacao/editar/:id" element={<GuiaAutorizacaoFormPage />} />

          <Route path="/admin/guia-honorarios" element={<GuiaHonorariosPage />} />
          <Route path="/admin/guia-honorarios/nova" element={<GuiaHonorariosFormPage />} />
          <Route path="/admin/guia-honorarios/editar/:id" element={<GuiaHonorariosFormPage />} />

          {/* Acompanhamento de SADT */}
          <Route path="/admin/sadt-acompanhamento" element={<SadtAcompanhamentoPage />} />
          <Route path="/admin/sadt-acompanhamento/nova" element={<SadtAcompanhamentoFormPage />} />
          <Route path="/admin/sadt-acompanhamento/lote" element={<SadtAcompanhamentoLote />} />
          <Route path="/admin/sadt-acompanhamento/editar/:id" element={<SadtAcompanhamentoFormPage />} />
          <Route path="/medico/sadt-acompanhamento" element={<SadtAcompanhamentoPage />} />
          <Route path="/medico/sadt-acompanhamento/lote" element={<SadtAcompanhamentoLote />} />
          <Route path="/medico/sadt-acompanhamento/enviar" element={<MedicoUploadSadtAcompanhamento />} />
          <Route path="/medico/sadt-acompanhamento/editar/:id" element={<SadtAcompanhamentoFormPage />} />
          {/* Alias amigável para o fluxo de acompanhamento (usado pelo menu flutuante do médico) */}
          <Route path="/medico/acompanhamento/enviar" element={<MedicoUploadSadtAcompanhamento />} />

          <Route path="/admin/descricao-cirurgica" element={<DescricaoCirurgicaAdminPage />} />
          <Route path="/admin/descricao-cirurgica/nova" element={<DescricaoCirurgicaAdminFormPage />} />
          <Route path="/admin/descricao-cirurgica/editar/:id" element={<DescricaoCirurgicaAdminFormPage />} />

          <Route path="/admin/modelos-emails" element={<AdminEmailTemplates />} />
          <Route path="/admin/modelos-emails/novo" element={<AdminEmailTemplateForm />} />
          <Route path="/admin/modelos-emails/:id" element={<AdminEmailTemplateForm />} />
          <Route path="/admin/modelos-emails/:id/editar" element={<AdminEmailTemplateForm />} />

          <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
          <Route
            path="/admin/configuracoes/converter-pdf"
            element={<AdminConverterPdf />}
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </SystemUserProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
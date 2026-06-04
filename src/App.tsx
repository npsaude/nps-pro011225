import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SystemUserProvider } from "@/contexts/SystemUserContext";

// Componentes de layout/guarda mantidos estáticos (leves e presentes em toda a
// aplicação). As páginas são carregadas sob demanda (code-splitting por rota)
// para reduzir o bundle inicial — libs pesadas (pdfjs/jspdf/html2canvas) ficam
// isoladas nos chunks das páginas que as usam.
import SuperAdminGuard from "@/components/auth/SuperAdminGuard";
import AdminOrSuperAdminGuard from "@/components/auth/AdminOrSuperAdminGuard";
import MedicoGuard from "@/components/auth/MedicoGuard";
import AuthUrlRouter from "@/components/auth/AuthUrlRouter";
import InactivityLogout from "@/components/auth/InactivityLogout";

const NotFound = lazy(() => import("./pages/NotFound"));
const SadtEnviar = lazy(() => import("./pages/SadtEnviar"));
const SadtSucesso = lazy(() => import("./pages/SadtSucesso"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SadtCadastro = lazy(() => import("./pages/SadtCadastro"));
const SadtNova = lazy(() => import("./pages/SadtNova"));
const SadtEditar = lazy(() => import("./pages/SadtEditar"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ClinicasCadastro = lazy(() => import("./pages/ClinicasCadastro"));
const MedicosCadastro = lazy(() => import("./pages/MedicosCadastro"));
const DashboardMedico = lazy(() => import("./pages/DashboardMedico"));
const AdminConfiguracoes = lazy(() => import("./pages/AdminConfiguracoes"));
const AdminConverterPdf = lazy(() => import("./pages/AdminConverterPdf"));
const DescricaoCirurgicaPage = lazy(() => import("./pages/DescricaoCirurgica"));
const MedicoUploadDescricaoCirurgica = lazy(() => import("./pages/MedicoUploadDescricaoCirurgica"));
const MedicoUploadGuiaAutorizacao = lazy(() => import("./pages/MedicoUploadGuiaAutorizacao"));
const MedicoFaturamentos = lazy(() => import("./pages/MedicoFaturamentos"));
const DescricaoCirurgicaArquivosPage = lazy(() => import("./pages/DescricaoCirurgicaArquivos"));
const HospitaisCadastro = lazy(() => import("./pages/HospitaisCadastro"));
const MedicoInicio = lazy(() => import("./pages/MedicoInicio"));
const AdminFaturamento = lazy(() => import("./pages/AdminFaturamento"));
const AdminFinancas = lazy(() => import("./pages/AdminFinancas"));
const AdminSubscriptionPlans = lazy(() => import("./pages/AdminSubscriptionPlans"));
const Welcome = lazy(() => import("./pages/Welcome"));
const FirstAccess = lazy(() => import("./pages/FirstAccess"));
const UnderConstruction = lazy(() => import("./pages/UnderConstruction"));
const AdminSubscriptionsDashboard = lazy(() => import("./pages/AdminSubscriptionsDashboard"));
const AdminSubscribers = lazy(() => import("./pages/AdminSubscribers"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminSiteContactMessages = lazy(() => import("./pages/AdminSiteContactMessages"));
const GuiaSolicitacaoPage = lazy(() => import("./pages/GuiaSolicitacao"));
const GuiaSolicitacaoFormPage = lazy(() => import("./pages/GuiaSolicitacaoForm"));
const GuiaAutorizacaoPage = lazy(() => import("./pages/GuiaAutorizacao"));
const GuiaAutorizacaoFormPage = lazy(() => import("./pages/GuiaAutorizacaoForm"));
const GuiaHonorariosPage = lazy(() => import("./pages/GuiaHonorarios"));
const GuiaHonorariosFormPage = lazy(() => import("./pages/GuiaHonorariosForm"));
const DescricaoCirurgicaAdminPage = lazy(() => import("./pages/DescricaoCirurgicaAdmin"));
const DescricaoCirurgicaAdminFormPage = lazy(() => import("./pages/DescricaoCirurgicaAdminForm"));
const GftCadastro = lazy(() => import("./pages/GftCadastro"));
const AdminModelosDescricaoCirurgica = lazy(() => import("./pages/AdminModelosDescricaoCirurgica"));
const AdminModelosDescricaoCirurgicaForm = lazy(() => import("./pages/AdminModelosDescricaoCirurgicaForm"));
const AdminEmailTemplates = lazy(() => import("./pages/AdminEmailTemplates"));
const AdminEmailTemplateForm = lazy(() => import("./pages/AdminEmailTemplateForm"));
const SadtAcompanhamentoPage = lazy(() => import("./pages/SadtAcompanhamento"));
const SadtAcompanhamentoFormPage = lazy(() => import("./pages/SadtAcompanhamentoForm"));
const MedicoUploadSadtAcompanhamento = lazy(() => import("./pages/MedicoUploadSadtAcompanhamento"));
const AdminRetorno = lazy(() => import("./pages/AdminRetorno"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#0b0b0b]">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A017]/30 border-t-[#D4A017]" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SystemUserProvider>
        <AuthUrlRouter />
        <InactivityLogout timeoutMinutes={60} />
        <Suspense fallback={<PageFallback />}>
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

          <Route path="/admin/dashboard" element={<AdminOrSuperAdminGuard redirectTo="/login"><Dashboard /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/faturamento" element={<AdminOrSuperAdminGuard redirectTo="/login"><AdminFaturamento /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/financas" element={<AdminOrSuperAdminGuard redirectTo="/login"><AdminFinancas /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/retorno" element={<AdminOrSuperAdminGuard redirectTo="/login"><AdminRetorno /></AdminOrSuperAdminGuard>} />

          <Route path="/descricao-cirurgica" element={<DescricaoCirurgicaPage />} />
          <Route
            path="/descricao-cirurgica/:id/arquivos"
            element={<DescricaoCirurgicaArquivosPage />}
          />

          <Route path="/medico/dashboard" element={<MedicoGuard><MedicoInicio /></MedicoGuard>} />
          <Route path="/medico/informacoes" element={<MedicoGuard><DashboardMedico /></MedicoGuard>} />

          {/* Novo fluxo (renomeado) */}
          <Route
            path="/medico/faturamentos/enviar"
            element={<MedicoGuard><MedicoUploadDescricaoCirurgica /></MedicoGuard>}
          />
          <Route
            path="/medico/guia-autorizacao/enviar"
            element={<MedicoGuard><MedicoUploadGuiaAutorizacao /></MedicoGuard>}
          />
          <Route path="/medico/faturamentos" element={<MedicoGuard><MedicoFaturamentos /></MedicoGuard>} />

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

          <Route path="/admin/guia-solicitacao" element={<AdminOrSuperAdminGuard redirectTo="/login"><GuiaSolicitacaoPage /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/guia-solicitacao/nova" element={<AdminOrSuperAdminGuard redirectTo="/login"><GuiaSolicitacaoFormPage /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/guia-solicitacao/editar/:id" element={<AdminOrSuperAdminGuard redirectTo="/login"><GuiaSolicitacaoFormPage /></AdminOrSuperAdminGuard>} />

          <Route path="/admin/guia-autorizacao" element={<AdminOrSuperAdminGuard redirectTo="/login"><GuiaAutorizacaoPage /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/guia-autorizacao/nova" element={<AdminOrSuperAdminGuard redirectTo="/login"><GuiaAutorizacaoFormPage /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/guia-autorizacao/editar/:id" element={<AdminOrSuperAdminGuard redirectTo="/login"><GuiaAutorizacaoFormPage /></AdminOrSuperAdminGuard>} />

          <Route path="/admin/guia-honorarios" element={<AdminOrSuperAdminGuard redirectTo="/login"><GuiaHonorariosPage /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/guia-honorarios/nova" element={<AdminOrSuperAdminGuard redirectTo="/login"><GuiaHonorariosFormPage /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/guia-honorarios/editar/:id" element={<AdminOrSuperAdminGuard redirectTo="/login"><GuiaHonorariosFormPage /></AdminOrSuperAdminGuard>} />

          {/* Acompanhamento de SADT */}
          <Route path="/admin/sadt-acompanhamento" element={<AdminOrSuperAdminGuard redirectTo="/login"><SadtAcompanhamentoPage /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/sadt-acompanhamento/nova" element={<AdminOrSuperAdminGuard redirectTo="/login"><SadtAcompanhamentoFormPage /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/sadt-acompanhamento/editar/:id" element={<AdminOrSuperAdminGuard redirectTo="/login"><SadtAcompanhamentoFormPage /></AdminOrSuperAdminGuard>} />
          <Route path="/medico/sadt-acompanhamento" element={<MedicoGuard><SadtAcompanhamentoPage /></MedicoGuard>} />
          <Route path="/medico/sadt-acompanhamento/enviar" element={<MedicoGuard><MedicoUploadSadtAcompanhamento /></MedicoGuard>} />
          <Route path="/medico/sadt-acompanhamento/editar/:id" element={<MedicoGuard><SadtAcompanhamentoFormPage /></MedicoGuard>} />
          {/* Alias amigável para o fluxo de acompanhamento (usado pelo menu flutuante do médico) */}
          <Route path="/medico/acompanhamento/enviar" element={<MedicoGuard><MedicoUploadSadtAcompanhamento /></MedicoGuard>} />

          <Route path="/admin/descricao-cirurgica" element={<AdminOrSuperAdminGuard redirectTo="/login"><DescricaoCirurgicaAdminPage /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/descricao-cirurgica/nova" element={<AdminOrSuperAdminGuard redirectTo="/login"><DescricaoCirurgicaAdminFormPage /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/descricao-cirurgica/editar/:id" element={<AdminOrSuperAdminGuard redirectTo="/login"><DescricaoCirurgicaAdminFormPage /></AdminOrSuperAdminGuard>} />

          <Route path="/admin/modelos-emails" element={<AdminOrSuperAdminGuard redirectTo="/login"><AdminEmailTemplates /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/modelos-emails/novo" element={<AdminOrSuperAdminGuard redirectTo="/login"><AdminEmailTemplateForm /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/modelos-emails/:id" element={<AdminOrSuperAdminGuard redirectTo="/login"><AdminEmailTemplateForm /></AdminOrSuperAdminGuard>} />
          <Route path="/admin/modelos-emails/:id/editar" element={<AdminOrSuperAdminGuard redirectTo="/login"><AdminEmailTemplateForm /></AdminOrSuperAdminGuard>} />

          <Route path="/admin/configuracoes" element={<AdminOrSuperAdminGuard redirectTo="/login"><AdminConfiguracoes /></AdminOrSuperAdminGuard>} />
          <Route
            path="/admin/configuracoes/converter-pdf"
            element={
              <AdminOrSuperAdminGuard redirectTo="/login">
                <AdminConverterPdf />
              </AdminOrSuperAdminGuard>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </SystemUserProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

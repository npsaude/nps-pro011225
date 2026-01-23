import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import MedicoDescricoesCirurgicas from "./pages/MedicoDescricoesCirurgicas";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthUrlRouter />
        <InactivityLogout timeoutMinutes={60} />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login-medico" element={<LoginMedico />} />

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

          <Route path="/descricao-cirurgica" element={<DescricaoCirurgicaPage />} />
          <Route path="/descricao-cirurgica/:id/arquivos" element={<DescricaoCirurgicaArquivosPage />} />

          <Route path="/medico/dashboard" element={<MedicoInicio />} />
          <Route path="/medico/informacoes" element={<DashboardMedico />} />
          <Route path="/medico/descricao-cirurgica/enviar" element={<MedicoUploadDescricaoCirurgica />} />
          <Route path="/medico/descricao-cirurgica" element={<MedicoDescricoesCirurgicas />} />

          <Route path="/cadastro/clinicas" element={<ClinicasCadastro />} />
          <Route path="/cadastro/hospitais" element={<HospitaisCadastro />} />
          <Route path="/cadastro/medicos" element={<MedicosCadastro />} />

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

          <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
          <Route path="/admin/configuracoes/converter-pdf" element={<AdminConverterPdf />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
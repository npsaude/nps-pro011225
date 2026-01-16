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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Boas-vindas */}
          <Route path="/" element={<Welcome />} />

          {/* Acesso */}
          <Route path="/login" element={<Login />} />
          <Route path="/login-medico" element={<LoginMedico />} />

          {/* Primeiro acesso: envia link para cadastrar senha */}
          <Route path="/primeiro-acesso" element={<FirstAccess />} />

          {/* Cadastro/definição de senha (via link recebido por e-mail) */}
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/sadt/enviar" element={<SadtEnviar />} />
          <Route path="/sadt/sucesso" element={<SadtSucesso />} />
          <Route path="/sadt/cadastro" element={<SadtCadastro />} />
          <Route path="/sadt/nova" element={<SadtNova />} />
          <Route path="/sadt/editar/:id" element={<SadtEditar />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/faturamento" element={<AdminFaturamento />} />
          <Route path="/admin/financas" element={<AdminFinancas />} />

          {/* Nova tela de Descrição Cirúrgica (admin) */}
          <Route
            path="/descricao-cirurgica"
            element={<DescricaoCirurgicaPage />}
          />
          <Route
            path="/descricao-cirurgica/:id/arquivos"
            element={<DescricaoCirurgicaArquivosPage />}
          />

          {/* Dashboard específico para médico */}
          <Route path="/medico/dashboard" element={<MedicoInicio />} />
          <Route path="/medico/informacoes" element={<DashboardMedico />} />

          {/* Envio de arquivos da descrição cirúrgica pelo médico */}
          <Route
            path="/medico/descricao-cirurgica/enviar"
            element={<MedicoUploadDescricaoCirurgica />}
          />

          {/* Acompanhamento das descrições cirúrgicas pelo médico */}
          <Route
            path="/medico/descricao-cirurgica"
            element={<MedicoDescricoesCirurgicas />}
          />

          {/* Cadastros administrativos */}
          <Route path="/cadastro/clinicas" element={<ClinicasCadastro />} />
          <Route path="/cadastro/hospitais" element={<HospitaisCadastro />} />
          <Route path="/cadastro/medicos" element={<MedicosCadastro />} />
          <Route
            path="/admin/assinaturas/planos"
            element={<AdminSubscriptionPlans />}
          />

          {/* Configurações administrativas */}
          <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
          <Route
            path="/admin/configuracoes/converter-pdf"
            element={<AdminConverterPdf />}
          />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Tela inicial agora é o Login administrativo */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login-medico" element={<LoginMedico />} />

          <Route path="/sadt/enviar" element={<SadtEnviar />} />
          <Route path="/sadt/sucesso" element={<SadtSucesso />} />
          <Route path="/sadt/cadastro" element={<SadtCadastro />} />
          <Route path="/sadt/nova" element={<SadtNova />} />
          <Route path="/sadt/editar/:id" element={<SadtEditar />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
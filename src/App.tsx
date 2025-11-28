import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import NotFound from "./pages/NotFound";
import SadtEnviar from "./pages/SadtEnviar";
import SadtSucesso from "./pages/SadtSucesso";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Tela inicial agora é o Login */}
          <Route path="/" element={<Login />} />
          <Route path="/sadt/enviar" element={<SadtEnviar />} />
          <Route path="/sadt/sucesso" element={<SadtSucesso />} />
          {/* Mantém /login como atalho para a mesma tela */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
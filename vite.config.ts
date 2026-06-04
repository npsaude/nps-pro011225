import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa as libs de terceiros em chunks estáveis por família, para
        // melhorar o cache do navegador e enxugar o bundle principal.
        // heic2any/browser-image-compression continuam carregadas sob demanda
        // (import dinâmico), então não entram nesses chunks eager.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("heic2any") || id.includes("browser-image-compression")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
            return "react-vendor";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("recharts") || id.includes("/d3-")) return "charts";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("react-hook-form") || id.includes("@hookform")) return "forms";
          if (id.includes("lucide-react")) return "icons";
          // Demais libs: deixa o Rollup decidir (preserva o split por rota lazy).
          return undefined;
        },
      },
    },
  },
}));
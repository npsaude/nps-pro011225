import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  const cmd = new Deno.Command("git", {
    args: ["checkout", "src/pages/MedicoUploadDescricaoCirurgica.tsx", "src/pages/MedicoUploadGuiaAutorizacao.tsx", "src/pages/MedicoUploadGuiaSolicitacao.tsx"],
  });
  const output = await cmd.output();
  return new Response(new TextDecoder().decode(output.stdout));
});

// Função desativada: era um resquício de desenvolvimento que executava
// comandos git no runtime e estava exposta sem autenticação. Mantida apenas
// como stub para responder 410 a qualquer chamada remanescente.
Deno.serve(() =>
  new Response(
    JSON.stringify({ error: "Gone: esta função foi desativada." }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  ),
);

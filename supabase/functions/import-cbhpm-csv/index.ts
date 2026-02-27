import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type CbhpmRow = {
  codigo: string;
  descricao: string;
  porte?: string | null;
  valor_porte?: number | null;
  porte_anestesico?: string | null;
  incidencia?: string | null;
  n_auxiliares?: number | null;
  video?: string | null;
};

type RequestBody = {
  rows: CbhpmRow[];
};

serve(async (req) => {
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  console.log("[import-cbhpm-csv] Iniciando importação...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("[import-cbhpm-csv] Variáveis SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY ausentes.");
    return new Response(
      JSON.stringify({ error: "Configuração do Supabase ausente." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Autenticação: valida o token do usuário chamador
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !userRes?.user) {
    console.error("[import-cbhpm-csv] Token inválido.", userErr);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = userRes.user.id;

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  // Autorização: apenas ADMIN/SUPER_ADMIN
  const { data: userRoleRow, error: roleErr } = await supabaseAdmin
    .from("usuarios_sistema")
    .select("regra, ativo")
    .eq("id_user", userId)
    .maybeSingle();

  if (roleErr) {
    console.error("[import-cbhpm-csv] Erro ao buscar role.", roleErr);
    return new Response(JSON.stringify({ error: "Erro ao validar permissões." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const regra = String((userRoleRow as any)?.regra ?? "").toLowerCase();
  const ativo = Boolean((userRoleRow as any)?.ativo);

  if (!ativo || (regra !== "admin" && regra !== "super_admin")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch (e) {
    console.error("[import-cbhpm-csv] JSON inválido.", e);
    return new Response(JSON.stringify({ error: "Body JSON inválido." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = Array.isArray(body?.rows) ? body.rows : [];

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "Nenhuma linha para importar." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cleaned = rows
    .map((r) => ({
      codigo: String(r.codigo ?? "").trim(),
      descricao: String(r.descricao ?? "").trim(),
      porte: r.porte ?? null,
      valor_porte:
        r.valor_porte === null || r.valor_porte === undefined
          ? null
          : Number(r.valor_porte),
      porte_anestesico: r.porte_anestesico ?? null,
      incidencia: r.incidencia ?? null,
      n_auxiliares:
        r.n_auxiliares === null || r.n_auxiliares === undefined
          ? null
          : Number(r.n_auxiliares),
      video: r.video ?? null,
    }))
    .filter((r) => r.codigo && r.descricao);

  if (cleaned.length === 0) {
    return new Response(JSON.stringify({ error: "Nenhuma linha válida (codigo/descricao)." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[import-cbhpm-csv] Linhas recebidas:", rows.length, "válidas:", cleaned.length);

  // UPSERT substitui duplicadas (por conflito em codigo)
  const { error: upsertErr } = await supabaseAdmin
    .from("cbhpm_cirurgias")
    .upsert(cleaned, { onConflict: "codigo" });

  if (upsertErr) {
    console.error("[import-cbhpm-csv] Erro no upsert.", upsertErr);
    return new Response(
      JSON.stringify({ error: "Erro ao gravar cbhpm_cirurgias.", details: upsertErr.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log("[import-cbhpm-csv] Importação concluída.");

  return new Response(
    JSON.stringify({ success: true, processed: cleaned.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

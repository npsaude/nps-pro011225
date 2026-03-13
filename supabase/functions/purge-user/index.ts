import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalizeEmail(email: unknown) {
  return String(email ?? "").trim().toLowerCase();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error("[purge-user] Missing env vars", {
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(supabaseAnonKey),
      hasServiceRoleKey: Boolean(supabaseServiceRoleKey),
    });
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    console.error("[purge-user] Invalid auth", { userError });
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const requester = userData.user;
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: isSuperAdmin, error: superAdminError } = await adminClient.rpc(
    "is_super_admin",
    { p_user_id: requester.id },
  );

  if (superAdminError) {
    console.error("[purge-user] Failed to validate super admin", {
      superAdminError,
      requesterId: requester.id,
    });
    return new Response(JSON.stringify({ error: "Failed to validate permissions" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!isSuperAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null);
  const email = normalizeEmail(body?.email);

  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ error: "Email inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[purge-user] Starting purge", {
    requesterId: requester.id,
    targetEmail: email,
  });

  // 1) Descobre o user_id no auth
  const { data: authUserRow, error: authLookupError } = await adminClient
    .schema("auth")
    .from("users")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (authLookupError) {
    console.error("[purge-user] Failed to look up auth user", {
      authLookupError,
      email,
    });
    return new Response(JSON.stringify({ error: "Falha ao buscar usuário" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!authUserRow?.id) {
    return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const targetUserId = authUserRow.id as string;

  // 2) Deleta dados das tabelas (DB)
  const { data: dbResult, error: dbError } = await adminClient.rpc(
    "purge_user_everything",
    { p_email: email },
  );

  if (dbError) {
    console.error("[purge-user] DB purge failed", { dbError, email, targetUserId });
    return new Response(JSON.stringify({ error: "Falha ao excluir dados do banco" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3) Remove arquivos de Storage (todos os buckets, por padrão de path)
  let deletedStorageObjects = 0;
  const { data: buckets, error: bucketsError } = await adminClient.storage
    .listBuckets();

  if (bucketsError) {
    console.error("[purge-user] Failed to list buckets", { bucketsError });
  } else {
    for (const b of buckets ?? []) {
      const bucketId = (b as any).id as string;

      const { data: objects, error: objectsError } = await adminClient
        .schema("storage")
        .from("objects")
        .select("name")
        .eq("bucket_id", bucketId)
        .or(`name.ilike.%/${targetUserId}/%,name.ilike.${targetUserId}/%`)
        .limit(5000);

      if (objectsError) {
        console.error("[purge-user] Failed to list objects", {
          objectsError,
          bucketId,
          targetUserId,
        });
        continue;
      }

      const names = (objects ?? [])
        .map((o: any) => String(o?.name ?? "").trim())
        .filter(Boolean);

      if (!names.length) continue;

      for (const batch of chunk(names, 100)) {
        const { error: removeError } = await adminClient.storage
          .from(bucketId)
          .remove(batch);

        if (removeError) {
          console.error("[purge-user] Failed to remove objects", {
            removeError,
            bucketId,
            batchCount: batch.length,
          });
          continue;
        }

        deletedStorageObjects += batch.length;
      }
    }
  }

  // 4) Exclui usuário do Auth
  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
    targetUserId,
  );

  if (deleteAuthError) {
    console.error("[purge-user] Failed to delete auth user", {
      deleteAuthError,
      targetUserId,
      email,
    });
    return new Response(
      JSON.stringify({
        error: "Falha ao excluir usuário no Auth",
        details: deleteAuthError.message,
        dbResult,
        deletedStorageObjects,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log("[purge-user] Purge completed", {
    targetUserId,
    email,
    deletedStorageObjects,
  });

  return new Response(
    JSON.stringify({
      status: "ok",
      email,
      user_id: targetUserId,
      db: dbResult,
      deletedStorageObjects,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});

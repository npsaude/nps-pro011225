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

type DbPurgeResult = {
  status: "ok" | "not_found";
  email?: string;
  user_id?: string;
  deleted?: unknown;
};

type StorageObj = { bucket_id: string; name: string };

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

  // 1) Purga no banco e também descobre o user_id (consultando auth.users via SQL definer)
  const { data: dbResultRaw, error: dbError } = await adminClient.rpc(
    "purge_user_everything",
    { p_email: email },
  );

  if (dbError) {
    console.error("[purge-user] DB purge failed", { dbError, email });
    return new Response(JSON.stringify({ error: "Falha ao excluir dados do banco" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const dbResult = (dbResultRaw ?? null) as DbPurgeResult | null;

  if (!dbResult || dbResult.status === "not_found" || !dbResult.user_id) {
    return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const targetUserId = String(dbResult.user_id);

  // 2) Remove arquivos de Storage (usando função SQL definer que acessa storage.objects)
  const { data: storageRows, error: storageListError } = await adminClient.rpc(
    "list_storage_objects_for_user",
    { p_user_id: targetUserId },
  );

  if (storageListError) {
    console.error("[purge-user] Failed to list storage objects", {
      storageListError,
      targetUserId,
    });
    return new Response(JSON.stringify({ error: "Falha ao listar arquivos do Storage" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const objects = ((storageRows ?? []) as StorageObj[])
    .map((o) => ({ bucket_id: String((o as any).bucket_id), name: String((o as any).name) }))
    .filter((o) => o.bucket_id && o.name);

  const byBucket = new Map<string, string[]>();
  for (const o of objects) {
    const list = byBucket.get(o.bucket_id) ?? [];
    list.push(o.name);
    byBucket.set(o.bucket_id, list);
  }

  let deletedStorageObjects = 0;
  for (const [bucketId, names] of byBucket.entries()) {
    for (const batch of chunk(names, 100)) {
      const { error: removeError } = await adminClient.storage.from(bucketId).remove(batch);

      if (removeError) {
        console.error("[purge-user] Failed to remove objects", {
          removeError,
          bucketId,
          batchCount: batch.length,
        });
        return new Response(JSON.stringify({ error: "Falha ao remover arquivos do Storage" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      deletedStorageObjects += batch.length;
    }
  }

  // 3) Exclui usuário do Auth
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
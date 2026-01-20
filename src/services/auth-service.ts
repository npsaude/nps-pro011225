import type { DbSystemUser } from "@/db/schema";
import { supabase } from "@/integrations/supabase/client";
import { salvarMedico } from "@/services/medicos-service";

export type AllowedRole = "ADMIN" | "MEDICO" | "SUPER_ADMIN";

export type RegisterRole = "ADMIN" | "MEDICO";

export interface LoginResult {
  user: DbSystemUser | null;
  role: AllowedRole | null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeRole(role: unknown): AllowedRole {
  const normalized = String(role ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/_+/g, "_");

  // mapeia variações (ex.: "médico(a)", "medico", "SUPER ADMIN", etc.)
  if (normalized.includes("SUPER")) return "SUPER_ADMIN";
  if (normalized.includes("MEDIC")) return "MEDICO";
  if (normalized.includes("ADMIN")) return "ADMIN";

  // fallback (mantém erro mais claro em caso de valor inesperado)
  return normalized as AllowedRole;
}

async function loadSystemUsersByEmail(email: string): Promise<DbSystemUser[]> {
  const normalized = normalizeEmail(email);

  const { data, error } = await supabase
    .from("usuarios_sistema")
    .select("*")
    // Busca tolerante: se houver espaços antes/depois no banco, ainda retorna
    .ilike("email", `%${normalized}%`)
    .limit(25);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Erro ao carregar usuarios_sistema por email (ilike):", error);
    return [];
  }

  const rows = ((data ?? []) as DbSystemUser[]).map((r) => ({
    ...r,
    email: typeof (r as any).email === "string" ? (r as any).email : "",
  }));

  // Preferência: match exato após normalização (trim + lowercase)
  const exact = rows.filter((r) => normalizeEmail(r.email) === normalized);
  return exact.length ? exact : rows;
}

function pickBestSystemUser(
  users: DbSystemUser[],
  allowedRole: AllowedRole,
): DbSystemUser | null {
  if (!users.length) return null;

  const active = users.filter((u) => (u as any)?.ativo === true);
  const pool = active.length ? active : users;

  const withRole = pool.map((u) => ({
    user: u,
    role: normalizeRole((u as any)?.regra),
  }));

  const pick = (roles: AllowedRole[]) =>
    roles
      .map((r) => withRole.find((x) => x.role === r)?.user ?? null)
      .find((u) => u !== null) ?? null;

  if (allowedRole === "MEDICO") return pick(["MEDICO"]);
  if (allowedRole === "SUPER_ADMIN") return pick(["SUPER_ADMIN"]);

  // Portal admin: permite apenas ADMIN/SUPER_ADMIN e prefere SUPER_ADMIN
  return pick(["SUPER_ADMIN", "ADMIN"]);
}

async function loadSystemUserByEmail(email: string): Promise<DbSystemUser | null> {
  const users = await loadSystemUsersByEmail(email);
  return users[0] ?? null;
}

/**
 * Login via Supabase Auth (email/senha).
 * Depois de autenticar, carrega o registro em usuarios_sistema
 * usando o e-mail (case-insensitive).
 */
export async function loginWithRole(params: {
  email: string;
  password: string;
  allowedRole: AllowedRole;
}): Promise<LoginResult> {
  const { email, password, allowedRole } = params;

  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      throw new Error(
        "Seu cadastro ainda não foi confirmado. Verifique seu e-mail e clique no link de confirmação.",
      );
    }

    throw new Error(
      error.message || "Não foi possível autenticar. Verifique e-mail e senha.",
    );
  }

  if (!data.user) {
    throw new Error("Usuário não retornado pelo provedor de autenticação.");
  }

  const systemUsers = await loadSystemUsersByEmail(normalizedEmail);
  const systemUser = pickBestSystemUser(systemUsers, allowedRole);

  // Garante que exista um registro em usuarios_sistema
  if (!systemUser) {
    throw new Error(
      "Seu usuário não está vinculado corretamente ao sistema. Entre em contato com o administrador.",
    );
  }

  if ((systemUser as any)?.ativo === false) {
    await supabase.auth.signOut();
    throw new Error(
      "Seu acesso está desativado. Entre em contato com o administrador.",
    );
  }

  const userRole = normalizeRole((systemUser as any)?.regra);

  // Garante que o papel do usuário é o permitido para essa área
  const allowedRoles: AllowedRole[] =
    allowedRole === "ADMIN"
      ? (["ADMIN", "SUPER_ADMIN"] as AllowedRole[])
      : ([allowedRole] as AllowedRole[]);

  if (!allowedRoles.includes(userRole)) {
    // Encerra sessão para evitar sessão ativa em área errada
    await supabase.auth.signOut();

    if (allowedRole === "MEDICO") {
      throw new Error(
        "Esta área é exclusiva para médicos. Utilize o acesso administrativo ou peça ao administrador para ajustar seu perfil.",
      );
    }

    throw new Error(
      "Esta área é exclusiva para administradores. Utilize o acesso do médico ou peça ao administrador para ajustar seu perfil.",
    );
  }

  return {
    user: systemUser,
    role: userRole ?? null,
  };
}

/**
 * Cadastro / sincronização:
 * - Se o usuário ainda não existir no Auth, faz signUp.
 * - Se já existir ("User already registered"), apenas valida a senha.
 * - Em ambos os casos, garante que exista um registro em usuarios_sistema
 *   (criando ou atualizando pela coluna email).
 * - Se o usuário for MÉDICO, também garante um registro inicial em medicos.
 */
export async function registerUser(params: {
  nome: string;
  email: string;
  password: string;
  role: RegisterRole;
}): Promise<DbSystemUser> {
  const { nome, email, password, role } = params;

  const normalizedEmail = normalizeEmail(email);

  // 1) Tenta criar no Auth
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        role,
        nome,
      },
      emailRedirectTo: window.location.origin + "/login",
    },
  });

  if (signUpError) {
    const msg = signUpError.message?.toLowerCase() ?? "";

    // Se já existir no Auth, validamos a senha com signIn e seguimos.
    if (msg.includes("user already registered")) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        throw new Error(
          signInError.message ||
            "Este e-mail já está cadastrado e a senha informada não confere.",
        );
      }

      // eslint-disable-next-line no-console
      console.log(
        "Usuário já existia no Auth; senha validada e prosseguindo para sincronizar usuarios_sistema.",
      );
    } else {
      // eslint-disable-next-line no-console
      console.error("Erro no signUp do Supabase Auth:", {
        email: normalizedEmail,
        signUpError,
      });

      throw new Error(
        signUpError.message ||
          "Não foi possível criar o usuário na autenticação. Verifique os dados informados.",
      );
    }
  } else {
    if (!signUpData.user) {
      throw new Error(
        "Usuário não foi retornado pelo provedor de autenticação.",
      );
    }

    // eslint-disable-next-line no-console
    console.log("Usuário criado no Auth com sucesso:", {
      authUserId: signUpData.user.id,
      email: signUpData.user.email,
      metadata: signUpData.user.user_metadata,
    });
  }

  // 2) Garante cadastro em usuarios_sistema (create/update por e-mail)
  const insertPayload = {
    nome,
    email: normalizedEmail,
    celular: null as string | null,
    regra: role,
    ativo: true,
  };

  // Primeiro, verifica se já existe (case-insensitive)
  const existing = await loadSystemUserByEmail(normalizedEmail);

  let upsertResult: DbSystemUser | null = null;

  if (existing) {
    // Atualiza registro existente (igualando por email ilike)
    const { data: updated, error: updateError } = await supabase
      .from("usuarios_sistema")
      .update(insertPayload)
      .ilike("email", normalizedEmail)
      .select("*")
      .maybeSingle();

    if (updateError) {
      // eslint-disable-next-line no-console
      console.error("Erro ao atualizar usuarios_sistema:", {
        email: normalizedEmail,
        insertPayload,
        updateError,
      });

      throw new Error(
        updateError.message ||
          "Não foi possível atualizar o cadastro do usuário no sistema.",
      );
    }

    upsertResult = updated as DbSystemUser | null;
    // eslint-disable-next-line no-console
    console.log("Registro atualizado em usuarios_sistema:", upsertResult);
  } else {
    // Cria novo registro
    const { data: inserted, error: insertError } = await supabase
      .from("usuarios_sistema")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError) {
      // eslint-disable-next-line no-console
      console.error("Erro ao inserir em usuarios_sistema:", {
        insertPayload,
        insertError,
      });

      throw new Error(
        insertError.message ||
          "Usuário criado/validado na autenticação, mas não foi possível salvar no cadastro de usuários do sistema.",
      );
    }

    upsertResult = inserted as DbSystemUser;
    // eslint-disable-next-line no-console
    console.log("Registro criado em usuarios_sistema com sucesso:", upsertResult);
  }

  if (!upsertResult) {
    throw new Error(
      "Não foi possível obter o cadastro do usuário após salvar em usuarios_sistema.",
    );
  }

  // 3) Se for médico, garante um registro inicial na tabela medicos
  if (role === "MEDICO") {
    try {
      await salvarMedico({
        id: upsertResult.id_user,
        nome: upsertResult.nome,
        email: upsertResult.email,
        telefone_whatsapp: null,
        crm: null,
        clinicas_ids: [],
        hospitais_ids: [], // médico recém-criado ainda sem hospitais vinculados
      });
      // eslint-disable-next-line no-console
      console.log(
        "Registro inicial criado/atualizado na tabela medicos para o usuário médico:",
        upsertResult.id_user,
      );
    } catch (error) {
      // Não bloqueia o fluxo, apenas loga para diagnóstico
      // eslint-disable-next-line no-console
      console.error(
        "Não foi possível criar/atualizar o registro inicial em medicos para o usuário médico:",
        {
          usuarioSistema: upsertResult,
          error,
        },
      );
    }
  }

  return upsertResult;
}

/**
 * Inicia fluxo de recuperação de senha via e-mail do Supabase.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: window.location.origin + "/reset-password",
  });

  if (error) {
    throw new Error(
      error.message ||
        "Não foi possível enviar o e-mail de recuperação de senha.",
    );
  }
}

/**
 * Atualiza senha do usuário logado (parte final do fluxo de reset).
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(
      error.message || "Não foi possível atualizar a senha. Tente novamente.",
    );
  }
}

/**
 * Encerra sessão atual.
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message || "Erro ao encerrar sessão.");
  }
}
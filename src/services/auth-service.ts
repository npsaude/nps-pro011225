import type { DbSystemUser } from "@/db/schema";
import { supabase } from "@/integrations/supabase/client";

export type AllowedRole = "ADMIN" | "MEDICO";

export interface LoginResult {
  user: DbSystemUser | null;
  role: AllowedRole | null;
}

/**
 * Login via Supabase Auth (email/senha).
 * Após autenticar, busca o registro correspondente em usuarios_sistema
 * usando o e-mail informado no login. Não bloqueia por regra/ativo
 * durante o desenvolvimento, apenas retorna os dados se existirem.
 */
export async function loginWithRole(params: {
  email: string;
  password: string;
  allowedRole: AllowedRole; // mantido para compatibilidade, mas não bloqueia por isso em dev
}): Promise<LoginResult> {
  const { email, password } = params;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
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

  // Busca correspondente em usuarios_sistema (sem bloquear login em dev)
  const { data: systemUser, error: systemUserError } = await supabase
    .from("usuarios_sistema")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (systemUserError) {
    // eslint-disable-next-line no-console
    console.error("Erro ao carregar usuarios_sistema:", systemUserError);
  }

  const typedUser = systemUser as DbSystemUser | null;

  return {
    user: typedUser,
    role: typedUser?.regra ?? null,
  };
}

/**
 * Cadastro:
 * 1) Cria usuário no Supabase Auth.
 * 2) Cria registro correspondente em usuarios_sistema com regra e ativo=true.
 */
export async function registerUser(params: {
  nome: string;
  email: string;
  password: string;
  role: AllowedRole;
}): Promise<DbSystemUser> {
  const { nome, email, password, role } = params;

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
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
    throw new Error(
      signUpError.message ||
        "Não foi possível criar o usuário. Verifique os dados informados.",
    );
  }

  if (!signUpData.user) {
    throw new Error("Usuário não foi retornado pelo provedor de autenticação.");
  }

  // Cria o registro em usuarios_sistema.
  const insertPayload = {
    nome,
    email,
    celular: null,
    regra: role,
    ativo: true,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("usuarios_sistema")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError) {
    // Log detalhado no console para facilitar o debug em desenvolvimento
    // eslint-disable-next-line no-console
    console.error("Erro ao inserir em usuarios_sistema:", {
      insertPayload,
      insertError,
    });

    throw new Error(
      insertError.message ||
        "Usuário criado na autenticação, mas não foi possível salvar no cadastro de usuários do sistema.",
    );
  }

  return inserted as DbSystemUser;
}

/**
 * Inicia fluxo de recuperação de senha via e-mail do Supabase.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
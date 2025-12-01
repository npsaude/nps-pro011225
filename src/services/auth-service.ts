import type { DbSystemUser } from "@/db/schema";
import { supabase } from "@/integrations/supabase/client";

export type AllowedRole = "ADMIN" | "MEDICO";

export interface LoginResult {
  user: DbSystemUser;
  role: AllowedRole;
}

/**
 * Login real via Supabase Auth (email/senha) + validação de regra na tabela usuarios_sistema.
 */
export async function loginWithRole(params: {
  email: string;
  password: string;
  allowedRole: AllowedRole;
}): Promise<LoginResult> {
  const { email, password, allowedRole } = params;

  // 1) Login no Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Mensagens mais amigáveis
    if (error.message.toLowerCase().includes("email not confirmed")) {
      throw new Error(
        "Seu cadastro ainda não foi confirmado. Verifique seu e-mail e clique no link de confirmação.",
      );
    }

    throw new Error(
      error.message || "Não foi possível autenticar. Verifique e-mail e senha.",
    );
  }

  const authUserEmail = data.user?.email;
  if (!authUserEmail) {
    throw new Error(
      "Usuário autenticado sem e-mail. Verifique a configuração de autenticação.",
    );
  }

  // 2) Buscar usuário na tabela de sistema
  const { data: usuarios, error: usuarioError } = await supabase
    .from("usuarios_sistema")
    .select("*")
    .eq("email", authUserEmail)
    .limit(1);

  if (usuarioError) {
    throw new Error(
      usuarioError.message ||
        "Erro ao carregar dados do usuário do sistema (usuarios_sistema).",
    );
  }

  if (!usuarios || usuarios.length === 0) {
    throw new Error(
      "Usuário autenticado, mas não encontrado na tabela usuarios_sistema.",
    );
  }

  const usuario = usuarios[0] as DbSystemUser;

  if (!usuario.ativo) {
    throw new Error("Usuário inativo. Entre em contato com o administrador.");
  }

  if (usuario.regra !== allowedRole) {
    if (allowedRole === "ADMIN") {
      throw new Error(
        "Este acesso é exclusivo para administradores. Utilize o login de administrador.",
      );
    }
    if (allowedRole === "MEDICO") {
      throw new Error(
        "Este acesso é exclusivo para médicos. Utilize o login de médico.",
      );
    }
    throw new Error("Você não tem permissão para acessar esta área.");
  }

  return { user: usuario, role: usuario.regra };
}

/**
 * Cadastro real:
 * 1) Cria usuário no Supabase Auth (envia e-mail de confirmação automaticamente).
 * 2) Cria registro correspondente na tabela usuarios_sistema com regra e ativo=true.
 */
export async function registerUser(params: {
  nome: string;
  email: string;
  password: string;
  role: AllowedRole;
}): Promise<DbSystemUser> {
  const { nome, email, password, role } = params;

  // 1) Cria usuário no Auth, disparando e-mail de confirmação
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

  // 2) Cria registro em usuarios_sistema
  const { data: inserted, error: insertError } = await supabase
    .from("usuarios_sistema")
    .insert({
      nome,
      email,
      celular: null,
      regra: role,
      ativo: true,
    })
    .select("*")
    .single();

  if (insertError) {
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
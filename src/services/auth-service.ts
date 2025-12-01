import type { DbSystemUser } from "@/db/schema";
import { supabase } from "@/integrations/supabase/client";

export type AllowedRole = "ADMIN" | "MEDICO";

export interface LoginResult {
  user: DbSystemUser;
  role: AllowedRole;
}

/**
 * Envia um link mágico (OTP) para o e-mail informado,
 * depois de validar se existe um usuário em usuarios_sistema com a regra correta.
 *
 * Fluxo:
 * 1) Busca na tabela usuarios_sistema pelo e-mail e valida regra/ativo.
 * 2) Chama supabase.auth.signInWithOtp para enviar o link de login.
 */
export async function requestLoginLinkWithRole(params: {
  email: string;
  allowedRole: AllowedRole;
}): Promise<LoginResult> {
  const { email, allowedRole } = params;

  // 1) Valida usuário na tabela de sistema
  const { data: usuarios, error: usuarioError } = await supabase
    .from("usuarios_sistema")
    .select("*")
    .eq("email", email)
    .limit(1);

  if (usuarioError) {
    throw new Error(
      usuarioError.message || "Erro ao carregar dados do usuário do sistema.",
    );
  }

  if (!usuarios || usuarios.length === 0) {
    throw new Error(
      "Usuário não encontrado na tabela de usuários do sistema (usuarios_sistema).",
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

  // 2) Envia link mágico de login para o e-mail
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + "/admin/dashboard",
      // Podemos reaproveitar metadados se quiser,
      // mas aqui basta o e-mail para autenticar.
    },
  });

  if (otpError) {
    throw new Error(
      otpError.message ||
        "Não foi possível enviar o link de acesso. Tente novamente.",
    );
  }

  return { user: usuario, role: usuario.regra };
}

/**
 * Cria um usuário no Supabase Auth e vincula na tabela usuarios_sistema
 * com a regra especificada (ADMIN ou MEDICO).
 */
export async function registerUser(params: {
  nome: string;
  email: string;
  password: string;
  role: AllowedRole;
}): Promise<DbSystemUser> {
  const { nome, email, password, role } = params;

  // 1) Cria usuário no Auth
  const { data: signUpData, error: signUpError } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          nome,
        },
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
 * Inicia fluxo de recuperação de senha via Supabase.
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
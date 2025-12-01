import { createClient } from "@supabase/supabase-js";
import type { DbSystemUser } from "@/db/schema";

// Mesmo client usado globalmente; aqui criamos um client leve só para tipagem.
// Em runtime, o código real é o do arquivo de integração.
const supabaseUrl = "https://pokyribuibmbeorrcsgk.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBva3lyaWJ1aWJtYmVvcnJjc2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzc3OTAsImV4cCI6MjA3OTg1Mzc5MH0.YRSDKlnIdJPkQCXjo9FEci_YvRXgO717PqbkZpm3h2k";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AllowedRole = "ADMIN" | "MEDICO";

export interface LoginResult {
  user: DbSystemUser;
  role: AllowedRole;
}

/**
 * Faz login via Supabase Auth com email/senha e valida a regra do usuário
 * na tabela usuarios_sistema.
 */
export async function loginWithRole(params: {
  email: string;
  password: string;
  allowedRole: AllowedRole;
}): Promise<LoginResult> {
  const { email, password, allowedRole } = params;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(
      error.message || "Não foi possível autenticar. Verifique seus dados.",
    );
  }

  const authUserEmail = data.user?.email;
  if (!authUserEmail) {
    throw new Error("Usuário autenticado sem e-mail. Verifique a configuração.");
  }

  // Busca usuário de sistema com o mesmo email
  const { data: usuarios, error: usuarioError } = await supabase
    .from("usuarios_sistema")
    .select("*")
    .eq("email", authUserEmail)
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

  return { user: usuario, role: usuario.regra };
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
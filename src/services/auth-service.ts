import type { DbSystemUser } from "@/db/schema";
import { supabase } from "@/integrations/supabase/client";

export type AllowedRole = "ADMIN" | "MEDICO";

export interface LoginResult {
  user: DbSystemUser;
  role: AllowedRole;
}

interface MockAuthUser {
  email: string;
  password: string; // para ambiente real, use hash; aqui é só DEV
  role: AllowedRole;
  confirmed: boolean;
}

const MOCK_AUTH_KEY = "mock-auth-users";

function loadMockUsers(): MockAuthUser[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(MOCK_AUTH_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MockAuthUser[];
  } catch {
    return [];
  }
}

function saveMockUsers(users: MockAuthUser[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_AUTH_KEY, JSON.stringify(users));
}

/**
 * Marca usuário como confirmado (simula clique no link de confirmação enviado por e-mail).
 */
export async function confirmUser(email: string): Promise<void> {
  if (typeof window === "undefined") return;
  const users = loadMockUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) {
    throw new Error("Usuário não encontrado para confirmação.");
  }
  users[idx] = { ...users[idx], confirmed: true };
  saveMockUsers(users);
}

/**
 * Login local: confere email/senha em localStorage e valida regra
 * contra a tabela usuarios_sistema.
 */
export async function loginWithRole(params: {
  email: string;
  password: string;
  allowedRole: AllowedRole;
}): Promise<LoginResult> {
  const { email, password, allowedRole } = params;

  const users = loadMockUsers();
  const authUser = users.find((u) => u.email === email);

  if (!authUser || authUser.password !== password) {
    throw new Error("Credenciais inválidas. Verifique e-mail e senha.");
  }

  if (!authUser.confirmed) {
    throw new Error(
      "Seu cadastro ainda não foi confirmado. Acesse o link de confirmação enviado por e-mail (ou use a opção de confirmar cadastro nos testes).",
    );
  }

  // Valida contra usuarios_sistema, respeitando regra e ativo
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

  // Marca "sessão" simples em localStorage
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      "mock-auth-session",
      JSON.stringify({ email, role: usuario.regra }),
    );
  }

  return { user: usuario, role: usuario.regra };
}

/**
 * Cria um usuário na tabela usuarios_sistema e também em localStorage
 * como usuário "autenticável" neste ambiente de testes.
 */
export async function registerUser(params: {
  nome: string;
  email: string;
  password: string;
  role: AllowedRole;
}): Promise<DbSystemUser> {
  const { nome, email, password, role } = params;

  // 1) Cria registro em usuarios_sistema no Supabase
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
        "Não foi possível salvar o usuário na tabela de usuários do sistema.",
    );
  }

  // 2) Armazena credenciais localmente (somente para ambiente de testes)
  const users = loadMockUsers();
  const exists = users.find((u) => u.email === email);
  if (!exists) {
    users.push({ email, password, role, confirmed: false });
    saveMockUsers(users);
  }

  return inserted as DbSystemUser;
}

/**
 * "Envia" um reset de senha: aqui é apenas simulado.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const users = loadMockUsers();
  const exists = users.find((u) => u.email === email);
  if (!exists) {
    throw new Error("Usuário não encontrado para recuperação de senha.");
  }

  // Em ambiente real: enviar e-mail; aqui só sinalizamos que "foi enviado".
  return;
}

/**
 * Atualiza senha do usuário logado no mock local.
 */
export async function updatePassword(newPassword: string): Promise<void> {
  if (typeof window === "undefined") return;

  const sessionRaw = window.localStorage.getItem("mock-auth-session");
  if (!sessionRaw) {
    throw new Error("Nenhum usuário autenticado para atualizar a senha.");
  }

  const session = JSON.parse(sessionRaw) as { email: string; role: AllowedRole };

  const users = loadMockUsers();
  const idx = users.findIndex((u) => u.email === session.email);
  if (idx === -1) {
    throw new Error("Usuário não encontrado no armazenamento local.");
  }

  users[idx] = { ...users[idx], password: newPassword };
  saveMockUsers(users);
}

/**
 * Encerra sessão atual (mock).
 */
export async function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("mock-auth-session");
}
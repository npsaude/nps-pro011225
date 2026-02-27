export type Atuacao =
  | "CIRURGIAO"
  | "PRIMEIRO_AUXILIAR"
  | "SEGUNDO_AUXILIAR"
  | "TERCEIRO_AUXILIAR"
  | "ANESTESISTA";

export const ATUACAO_LABEL: Record<Atuacao, string> = {
  CIRURGIAO: "Cirurgião",
  PRIMEIRO_AUXILIAR: "Primeiro Auxiliar",
  SEGUNDO_AUXILIAR: "Segundo Auxiliar",
  TERCEIRO_AUXILIAR: "Terceiro Auxiliar",
  ANESTESISTA: "Anestesista",
};

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstName(input: string): string {
  const n = normalizeText(input);
  return n.split(" ").filter(Boolean)[0] ?? "";
}

function normalizeDigits(input: string): string {
  return String(input ?? "").replace(/\D/g, "");
}

function includesFirstName(haystack: string, fullName: string): boolean {
  const f = firstName(fullName);
  if (!f) return false;
  return haystack.includes(` ${f} `) || haystack.startsWith(`${f} `) || haystack.endsWith(` ${f}`);
}

export function reconhecerAtuacao(params: {
  descricaoCirurgicaTexto: string | null | undefined;
  userNome: string;
  userCrm: string;
  cirurgiaoNome?: string | null;
  cirurgiaoCrm?: string | null;
  auxiliar1Nome?: string | null;
  auxiliar1Crm?: string | null;
  auxiliar2Nome?: string | null;
  auxiliar2Crm?: string | null;
  auxiliar3Nome?: string | null;
  auxiliar3Crm?: string | null;
  anestesistaNome?: string | null;
  anestesistaCrm?: string | null;
}): Atuacao | null {
  const crmUser = normalizeDigits(params.userCrm);
  const desc = ` ${normalizeText(params.descricaoCirurgicaTexto ?? "")} `;

  const candidates: Array<{ atuacao: Atuacao; nome?: string | null; crm?: string | null }> = [
    { atuacao: "CIRURGIAO", nome: params.cirurgiaoNome, crm: params.cirurgiaoCrm },
    { atuacao: "PRIMEIRO_AUXILIAR", nome: params.auxiliar1Nome, crm: params.auxiliar1Crm },
    { atuacao: "SEGUNDO_AUXILIAR", nome: params.auxiliar2Nome, crm: params.auxiliar2Crm },
    { atuacao: "TERCEIRO_AUXILIAR", nome: params.auxiliar3Nome, crm: params.auxiliar3Crm },
    { atuacao: "ANESTESISTA", nome: params.anestesistaNome, crm: params.anestesistaCrm },
  ];

  // 1) Match forte por CRM (quando disponível na extração)
  if (crmUser) {
    for (const c of candidates) {
      const crm = normalizeDigits(c.crm ?? "");
      if (crm && crm === crmUser) return c.atuacao;
    }
  }

  // 2) Fallback: match por primeiro nome + CRM no texto da descrição (se a descrição tiver CRM)
  if (crmUser && includesFirstName(desc, params.userNome)) {
    if (desc.includes(` ${crmUser} `) || desc.includes(crmUser)) {
      // Se o texto contém o CRM do usuário e o primeiro nome, tentamos inferir pela ocorrência
      // de palavras-chave próximas.
      const has = (re: RegExp) => re.test(desc);
      const f = firstName(params.userNome);

      const patterns: Array<{ atuacao: Atuacao; re: RegExp }> = [
        { atuacao: "CIRURGIAO", re: new RegExp(`(cirurgi[aã]o|cirurgiao)[^\n]{0,120}${f}[^\n]{0,120}${crmUser}`) },
        { atuacao: "PRIMEIRO_AUXILIAR", re: new RegExp(`(1\s*o|1º|primeiro)\s*auxiliar[^\n]{0,120}${f}[^\n]{0,120}${crmUser}`) },
        { atuacao: "SEGUNDO_AUXILIAR", re: new RegExp(`(2\s*o|2º|segundo)\s*auxiliar[^\n]{0,120}${f}[^\n]{0,120}${crmUser}`) },
        { atuacao: "TERCEIRO_AUXILIAR", re: new RegExp(`(3\s*o|3º|terceiro)\s*auxiliar[^\n]{0,120}${f}[^\n]{0,120}${crmUser}`) },
        { atuacao: "ANESTESISTA", re: new RegExp(`anestesista[^\n]{0,120}${f}[^\n]{0,120}${crmUser}`) },
      ];

      for (const p of patterns) {
        if (has(p.re)) return p.atuacao;
      }
    }
  }

  // 3) Fallback simples: primeiro nome bate com o nome extraído para cada papel.
  // Só usamos isso se o CRM do usuário for vazio (ou não foi possível cruzar).
  const userFirst = firstName(params.userNome);
  if (userFirst) {
    for (const c of candidates) {
      const nomeFirst = firstName(c.nome ?? "");
      if (nomeFirst && nomeFirst === userFirst) return c.atuacao;
    }
  }

  return null;
}

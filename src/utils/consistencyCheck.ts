import { supabase } from "@/integrations/supabase/client";

export type ConsistencyStage =
  | "apos_solicitacao"
  | "apos_guia_autorizacao"
  | "apos_descricao_cirurgica";

export type CheckResult = {
  id: string;
  label: string;
  grupo: "cirurgia" | "medicos" | "procedimentos";
  status: "ok" | "warning" | "error" | "skipped";
  detail?: string;
  documentoA?: string;
  valorA?: string;
  documentoB?: string;
  valorB?: string;
  confiancaIa?: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(s?: string | null): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstToken(s?: string | null): string {
  if (!s) return "";
  return normalize(s).split(/\s+/)[0] ?? "";
}

function minuteDiff(a?: string | null, b?: string | null): number {
  if (!a || !b) return Infinity;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return Math.abs((ah * 60 + am) - (bh * 60 + bm));
}

/** Normaliza CRM: mantém só dígitos para comparação */
function normalizeCrm(s?: string | null): string {
  if (!s) return "";
  return s.replace(/\D/g, "");
}

function compareProcedureSets(
  aCodes: string[],
  bCodes: string[]
): { missingInB: string[]; missingInA: string[] } {
  const setA = new Set(aCodes.map(normalize).filter(Boolean));
  const setB = new Set(bCodes.map(normalize).filter(Boolean));
  return {
    missingInB: [...setA].filter(c => !setB.has(c)),
    missingInA: [...setB].filter(c => !setA.has(c)),
  };
}

function resolveDbStatus(
  status: CheckResult["status"]
): "correto" | "inconsistente" | "suspeita" | null {
  if (status === "skipped") return null;
  if (status === "ok")      return "correto";
  if (status === "error")   return "inconsistente";
  return "suspeita";
}

// ─── Persistência ─────────────────────────────────────────────────────────────

export async function saveConsistencyResults(
  faturamentoId: string,
  medicoId: string,
  stage: ConsistencyStage,
  results: CheckResult[]
) {
  const rows = results
    .filter(r => r.status !== "skipped")
    .map(r => ({
      faturamento_id:        faturamentoId,
      medico_id:             medicoId,
      check_id:              r.id,
      check_label:           r.label,
      check_grupo:           r.grupo,
      check_stage:           stage,
      documento_a:           r.documentoA ?? null,
      valor_a:               r.valorA ?? null,
      documento_b:           r.documentoB ?? null,
      valor_b:               r.valorB ?? null,
      status:                resolveDbStatus(r.status) as "correto" | "inconsistente" | "suspeita",
      detalhe:               r.detail ?? null,
      confianca_ia:          r.confiancaIa ?? null,
      ignorado_pelo_usuario: false,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("faturamento_consistencia")
    .insert(rows);

  if (error) console.error("[consistencyCheck] Erro ao salvar:", error);
}

export async function markResultsAsIgnored(
  faturamentoId: string,
  stage: ConsistencyStage
) {
  const { error } = await supabase
    .from("faturamento_consistencia")
    .update({
      ignorado_pelo_usuario: true,
      ignorado_em: new Date().toISOString(),
    })
    .eq("faturamento_id", faturamentoId)
    .eq("check_stage", stage)
    .eq("status", "inconsistente");

  if (error) console.error("[consistencyCheck] Erro ao marcar ignorado:", error);
}

// ─── Tipos de dados por documento ────────────────────────────────────────────

export type DadosSolicitacao = {
  nome_beneficiario?: string | null;          // Nome do paciente
  hora_inicial?: string | null;               // Hora de início (por item)
  profissional_nome?: string | null;          // Cirurgião nome
  profissional_numero_conselho?: string | null; // Cirurgião CRM
  // procedimentos vêm separados como array de strings
};

export type DadosAutorizacao = {
  paciente_nome?: string | null;              // Nome do paciente
  // hora_inicio: NÃO extraído pela autorização
  cirurgiao_nome?: string | null;             // Cirurgião nome
  cirurgiao_principal_crm?: string | null;    // Cirurgião CRM
  // procedimentos vêm separados como array de strings
};

export type DadosDescricao = {
  paciente_nome?: string | null;              // Nome do paciente
  hora_inicio?: string | null;               // Hora de início
  cirurgiao_principal_nome?: string | null;  // Cirurgião nome
  cirurgiao_principal_crm?: string | null;   // Cirurgião CRM
  // procedimentos vêm separados como array de strings
};

// ─── Estágio 1: após guia de solicitação ─────────────────────────────────────
// Apenas valida que os campos foram extraídos (sem cruzamento ainda)

export function checkAposSolicitacao(
  sol: DadosSolicitacao,
  solProcCodes: string[]
): CheckResult[] {
  const results: CheckResult[] = [];

  // C — Nome do paciente
  results.push({
    id: "S1", label: "Nome do paciente extraído", grupo: "cirurgia",
    status: sol.nome_beneficiario ? "ok" : "warning",
    detail: sol.nome_beneficiario ? undefined : "Campo não extraído da guia de solicitação",
    documentoA: "guia_solicitacao",
    valorA: sol.nome_beneficiario ?? undefined,
  });

  // C — Hora de início
  results.push({
    id: "S2", label: "Hora de início extraída", grupo: "cirurgia",
    status: sol.hora_inicial ? "ok" : "warning",
    detail: sol.hora_inicial ? undefined : "Campo não extraído da guia de solicitação",
    documentoA: "guia_solicitacao",
    valorA: sol.hora_inicial ?? undefined,
  });

  // M — Cirurgião nome
  results.push({
    id: "S3", label: "Cirurgião nome extraído", grupo: "medicos",
    status: sol.profissional_nome ? "ok" : "warning",
    detail: sol.profissional_nome ? undefined : "Campo não extraído da guia de solicitação",
    documentoA: "guia_solicitacao",
    valorA: sol.profissional_nome ?? undefined,
  });

  // M — Cirurgião CRM
  results.push({
    id: "S4", label: "Cirurgião CRM extraído", grupo: "medicos",
    status: sol.profissional_numero_conselho ? "ok" : "warning",
    detail: sol.profissional_numero_conselho ? undefined : "Campo não extraído da guia de solicitação",
    documentoA: "guia_solicitacao",
    valorA: sol.profissional_numero_conselho ?? undefined,
  });

  // P — Código dos procedimentos
  results.push({
    id: "S5", label: "Código dos procedimentos extraído", grupo: "procedimentos",
    status: solProcCodes.length > 0 ? "ok" : "warning",
    detail: solProcCodes.length > 0 ? undefined : "Nenhum código extraído da guia de solicitação",
    documentoA: "guia_solicitacao",
    valorA: solProcCodes.join(", ") || undefined,
  });

  // P — Quantidade de procedimentos
  results.push({
    id: "S6", label: "Quantidade de procedimentos", grupo: "procedimentos",
    status: solProcCodes.length > 0 ? "ok" : "warning",
    detail: solProcCodes.length > 0 ? undefined : "Nenhum procedimento extraído da guia de solicitação",
    documentoA: "guia_solicitacao",
    valorA: String(solProcCodes.length),
  });

  return results;
}

// ─── Estágio 2: após guia de autorização ─────────────────────────────────────
// Cruza com solicitação (se enviada) nos campos em comum.
// Hora de início: a autorização NÃO extrai — skipped nesse cruzamento.

export function checkAposGuiaAutorizacao(
  aut: DadosAutorizacao,
  autProcCodes: string[],
  sol?: DadosSolicitacao | null,
  solProcCodes?: string[]
): CheckResult[] {
  const results: CheckResult[] = [];
  const solCodes = solProcCodes ?? [];

  if (sol) {
    // ── Cruzamento Solicitação ↔ Autorização ──

    // Nome do paciente
    const nomeOk = firstToken(sol.nome_beneficiario) === firstToken(aut.paciente_nome);
    results.push({
      id: "A1", label: "Nome do paciente", grupo: "cirurgia",
      status: (!sol.nome_beneficiario || !aut.paciente_nome) ? "warning" : nomeOk ? "ok" : "error",
      detail: nomeOk ? undefined : `"${sol.nome_beneficiario}" ↔ "${aut.paciente_nome}"`,
      documentoA: "guia_solicitacao", valorA: sol.nome_beneficiario ?? undefined,
      documentoB: "guia_autorizacao", valorB: aut.paciente_nome ?? undefined,
    });

    // Hora de início — autorização não extrai
    results.push({
      id: "A2", label: "Hora de início", grupo: "cirurgia",
      status: "skipped",
      detail: "Guia de autorização não contém hora de início",
      documentoA: "guia_solicitacao", valorA: sol.hora_inicial ?? undefined,
    });

    // Cirurgião nome
    const cirNomeOk = firstToken(sol.profissional_nome) === firstToken(aut.cirurgiao_nome);
    results.push({
      id: "A3", label: "Cirurgião nome", grupo: "medicos",
      status: (!sol.profissional_nome || !aut.cirurgiao_nome) ? "warning" : cirNomeOk ? "ok" : "warning",
      detail: cirNomeOk ? undefined : `"${sol.profissional_nome}" ↔ "${aut.cirurgiao_nome}"`,
      documentoA: "guia_solicitacao", valorA: sol.profissional_nome ?? undefined,
      documentoB: "guia_autorizacao", valorB: aut.cirurgiao_nome ?? undefined,
    });

    // Cirurgião CRM
    const cirCrmOk = normalizeCrm(sol.profissional_numero_conselho) === normalizeCrm(aut.cirurgiao_principal_crm);
    results.push({
      id: "A4", label: "Cirurgião CRM", grupo: "medicos",
      status: (!sol.profissional_numero_conselho || !aut.cirurgiao_principal_crm) ? "warning" : cirCrmOk ? "ok" : "error",
      detail: cirCrmOk ? undefined : `"${sol.profissional_numero_conselho}" ↔ "${aut.cirurgiao_principal_crm}"`,
      documentoA: "guia_solicitacao", valorA: sol.profissional_numero_conselho ?? undefined,
      documentoB: "guia_autorizacao", valorB: aut.cirurgiao_principal_crm ?? undefined,
    });

    // Código dos procedimentos
    if (solCodes.length > 0 && autProcCodes.length > 0) {
      const { missingInB, missingInA } = compareProcedureSets(solCodes, autProcCodes);
      const ok = missingInB.length === 0 && missingInA.length === 0;
      const details: string[] = [];
      if (missingInB.length) details.push(`Ausentes na autorização: ${missingInB.join(", ")}`);
      if (missingInA.length) details.push(`Ausentes na solicitação: ${missingInA.join(", ")}`);
      results.push({
        id: "A5", label: "Código dos procedimentos", grupo: "procedimentos",
        status: ok ? "ok" : "error",
        detail: ok ? undefined : details.join(" | "),
        documentoA: "guia_solicitacao", valorA: solCodes.join(", "),
        documentoB: "guia_autorizacao", valorB: autProcCodes.join(", "),
      });
    } else {
      results.push({
        id: "A5", label: "Código dos procedimentos", grupo: "procedimentos",
        status: autProcCodes.length > 0 ? "ok" : "warning",
        detail: autProcCodes.length > 0 ? undefined : "Nenhum código extraído da guia de autorização",
        documentoA: "guia_solicitacao", valorA: solCodes.join(", ") || undefined,
        documentoB: "guia_autorizacao", valorB: autProcCodes.join(", ") || undefined,
      });
    }

    // Quantidade de procedimentos
    const qtdOk = solCodes.length === autProcCodes.length;
    results.push({
      id: "A6", label: "Quantidade de procedimentos", grupo: "procedimentos",
      status: (solCodes.length === 0 || autProcCodes.length === 0) ? "warning" : qtdOk ? "ok" : "warning",
      detail: qtdOk ? undefined : `${solCodes.length} na solicitação ↔ ${autProcCodes.length} na autorização`,
      documentoA: "guia_solicitacao", valorA: String(solCodes.length),
      documentoB: "guia_autorizacao", valorB: String(autProcCodes.length),
    });

  } else {
    // ── Sem solicitação: apenas valida extração da autorização ──

    results.push({
      id: "A1", label: "Nome do paciente extraído", grupo: "cirurgia",
      status: aut.paciente_nome ? "ok" : "warning",
      detail: aut.paciente_nome ? undefined : "Campo não extraído da guia de autorização",
      documentoA: "guia_autorizacao", valorA: aut.paciente_nome ?? undefined,
    });

    results.push({
      id: "A2", label: "Hora de início", grupo: "cirurgia",
      status: "skipped",
      detail: "Guia de autorização não contém hora de início",
    });

    results.push({
      id: "A3", label: "Cirurgião nome extraído", grupo: "medicos",
      status: aut.cirurgiao_nome ? "ok" : "warning",
      detail: aut.cirurgiao_nome ? undefined : "Campo não extraído da guia de autorização",
      documentoA: "guia_autorizacao", valorA: aut.cirurgiao_nome ?? undefined,
    });

    results.push({
      id: "A4", label: "Cirurgião CRM extraído", grupo: "medicos",
      status: aut.cirurgiao_principal_crm ? "ok" : "warning",
      detail: aut.cirurgiao_principal_crm ? undefined : "Campo não extraído da guia de autorização",
      documentoA: "guia_autorizacao", valorA: aut.cirurgiao_principal_crm ?? undefined,
    });

    results.push({
      id: "A5", label: "Código dos procedimentos extraído", grupo: "procedimentos",
      status: autProcCodes.length > 0 ? "ok" : "warning",
      detail: autProcCodes.length > 0 ? undefined : "Nenhum código extraído da guia de autorização",
      documentoA: "guia_autorizacao", valorA: autProcCodes.join(", ") || undefined,
    });

    results.push({
      id: "A6", label: "Quantidade de procedimentos", grupo: "procedimentos",
      status: autProcCodes.length > 0 ? "ok" : "warning",
      detail: autProcCodes.length > 0 ? undefined : "Nenhum procedimento extraído da guia de autorização",
      documentoA: "guia_autorizacao", valorA: String(autProcCodes.length),
    });
  }

  return results;
}

// ─── Estágio 3: após descrição cirúrgica ─────────────────────────────────────
// Cruza com o melhor documento anterior disponível.
// Referência de nome/CRM/nome cirurgião: autorização > solicitação
// Referência de hora: solicitação (autorização não extrai)
// Referência de procedimentos: autorização > solicitação

export function checkAposDescricaoCirurgica(
  desc: DadosDescricao,
  descProcCodes: string[],
  autSnapshot?: DadosAutorizacao | null,
  autProcCodes?: string[],
  sol?: DadosSolicitacao | null,
  solProcCodes?: string[]
): CheckResult[] {
  const results: CheckResult[] = [];

  const autCodes = autProcCodes ?? [];
  const solCodes = solProcCodes ?? [];

  // Melhor referência para cada campo
  const refNome = autSnapshot?.paciente_nome || sol?.nome_beneficiario || null;
  const refNomeDoc = autSnapshot?.paciente_nome ? "guia_autorizacao" : "guia_solicitacao";

  const refHora = sol?.hora_inicial || null; // só solicitação tem hora
  const refHoraDoc = "guia_solicitacao";

  const refCirNome = autSnapshot?.cirurgiao_nome || sol?.profissional_nome || null;
  const refCirNomeDoc = autSnapshot?.cirurgiao_nome ? "guia_autorizacao" : "guia_solicitacao";

  const refCirCrm = autSnapshot?.cirurgiao_principal_crm || sol?.profissional_numero_conselho || null;
  const refCirCrmDoc = autSnapshot?.cirurgiao_principal_crm ? "guia_autorizacao" : "guia_solicitacao";

  const refProcCodes = autCodes.length > 0 ? autCodes : solCodes;
  const refProcDoc = autCodes.length > 0 ? "guia_autorizacao" : "guia_solicitacao";

  // ── C1 — Nome do paciente ──
  if (!refNome) {
    results.push({
      id: "C1", label: "Nome do paciente", grupo: "cirurgia",
      status: desc.paciente_nome ? "ok" : "warning",
      detail: desc.paciente_nome ? undefined : "Nome não extraído da descrição cirúrgica",
      documentoB: "descricao_cirurgica", valorB: desc.paciente_nome ?? undefined,
    });
  } else {
    const ok = firstToken(refNome) === firstToken(desc.paciente_nome);
    results.push({
      id: "C1", label: "Nome do paciente", grupo: "cirurgia",
      status: !desc.paciente_nome ? "warning" : ok ? "ok" : "error",
      detail: ok ? undefined : `"${refNome}" ↔ "${desc.paciente_nome}"`,
      documentoA: refNomeDoc, valorA: refNome,
      documentoB: "descricao_cirurgica", valorB: desc.paciente_nome ?? undefined,
    });
  }

  // ── C2 — Hora de início ──
  if (!refHora) {
    results.push({
      id: "C2", label: "Hora de início", grupo: "cirurgia",
      status: desc.hora_inicio ? "ok" : "warning",
      detail: desc.hora_inicio ? undefined : "Hora não extraída da descrição cirúrgica",
      documentoB: "descricao_cirurgica", valorB: desc.hora_inicio ?? undefined,
    });
  } else {
    const diff = minuteDiff(refHora, desc.hora_inicio);
    const ok = diff <= 30;
    results.push({
      id: "C2", label: "Hora de início", grupo: "cirurgia",
      status: !desc.hora_inicio ? "warning" : ok ? "ok" : "warning",
      detail: !desc.hora_inicio
        ? "Hora não extraída da descrição cirúrgica"
        : ok ? undefined : `Diferença de ${diff} min (tolerância: 30 min)`,
      documentoA: refHoraDoc, valorA: refHora,
      documentoB: "descricao_cirurgica", valorB: desc.hora_inicio ?? undefined,
    });
  }

  // ── M1 — Cirurgião nome ──
  if (!refCirNome) {
    results.push({
      id: "M1", label: "Cirurgião nome", grupo: "medicos",
      status: desc.cirurgiao_principal_nome ? "ok" : "warning",
      detail: desc.cirurgiao_principal_nome ? undefined : "Nome do cirurgião não extraído da descrição cirúrgica",
      documentoB: "descricao_cirurgica", valorB: desc.cirurgiao_principal_nome ?? undefined,
    });
  } else {
    const ok = firstToken(refCirNome) === firstToken(desc.cirurgiao_principal_nome);
    results.push({
      id: "M1", label: "Cirurgião nome", grupo: "medicos",
      status: !desc.cirurgiao_principal_nome ? "warning" : ok ? "ok" : "warning",
      detail: ok ? undefined : `"${refCirNome}" ↔ "${desc.cirurgiao_principal_nome}"`,
      documentoA: refCirNomeDoc, valorA: refCirNome,
      documentoB: "descricao_cirurgica", valorB: desc.cirurgiao_principal_nome ?? undefined,
    });
  }

  // ── M2 — Cirurgião CRM ──
  if (!refCirCrm) {
    results.push({
      id: "M2", label: "Cirurgião CRM", grupo: "medicos",
      status: desc.cirurgiao_principal_crm ? "ok" : "warning",
      detail: desc.cirurgiao_principal_crm ? undefined : "CRM do cirurgião não extraído da descrição cirúrgica",
      documentoB: "descricao_cirurgica", valorB: desc.cirurgiao_principal_crm ?? undefined,
    });
  } else {
    const ok = normalizeCrm(refCirCrm) === normalizeCrm(desc.cirurgiao_principal_crm);
    results.push({
      id: "M2", label: "Cirurgião CRM", grupo: "medicos",
      status: !desc.cirurgiao_principal_crm ? "warning" : ok ? "ok" : "error",
      detail: ok ? undefined : `"${refCirCrm}" ↔ "${desc.cirurgiao_principal_crm}"`,
      documentoA: refCirCrmDoc, valorA: refCirCrm,
      documentoB: "descricao_cirurgica", valorB: desc.cirurgiao_principal_crm ?? undefined,
    });
  }

  // ── P1 — Código dos procedimentos ──
  if (refProcCodes.length === 0) {
    results.push({
      id: "P1", label: "Código dos procedimentos", grupo: "procedimentos",
      status: descProcCodes.length > 0 ? "ok" : "warning",
      detail: descProcCodes.length > 0 ? undefined : "Nenhum código extraído da descrição cirúrgica",
      documentoB: "descricao_cirurgica", valorB: descProcCodes.join(", ") || undefined,
    });
  } else {
    const { missingInB, missingInA } = compareProcedureSets(refProcCodes, descProcCodes);
    const ok = missingInB.length === 0 && missingInA.length === 0;
    const details: string[] = [];
    if (missingInB.length) details.push(`Ausentes na descrição: ${missingInB.join(", ")}`);
    if (missingInA.length) details.push(`Ausentes na autorização/solicitação: ${missingInA.join(", ")}`);
    results.push({
      id: "P1", label: "Código dos procedimentos", grupo: "procedimentos",
      status: ok ? "ok" : "error",
      detail: ok ? undefined : details.join(" | "),
      documentoA: refProcDoc, valorA: refProcCodes.join(", "),
      documentoB: "descricao_cirurgica", valorB: descProcCodes.join(", "),
    });
  }

  // ── P2 — Quantidade de procedimentos ──
  if (refProcCodes.length === 0) {
    results.push({
      id: "P2", label: "Quantidade de procedimentos", grupo: "procedimentos",
      status: descProcCodes.length > 0 ? "ok" : "warning",
      detail: descProcCodes.length > 0 ? undefined : "Nenhum procedimento extraído da descrição cirúrgica",
      documentoB: "descricao_cirurgica", valorB: String(descProcCodes.length),
    });
  } else {
    const ok = refProcCodes.length === descProcCodes.length;
    results.push({
      id: "P2", label: "Quantidade de procedimentos", grupo: "procedimentos",
      status: ok ? "ok" : "warning",
      detail: ok ? undefined : `${refProcCodes.length} na ${refProcDoc === "guia_autorizacao" ? "autorização" : "solicitação"} ↔ ${descProcCodes.length} na descrição`,
      documentoA: refProcDoc, valorA: String(refProcCodes.length),
      documentoB: "descricao_cirurgica", valorB: String(descProcCodes.length),
    });
  }

  return results;
}

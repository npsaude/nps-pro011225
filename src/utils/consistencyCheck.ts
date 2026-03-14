import { supabase } from "@/integrations/supabase/client";

export type ConsistencyStage =
  | "apos_solicitacao"
  | "apos_guia_autorizacao"
  | "apos_descricao_cirurgica";

export type CheckResult = {
  id: string;                          // "C1", "M1", "P2" etc.
  label: string;                       // descrição legível
  grupo: "cirurgia" | "medicos" | "procedimentos";
  status: "ok" | "warning" | "error" | "skipped";
  detail?: string;
  documentoA?: string;                 // ex: "guia_autorizacao"
  valorA?: string;                     // valor extraído do doc A
  documentoB?: string;                 // ex: "descricao_cirurgica"
  valorB?: string;                     // valor extraído do doc B
  confiancaIa?: number;               // 0.000 a 1.000
};

// ─── Funções auxiliares ──────────────────────────────────────────────────────

function normalize(s?: string | null): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function firstToken(s?: string | null): string {
  if (!s) return "";
  return normalize(s).split(/\s+/)[0] ?? "";
}

function minuteDiff(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return Math.abs((ah * 60 + am) - (bh * 60 + bm));
}

function compareProcedureSets(
  autCodes: string[],
  descCodes: string[]
): { missingInDesc: string[]; missingInAut: string[] } {
  const setAut  = new Set(autCodes.map(normalize).filter(Boolean));
  const setDesc = new Set(descCodes.map(normalize).filter(Boolean));
  return {
    missingInDesc: [...setAut].filter(c => !setDesc.has(c)),
    missingInAut:  [...setDesc].filter(c => !setAut.has(c)),
  };
}

function resolveDbStatus(
  status: CheckResult["status"]
): "correto" | "inconsistente" | "suspeita" | null {
  if (status === "skipped") return null;
  if (status === "ok")      return "correto";
  if (status === "error")   return "inconsistente";
  return "suspeita"; // warning → suspeita
}

// ─── Persistência ────────────────────────────────────────────────────────────

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

// ─── Estágio 1: após guia de solicitação ─────────────────────────────────────

export function checkAposSolicitacao(sol: {
  paciente_nome?: string | null;
  data_inicio_faturamento?: string | null;
  profissional_numero_conselho?: string | null;
}): CheckResult[] {
  const results: CheckResult[] = [];

  results.push({
    id: "S1",
    label: "Nome do paciente extraído",
    grupo: "cirurgia",
    status: sol.paciente_nome ? "ok" : "warning",
    detail: sol.paciente_nome ? undefined : "Campo não extraído da guia de solicitação",
    documentoA: "guia_solicitacao",
    valorA: sol.paciente_nome ?? undefined,
  });

  results.push({
    id: "S2",
    label: "Data de faturamento extraída",
    grupo: "cirurgia",
    status: sol.data_inicio_faturamento ? "ok" : "warning",
    detail: sol.data_inicio_faturamento ? undefined : "Campo não extraído da guia de solicitação",
    documentoA: "guia_solicitacao",
    valorA: sol.data_inicio_faturamento ?? undefined,
  });

  results.push({
    id: "S3",
    label: "CRM do solicitante extraído",
    grupo: "medicos",
    status: sol.profissional_numero_conselho ? "ok" : "warning",
    detail: sol.profissional_numero_conselho ? undefined : "Campo não extraído da guia de solicitação",
    documentoA: "guia_solicitacao",
    valorA: sol.profissional_numero_conselho ?? undefined,
  });

  return results;
}

// ─── Estágio 2: após guia de autorização ─────────────────────────────────────

export function checkAposGuiaAutorizacao(
  aut: {
    paciente_nome?: string | null;
    paciente_carteirinha?: string | null;
    hospital_codigo_cnes?: string | null;
    data_cirurgia?: string | null;
    cirurgiao_principal_crm?: string | null;
  },
  sol?: {
    nome_beneficiario?: string | null;
    numero_carteira?: string | null;
    contratado_cnes?: string | null;
  } | null
): CheckResult[] {
  const results: CheckResult[] = [];

  if (sol) {
    // Cruzar com solicitação
    const nomeOk = firstToken(aut.paciente_nome) === firstToken(sol.nome_beneficiario);
    results.push({
      id: "A1",
      label: "Nome do paciente — solicitação ↔ autorização",
      grupo: "cirurgia",
      status: nomeOk ? "ok" : "error",
      detail: nomeOk ? undefined : `"${sol.nome_beneficiario}" ↔ "${aut.paciente_nome}"`,
      documentoA: "guia_solicitacao",
      valorA: sol.nome_beneficiario ?? undefined,
      documentoB: "guia_autorizacao",
      valorB: aut.paciente_nome ?? undefined,
    });

    const cartOk = normalize(aut.paciente_carteirinha) === normalize(sol.numero_carteira);
    results.push({
      id: "A2",
      label: "Carteirinha — solicitação ↔ autorização",
      grupo: "cirurgia",
      status: (!aut.paciente_carteirinha || !sol.numero_carteira)
        ? "warning"
        : cartOk ? "ok" : "error",
      detail: cartOk ? undefined : `"${sol.numero_carteira}" ↔ "${aut.paciente_carteirinha}"`,
      documentoA: "guia_solicitacao",
      valorA: sol.numero_carteira ?? undefined,
      documentoB: "guia_autorizacao",
      valorB: aut.paciente_carteirinha ?? undefined,
    });

    const cnesOk = normalize(aut.hospital_codigo_cnes) === normalize(sol.contratado_cnes);
    results.push({
      id: "A3",
      label: "CNES do hospital — solicitação ↔ autorização",
      grupo: "cirurgia",
      status: (!aut.hospital_codigo_cnes || !sol.contratado_cnes)
        ? "warning"
        : cnesOk ? "ok" : "error",
      detail: cnesOk ? undefined : `"${sol.contratado_cnes}" ↔ "${aut.hospital_codigo_cnes}"`,
      documentoA: "guia_solicitacao",
      valorA: sol.contratado_cnes ?? undefined,
      documentoB: "guia_autorizacao",
      valorB: aut.hospital_codigo_cnes ?? undefined,
    });
  } else {
    // Sem solicitação — validar campos essenciais da autorização
    results.push({
      id: "A1",
      label: "Nome do paciente extraído",
      grupo: "cirurgia",
      status: aut.paciente_nome ? "ok" : "warning",
      detail: aut.paciente_nome ? undefined : "Campo não extraído da guia de autorização",
      documentoA: "guia_autorizacao",
      valorA: aut.paciente_nome ?? undefined,
    });

    results.push({
      id: "A2",
      label: "Data da cirurgia extraída",
      grupo: "cirurgia",
      status: aut.data_cirurgia ? "ok" : "warning",
      detail: aut.data_cirurgia ? undefined : "Campo não extraído da guia de autorização",
      documentoA: "guia_autorizacao",
      valorA: aut.data_cirurgia ?? undefined,
    });

    results.push({
      id: "A3",
      label: "CRM do cirurgião extraído",
      grupo: "medicos",
      status: aut.cirurgiao_principal_crm ? "ok" : "warning",
      detail: aut.cirurgiao_principal_crm ? undefined : "Campo não extraído da guia de autorização",
      documentoA: "guia_autorizacao",
      valorA: aut.cirurgiao_principal_crm ?? undefined,
    });
  }

  return results;
}

// ─── Estágio 3: após descrição cirúrgica ─────────────────────────────────────

export function checkAposDescricaoCirurgica(
  desc: {
    registro_civil?: string | null;
    nome_social?: string | null;
    cpf?: string | null;
    data_inicio_procedimento?: string | null;
    hora_inicio_procedimento?: string | null;
    hora_fim_procedimento?: string | null;
    cirurgiao_responsavel?: string | null;
    cirurgiao_responsavel_crm?: string | null;
    equipe?: Array<{
      nome?: string;
      funcao?: string;
      conselho_numero?: string;
    }> | null;
    procedimentos?: Array<{
      codigo?: string;
      descricao?: string;
    }> | null;
  },
  aut?: {
    paciente_nome?: string | null;
    data_cirurgia?: string | null;
    hora_inicio?: string | null;
    hora_fim?: string | null;
    cirurgiao_principal_nome?: string | null;
    cirurgiao_principal_crm?: string | null;
    auxiliar1_nome?: string | null;
    auxiliar1_crm?: string | null;
    auxiliar2_nome?: string | null;
    auxiliar2_crm?: string | null;
    auxiliar3_nome?: string | null;
    auxiliar3_crm?: string | null;
    anestesista_nome?: string | null;
    anestesista_crm?: string | null;
    instrumentador_nome?: string | null;
    instrumentador_crm?: string | null;
    proc_cir_1_amb_cbhpm?: string | null;
    proc_cir_2_amb_cbhpm?: string | null;
    proc_cir_3_amb_cbhpm?: string | null;
    proc_cir_4_amb_cbhpm?: string | null;
    proc_cir_5_amb_cbhpm?: string | null;
  } | null,
  sol?: {
    nome_beneficiario?: string | null;
  } | null
): CheckResult[] {
  const results: CheckResult[] = [];

  const descNome = desc.registro_civil || desc.nome_social;
  const refNome  = aut?.paciente_nome || sol?.nome_beneficiario;

  // C1 — Nome do paciente
  if (!refNome) {
    results.push({
      id: "C1", label: "Nome do paciente", grupo: "cirurgia",
      status: "skipped", detail: "Nenhum documento anterior enviado",
    });
  } else {
    const ok = firstToken(refNome) === firstToken(descNome);
    results.push({
      id: "C1", label: "Nome do paciente", grupo: "cirurgia",
      status: ok ? "ok" : "error",
      detail: ok ? undefined : `"${refNome}" ↔ "${descNome}"`,
      documentoA: aut ? "guia_autorizacao" : "guia_solicitacao",
      valorA: refNome,
      documentoB: "descricao_cirurgica",
      valorB: descNome ?? undefined,
    });
  }

  // C2 — Data da cirurgia
  if (!aut) {
    results.push({
      id: "C2", label: "Data da cirurgia", grupo: "cirurgia",
      status: "skipped", detail: "Guia de autorização não enviada",
    });
  } else {
    const ok = normalize(aut.data_cirurgia) === normalize(desc.data_inicio_procedimento);
    results.push({
      id: "C2", label: "Data da cirurgia", grupo: "cirurgia",
      status: ok ? "ok" : "error",
      detail: ok ? undefined : `"${aut.data_cirurgia}" ↔ "${desc.data_inicio_procedimento}"`,
      documentoA: "guia_autorizacao", valorA: aut.data_cirurgia ?? undefined,
      documentoB: "descricao_cirurgica", valorB: desc.data_inicio_procedimento ?? undefined,
    });
  }

  // C3 — Hora de início
  if (!aut) {
    results.push({
      id: "C3", label: "Hora de início", grupo: "cirurgia",
      status: "skipped", detail: "Guia de autorização não enviada",
    });
  } else {
    const diff = minuteDiff(aut.hora_inicio, desc.hora_inicio_procedimento);
    results.push({
      id: "C3", label: "Hora de início", grupo: "cirurgia",
      status: diff <= 30 ? "ok" : "warning",
      detail: diff <= 30 ? undefined : `Diferença de ${diff} min (tolerância: 30 min)`,
      documentoA: "guia_autorizacao", valorA: aut.hora_inicio ?? undefined,
      documentoB: "descricao_cirurgica", valorB: desc.hora_inicio_procedimento ?? undefined,
    });
  }

  // M1 — CRM do cirurgião
  if (!aut) {
    results.push({
      id: "M1", label: "CRM do cirurgião", grupo: "medicos",
      status: "skipped", detail: "Guia de autorização não enviada",
    });
  } else {
    const ok = normalize(aut.cirurgiao_principal_crm) === normalize(desc.cirurgiao_responsavel_crm);
    results.push({
      id: "M1", label: "CRM do cirurgião", grupo: "medicos",
      status: ok ? "ok" : "error",
      detail: ok ? undefined : `"${aut.cirurgiao_principal_crm}" ↔ "${desc.cirurgiao_responsavel_crm}"`,
      documentoA: "guia_autorizacao", valorA: aut.cirurgiao_principal_crm ?? undefined,
      documentoB: "descricao_cirurgica", valorB: desc.cirurgiao_responsavel_crm ?? undefined,
    });
  }

  // M2 — Primeiro nome do cirurgião
  if (!aut) {
    results.push({
      id: "M2", label: "Nome do cirurgião", grupo: "medicos",
      status: "skipped", detail: "Guia de autorização não enviada",
    });
  } else {
    const ok = firstToken(aut.cirurgiao_principal_nome) === firstToken(desc.cirurgiao_responsavel);
    results.push({
      id: "M2", label: "Nome do cirurgião", grupo: "medicos",
      status: ok ? "ok" : "warning",
      detail: ok ? undefined : `"${aut.cirurgiao_principal_nome}" ↔ "${desc.cirurgiao_responsavel}"`,
      documentoA: "guia_autorizacao", valorA: aut.cirurgiao_principal_nome ?? undefined,
      documentoB: "descricao_cirurgica", valorB: desc.cirurgiao_responsavel ?? undefined,
    });
  }

  // M3 — CRM do 1º auxiliar
  if (!aut) {
    results.push({
      id: "M3", label: "CRM do 1º auxiliar", grupo: "medicos",
      status: "skipped", detail: "Guia de autorização não enviada",
    });
  } else {
    const descAux = desc.equipe?.find(e => normalize(e.funcao) === "auxiliar");
    if (!aut.auxiliar1_crm && !descAux?.conselho_numero) {
      results.push({
        id: "M3", label: "CRM do 1º auxiliar", grupo: "medicos",
        status: "skipped", detail: "Auxiliar não informado em nenhum documento",
      });
    } else {
      const ok = normalize(aut.auxiliar1_crm) === normalize(descAux?.conselho_numero);
      results.push({
        id: "M3", label: "CRM do 1º auxiliar", grupo: "medicos",
        status: ok ? "ok" : "error",
        detail: ok ? undefined : `"${aut.auxiliar1_crm}" ↔ "${descAux?.conselho_numero}"`,
        documentoA: "guia_autorizacao", valorA: aut.auxiliar1_crm ?? undefined,
        documentoB: "descricao_cirurgica", valorB: descAux?.conselho_numero ?? undefined,
      });
    }
  }

  // M4 — Primeiro nome do 1º auxiliar
  if (!aut) {
    results.push({
      id: "M4", label: "Nome do 1º auxiliar", grupo: "medicos",
      status: "skipped", detail: "Guia de autorização não enviada",
    });
  } else {
    const descAux = desc.equipe?.find(e => normalize(e.funcao) === "auxiliar");
    if (!aut.auxiliar1_nome && !descAux?.nome) {
      results.push({
        id: "M4", label: "Nome do 1º auxiliar", grupo: "medicos",
        status: "skipped", detail: "Auxiliar não informado em nenhum documento",
      });
    } else {
      const ok = firstToken(aut.auxiliar1_nome) === firstToken(descAux?.nome);
      results.push({
        id: "M4", label: "Nome do 1º auxiliar", grupo: "medicos",
        status: ok ? "ok" : "warning",
        detail: ok ? undefined : `"${aut.auxiliar1_nome}" ↔ "${descAux?.nome}"`,
        documentoA: "guia_autorizacao", valorA: aut.auxiliar1_nome ?? undefined,
        documentoB: "descricao_cirurgica", valorB: descAux?.nome ?? undefined,
      });
    }
  }

  // M5 — Conflito de papéis
  if (!aut) {
    results.push({
      id: "M5", label: "Conflito de papéis na equipe", grupo: "medicos",
      status: "skipped", detail: "Guia de autorização não enviada",
    });
  } else {
    const mapaAut: Record<string, string> = {};
    const campos = [
      { crm: aut.cirurgiao_principal_crm, papel: "cirurgiao" },
      { crm: aut.auxiliar1_crm,           papel: "auxiliar1" },
      { crm: aut.auxiliar2_crm,           papel: "auxiliar2" },
      { crm: aut.auxiliar3_crm,           papel: "auxiliar3" },
      { crm: aut.anestesista_crm,         papel: "anestesista" },
      { crm: aut.instrumentador_crm,      papel: "instrumentador" },
    ];
    campos.forEach(({ crm, papel }) => {
      if (crm) mapaAut[normalize(crm)] = papel;
    });

    const conflitos: string[] = [];
    desc.equipe?.forEach(membro => {
      const crm = normalize(membro.conselho_numero);
      if (!crm || !mapaAut[crm]) return;
      const papelAut  = mapaAut[crm];
      const papelDesc = normalize(membro.funcao);
      const papelAutNorm = papelAut.startsWith("auxiliar") ? "auxiliar" : papelAut;
      if (papelAutNorm !== papelDesc) {
        conflitos.push(`CRM ${membro.conselho_numero}: "${papelAut}" (aut.) ↔ "${membro.funcao}" (desc.)`);
      }
    });

    results.push({
      id: "M5", label: "Conflito de papéis na equipe", grupo: "medicos",
      status: conflitos.length === 0 ? "ok" : "error",
      detail: conflitos.length === 0 ? undefined : conflitos.join("; "),
      documentoA: "guia_autorizacao",
      documentoB: "descricao_cirurgica",
    });
  }

  // P1 — Quantidade de procedimentos
  if (!aut) {
    results.push({
      id: "P1", label: "Quantidade de procedimentos", grupo: "procedimentos",
      status: "skipped", detail: "Guia de autorização não enviada",
    });
  } else {
    const autProcs = [
      aut.proc_cir_1_amb_cbhpm,
      aut.proc_cir_2_amb_cbhpm,
      aut.proc_cir_3_amb_cbhpm,
      aut.proc_cir_4_amb_cbhpm,
      aut.proc_cir_5_amb_cbhpm,
    ].filter(Boolean);
    const descQtd = desc.procedimentos?.length ?? 0;
    const ok = autProcs.length === descQtd;
    results.push({
      id: "P1", label: "Quantidade de procedimentos", grupo: "procedimentos",
      status: ok ? "ok" : "warning",
      detail: ok ? undefined : `${autProcs.length} na autorização ↔ ${descQtd} na descrição`,
      documentoA: "guia_autorizacao", valorA: String(autProcs.length),
      documentoB: "descricao_cirurgica", valorB: String(descQtd),
    });
  }

  // P2 — Códigos dos procedimentos
  if (!aut) {
    results.push({
      id: "P2", label: "Códigos dos procedimentos", grupo: "procedimentos",
      status: "skipped", detail: "Guia de autorização não enviada",
    });
  } else {
    const autCodes = [
      aut.proc_cir_1_amb_cbhpm,
      aut.proc_cir_2_amb_cbhpm,
      aut.proc_cir_3_amb_cbhpm,
      aut.proc_cir_4_amb_cbhpm,
      aut.proc_cir_5_amb_cbhpm,
    ].filter((c): c is string => !!c);
    const descCodes = (desc.procedimentos ?? [])
      .map(p => p.codigo)
      .filter((c): c is string => !!c);
    const { missingInDesc, missingInAut } = compareProcedureSets(autCodes, descCodes);
    const ok = missingInDesc.length === 0 && missingInAut.length === 0;
    const details: string[] = [];
    if (missingInDesc.length) details.push(`Ausentes na descrição: ${missingInDesc.join(", ")}`);
    if (missingInAut.length)  details.push(`Ausentes na autorização: ${missingInAut.join(", ")}`);
    results.push({
      id: "P2", label: "Códigos dos procedimentos", grupo: "procedimentos",
      status: ok ? "ok" : "error",
      detail: ok ? undefined : details.join(" | "),
      documentoA: "guia_autorizacao", valorA: autCodes.join(", "),
      documentoB: "descricao_cirurgica", valorB: descCodes.join(", "),
    });
  }

  return results;
}

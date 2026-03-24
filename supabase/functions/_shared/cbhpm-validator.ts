/**
 * Validador de procedimentos CBHPM
 * Valida códigos e descrições contra a tabela cbhpm_cirurgias
 */

interface CbhpmProcedimento {
  codigo: string;
  descricao: string;
  porte: string | null;
  valor_porte: number | null;
}

interface ValidacaoResult {
  valido: boolean;
  codigo_validado: string | null;
  descricao_validada: string | null;
  cbhpm_match: CbhpmProcedimento | null;
  metodo_validacao: "codigo_exato" | "descricao_similar" | "nao_encontrado";
  similaridade?: number;
  /** Best match found even if below threshold (for suggestion purposes) */
  melhor_sugestao?: {
    codigo: string;
    descricao: string;
    similaridade: number;
  } | null;
}

// ── Medical synonym groups ──────────────────────────────────────────────────
// Words in the same group are considered equivalent for matching purposes.
// This helps match "sínfise púbica" → "pelve", "reto femoral" → "fêmur", etc.
const SYNONYM_GROUPS: string[][] = [
  // Pelve / púbis / sínfise
  ["pelve", "pelvico", "pelvica", "pubica", "pubico", "pubis", "pubiana", "pubiano", "sinfise", "iliac", "iliaco", "iliaca", "isquio", "sacroiliaca", "sacroiliaco"],
  // Fêmur / femoral
  ["femur", "femoral", "femorais"],
  // Tíbia / tibial
  ["tibia", "tibial", "tibiais"],
  // Joelho / patelar
  ["joelho", "patelar", "patela"],
  // Ombro / escapular / umeral
  ["ombro", "escapular", "escapula", "umeral", "umero"],
  // Mão / carpal / metacarpal
  ["mao", "carpal", "metacarpal", "metacarpiano", "carpiano"],
  // Pé / tarsal / metatarsal
  ["pe", "tarsal", "metatarsal", "metatarsiano", "tarsiano"],
  // Coluna / vertebral / espinhal
  ["coluna", "vertebral", "vertebra", "espinhal", "raqui"],
  // Tendão / tenoplastia / tenorrafia
  ["tendao", "tenoplastia", "tenorrafia", "tenotomia"],
  // Fratura / redução
  ["fratura", "fraturas"],
  // Osteotomia / osteoplastia
  ["osteotomia", "osteoplastia"],
  // Cirúrgico / cirurgia
  ["cirurgico", "cirurgica", "cirurgia"],
  // Tratamento
  ["tratamento", "trat"],
  // Radioscopia / fluoroscopia / intensificador de imagem
  ["radioscopico", "radioscopica", "radioscopia", "fluoroscopia", "fluoroscopico", "fluoroscopica", "intensificador"],
  // Controle / monitorização
  ["controle", "monitorizacao", "acompanhamento"],
  // Intraoperatório
  ["intraoperatorio", "intraoperatoria", "peroperatorio", "peroperatoria", "transoperatorio", "transoperatoria"],
];

// Build a lookup map: word → group index
const synonymMap = new Map<string, number>();
SYNONYM_GROUPS.forEach((group, idx) => {
  for (const word of group) {
    synonymMap.set(word, idx);
  }
});

/**
 * Normaliza texto para comparação (remove acentos, lowercase, trim, espaços extras)
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s]/g, " ") // Remove caracteres especiais
    .replace(/\s+/g, " ") // Normaliza espaços
    .trim();
}

/**
 * Extrai palavras significativas (>= 3 chars, excluindo stopwords)
 */
const STOPWORDS = new Set(["de", "do", "da", "dos", "das", "com", "sem", "por", "para", "ou", "e/ou", "cada", "uma", "mais", "nao", "que", "nos", "nas", "num", "tipo", "nivel"]);

function extractSignificantWords(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * Checks if two words are synonyms (belong to the same synonym group)
 */
function areSynonyms(word1: string, word2: string): boolean {
  if (word1 === word2) return true;
  const group1 = synonymMap.get(word1);
  const group2 = synonymMap.get(word2);
  if (group1 !== undefined && group2 !== undefined && group1 === group2) return true;
  // Also check if one word starts with the other (stem matching)
  // e.g., "osteotomia" matches "osteotomias", "pelvic" matches "pelvico"
  if (word1.length >= 4 && word2.length >= 4) {
    const minLen = Math.min(word1.length, word2.length);
    const stemLen = Math.max(4, Math.floor(minLen * 0.75));
    if (word1.slice(0, stemLen) === word2.slice(0, stemLen)) return true;
  }
  return false;
}

/**
 * Calcula a similaridade entre duas strings usando distância de Levenshtein normalizada
 * Retorna um valor entre 0 (totalmente diferente) e 1 (idêntico)
 */
export function calcularSimilaridade(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Matriz para distância de Levenshtein
  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deleção
        matrix[i][j - 1] + 1, // inserção
        matrix[i - 1][j - 1] + cost // substituição
      );
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);

  return 1 - distance / maxLength;
}

/**
 * Bidirectional word matching with synonym support.
 * Returns a score 0-1 based on how many significant words match between the two descriptions.
 * Checks both directions and returns the best combined score.
 */
export function calcularSimilaridadePalavras(
  descricaoExtraida: string,
  descricaoCbhpm: string
): number {
  const wordsExtraida = extractSignificantWords(descricaoExtraida);
  const wordsCbhpm = extractSignificantWords(descricaoCbhpm);

  if (wordsExtraida.length === 0 || wordsCbhpm.length === 0) return 0;

  // Direction 1: How many CBHPM words are found in the extracted description?
  let matchesCbhpmInExtraida = 0;
  for (const wCbhpm of wordsCbhpm) {
    if (wordsExtraida.some(wExt => areSynonyms(wExt, wCbhpm))) {
      matchesCbhpmInExtraida++;
    }
  }
  const scoreCbhpmInExtraida = wordsCbhpm.length > 0 ? matchesCbhpmInExtraida / wordsCbhpm.length : 0;

  // Direction 2: How many extracted words are found in the CBHPM description?
  let matchesExtraidaInCbhpm = 0;
  for (const wExt of wordsExtraida) {
    if (wordsCbhpm.some(wCbhpm => areSynonyms(wExt, wCbhpm))) {
      matchesExtraidaInCbhpm++;
    }
  }
  const scoreExtraidaInCbhpm = wordsExtraida.length > 0 ? matchesExtraidaInCbhpm / wordsExtraida.length : 0;

  // F1-like score: harmonic mean of both directions
  if (scoreCbhpmInExtraida + scoreExtraidaInCbhpm === 0) return 0;
  const f1 = (2 * scoreCbhpmInExtraida * scoreExtraidaInCbhpm) / (scoreCbhpmInExtraida + scoreExtraidaInCbhpm);

  return f1;
}

/**
 * Generates character bigrams from a string for fuzzy matching
 */
function getBigrams(text: string): Set<string> {
  const normalized = normalizeText(text);
  const bigrams = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i++) {
    if (normalized[i] !== " " && normalized[i + 1] !== " ") {
      bigrams.add(normalized.slice(i, i + 2));
    }
  }
  return bigrams;
}

/**
 * Dice coefficient using bigrams - good for fuzzy string matching
 */
export function calcularSimilaridadeBigram(str1: string, str2: string): number {
  const bigrams1 = getBigrams(str1);
  const bigrams2 = getBigrams(str2);
  if (bigrams1.size === 0 || bigrams2.size === 0) return 0;

  let intersection = 0;
  for (const bg of bigrams1) {
    if (bigrams2.has(bg)) intersection++;
  }

  return (2 * intersection) / (bigrams1.size + bigrams2.size);
}

/**
 * Combined similarity score using multiple methods.
 * This is the main scoring function for description matching.
 */
export function calcularScoreCombinado(
  descricaoExtraida: string,
  descricaoCbhpm: string
): { score: number; detalhes: { palavras: number; bigram: number; levenshtein: number } } {
  const palavras = calcularSimilaridadePalavras(descricaoExtraida, descricaoCbhpm);
  const bigram = calcularSimilaridadeBigram(descricaoExtraida, descricaoCbhpm);
  const levenshtein = calcularSimilaridade(descricaoExtraida, descricaoCbhpm);

  // Weighted combination:
  // - 50% word matching with synonyms (most important for medical terms)
  // - 30% bigram similarity (good for partial matches)
  // - 20% Levenshtein (overall string similarity)
  const score = palavras * 0.50 + bigram * 0.30 + levenshtein * 0.20;

  return { score, detalhes: { palavras, bigram, levenshtein } };
}

// Keep old function for backward compatibility with code-based matching
export function verificarPalavrasChave(
  descricaoExtraida: string,
  descricaoCbhpm: string
): number {
  return calcularSimilaridadePalavras(descricaoExtraida, descricaoCbhpm);
}

/**
 * Valida um procedimento contra a tabela CBHPM
 * @param supabase - Cliente Supabase
 * @param codigo - Código do procedimento extraído
 * @param descricao - Descrição do procedimento extraída
 * @param limiarSimilaridade - Limiar mínimo de similaridade para aceitar (default: 0.6)
 */
export async function validarProcedimentoCbhpm(
  supabase: any,
  codigo: string | null,
  descricao: string | null,
  limiarSimilaridade: number = 0.6
): Promise<ValidacaoResult> {
  const codigoLimpo = codigo?.toString().trim() || null;
  const descricaoLimpa = descricao?.toString().trim() || null;

  console.log(`[cbhpm-validator] Validando: codigo="${codigoLimpo}", descricao="${descricaoLimpa?.slice(0, 60)}..."`);

  // 1. Primeiro, tentar validação por código exato
  if (codigoLimpo) {
    const { data: matchByCodigo, error } = await supabase
      .from("cbhpm_cirurgias")
      .select("codigo, descricao, porte, valor_porte")
      .eq("codigo", codigoLimpo)
      .maybeSingle();

    if (!error && matchByCodigo) {
      console.log(`[cbhpm-validator] ✅ Match por código exato: ${codigoLimpo}`);
      return {
        valido: true,
        codigo_validado: matchByCodigo.codigo,
        descricao_validada: matchByCodigo.descricao,
        cbhpm_match: matchByCodigo,
        metodo_validacao: "codigo_exato",
      };
    }

    console.log(`[cbhpm-validator] ❌ Código "${codigoLimpo}" não encontrado na CBHPM`);

    // 1.5. Tentar busca por código aproximado
    const variantesCodigo: string[] = [];

    for (let i = 0; i < codigoLimpo.length; i++) {
      variantesCodigo.push(codigoLimpo.slice(0, i) + codigoLimpo.slice(i + 1));
    }

    const prefixos = [
      codigoLimpo.slice(0, 5),
      codigoLimpo.slice(0, 6),
      codigoLimpo.slice(0, 7),
    ].filter((p, idx, arr) => p.length >= 5 && arr.indexOf(p) === idx);

    const candidatosSet = new Map<string, CbhpmProcedimento>();

    for (const prefixo of prefixos) {
      const { data: candidatosPorPrefixo, error: prefixError } = await supabase
        .from("cbhpm_cirurgias")
        .select("codigo, descricao, porte, valor_porte")
        .like("codigo", `${prefixo}%`);

      if (!prefixError && candidatosPorPrefixo) {
        for (const c of candidatosPorPrefixo) {
          candidatosSet.set(c.codigo, c);
        }
      }
    }

    for (const variante of variantesCodigo) {
      if (variante.length >= 7) {
        const { data: matchVariante } = await supabase
          .from("cbhpm_cirurgias")
          .select("codigo, descricao, porte, valor_porte")
          .eq("codigo", variante)
          .maybeSingle();
        if (matchVariante) {
          candidatosSet.set(matchVariante.codigo, matchVariante);
        }
      }
    }

    if (candidatosSet.size > 0 && descricaoLimpa) {
      let melhorCandidato: CbhpmProcedimento | null = null;
      let melhorScore = 0;

      for (const cand of candidatosSet.values()) {
        const { score } = calcularScoreCombinado(descricaoLimpa, cand.descricao);
        if (score > melhorScore) {
          melhorScore = score;
          melhorCandidato = cand;
        }
      }

      if (melhorCandidato && melhorScore >= 0.4) {
        console.log(
          `[cbhpm-validator] ✅ Match por código aproximado (score ${(melhorScore * 100).toFixed(1)}%): "${melhorCandidato.codigo}" - "${melhorCandidato.descricao.slice(0, 50)}..."`
        );
        return {
          valido: true,
          codigo_validado: melhorCandidato.codigo,
          descricao_validada: melhorCandidato.descricao,
          cbhpm_match: melhorCandidato,
          metodo_validacao: "codigo_exato",
          similaridade: melhorScore,
        };
      }
    }
  }

  // 2. Se não encontrou por código, tentar por similaridade de descrição
  let melhorMatchGlobal: CbhpmProcedimento | null = null;
  let melhorSimilaridadeGlobal = 0;
  let melhorDetalhes: { palavras: number; bigram: number; levenshtein: number } | null = null;

  if (descricaoLimpa) {
    const { data: todosProcedimentos, error } = await supabase
      .from("cbhpm_cirurgias")
      .select("codigo, descricao, porte, valor_porte");

    if (error || !todosProcedimentos || todosProcedimentos.length === 0) {
      console.log(`[cbhpm-validator] Erro ao buscar procedimentos CBHPM:`, error);
      return {
        valido: false,
        codigo_validado: null,
        descricao_validada: null,
        cbhpm_match: null,
        metodo_validacao: "nao_encontrado",
      };
    }

    // Log top 3 candidates for debugging
    const candidates: Array<{ proc: CbhpmProcedimento; score: number; detalhes: any }> = [];

    for (const proc of todosProcedimentos) {
      const { score, detalhes } = calcularScoreCombinado(descricaoLimpa, proc.descricao);

      if (score > melhorSimilaridadeGlobal) {
        melhorSimilaridadeGlobal = score;
        melhorMatchGlobal = proc;
        melhorDetalhes = detalhes;
      }

      // Track top candidates for logging
      if (candidates.length < 3 || score > candidates[candidates.length - 1].score) {
        candidates.push({ proc, score, detalhes });
        candidates.sort((a, b) => b.score - a.score);
        if (candidates.length > 3) candidates.pop();
      }
    }

    // Log top 3 candidates for debugging
    console.log(
      `[cbhpm-validator] Top 3 candidatos para "${descricaoLimpa?.slice(0, 50)}...":`,
      candidates.map(c => `${c.proc.codigo} "${c.proc.descricao.slice(0, 40)}..." (score=${(c.score * 100).toFixed(1)}% pal=${(c.detalhes.palavras * 100).toFixed(0)}% bi=${(c.detalhes.bigram * 100).toFixed(0)}% lev=${(c.detalhes.levenshtein * 100).toFixed(0)}%)`).join(" | ")
    );

    if (melhorMatchGlobal && melhorSimilaridadeGlobal >= limiarSimilaridade) {
      console.log(
        `[cbhpm-validator] ✅ Match por descrição similar (${(melhorSimilaridadeGlobal * 100).toFixed(1)}%): "${melhorMatchGlobal.codigo}" - "${melhorMatchGlobal.descricao.slice(0, 60)}..." [pal=${(melhorDetalhes!.palavras * 100).toFixed(0)}% bi=${(melhorDetalhes!.bigram * 100).toFixed(0)}% lev=${(melhorDetalhes!.levenshtein * 100).toFixed(0)}%]`
      );
      return {
        valido: true,
        codigo_validado: melhorMatchGlobal.codigo,
        descricao_validada: melhorMatchGlobal.descricao,
        cbhpm_match: melhorMatchGlobal,
        metodo_validacao: "descricao_similar",
        similaridade: melhorSimilaridadeGlobal,
      };
    }

    if (melhorMatchGlobal) {
      console.log(
        `[cbhpm-validator] ❌ Melhor match encontrado mas similaridade insuficiente (${(melhorSimilaridadeGlobal * 100).toFixed(1)}% < ${limiarSimilaridade * 100}%): "${melhorMatchGlobal.codigo}" - "${melhorMatchGlobal.descricao.slice(0, 60)}..."`
      );
    }
  }

  // 3. Não encontrou match válido
  console.log(`[cbhpm-validator] ❌ Procedimento não validado: codigo="${codigoLimpo}", descricao="${descricaoLimpa?.slice(0, 60)}..."`);

  // Return best match as suggestion even if below threshold
  const melhorSugestao: ValidacaoResult["melhor_sugestao"] =
    melhorMatchGlobal && melhorSimilaridadeGlobal >= 0.2
      ? {
          codigo: melhorMatchGlobal.codigo,
          descricao: melhorMatchGlobal.descricao,
          similaridade: melhorSimilaridadeGlobal,
        }
      : null;

  if (melhorSugestao) {
    console.log(
      `[cbhpm-validator] 💡 Sugestão (abaixo do limiar): "${melhorSugestao.codigo}" - "${melhorSugestao.descricao.slice(0, 60)}..." (${(melhorSugestao.similaridade * 100).toFixed(1)}%)`
    );
  }

  return {
    valido: false,
    codigo_validado: null,
    descricao_validada: null,
    cbhpm_match: null,
    metodo_validacao: "nao_encontrado",
    melhor_sugestao: melhorSugestao,
  };
}

/**
 * Valida e corrige uma lista de procedimentos contra a CBHPM
 * Retorna apenas os procedimentos válidos com códigos/descrições corrigidos
 */
export async function validarListaProcedimentos(
  supabase: any,
  procedimentos: Array<{
    codigo_procedimento?: string | null;
    descricao_procedimento?: string | null;
    quantidade_autorizada?: number | null;
    quantidade_executada?: number | null;
  }>,
  limiarSimilaridade: number = 0.6
): Promise<Array<{
  codigo_procedimento: string;
  descricao_procedimento: string;
  quantidade_autorizada: number;
  quantidade_executada: number;
  cbhpm_validado: boolean;
  metodo_validacao: string;
}>> {
  const resultados: Array<{
    codigo_procedimento: string;
    descricao_procedimento: string;
    quantidade_autorizada: number;
    quantidade_executada: number;
    cbhpm_validado: boolean;
    metodo_validacao: string;
  }> = [];

  const codigosJaAdicionados = new Set<string>();

  for (const proc of procedimentos) {
    const validacao = await validarProcedimentoCbhpm(
      supabase,
      proc.codigo_procedimento || null,
      proc.descricao_procedimento || null,
      limiarSimilaridade
    );

    if (validacao.valido && validacao.codigo_validado) {
      if (codigosJaAdicionados.has(validacao.codigo_validado)) {
        console.log(`[cbhpm-validator] Procedimento duplicado ignorado: ${validacao.codigo_validado}`);
        continue;
      }

      codigosJaAdicionados.add(validacao.codigo_validado);

      resultados.push({
        codigo_procedimento: validacao.codigo_validado,
        descricao_procedimento: validacao.descricao_validada!,
        quantidade_autorizada: proc.quantidade_autorizada ?? 1,
        quantidade_executada: proc.quantidade_executada ?? 1,
        cbhpm_validado: true,
        metodo_validacao: validacao.metodo_validacao,
      });
    } else {
      console.log(
        `[cbhpm-validator] ⚠️ Procedimento rejeitado (não encontrado na CBHPM): codigo="${proc.codigo_procedimento}", descricao="${proc.descricao_procedimento?.slice(0, 50)}..."`
      );
    }
  }

  console.log(
    `[cbhpm-validator] Validação concluída: ${resultados.length}/${procedimentos.length} procedimentos válidos`
  );

  return resultados;
}

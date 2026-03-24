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
 * Verifica se a descrição contém as palavras-chave principais da descrição CBHPM
 */
export function verificarPalavrasChave(
  descricaoExtraida: string,
  descricaoCbhpm: string
): number {
  const palavrasExtraida = new Set(normalizeText(descricaoExtraida).split(" ").filter(p => p.length > 2));
  const palavrasCbhpm = normalizeText(descricaoCbhpm).split(" ").filter(p => p.length > 2);

  if (palavrasCbhpm.length === 0) return 0;

  let matches = 0;
  for (const palavra of palavrasCbhpm) {
    if (palavrasExtraida.has(palavra)) {
      matches++;
    }
  }

  return matches / palavrasCbhpm.length;
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

  console.log(`[cbhpm-validator] Validando: codigo="${codigoLimpo}", descricao="${descricaoLimpa?.slice(0, 50)}..."`);

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
    // A IA pode ter errado 1-2 dígitos (dígito extra, faltando, ou trocado).
    // Estratégia: gerar variantes do código e testar cada uma.
    const variantesCodigo: string[] = [];

    // Variante: remover cada dígito (código com 1 dígito a menos)
    for (let i = 0; i < codigoLimpo.length; i++) {
      variantesCodigo.push(codigoLimpo.slice(0, i) + codigoLimpo.slice(i + 1));
    }

    // Variante: prefixos de 5, 6, 7 dígitos para busca por LIKE
    const prefixos = [
      codigoLimpo.slice(0, 5),
      codigoLimpo.slice(0, 6),
      codigoLimpo.slice(0, 7),
    ].filter((p, idx, arr) => p.length >= 5 && arr.indexOf(p) === idx);

    // Buscar candidatos por prefixo
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

    // Também testar variantes exatas (código com dígito removido)
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
        const simDesc = verificarPalavrasChave(descricaoLimpa, cand.descricao);
        const simLev = calcularSimilaridade(descricaoLimpa, cand.descricao);
        const score = simLev * 0.4 + simDesc * 0.6;

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

  if (descricaoLimpa) {
    // Buscar todos os procedimentos CBHPM para comparação
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

    for (const proc of todosProcedimentos) {
      // Calcular similaridade combinada (Levenshtein + palavras-chave)
      const simLevenshtein = calcularSimilaridade(descricaoLimpa, proc.descricao);
      const simPalavras = verificarPalavrasChave(descricaoLimpa, proc.descricao);

      // Média ponderada: 40% Levenshtein, 60% palavras-chave
      const similaridadeCombinada = simLevenshtein * 0.4 + simPalavras * 0.6;

      if (similaridadeCombinada > melhorSimilaridadeGlobal) {
        melhorSimilaridadeGlobal = similaridadeCombinada;
        melhorMatchGlobal = proc;
      }
    }

    if (melhorMatchGlobal && melhorSimilaridadeGlobal >= limiarSimilaridade) {
      console.log(
        `[cbhpm-validator] ✅ Match por descrição similar (${(melhorSimilaridadeGlobal * 100).toFixed(1)}%): "${melhorMatchGlobal.codigo}" - "${melhorMatchGlobal.descricao.slice(0, 50)}..."`
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
        `[cbhpm-validator] ❌ Melhor match encontrado mas similaridade insuficiente (${(melhorSimilaridadeGlobal * 100).toFixed(1)}% < ${limiarSimilaridade * 100}%): "${melhorMatchGlobal.codigo}" - "${melhorMatchGlobal.descricao.slice(0, 50)}..."`
      );
    }
  }

  // 3. Não encontrou match válido
  console.log(`[cbhpm-validator] ❌ Procedimento não validado: codigo="${codigoLimpo}", descricao="${descricaoLimpa?.slice(0, 50)}..."`);

  // Return best match as suggestion even if below threshold (for UI suggestion purposes)
  // Only suggest if similarity is at least 30%
  const melhorSugestao: ValidacaoResult["melhor_sugestao"] =
    melhorMatchGlobal && melhorSimilaridadeGlobal >= 0.3
      ? {
          codigo: melhorMatchGlobal.codigo,
          descricao: melhorMatchGlobal.descricao,
          similaridade: melhorSimilaridadeGlobal,
        }
      : null;

  if (melhorSugestao) {
    console.log(
      `[cbhpm-validator] 💡 Sugestão (abaixo do limiar): "${melhorSugestao.codigo}" - "${melhorSugestao.descricao.slice(0, 50)}..." (${(melhorSugestao.similaridade * 100).toFixed(1)}%)`
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
      // Evitar duplicatas
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
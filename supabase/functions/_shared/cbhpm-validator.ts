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

    // 1.5. Tentar busca por código aproximado (prefixo similar)
    // A IA pode ter errado 1-2 dígitos do código. Buscar códigos com mesmo prefixo (primeiros 5 dígitos).
    if (codigoLimpo.length >= 5) {
      const prefixo = codigoLimpo.slice(0, 5);
      const { data: candidatosPorPrefixo, error: prefixError } = await supabase
        .from("cbhpm_cirurgias")
        .select("codigo, descricao, porte, valor_porte")
        .like("codigo", `${prefixo}%`);

      if (!prefixError && candidatosPorPrefixo && candidatosPorPrefixo.length > 0 && descricaoLimpa) {
        // Entre os candidatos com prefixo similar, encontrar o que tem descrição mais parecida
        let melhorCandidato: CbhpmProcedimento | null = null;
        let melhorScore = 0;

        for (const cand of candidatosPorPrefixo) {
          const simDesc = verificarPalavrasChave(descricaoLimpa, cand.descricao);
          const simLev = calcularSimilaridade(descricaoLimpa, cand.descricao);
          const score = simLev * 0.4 + simDesc * 0.6;

          if (score > melhorScore) {
            melhorScore = score;
            melhorCandidato = cand;
          }
        }

        if (melhorCandidato && melhorScore >= 0.5) {
          console.log(
            `[cbhpm-validator] ✅ Match por código aproximado (prefixo ${prefixo}, score ${(melhorScore * 100).toFixed(1)}%): "${melhorCandidato.codigo}" - "${melhorCandidato.descricao.slice(0, 50)}..."`
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
  }

  // 2. Se não encontrou por código, tentar por similaridade de descrição
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

    let melhorMatch: CbhpmProcedimento | null = null;
    let melhorSimilaridade = 0;

    for (const proc of todosProcedimentos) {
      // Calcular similaridade combinada (Levenshtein + palavras-chave)
      const simLevenshtein = calcularSimilaridade(descricaoLimpa, proc.descricao);
      const simPalavras = verificarPalavrasChave(descricaoLimpa, proc.descricao);

      // Média ponderada: 40% Levenshtein, 60% palavras-chave
      const similaridadeCombinada = simLevenshtein * 0.4 + simPalavras * 0.6;

      if (similaridadeCombinada > melhorSimilaridade) {
        melhorSimilaridade = similaridadeCombinada;
        melhorMatch = proc;
      }
    }

    if (melhorMatch && melhorSimilaridade >= limiarSimilaridade) {
      console.log(
        `[cbhpm-validator] ✅ Match por descrição similar (${(melhorSimilaridade * 100).toFixed(1)}%): "${melhorMatch.codigo}" - "${melhorMatch.descricao.slice(0, 50)}..."`
      );
      return {
        valido: true,
        codigo_validado: melhorMatch.codigo,
        descricao_validada: melhorMatch.descricao,
        cbhpm_match: melhorMatch,
        metodo_validacao: "descricao_similar",
        similaridade: melhorSimilaridade,
      };
    }

    if (melhorMatch) {
      console.log(
        `[cbhpm-validator] ❌ Melhor match encontrado mas similaridade insuficiente (${(melhorSimilaridade * 100).toFixed(1)}% < ${limiarSimilaridade * 100}%): "${melhorMatch.descricao.slice(0, 50)}..."`
      );
    }
  }

  // 3. Não encontrou match válido
  console.log(`[cbhpm-validator] ❌ Procedimento não validado: codigo="${codigoLimpo}", descricao="${descricaoLimpa?.slice(0, 50)}..."`);
  return {
    valido: false,
    codigo_validado: null,
    descricao_validada: null,
    cbhpm_match: null,
    metodo_validacao: "nao_encontrado",
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
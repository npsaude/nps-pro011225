-- =====================================================================
-- Tabela principal de cadastro de SADT
-- =====================================================================

-- Enum para status cadastral da SADT
CREATE TYPE sadt_cadastro_status AS ENUM ('ATIVO', 'INATIVO');

-- Enum para estágio da SADT no fluxo de faturamento
CREATE TYPE sadt_estagio AS ENUM (
  'AGUARDANDO',
  'RECEBIDO',
  'EM_FATURAMENTO',
  'PAGO',
  'RETORNO_POR_GLOSA',
  'DEFESA_POR_GLOSA'
);

CREATE TABLE IF NOT EXISTS sadts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id         UUID NOT NULL, -- ID do médico responsável (referência à tabela de médicos do seu sistema)
  numero_guia_principal      TEXT NOT NULL,
  data_autorizacao           DATE NOT NULL,
  nome_profissional_solicitante TEXT NOT NULL,
  identificacao_operadora    TEXT NOT NULL,
  telefone_contato           TEXT,
  protocolo                  TEXT,    -- protocolo gerado no envio
  status_cadastro            sadt_cadastro_status NOT NULL DEFAULT 'ATIVO',
  estagio                    sadt_estagio NOT NULL DEFAULT 'AGUARDANDO',
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- Tabela de configurações gerais da aplicação
-- Inclui o campo "Token OpenAI"
-- =====================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- token usado para chamadas à OpenAI
  openai_api_token  TEXT,
  -- outros campos de configuração podem ser adicionados aqui
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Opcional: você pode trabalhar com um único registro na tabela de settings.
-- Nesse caso, crie 1 row e atualize sempre a mesma.

-- =====================================================================
-- Tabela de arquivos de SADT enviados pelos médicos
-- =====================================================================

CREATE TABLE IF NOT EXISTS sadt_files (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sadt_id           UUID NOT NULL REFERENCES sadts(id) ON DELETE CASCADE,
  medico_id         UUID NOT NULL,
  file_name         TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  size_bytes        BIGINT NOT NULL,
  -- Caminho físico ou lógico do arquivo no storage.
  -- Recomendação: salvar no padrão "medicos/{medico_id}/{nome_arquivo}"
  file_path         TEXT NOT NULL,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- Tabela de análises da OpenAI relacionadas à SADT
-- =====================================================================

-- Enum para status da análise
CREATE TYPE sadt_analysis_status AS ENUM (
  'PENDENTE',
  'EM_PROCESSAMENTO',
  'CONCLUIDO',
  'ERRO'
);

CREATE TABLE IF NOT EXISTS sadt_analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sadt_id           UUID NOT NULL REFERENCES sadts(id) ON DELETE CASCADE,
  sadt_file_id      UUID REFERENCES sadt_files(id) ON DELETE SET NULL,
  model             TEXT NOT NULL, -- ex: gpt-4o-mini
  status            sadt_analysis_status NOT NULL DEFAULT 'PENDENTE',
  -- resposta raw da OpenAI (JSON grande)
  raw_response      JSONB,
  -- campos extraídos já normalizados (número da guia, datas etc.)
  extracted_fields  JSONB,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at       TIMESTAMPTZ
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_sadt_files_sadt_id ON sadt_files (sadt_id);
CREATE INDEX IF NOT EXISTS idx_sadt_files_medico_id ON sadt_files (medico_id);
CREATE INDEX IF NOT EXISTS idx_sadt_analyses_sadt_id ON sadt_analyses (sadt_id);
CREATE INDEX IF NOT EXISTS idx_sadt_analyses_sadt_file_id ON sadt_analyses (sadt_file_id);
-- Extensão para geração de UUID (se ainda não existir)
create extension if not exists "pgcrypto";

-- Tabela de cadastro de SADT
create table if not exists sadts (
  id uuid primary key default gen_random_uuid(),

  -- Referência ao médico (por enquanto sem FK; podemos adicionar depois)
  "medicoId" uuid not null,

  -- Dados principais da guia SADT
  "numeroGuiaPrincipal" text not null,
  "dataAutorizacao" date not null,
  "nomeProfissionalSolicitante" text not null,
  "identificacaoOperadora" text not null,

  -- Dados de contato / protocolo
  "telefoneContato" text,
  "protocolo" text,

  -- Status de cadastro e estágio do processo
  "statusCadastro" text not null check ("statusCadastro" in ('ATIVO', 'INATIVO')),
  "estagio" text not null check (
    "estagio" in (
      'AGUARDANDO',
      'RECEBIDO',
      'EM_FATURAMENTO',
      'PAGO',
      'RETORNO_POR_GLOSA',
      'DEFESA_POR_GLOSA'
    )
  ),

  -- Datas de criação/atualização do registro
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Fim da definição da tabela sadts
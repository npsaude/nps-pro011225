-- Tabela de usuários da aplicação
create extension if not exists "pgcrypto";

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  role text not null check (role in ('MEDICO', 'ADMIN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fim da definição da tabela de usuários
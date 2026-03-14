create type consistencia_status as enum ('correto', 'inconsistente', 'suspeita');

create table faturamento_consistencia (
  id                    uuid primary key default gen_random_uuid(),
  faturamento_id        uuid not null references faturamentos(id) on delete cascade,
  medico_id             uuid not null references auth.users(id),

  check_id              text not null,
  check_label           text not null,
  check_grupo           text not null,
  check_stage           text not null,

  documento_a           text,
  valor_a               text,
  documento_b           text,
  valor_b               text,

  status                consistencia_status not null,
  detalhe               text,

  confianca_ia          numeric(4,3),

  ignorado_pelo_usuario boolean not null default false,
  ignorado_em           timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index on faturamento_consistencia (faturamento_id);
create index on faturamento_consistencia (medico_id);
create index on faturamento_consistencia (status);
create index on faturamento_consistencia (faturamento_id, status);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_faturamento_consistencia_updated_at
  before update on faturamento_consistencia
  for each row execute function set_updated_at();

alter table faturamento_consistencia enable row level security;

create policy "consistencia_select_own"
  on faturamento_consistencia for select
  using (medico_id = auth.uid());

create policy "consistencia_insert_own"
  on faturamento_consistencia for insert
  with check (medico_id = auth.uid());

create policy "consistencia_update_own"
  on faturamento_consistencia for update
  using (medico_id = auth.uid());

create policy "consistencia_delete_own"
  on faturamento_consistencia for delete
  using (medico_id = auth.uid());

create policy "consistencia_select_super_admin"
  on faturamento_consistencia for select
  using (
    exists (
      select 1 from usuarios_sistema
      where id_user = auth.uid()
        and regra = 'super_admin'
    )
  );

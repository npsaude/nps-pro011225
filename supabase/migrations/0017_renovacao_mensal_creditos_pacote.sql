-- Renovação mensal do ciclo de créditos do pacote contratado.
--
-- O consumo de créditos (faturamento=10, acompanhamento=2) é contado a partir
-- de subscription_enrollments.current_period_start. Para os créditos "voltarem"
-- a cada mês a partir da data de contratação, esta função avança
-- current_period_start para o início do ciclo mensal vigente, preservando o
-- dia do mês original. current_period_end (validade da assinatura) NÃO é
-- alterado.

create extension if not exists pg_cron;

create or replace function public.renew_credit_periods()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  afetados integer;
begin
  with atualizados as (
    update public.subscription_enrollments e
    set current_period_start = e.current_period_start
          + make_interval(months =>
              (extract(year from age(now(), e.current_period_start)) * 12
               + extract(month from age(now(), e.current_period_start)))::int),
        updated_at = now()
    where e.status in ('ACTIVE', 'TRIAL')
      and e.cancelado = false
      and e.current_period_start is not null
      and (extract(year from age(now(), e.current_period_start)) * 12
           + extract(month from age(now(), e.current_period_start)))::int >= 1
    returning 1
  )
  select count(*) into afetados from atualizados;

  return afetados;
end;
$$;

comment on function public.renew_credit_periods() is
  'Avança current_period_start dos enrollments ativos para o ciclo mensal vigente (reset mensal dos créditos do pacote). Não altera current_period_end.';

-- Agenda diária (00:05) para manter os ciclos sempre atualizados.
select cron.unschedule('renew-credit-periods')
where exists (select 1 from cron.job where jobname = 'renew-credit-periods');

select cron.schedule(
  'renew-credit-periods',
  '5 0 * * *',
  $$select public.renew_credit_periods();$$
);

-- Backfill imediato: ajusta os períodos vencidos ao ciclo atual.
select public.renew_credit_periods();

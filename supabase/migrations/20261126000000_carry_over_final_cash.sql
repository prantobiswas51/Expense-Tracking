-- Carry over "Final Cash" instead of cashflow net, matching the dashboard card:
--   cashflow incoming - outgoing, + unpaid part of loans borrowed, - unpaid part of loans lent,
--   counting only entries and loans dated in the previous month (UTC).
-- The scheduled job from the earlier migration keeps calling this function.
create or replace function public.carry_over_previous_month()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cur   timestamptz := date_trunc('month', now() at time zone 'utc') at time zone 'utc';
  prev  timestamptz := cur - interval '1 month';
  -- Calendar dates of the same boundaries, for loans.loan_date.
  cur_day  date := (cur at time zone 'utc')::date;
  prev_day date := (prev at time zone 'utc')::date;
  label text := 'Previous - ' || trim(to_char(prev at time zone 'utc', 'Month')) || ' - added';
  added integer;
begin
  insert into public.cashflow (user_id, name, amount, direction, project_id, created_at)
  select t.user_id, label, sum(t.value), 'incoming', null, cur
    from (
      select user_id,
             case when direction = 'incoming' then amount else -amount end as value
        from public.cashflow
       where created_at >= prev and created_at < cur
      union all
      select user_id,
             case when kind = 'borrowed' then amount - repaid else repaid - amount end
        from public.loans
       where loan_date >= prev_day and loan_date < cur_day
    ) t
   -- Safe to run twice: skip users who already have this month's carry-over.
   where not exists (
     select 1 from public.cashflow c
      where c.user_id = t.user_id and c.created_at = cur and c.name = label
   )
   group by t.user_id
  having sum(t.value) > 0;
  get diagnostics added = row_count;
  return added;
end;
$$;

revoke all on function public.carry_over_previous_month() from public, anon, authenticated;

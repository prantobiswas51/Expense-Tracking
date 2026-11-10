-- Month-end carry-over: on the 1st of every month, each user's leftover from the previous month
-- (incoming - outgoing, which already includes any amount carried into that month) is added to the
-- new month as an incoming cashflow entry with no project, named "Previous - <Month> - added".
-- Only a positive leftover is carried. Month boundaries are UTC.
create or replace function public.carry_over_previous_month()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cur   timestamptz := date_trunc('month', now() at time zone 'utc') at time zone 'utc';
  prev  timestamptz := cur - interval '1 month';
  added integer;
begin
  insert into public.cashflow (user_id, name, amount, direction, project_id, created_at)
  select t.user_id,
         'Previous - ' || trim(to_char(prev at time zone 'utc', 'Month')) || ' - added',
         t.net,
         'incoming',
         null,
         cur
    from (
      select user_id,
             sum(case when direction = 'incoming' then amount else -amount end) as net
        from public.cashflow
       where created_at >= prev and created_at < cur
       group by user_id
    ) t
   where t.net > 0
     -- Safe to run twice: skip users who already have this month's carry-over.
     and not exists (
       select 1 from public.cashflow c
        where c.user_id = t.user_id
          and c.created_at = cur
          and c.name = 'Previous - ' || trim(to_char(prev at time zone 'utc', 'Month')) || ' - added'
     );
  get diagnostics added = row_count;
  return added;
end;
$$;

-- Only the scheduler (postgres) runs this; it touches every user's data.
revoke all on function public.carry_over_previous_month() from public, anon, authenticated;

create extension if not exists pg_cron;

-- 00:05 UTC on the 1st of every month. Re-scheduling with the same name just updates the job.
select cron.schedule('carry-over-previous-month', '5 0 1 * *', $$select public.carry_over_previous_month()$$);

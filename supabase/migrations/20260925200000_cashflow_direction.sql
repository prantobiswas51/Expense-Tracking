-- Replace cashflow types with a fixed direction on each entry.
alter table public.cashflow
  add column direction text check (direction in ('incoming', 'outgoing'));

-- Keep existing meaning: positive type -> incoming, negative type -> outgoing, no type -> incoming.
update public.cashflow c
set direction = case when t.is_positive then 'incoming' else 'outgoing' end
from public.cashflow_types t
where t.id = c.type_id;

update public.cashflow set direction = 'incoming' where direction is null;

alter table public.cashflow
  alter column direction set default 'incoming',
  alter column direction set not null,
  drop constraint cashflow_type_fkey,
  drop column type_id;

drop table public.cashflow_types;

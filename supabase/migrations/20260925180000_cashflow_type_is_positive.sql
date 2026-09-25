-- Direction of a cashflow type: true = incoming (positive), false = outgoing (negative).
alter table public.cashflow_types
  add column is_positive boolean not null default true;

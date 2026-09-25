-- Cashflow types, owned by the signed-in user.
create table public.cashflow_types (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id) -- target for the composite FK below
);

-- Cashflow entries.
create table public.cashflow (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 200),
  amount     numeric(14, 2) not null,
  type_id    uuid,
  created_at timestamptz not null default now(),
  -- Only the owner's own types; deleting a type clears it on its entries.
  constraint cashflow_type_fkey foreign key (type_id, user_id)
    references public.cashflow_types (id, user_id) on delete set null (type_id)
);

create index cashflow_user_created_idx on public.cashflow (user_id, created_at desc);
create index cashflow_type_id_idx on public.cashflow (type_id);

alter table public.cashflow_types enable row level security;
alter table public.cashflow enable row level security;

create policy "Own cashflow types: select" on public.cashflow_types
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own cashflow types: insert" on public.cashflow_types
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own cashflow types: update" on public.cashflow_types
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own cashflow types: delete" on public.cashflow_types
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Own cashflow: select" on public.cashflow
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own cashflow: insert" on public.cashflow
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own cashflow: update" on public.cashflow
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own cashflow: delete" on public.cashflow
  for delete to authenticated using (user_id = (select auth.uid()));

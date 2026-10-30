-- Loans, owned by the signed-in user: money lent to someone or borrowed from someone.
create table public.loans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person     text not null check (char_length(trim(person)) between 1 and 200),
  kind       text not null check (kind in ('lent', 'borrowed')),
  amount     numeric(14, 2) not null check (amount > 0),
  repaid     numeric(14, 2) not null default 0 check (repaid >= 0 and repaid <= amount),
  loan_date  date not null default current_date,
  due_date   date check (due_date is null or due_date >= loan_date),
  notes      text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);

create index loans_user_id_idx on public.loans (user_id);

alter table public.loans enable row level security;

create policy "Own loans: select" on public.loans
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own loans: insert" on public.loans
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own loans: update" on public.loans
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own loans: delete" on public.loans
  for delete to authenticated using (user_id = (select auth.uid()));

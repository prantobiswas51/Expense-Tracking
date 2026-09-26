-- Clients, owned by the signed-in user.
create table public.clients (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 200),
  company    text check (char_length(company) <= 200),
  email      text check (char_length(email) <= 320),
  phone      text check (char_length(phone) <= 50),
  notes      text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  unique (id, user_id) -- target for the composite FK below
);

-- Many-to-many: a project can have several clients, a client several projects.
-- Composite FKs keep both sides owned by the same user; deleting either side removes the link.
create table public.project_clients (
  project_id uuid not null,
  client_id  uuid not null,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, client_id),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  foreign key (client_id, user_id) references public.clients (id, user_id) on delete cascade
);

create index project_clients_client_id_idx on public.project_clients (client_id);

alter table public.clients enable row level security;
alter table public.project_clients enable row level security;

create policy "Own clients: select" on public.clients
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own clients: insert" on public.clients
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own clients: update" on public.clients
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own clients: delete" on public.clients
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Own project clients: select" on public.project_clients
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own project clients: insert" on public.project_clients
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own project clients: delete" on public.project_clients
  for delete to authenticated using (user_id = (select auth.uid()));

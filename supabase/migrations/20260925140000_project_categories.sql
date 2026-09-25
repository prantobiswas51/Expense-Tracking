-- Project categories, owned by the signed-in user.
create table public.project_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id) -- target for the composite FK below
);

alter table public.project_categories enable row level security;

create policy "Own categories: select" on public.project_categories
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own categories: insert" on public.project_categories
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own categories: update" on public.project_categories
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own categories: delete" on public.project_categories
  for delete to authenticated using (user_id = (select auth.uid()));

-- Project type -> category. Composite FK means a project can only use its owner's categories.
-- Deleting a category clears the type on its projects instead of deleting them.
alter table public.projects
  add column type_id uuid,
  add constraint projects_type_fkey
    foreign key (type_id, user_id) references public.project_categories (id, user_id)
    on delete set null (type_id);

create index projects_type_id_idx on public.projects (type_id);

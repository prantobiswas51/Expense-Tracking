-- Projects: one row per project, owned by the signed-in user.
create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 200),
  slug       text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

-- Auto-generate slug from name on insert (only when none is given), de-duplicated per user: my-app, my-app-2, ...
create or replace function public.projects_set_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  base text;
  candidate text;
  n int := 1;
begin
  if coalesce(new.slug, '') <> '' then
    return new;
  end if;

  base := trim(both '-' from regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g'));
  if base = '' then
    base := 'project';
  end if;

  candidate := base;
  while exists (select 1 from public.projects p where p.user_id = new.user_id and p.slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

create trigger projects_set_slug
before insert on public.projects
for each row execute function public.projects_set_slug();

-- Row-level security: users only see and change their own projects.
alter table public.projects enable row level security;

create policy "Own projects: select" on public.projects
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own projects: insert" on public.projects
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own projects: update" on public.projects
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own projects: delete" on public.projects
  for delete to authenticated using (user_id = (select auth.uid()));

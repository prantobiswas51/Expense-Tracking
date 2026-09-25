-- Optional link from a cashflow entry to one of the owner's projects.
alter table public.projects
  add constraint projects_id_user_id_key unique (id, user_id); -- target for the composite FK below

alter table public.cashflow
  add column project_id uuid,
  add constraint cashflow_project_fkey foreign key (project_id, user_id)
    references public.projects (id, user_id) on delete set null (project_id);

create index cashflow_project_id_idx on public.cashflow (project_id);

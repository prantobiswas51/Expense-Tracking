-- Project status and optional due date.
alter table public.projects
  add column status text not null default 'started'
    check (status in ('started', 'in_progress', 'cancelled', 'completed')),
  add column due_date date;

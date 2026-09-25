-- Optional free-text description on projects.
alter table public.projects
  add column description text check (char_length(description) <= 2000);

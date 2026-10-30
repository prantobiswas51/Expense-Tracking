-- Loans point at a client instead of holding a free-text person.
alter table public.loans add column client_id uuid;

-- Keep any existing loans: create a client for each distinct name that has none yet, then link.
insert into public.clients (user_id, name)
select distinct l.user_id, trim(l.person)
  from public.loans l
 where not exists (
   select 1 from public.clients c where c.user_id = l.user_id and lower(c.name) = lower(trim(l.person))
 );

update public.loans l
   set client_id = (
     select c.id from public.clients c
      where c.user_id = l.user_id and lower(c.name) = lower(trim(l.person))
      order by c.created_at limit 1
   );

alter table public.loans alter column client_id set not null;
alter table public.loans drop column person;

-- Same owner on both sides; a client with loans can't be deleted by accident.
alter table public.loans
  add foreign key (client_id, user_id) references public.clients (id, user_id);

create index loans_client_id_idx on public.loans (client_id);

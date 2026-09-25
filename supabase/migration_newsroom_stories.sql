create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references public.candidates(id) on delete restrict,
  headline text not null,
  summary text,
  vertical text not null default 'unassigned'
    check (vertical in ('unassigned','auto','industry','mega','cross_vertical')),
  destination_type text
    check (destination_type is null or destination_type in ('tdr_auto','tdr_asia','tdr_mega','none')),
  destination_url text,
  status text not null default 'draft'
    check (status in ('draft','ready','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stories enable row level security;
revoke all on table public.stories from anon, authenticated;
grant select, insert, update, delete on table public.stories to service_role;

create index if not exists stories_created_at_idx on public.stories (created_at desc);
create index if not exists stories_status_idx on public.stories (status);

create or replace function public.set_stories_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_stories_updated_at() from public;
grant execute on function public.set_stories_updated_at() to service_role;

drop trigger if exists stories_set_updated_at on public.stories;
create trigger stories_set_updated_at
before update on public.stories
for each row execute function public.set_stories_updated_at();

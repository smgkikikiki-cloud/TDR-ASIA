create table if not exists public.distribution_items (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  channel text not null check (channel in ('facebook','x')),
  copy text not null default '',
  status text not null default 'draft' check (status in ('draft','ready','posted')),
  destination_url text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, channel)
);

alter table public.distribution_items enable row level security;
revoke all on table public.distribution_items from anon, authenticated;
grant select, insert, update, delete on table public.distribution_items to service_role;

create index if not exists distribution_items_story_id_idx on public.distribution_items (story_id);
create index if not exists distribution_items_status_idx on public.distribution_items (status);

create or replace function public.set_distribution_items_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_distribution_items_updated_at() from public;
grant execute on function public.set_distribution_items_updated_at() to service_role;

drop trigger if exists distribution_items_set_updated_at on public.distribution_items;
create trigger distribution_items_set_updated_at
before update on public.distribution_items
for each row execute function public.set_distribution_items_updated_at();

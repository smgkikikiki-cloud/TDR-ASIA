alter table public.distribution_items
  add column if not exists post_url text,
  add column if not exists posted_at timestamptz;

create table if not exists public.performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  distribution_item_id uuid not null references public.distribution_items(id) on delete cascade,
  captured_at timestamptz not null default now(),
  views bigint not null default 0 check (views >= 0),
  reach bigint not null default 0 check (reach >= 0),
  reactions bigint not null default 0 check (reactions >= 0),
  comments bigint not null default 0 check (comments >= 0),
  shares bigint not null default 0 check (shares >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  followers_gained bigint not null default 0 check (followers_gained >= 0),
  created_at timestamptz not null default now()
);

create index if not exists performance_snapshots_distribution_captured_idx
  on public.performance_snapshots(distribution_item_id, captured_at desc);

alter table public.performance_snapshots enable row level security;
revoke all on table public.performance_snapshots from anon, authenticated;
grant select, insert, update, delete on table public.performance_snapshots to service_role;

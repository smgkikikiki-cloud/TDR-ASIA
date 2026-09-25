-- TDR Asia newsroom MVP persistence.
-- Service-role access only. Public pages read it server-side.
create table if not exists public.newsroom_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.newsroom_state enable row level security;
-- Intentionally no anon/authenticated policies. Server uses service-role key.

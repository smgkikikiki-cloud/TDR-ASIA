alter table public.stories
  add column if not exists growth_score smallint check (growth_score between 0 and 100),
  add column if not exists route_score smallint check (route_score between 0 and 100),
  add column if not exists automation_reason text,
  add column if not exists auto_promoted_at timestamptz;

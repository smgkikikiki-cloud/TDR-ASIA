create table if not exists public.mega_project_companies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.mega_projects(id) on delete cascade,
  company_id uuid not null references public.mega_companies(id) on delete cascade,
  role text not null check (role in ('owner','developer','concessionaire','main_contractor','epc','consultant','supplier','financier','operator','other')),
  source_url text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, company_id, role)
);

create index if not exists mega_project_companies_project_idx
  on public.mega_project_companies(project_id, role);

create index if not exists mega_project_companies_company_idx
  on public.mega_project_companies(company_id, role);

alter table public.mega_project_companies enable row level security;
revoke all on table public.mega_project_companies from anon, authenticated;
grant select, insert, update, delete on table public.mega_project_companies to service_role;

-- Bootstrap canonical owner entities from current verified project ownership.
with owner_parts as (
  select distinct trim(part) as name
  from public.mega_projects p
  cross join lateral regexp_split_to_table(p.owner_name, E'\\s*/\\s*') as part
  where p.owner_name is not null and trim(part) <> ''
), normalized as (
  select
    trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) as entity_key,
    name,
    case
      when name ilike '%authority%'
        or name ilike '%office%'
        or name ilike '%state railway%'
        or name ilike '%royal thai navy%'
        then 'public_owner'
      else 'company'
    end as company_type
  from owner_parts
)
insert into public.mega_companies(entity_key, name, company_type)
select entity_key, name, company_type
from normalized
where entity_key <> ''
on conflict(entity_key) do update set
  name = excluded.name,
  company_type = coalesce(public.mega_companies.company_type, excluded.company_type),
  updated_at = now();

with project_owner_parts as (
  select p.id as project_id, p.source_url, p.last_verified_at, trim(part) as name
  from public.mega_projects p
  cross join lateral regexp_split_to_table(p.owner_name, E'\\s*/\\s*') as part
  where p.owner_name is not null and trim(part) <> ''
), normalized as (
  select
    project_id,
    source_url,
    last_verified_at,
    trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) as entity_key
  from project_owner_parts
)
insert into public.mega_project_companies(project_id, company_id, role, source_url, verified_at)
select n.project_id, c.id, 'owner', n.source_url, n.last_verified_at
from normalized n
join public.mega_companies c on c.entity_key = n.entity_key
where n.entity_key <> ''
on conflict(project_id, company_id, role) do update set
  source_url = excluded.source_url,
  verified_at = excluded.verified_at,
  updated_at = now();

-- Verified-only package layer for TDR Mega.
-- Do not seed synthetic tenders/packages from project names. Package records must retain source evidence.

create table if not exists public.mega_packages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.mega_projects(id) on delete cascade,
  package_code text not null,
  name text not null,
  category text,
  status text not null default 'planned' check (status in ('planned','prequalification','tendering','awarded','construction','completed','cancelled','on_hold')),
  value_thb numeric,
  procurement_method text,
  description text,
  source_url text,
  source_label text,
  verified_at timestamptz,
  award_date date,
  planned_start_date date,
  planned_completion_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, package_code),
  check (value_thb is null or value_thb >= 0)
);

create table if not exists public.mega_package_companies (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.mega_packages(id) on delete cascade,
  company_id uuid not null references public.mega_companies(id) on delete cascade,
  role text not null check (role in ('client','developer','concessionaire','main_contractor','epc','designer','consultant','supplier','financier','operator','jv_member','other')),
  source_url text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(package_id, company_id, role)
);

create index if not exists mega_packages_project_status_idx on public.mega_packages(project_id, status);
create index if not exists mega_packages_status_value_idx on public.mega_packages(status, value_thb desc);
create index if not exists mega_package_companies_package_idx on public.mega_package_companies(package_id, role);
create index if not exists mega_package_companies_company_idx on public.mega_package_companies(company_id, role);

alter table public.mega_packages enable row level security;
alter table public.mega_package_companies enable row level security;
revoke all on table public.mega_packages from anon, authenticated;
revoke all on table public.mega_package_companies from anon, authenticated;
grant select, insert, update, delete on table public.mega_packages to service_role;
grant select, insert, update, delete on table public.mega_package_companies to service_role;

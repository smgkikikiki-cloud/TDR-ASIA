-- U-Tapao package/workstream backfill from official EECO sources.
-- Only record_type='opportunity' counts as an open commercial opportunity.

alter table public.mega_packages
  add column if not exists record_type text not null default 'tracked_workstream'
  check (record_type in ('opportunity','awarded_package','tracked_workstream'));

create index if not exists mega_packages_record_type_status_idx
  on public.mega_packages(record_type, status, value_thb desc);

with entities(entity_key,name,company_type) as (
  values
    ('italian-thai-development-plc','Italian-Thai Development PLC.','contractor'),
    ('aeronautical-radio-of-thailand-ltd','Aeronautical Radio of Thailand Ltd.','state_enterprise'),
    ('department-of-highways','Department of Highways','public_owner'),
    ('eastern-water-resources-development-and-management-public-company-limited','Eastern Water Resources Development and Management Public Company Limited','operator'),
    ('b-grimm-power-public-company-limited','B.Grimm Power Public Company Limited','operator'),
    ('global-aero-associates-co-ltd','Global Aero Associates Co., Ltd.','operator'),
    ('u-tapao-international-aviation-co-ltd','U-Tapao International Aviation Co., Ltd.','developer'),
    ('asian-infrastructure-investment-bank','Asian Infrastructure Investment Bank','financier')
)
insert into public.mega_companies(entity_key,name,company_type)
select * from entities
on conflict(entity_key) do update set name=excluded.name, company_type=coalesce(public.mega_companies.company_type,excluded.company_type), updated_at=now();

with p as (select id from public.mega_projects where slug='utapao-airport-eastern-aviation-city'),
rows(package_code,name,category,status,record_type,value_thb,procurement_method,description,source_url,source_label,award_date,planned_start_date,planned_completion_date) as (
  values
    ('UTP-RWY2','Second Runway and Associated Taxiways','Airfield civil works','construction','awarded_package',13142000000::numeric,'Construction contract','Construction contract signed 12 Sep 2025; works commenced 28 Nov 2025; completion scheduled for 29 Oct 2028.','https://www.eeco.or.th/press_release/%E0%B8%AA%E0%B8%81%E0%B8%9E%E0%B8%AD-%E0%B8%A3%E0%B9%88%E0%B8%A7%E0%B8%A1%E0%B8%84%E0%B8%B4%E0%B8%81%E0%B8%AD%E0%B8%AD%E0%B8%9F-%E0%B9%80%E0%B8%A3%E0%B8%B4%E0%B9%88%E0%B8%A1%E0%B8%95%E0%B9%89/','EECO project update','2025-09-12'::date,'2025-11-28'::date,'2028-10-29'::date),
    ('UTP-ATC','New Air Traffic Control Tower','Air traffic management','planned','tracked_workstream',null::numeric,null,'Construction preparations underway under AEROTHAI responsibility.','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/','EECO project status',null::date,null::date,null::date),
    ('UTP-M7-LINK','Elevated Road Connecting Motorway No. 7 to the Airport','Road access','awarded','awarded_package',null::numeric,null,'Department of Highways workstream; construction contract signed 6 Oct 2025.','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/','EECO project status',null::date,null::date,null::date),
    ('UTP-WATER','Water Supply and Wastewater Treatment Systems','Utilities - water','construction','tracked_workstream',null::numeric,null,'Water supply and wastewater treatment systems are under construction.','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/','EECO project status',null::date,null::date,null::date),
    ('UTP-POWER-DC','Power Supply and District Cooling Systems','Utilities - energy','construction','tracked_workstream',null::numeric,null,'Power supply and district cooling systems are under construction.','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/','EECO project status',null::date,null::date,null::date),
    ('UTP-FUEL','Aircraft Refueling System','Aviation fuel','construction','tracked_workstream',null::numeric,null,'Aircraft refueling system is under construction.','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/','EECO project status',null::date,null::date,null::date),
    ('UTP-MRO','Aircraft Maintenance, Repair, and Overhaul (MRO) Zone','MRO','tendering','opportunity',null::numeric,'Operator selection','EECO reports the project is in the process of selecting a project operator.','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/','EECO project status',null::date,null::date,null::date),
    ('UTP-T34','Passenger Terminals 3 and 4','Passenger terminal','planned','tracked_workstream',null::numeric,null,'Private-sector development under UTA; awaiting notice to proceed.','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/','EECO project status',null::date,null::date,null::date)
)
insert into public.mega_packages(project_id,package_code,name,category,status,record_type,value_thb,procurement_method,description,source_url,source_label,verified_at,award_date,planned_start_date,planned_completion_date)
select p.id,r.package_code,r.name,r.category,r.status,r.record_type,r.value_thb,r.procurement_method,r.description,r.source_url,r.source_label,now(),r.award_date,r.planned_start_date,r.planned_completion_date from p cross join rows r
on conflict(project_id,package_code) do update set name=excluded.name,category=excluded.category,status=excluded.status,record_type=excluded.record_type,value_thb=excluded.value_thb,procurement_method=excluded.procurement_method,description=excluded.description,source_url=excluded.source_url,source_label=excluded.source_label,verified_at=excluded.verified_at,award_date=excluded.award_date,planned_start_date=excluded.planned_start_date,planned_completion_date=excluded.planned_completion_date,updated_at=now();

with links(package_code,entity_key,role,source_url) as (
  values
    ('UTP-RWY2','royal-thai-navy','client','https://www.eeco.or.th/press_release/%E0%B8%AA%E0%B8%81%E0%B8%9E%E0%B8%AD-%E0%B8%A3%E0%B9%88%E0%B8%A7%E0%B8%A1%E0%B8%84%E0%B8%B4%E0%B8%81%E0%B8%AD%E0%B8%AD%E0%B8%9F-%E0%B9%80%E0%B8%A3%E0%B8%B4%E0%B9%88%E0%B8%A1%E0%B8%95%E0%B9%89/'),
    ('UTP-RWY2','italian-thai-development-plc','main_contractor','https://www.eeco.or.th/?jet_download=cc4ff64ed327a4e64f5c77a9255e9cc1e3fb3bf7'),
    ('UTP-RWY2','asian-infrastructure-investment-bank','financier','https://www.eeco.or.th/press_release/eeco-upd04062029/'),
    ('UTP-ATC','aeronautical-radio-of-thailand-ltd','client','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/'),
    ('UTP-M7-LINK','department-of-highways','client','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/'),
    ('UTP-WATER','eastern-economic-corridor-office','client','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/'),
    ('UTP-WATER','eastern-water-resources-development-and-management-public-company-limited','operator','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/'),
    ('UTP-POWER-DC','eastern-economic-corridor-office','client','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/'),
    ('UTP-POWER-DC','b-grimm-power-public-company-limited','operator','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/'),
    ('UTP-FUEL','eastern-economic-corridor-office','client','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/'),
    ('UTP-FUEL','global-aero-associates-co-ltd','operator','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/'),
    ('UTP-MRO','eastern-economic-corridor-office','client','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/'),
    ('UTP-T34','u-tapao-international-aviation-co-ltd','developer','https://www.eeco.or.th/en/u-tapao-airport-and-eastern-aviation-city/')
), p as (select id from public.mega_projects where slug='utapao-airport-eastern-aviation-city')
insert into public.mega_package_companies(package_id,company_id,role,source_url,verified_at)
select mp.id,mc.id,l.role,l.source_url,now() from links l join p on true join public.mega_packages mp on mp.project_id=p.id and mp.package_code=l.package_code join public.mega_companies mc on mc.entity_key=l.entity_key
on conflict(package_id,company_id,role) do update set source_url=excluded.source_url,verified_at=excluded.verified_at,updated_at=now();

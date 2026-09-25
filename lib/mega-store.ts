import 'server-only';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export type MegaProject = {
  id:string; slug:string; name:string; sector:string; province:string|null; location:string|null;
  stage:string; valueThb:number; owner:string|null; summary:string|null; sourceUrl:string|null;
  sourceLabel:string|null; verifiedAt:string|null; updatedAt:string;
};

export type MegaEvent = {
  id:string; eventType:string; projectName:string|null; companyName:string|null; sector:string|null;
  province:string|null; valueThb:number|null; sourceUrl:string; sourceTitle:string|null; createdAt:string;
};

export type MegaCompany = {
  id:string; entityKey:string; name:string; companyType:string|null; website:string|null; projects:number; roles:string[];
};

export type MegaProjectParticipant = {
  companyId:string; entityKey:string; name:string; companyType:string|null; website:string|null; role:string; sourceUrl:string|null; verifiedAt:string|null;
};

async function rest<T>(resource:string):Promise<T>{
  if(!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase server credentials are not configured');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${resource}`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`},cache:'no-store'});
  if(!res.ok) throw new Error(`Mega Supabase read failed: ${res.status} ${await res.text()}`);
  return await res.json() as T;
}

const mapProject=(r:any):MegaProject=>({id:r.id,slug:r.slug,name:r.name,sector:r.sector,province:r.province,location:r.location,stage:r.stage,valueThb:Number(r.value_thb||0),owner:r.owner_name,summary:r.summary,sourceUrl:r.source_url,sourceLabel:r.source_label,verifiedAt:r.last_verified_at,updatedAt:r.updated_at});

export async function getMegaProjects(){const rows=await rest<any[]>('mega_projects?select=*&order=value_thb.desc.nullslast');return rows.map(mapProject);}
export async function getMegaProject(slug:string){const rows=await rest<any[]>(`mega_projects?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`);return rows[0]?mapProject(rows[0]):null;}
export async function getMegaEvents(limit=50){const rows=await rest<any[]>(`mega_project_events?select=*&status=eq.matched&order=created_at.desc&limit=${limit}`);return rows.map((r:any)=>({id:r.id,eventType:r.event_type,projectName:r.project_name,companyName:r.company_name,sector:r.sector,province:r.province,valueThb:r.investment_value_thb==null?null:Number(r.investment_value_thb),sourceUrl:r.source_url,sourceTitle:r.source_title,createdAt:r.created_at} satisfies MegaEvent));}

export async function getMegaCompanies():Promise<MegaCompany[]>{
  const [companies,links]=await Promise.all([
    rest<any[]>('mega_companies?select=id,entity_key,name,company_type,website&order=name.asc'),
    rest<any[]>('mega_project_companies?select=company_id,project_id,role'),
  ]);
  const projectSets=new Map<string,Set<string>>();
  const roles=new Map<string,Set<string>>();
  for(const link of links){
    if(!projectSets.has(link.company_id)) projectSets.set(link.company_id,new Set());
    projectSets.get(link.company_id)!.add(link.project_id);
    if(!roles.has(link.company_id)) roles.set(link.company_id,new Set());
    roles.get(link.company_id)!.add(link.role);
  }
  return companies.map((row)=>({
    id:row.id,
    entityKey:row.entity_key,
    name:row.name,
    companyType:row.company_type??null,
    website:row.website??null,
    projects:projectSets.get(row.id)?.size||0,
    roles:[...(roles.get(row.id)||new Set<string>())].sort(),
  })).sort((a,b)=>b.projects-a.projects||a.name.localeCompare(b.name));
}

export async function getMegaProjectParticipants(projectId:string):Promise<MegaProjectParticipant[]>{
  const links=await rest<any[]>(`mega_project_companies?select=company_id,role,source_url,verified_at&project_id=eq.${encodeURIComponent(projectId)}&order=role.asc`);
  if(!links.length) return [];
  const ids=[...new Set(links.map((row)=>row.company_id))];
  const companies=await rest<any[]>(`mega_companies?select=id,entity_key,name,company_type,website&id=in.(${ids.join(',')})`);
  const companyById=new Map(companies.map((row)=>[row.id,row]));
  return links.flatMap((link)=>{
    const company=companyById.get(link.company_id);
    if(!company) return [];
    return [{
      companyId:company.id,
      entityKey:company.entity_key,
      name:company.name,
      companyType:company.company_type??null,
      website:company.website??null,
      role:link.role,
      sourceUrl:link.source_url??null,
      verifiedAt:link.verified_at??null,
    } satisfies MegaProjectParticipant];
  });
}

export const fmtThb=(n:number)=>n>=1e12?`฿${(n/1e12).toFixed(2)}T`:n>=1e9?`฿${(n/1e9).toFixed(1)}B`:n>=1e6?`฿${(n/1e6).toFixed(0)}M`:`฿${n.toLocaleString()}`;

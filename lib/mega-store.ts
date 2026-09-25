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
export async function getMegaCompanies(){const rows=await rest<any[]>('mega_projects?select=owner_name&owner_name=not.is.null');const counts=new Map<string,number>();for(const r of rows){const n=String(r.owner_name||'').trim();if(n)counts.set(n,(counts.get(n)||0)+1);}return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([name,projects])=>({name,projects,type:'Project owner / investor'}));}
export const fmtThb=(n:number)=>n>=1e12?`฿${(n/1e12).toFixed(2)}T`:n>=1e9?`฿${(n/1e9).toFixed(1)}B`:n>=1e6?`฿${(n/1e6).toFixed(0)}M`:`฿${n.toLocaleString()}`;

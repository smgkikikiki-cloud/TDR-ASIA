import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export async function POST(req: Request){
  const secret = process.env.MEGA_EVENT_INGEST_SECRET;
  if (!secret || req.headers.get('x-mega-ingest-secret') !== secret) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!SUPABASE_URL || !SUPABASE_KEY) return NextResponse.json({error:'database_not_configured'},{status:503});
  const body = await req.json().catch(()=>null) as Record<string,unknown>|null;
  if (!body || typeof body.event_type!=='string' || typeof body.source_url!=='string') return NextResponse.json({error:'event_type and source_url are required'},{status:400});
  const payload = {external_event_id:typeof body.external_event_id==='string'?body.external_event_id:null,source_system:typeof body.source_system==='string'?body.source_system:'tdr_asia',event_type:body.event_type,entity_key:typeof body.entity_key==='string'?body.entity_key:null,company_name:typeof body.company_name==='string'?body.company_name:null,project_name:typeof body.project_name==='string'?body.project_name:null,sector:typeof body.sector==='string'?body.sector:null,province:typeof body.province==='string'?body.province:null,investment_value_thb:typeof body.investment_value_thb==='number'?body.investment_value_thb:null,source_url:body.source_url,source_title:typeof body.source_title==='string'?body.source_title:null,source_published_at:typeof body.source_published_at==='string'?body.source_published_at:null,raw_payload:body,status:'pending_match'};
  const res = await fetch(`${SUPABASE_URL}/rest/v1/mega_project_events`,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(payload),cache:'no-store'});
  if(!res.ok) return NextResponse.json({error:'insert_failed',detail:await res.text()},{status:500});
  const rows = await res.json();
  return NextResponse.json({ok:true,event:rows?.[0]??null},{status:201});
}

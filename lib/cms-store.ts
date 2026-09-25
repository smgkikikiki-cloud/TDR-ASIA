import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { CmsState, CmsArticle, CmsTag, CmsSource, Candidate } from "./cms-types";

const STORE = path.join(process.cwd(), "data", "cms.json");
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

function emptyState(): CmsState { return { articles: [], tags: [], sources: [], candidates: [] }; }
async function localDefault(): Promise<CmsState> {
  try { return JSON.parse(await fs.readFile(STORE, "utf8")) as CmsState; }
  catch { return emptyState(); }
}

function configured() { return Boolean(SUPABASE_URL && SUPABASE_KEY); }

async function rest<T = any>(resource: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase server credentials are not configured");
  const headers: Record<string,string> = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...((init.headers || {}) as Record<string,string>),
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${resource}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) throw new Error(`Supabase ${init.method || "GET"} ${resource} failed: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const dbTagTypeToCms = (t:string): CmsTag["type"] => t === "other" ? "general" : (t as CmsTag["type"]);
const cmsTagTypeToDb = (t:CmsTag["type"]) => t === "general" ? "other" : t;
const sectionFromDb = (s:string): CmsArticle["section"] => s === "investment" ? "Investment" : s === "companies" ? "Companies" : "News";
const sectionToDb = (s:CmsArticle["section"]) => s.toLowerCase();

async function supabaseRead(): Promise<CmsState | null> {
  if (!configured()) return null;

  const [tags, sources, candidates, articles, articleTags, articleSources, runs] = await Promise.all([
    rest<any[]>("tags?select=*&order=name.asc"),
    rest<any[]>("sources?select=*&order=priority.desc,name.asc"),
    rest<any[]>("candidates?select=*&order=created_at.desc&limit=200"),
    rest<any[]>("articles?select=*&order=updated_at.desc"),
    rest<any[]>("article_tags?select=article_id,tag_id"),
    rest<any[]>("article_sources?select=article_id,source_url,source_name,published_at"),
    rest<any[]>("discovery_runs?select=started_at,completed_at&order=started_at.desc&limit=1"),
  ]);

  const tagsByArticle = new Map<string,string[]>();
  for (const row of articleTags) tagsByArticle.set(row.article_id, [...(tagsByArticle.get(row.article_id) || []), row.tag_id]);
  const sourcesByArticle = new Map<string,string[]>();
  for (const row of articleSources) sourcesByArticle.set(row.article_id, [...(sourcesByArticle.get(row.article_id) || []), row.source_url]);

  return {
    tags: tags.map((r:any) => ({
      id:r.id, name:r.name, slug:r.slug, type:dbTagTypeToCms(r.type), active:r.is_active,
      createdAt:r.created_at,
    })),
    sources: sources.map((r:any) => ({
      id:r.id, name:r.name, url:r.feed_url || (r.domain ? (/^https?:\/\//i.test(r.domain) ? r.domain : `https://${r.domain}/`) : ""), enabled:r.is_active,
      priority:r.priority, notes:r.notes || undefined,
    })),
    candidates: candidates.map((r:any) => ({
      id:r.id,
      title:r.headline,
      summary:r.summary || "",
      sourceName:r.source_name || "Source",
      sourceUrl:r.source_url,
      publishedAt:r.published_at || undefined,
      discoveredAt:r.created_at,
      suggestedTags:Array.isArray(r.raw_metadata?.suggestedTags) ? r.raw_metadata.suggestedTags.map(String) : [],
      selected:r.status === "selected",
      generated:r.status === "generated",
    })),
    articles: articles.map((r:any) => ({
      id:r.id,
      slug:r.slug,
      title:r.title,
      subheadline:r.subheadline || r.excerpt || "",
      section:sectionFromDb(r.section),
      body:r.body || "",
      imageUrl:r.hero_image_url || "",
      imageAlt:r.hero_image_alt || "",
      imageCredit:r.hero_image_credit || "",
      tagIds:tagsByArticle.get(r.id) || [],
      sourceUrls:sourcesByArticle.get(r.id) || [],
      status:(r.status === "ready" ? "draft" : r.status) as CmsArticle["status"],
      createdAt:r.created_at,
      updatedAt:r.updated_at,
      publishedAt:r.published_at || undefined,
      candidateId:r.source_candidate_id || undefined,
    })),
    lastDiscoveryAt:runs[0]?.completed_at || runs[0]?.started_at || undefined,
  };
}

async function upsert(table:string, rows:any[], conflict="id") {
  if (!rows.length) return;
  await rest(`${table}?on_conflict=${encodeURIComponent(conflict)}`, {
    method:"POST",
    headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
    body:JSON.stringify(rows),
  });
}

async function deleteMissing(table:string, ids:string[], idColumn="id") {
  const current = await rest<any[]>(`${table}?select=${idColumn}`);
  const keep = new Set(ids);
  const remove = current.map(r=>String(r[idColumn])).filter(id=>!keep.has(id));
  if (!remove.length) return;
  const values = remove.join(",");
  await rest(`${table}?${idColumn}=in.(${values})`, { method:"DELETE", headers:{Prefer:"return=minimal"} });
}

async function clearJoins(table:string) {
  // UUID PK/FK columns are never null, so this safely targets every row in the join table.
  const column = table === "article_tags" ? "article_id" : "article_id";
  await rest(`${table}?${column}=not.is.null`, { method:"DELETE", headers:{Prefer:"return=minimal"} });
}

async function supabaseWrite(state:CmsState) {
  if (!configured()) return false;

  await upsert("tags", state.tags.map(t=>({
    id:t.id, slug:t.slug, name:t.name, type:cmsTagTypeToDb(t.type), is_active:t.active,
    created_at:t.createdAt,
  })));

  await upsert("sources", state.sources.map(s=>({
    id:s.id, name:s.name, domain:(()=>{try{return new URL(s.url).hostname}catch{return s.url}})(), feed_url:null, priority:s.priority,
    is_active:s.enabled, notes:s.notes || null,
  })));

  await upsert("candidates", state.candidates.map(c=>({
    id:c.id,
    headline:c.title,
    summary:c.summary || null,
    source_name:c.sourceName || null,
    source_url:c.sourceUrl,
    published_at:c.publishedAt || null,
    status:c.generated ? "generated" : c.selected ? "selected" : "new",
    raw_metadata:{ suggestedTags:c.suggestedTags || [] },
  })));

  await upsert("articles", state.articles.map(a=>({
    id:a.id,
    slug:a.slug,
    title:a.title,
    subheadline:a.subheadline || null,
    excerpt:a.subheadline || null,
    body:a.body || "",
    section:sectionToDb(a.section),
    status:a.status,
    hero_image_url:a.imageUrl || null,
    hero_image_alt:a.imageAlt || null,
    hero_image_credit:a.imageCredit || null,
    source_candidate_id:a.candidateId || null,
    published_at:a.publishedAt || null,
    created_at:a.createdAt,
    updated_at:a.updatedAt,
  })));

  // Rebuild joins from the canonical admin state so tag/source edits stay exact.
  await clearJoins("article_tags");
  await clearJoins("article_sources");
  const articleTagRows = state.articles.flatMap(a=>a.tagIds.map(tagId=>({article_id:a.id,tag_id:tagId})));
  const articleSourceRows = state.articles.flatMap(a=>a.sourceUrls.map(sourceUrl=>({article_id:a.id,source_url:sourceUrl})));
  await upsert("article_tags", articleTagRows, "article_id,tag_id");
  await upsert("article_sources", articleSourceRows);

  // Deletes happen after dependent join rows have been rebuilt.
  await deleteMissing("articles", state.articles.map(a=>a.id));
  await deleteMissing("tags", state.tags.map(t=>t.id));
  await deleteMissing("sources", state.sources.map(s=>s.id));
  return true;
}

export async function readCms(): Promise<CmsState> {
  const remote = await supabaseRead();
  if (remote) return remote;
  return localDefault();
}

export async function writeCms(state:CmsState) {
  if (await supabaseWrite(state)) return;
  await fs.mkdir(path.dirname(STORE), { recursive:true });
  await fs.writeFile(STORE, JSON.stringify(state, null, 2), "utf8");
}

export async function appendDiscoveredCandidates(candidates:Candidate[]) {
  if (!configured()) {
    const state=await readCms();
    const seen=new Set(state.candidates.map(c=>c.sourceUrl));
    state.candidates=[...candidates.filter(c=>!seen.has(c.sourceUrl)),...state.candidates].slice(0,200);
    state.lastDiscoveryAt=new Date().toISOString();
    await writeCms(state);
    return state;
  }

  const run = await rest<any[]>("discovery_runs", {
    method:"POST",
    headers:{Prefer:"return=representation"},
    body:JSON.stringify({status:"completed",started_at:new Date().toISOString(),completed_at:new Date().toISOString(),candidate_count:candidates.length}),
  });
  const runId=run[0]?.id;
  const existing = await rest<any[]>("candidates?select=source_url");
  const seen=new Set(existing.map(r=>r.source_url));
  const fresh=candidates.filter(c=>c.sourceUrl && !seen.has(c.sourceUrl));
  if (fresh.length) {
    await rest("candidates", {
      method:"POST",
      headers:{Prefer:"return=minimal"},
      body:JSON.stringify(fresh.map(c=>({
        id:c.id,
        discovery_run_id:runId,
        headline:c.title,
        summary:c.summary || null,
        source_name:c.sourceName || null,
        source_url:c.sourceUrl,
        published_at:c.publishedAt || null,
        status:"new",
        raw_metadata:{suggestedTags:c.suggestedTags || []},
      }))),
    });
  }
  return (await supabaseRead())!;
}

export async function mutateCms(mutator:(state:CmsState)=>CmsState|void) {
  const state=await readCms();
  const next=mutator(state) || state;
  await writeCms(next);
  return next;
}

export async function getPublishedCmsArticles(): Promise<CmsArticle[]> {
  const state=await readCms();
  return state.articles.filter(a=>a.status === "published").sort((a,b)=>(b.publishedAt || b.updatedAt).localeCompare(a.publishedAt || a.updatedAt));
}

export async function getCmsArticleBySlug(slug:string):Promise<CmsArticle|undefined> {
  const state=await readCms();
  return state.articles.find(a=>a.slug===slug && a.status==="published");
}

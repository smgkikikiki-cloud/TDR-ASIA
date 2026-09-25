"use client";

import { useEffect, useMemo, useState } from "react";
import type { CmsState, CmsArticle, CmsTag, CmsSource, Candidate, TagType } from "@/lib/cms-types";

const blankArticle = (): CmsArticle => {
  const now = new Date().toISOString();
  return {id:crypto.randomUUID(),slug:"",title:"",subheadline:"",section:"News",body:"",imageUrl:"",imageAlt:"",imageCredit:"",tagIds:[],sourceUrls:[],status:"draft",createdAt:now,updatedAt:now};
};

const tagTypes: TagType[] = ["technology","industry","action","country","location","general"];
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export function AdminConsole(){
  const [state,setState]=useState<CmsState|null>(null);
  const [tab,setTab]=useState<"review"|"articles"|"tags"|"sources"|"automation">("review");
  const [selected,setSelected]=useState<string[]>([]);
  const [editing,setEditing]=useState<CmsArticle|null>(null);
  const [busy,setBusy]=useState("");
  const [message,setMessage]=useState("");
  const [token,setToken]=useState("");

  useEffect(()=>{setToken(sessionStorage.getItem("tdr-admin-token")||"");},[]);
  useEffect(()=>{void load();},[token]);
  const headers=useMemo(()=>({"Content-Type":"application/json",...(token?{"x-admin-token":token}:{})}),[token]);

  async function load(){
    try{const r=await fetch("/api/admin/state",{headers,cache:"no-store"});if(r.status===401){setMessage("Admin token required.");return;}setState(await r.json());setMessage("");}catch{setMessage("Could not load CMS state.");}
  }
  async function save(next:CmsState,notice="Saved"){
    setState(next);setBusy("save");
    const r=await fetch("/api/admin/state",{method:"PUT",headers,body:JSON.stringify(next)});
    setBusy("");setMessage(r.ok?notice:"Save failed");
  }
  function updateToken(v:string){setToken(v);sessionStorage.setItem("tdr-admin-token",v);}
  async function discover(){setBusy("discover");setMessage("");const r=await fetch("/api/admin/discover",{method:"POST",headers});const j=await r.json();setBusy("");if(r.ok){setState(j.state);setMessage(`${j.candidates.length} candidates loaded.`)}else setMessage(j.error||"Discovery failed");}
  async function generate(){if(!selected.length)return;setBusy("generate");setMessage("");const r=await fetch("/api/admin/generate",{method:"POST",headers,body:JSON.stringify({candidateIds:selected})});const j=await r.json();setBusy("");if(r.ok){await load();setSelected([]);setTab("articles");setMessage(`${j.created.length} draft article(s) generated${j.failures?.length?`, ${j.failures.length} failed`:""}.`)}else setMessage(j.error||"Generation failed");}

  if(!state)return <div className="adminLoading"><h1>TDR Asia Admin</h1><label>Admin token <input value={token} onChange={e=>updateToken(e.target.value)} placeholder="Only required in production"/></label><p>{message||"Loading…"}</p></div>;
  const candidates=state.candidates.filter(c=>!c.generated).slice(0,30);

  return <div className="adminConsole">
    <header className="adminHead"><div><span>TDR ASIA</span><h1>Newsroom Admin</h1><p>Discover → tick → generate → edit → publish.</p></div><div className="adminAuth"><label>Admin token</label><input type="password" value={token} onChange={e=>updateToken(e.target.value)} placeholder="production token"/></div></header>
    <nav className="adminTabs">
      {(["review","articles","tags","sources","automation"] as const).map(t=><button key={t} className={tab===t?"active":""} onClick={()=>{setTab(t);setEditing(null)}}>{t}{t==="review"&&candidates.length?` (${candidates.length})`:""}</button>)}
    </nav>
    {message&&<div className="adminNotice">{message}</div>}

    {tab==="review"&&<section className="adminSection">
      <div className="adminSectionHead"><div><h2>Story candidates</h2><p>Every discovery run keeps the best ten new Thai industry/investment stories. Tick what you want written.</p></div><button onClick={discover} disabled={!!busy}>{busy==="discover"?"Finding…":"Run discovery now"}</button></div>
      {!candidates.length&&<div className="adminEmpty">No unprocessed candidates yet. Run discovery or wait for the next 8-hour cycle.</div>}
      <div className="candidateList">{candidates.map((c,i)=><label className="candidateCard" key={c.id}>
        <input type="checkbox" checked={selected.includes(c.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,c.id]:s.filter(x=>x!==c.id))}/>
        <div className="candidateNo">{String(i+1).padStart(2,"0")}</div><div className="candidateCopy"><h3>{c.title}</h3><p>{c.summary}</p><div><b>{c.sourceName}</b>{c.publishedAt&&<span>{new Date(c.publishedAt).toLocaleString()}</span>}<a href={c.sourceUrl} target="_blank" rel="noreferrer">source ↗</a></div><div className="adminTagLine">{c.suggestedTags.map(t=><span key={t}>{t}</span>)}</div></div>
      </label>)}</div>
      <div className="selectionBar"><strong>{selected.length} selected</strong><button onClick={generate} disabled={!selected.length||!!busy}>{busy==="generate"?"Writing…":`Generate ${selected.length||""} article${selected.length===1?"":"s"}`}</button></div>
    </section>}

    {tab==="articles"&&<section className="adminSection">
      <div className="adminSectionHead"><div><h2>Articles</h2><p>Draft, publish, edit, archive or delete. Hero image is a URL field.</p></div><button onClick={()=>setEditing(blankArticle())}>+ New article</button></div>
      {editing?<ArticleEditor article={editing} tags={state.tags.filter(t=>t.active)} onCancel={()=>setEditing(null)} onSave={async article=>{
        const exists=state.articles.some(a=>a.id===article.id);const now=new Date().toISOString();const final={...article,slug:article.slug||slugify(article.title),updatedAt:now,publishedAt:article.status==="published"?(article.publishedAt||now):article.publishedAt};
        const next={...state,articles:exists?state.articles.map(a=>a.id===final.id?final:a):[final,...state.articles]};await save(next,"Article saved.");setEditing(null);
      }}/>:<div className="articleAdminList">{state.articles.length===0?<div className="adminEmpty">No articles yet. Generate one from Review or add one manually.</div>:state.articles.map(a=><div className="articleAdminRow" key={a.id}><div><span className={`statusDot ${a.status}`}>{a.status}</span><h3>{a.title||"Untitled"}</h3><p>{a.subheadline}</p><small>{a.tagIds.map(id=>state.tags.find(t=>t.id===id)?.name).filter(Boolean).join(" · ")}</small></div><div className="articleButtons"><button onClick={()=>setEditing(a)}>Edit</button><button onClick={()=>{const next={...state,articles:state.articles.filter(x=>x.id!==a.id)};void save(next,"Article deleted.")}}>Delete</button></div></div>)}</div>}
    </section>}

    {tab==="tags"&&<TagsPanel state={state} save={save}/>} 
    {tab==="sources"&&<SourcesPanel state={state} save={save}/>} 
    {tab==="automation"&&<section className="adminSection"><div className="adminSectionHead"><div><h2>Automation</h2><p>The production cron is configured for three runs per day, eight hours apart.</p></div><button onClick={discover} disabled={!!busy}>{busy==="discover"?"Running…":"Run now"}</button></div><div className="automationGrid"><div><span>Cadence</span><strong>Every 8 hours</strong><small>Vercel cron: 09:45 / 17:45 / 01:45 Bangkok</small></div><div><span>Per batch</span><strong>10 candidates</strong><small>You choose which ones become articles.</small></div><div><span>Last discovery</span><strong>{state.lastDiscoveryAt?new Date(state.lastDiscoveryAt).toLocaleString():"Not yet"}</strong><small>Failed runs stay visible instead of silently publishing.</small></div><div><span>Notification</span><strong>ChatGPT active</strong><small>LINE push is also wired when LINE credentials are added.</small></div></div></section>}
  </div>
}

function ArticleEditor({article,tags,onSave,onCancel}:{article:CmsArticle;tags:CmsTag[];onSave:(a:CmsArticle)=>void;onCancel:()=>void}){
  const [a,setA]=useState(article);const u=(k:keyof CmsArticle,v:any)=>setA(x=>({...x,[k]:v}));
  return <div className="articleEditor"><div className="editorGrid"><div><label>Headline</label><input value={a.title} onChange={e=>u("title",e.target.value)}/></div><div><label>Slug</label><input value={a.slug} onChange={e=>u("slug",e.target.value)}/></div></div><div className="editorGrid"><div><label>Section</label><select value={a.section} onChange={e=>u("section",e.target.value)}><option>News</option><option>Investment</option><option>Companies</option></select></div><div></div></div><label>Subheadline</label><textarea rows={2} value={a.subheadline} onChange={e=>u("subheadline",e.target.value)}/><div className="editorGrid"><div><label>Hero image URL</label><input value={a.imageUrl} onChange={e=>u("imageUrl",e.target.value)} placeholder="https://..."/></div><div><label>Image credit</label><input value={a.imageCredit} onChange={e=>u("imageCredit",e.target.value)}/></div></div><label>Image alt</label><input value={a.imageAlt} onChange={e=>u("imageAlt",e.target.value)}/><label>Article</label><textarea className="bodyEditor" rows={18} value={a.body} onChange={e=>u("body",e.target.value)}/><label>Source URLs (one per line)</label><textarea rows={3} value={a.sourceUrls.join("\n")} onChange={e=>u("sourceUrls",e.target.value.split(/\n+/).filter(Boolean))}/><label>Tags</label><div className="tagPicker">{tags.map(t=><label key={t.id}><input type="checkbox" checked={a.tagIds.includes(t.id)} onChange={e=>u("tagIds",e.target.checked?[...a.tagIds,t.id]:a.tagIds.filter(id=>id!==t.id))}/>{t.name}<small>{t.type}</small></label>)}</div><div className="editorFooter"><select value={a.status} onChange={e=>u("status",e.target.value as any)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select><button className="secondary" onClick={onCancel}>Cancel</button><button onClick={()=>onSave(a)}>Save article</button></div></div>
}

function TagsPanel({state,save}:{state:CmsState;save:(s:CmsState,n?:string)=>Promise<void>}){
  const [name,setName]=useState("");const [type,setType]=useState<TagType>("technology");
  return <section className="adminSection"><div className="adminSectionHead"><div><h2>Tags</h2><p>AI can assign these tags, but it cannot create new ones by itself.</p></div></div><div className="inlineCreate"><input value={name} onChange={e=>setName(e.target.value)} placeholder="New tag"/><select value={type} onChange={e=>setType(e.target.value as TagType)}>{tagTypes.map(t=><option key={t}>{t}</option>)}</select><button onClick={()=>{if(!name.trim())return;const tag:CmsTag={id:crypto.randomUUID(),name:name.trim(),slug:slugify(name),type,active:true,createdAt:new Date().toISOString()};void save({...state,tags:[...state.tags,tag]},"Tag added.");setName("")}}>Add tag</button></div><div className="manageList">{state.tags.map(t=><div key={t.id}><div><b>{t.name}</b><span>{t.type} · /tag/{t.slug}</span></div><button onClick={()=>void save({...state,tags:state.tags.map(x=>x.id===t.id?{...x,active:!x.active}:x)},t.active?"Tag disabled.":"Tag enabled.")}>{t.active?"Disable":"Enable"}</button><button onClick={()=>void save({...state,tags:state.tags.filter(x=>x.id!==t.id),articles:state.articles.map(a=>({...a,tagIds:a.tagIds.filter(id=>id!==t.id)}))},"Tag deleted.")}>Delete</button></div>)}</div></section>
}

function SourcesPanel({state,save}:{state:CmsState;save:(s:CmsState,n?:string)=>Promise<void>}){
  const [name,setName]=useState("");const [url,setUrl]=useState("");
  return <section className="adminSection"><div className="adminSectionHead"><div><h2>Sources</h2><p>Discovery uses this registry as a preference list, while still allowing strong company/primary sources it finds elsewhere.</p></div></div><div className="inlineCreate sourceCreate"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Source name"/><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."/><button onClick={()=>{if(!name||!url)return;const s:CmsSource={id:crypto.randomUUID(),name,url,enabled:true,priority:7};void save({...state,sources:[...state.sources,s]},"Source added.");setName("");setUrl("")}}>Add source</button></div><div className="manageList">{state.sources.sort((a,b)=>b.priority-a.priority).map(s=><div key={s.id}><div><b>{s.name}</b><span>{s.url}</span></div><label className="priorityLabel">Priority <input type="number" min="1" max="10" value={s.priority} onChange={e=>void save({...state,sources:state.sources.map(x=>x.id===s.id?{...x,priority:Number(e.target.value)}:x)},"Priority updated.")}/></label><button onClick={()=>void save({...state,sources:state.sources.map(x=>x.id===s.id?{...x,enabled:!x.enabled}:x)},s.enabled?"Source disabled.":"Source enabled.")}>{s.enabled?"Disable":"Enable"}</button><button onClick={()=>void save({...state,sources:state.sources.filter(x=>x.id!==s.id)},"Source deleted.")}>Delete</button></div>)}</div></section>
}

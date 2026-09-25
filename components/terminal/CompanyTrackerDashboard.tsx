"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CompanyEntity } from "@/content/companies";
import type { InvestmentRecord } from "@/content/investments";
import { TrackCompanyButton } from "@/components/terminal/TrackCompanyButton";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type Props = { companies: CompanyEntity[]; records: InvestmentRecord[] };

export function CompanyTrackerDashboard({ companies, records }: Props) {
  const [tracked,setTracked]=useState<string[]>([]);
  const [query,setQuery]=useState("");
  const [frequency,setFrequency]=useState("Instant");
  const [signedIn,setSignedIn]=useState(false);
  const [member,setMember]=useState(false);
  const [loading,setLoading]=useState(true);

  async function sync(){
    const supabase=getSupabaseBrowser();
    const {data:{session}}=await supabase.auth.getSession();
    setSignedIn(Boolean(session));
    if(!session){setTracked([]);setMember(false);setLoading(false);return;}
    const [{data:subs},{data:tracks},{data:profile}]=await Promise.all([
      supabase.from("subscriptions").select("status").in("status",["active","trialing"]).limit(1),
      supabase.from("tracked_companies").select("company_slug"),
      supabase.from("profiles").select("alert_frequency").single()
    ]);
    setMember(Boolean(subs?.length));
    setTracked((tracks||[]).map((r:any)=>r.company_slug));
    const f=profile?.alert_frequency; if(f) setFrequency(f==="daily"?"Daily digest":f==="weekly"?"Weekly digest":"Instant");
    setLoading(false);
  }

  useEffect(()=>{void sync();const handler=()=>void sync();window.addEventListener("tdr-tracker-change",handler);return()=>window.removeEventListener("tdr-tracker-change",handler);},[]);

  async function changeFrequency(next:string){
    setFrequency(next);
    const supabase=getSupabaseBrowser();
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)return;
    const value=next==="Daily digest"?"daily":next==="Weekly digest"?"weekly":"instant";
    await supabase.from("profiles").update({alert_frequency:value}).eq("id",session.user.id);
  }

  const trackedCompanies=companies.filter(c=>tracked.includes(c.slug));
  const trackedRecords=records.filter(r=>tracked.includes(r.companySlug));
  const filteredCompanies=companies.filter(c=>`${c.name} ${c.aliases.join(" ")} ${c.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  const value=useMemo(()=>trackedRecords.reduce((sum,r)=>sum+r.valueThbBn,0),[trackedRecords]);
  const sampleRecords=records.slice(0,3);

  if(loading) return <div className="trackerEmpty newsroomEmpty"><strong>Loading Tracker…</strong></div>;

  if(!member){
    return <>
      <section className="trackerNewsHead"><div className="newsKicker">TDR ASIA TRACKER <span>PRO</span></div><div className="trackerTitleRow"><div><h1>Track the companies that matter.</h1><p>Follow companies, tags and investment themes. TDR Asia watches new filings and investment updates for you.</p></div></div></section>
      <section className="paywallSample"><div className="sectionBar trackerBar"><h2>Latest Investment Activity</h2><span>Public preview</span></div><div className="editorialFeed">{sampleRecords.map(record=><article className="editorialFeedRow" key={record.id}><time>{record.date.slice(5)}</time><div><Link href={`/data/project/${record.id}`}>{record.company} — {record.action}</Link><p>{record.location} · {record.sector} · {record.sourceType}</p></div><b>{record.valueLabel}</b></article>)}</div></section>
      <section className="newspaperPaywall" aria-label="TDR Asia Tracker subscription"><div className="paywallRule"><span>SUBSCRIBER ACCESS</span></div><div className="paywallGrid"><div className="paywallCopy"><h2>Build your own investment watchlist.</h2><p>Tracker turns TDR Asia’s company and tag database into a personal monitoring feed. The news remains open; monitoring tools are for subscribers.</p><ul><li>Track companies and tag combinations</li><li>Instant, daily or weekly alerts</li><li>Full historical tracker search</li><li>Saved searches and watchlists</li><li>CSV / XLSX export</li></ul></div><div className="paywallOffer"><span className="offerLabel">TDR TRACKER PRO</span><strong>฿990</strong><small>/ month</small><Link href={signedIn?"/subscribe":"/account?next=/subscribe"} className="subscribeButton">{signedIn?"Subscribe to Tracker":"Sign in to subscribe"}</Link><Link className="signinLink" href="/account">Already a subscriber? Open account</Link></div></div></section>
      <section className="lockedTrackerPreview" aria-hidden="true"><div className="lockedColumn"><div className="sectionBar trackerBar"><h2>My Companies</h2><span>Subscriber</span></div>{companies.slice(0,3).map(company=><div className="lockedRow" key={company.slug}><b>{company.name}</b><span>{company.tags.slice(0,3).join(" · ")}</span></div>)}</div><div className="lockedColumn"><div className="sectionBar trackerBar"><h2>My Radars</h2><span>Subscriber</span></div><div className="lockedRow"><b>Robotics + Japan</b><span>Saved radar</span></div><div className="lockedRow"><b>Semiconductor + New Plant</b><span>Saved radar</span></div></div><div className="lockedStamp">PRO</div></section>
    </>;
  }

  return <>
    <section className="trackerNewsHead"><div className="newsKicker">TDR ASIA TRACKER <span>PRO</span></div><div className="trackerTitleRow"><div><h1>Company Tracker</h1><p>Follow companies investing in Thailand. New filings, project announcements and updates appear in one personal feed.</p></div><div className="trackerAlertControl"><label>Alert frequency</label><select value={frequency} onChange={e=>void changeFrequency(e.target.value)}><option>Instant</option><option>Daily digest</option><option>Weekly digest</option></select></div></div></section>
    <section className="trackerTicker"><div><span>TRACKING</span><strong>{trackedCompanies.length}</strong><small>companies</small></div><div><span>NEW FEED</span><strong>{trackedRecords.length}</strong><small>matching events</small></div><div><span>RECORDED VALUE</span><strong>฿{value.toFixed(1)}bn</strong><small>tracked projects</small></div><div className="tickerNote"><b>Subscriber tools active</b><small>Company tracking and account-backed watchlists are enabled.</small></div></section>
    <div className="trackerNewsGrid"><section className="trackerMainColumn"><div className="sectionBar trackerBar"><h2>My Companies</h2><span>{trackedCompanies.length} followed</span></div>{trackedCompanies.length?<div className="watchNewsList">{trackedCompanies.map(company=>{const companyRecords=records.filter(r=>r.companySlug===company.slug);const latest=companyRecords[0];return <article className="watchNewsItem" key={company.slug}><div className="watchCompanyLine"><div><Link href={`/data/company/${company.slug}`} className="watchCompanyName">{company.name}</Link><div className="trackerTags">{company.tags.slice(0,4).map(tag=><span key={tag}>{tag}</span>)}</div></div><TrackCompanyButton slug={company.slug} compact /></div>{latest&&<Link href={`/data/project/${latest.id}`} className="watchHeadline"><small>{latest.date}</small><h3>{latest.action}</h3><div><span>{latest.location}</span><span>{latest.sector}</span><b>{latest.valueLabel}</b></div></Link>}</article>})}</div>:<div className="trackerEmpty newsroomEmpty"><strong>Your watchlist is empty.</strong><p>Add companies from the directory. Their latest Thailand investment activity will appear here.</p></div>}<div className="sectionBar trackerBar feedBar"><h2>Latest From Your Watchlist</h2><span>Most recent first</span></div><div className="editorialFeed">{trackedRecords.length?trackedRecords.map(record=><article className="editorialFeedRow" key={record.id}><time>{record.date.slice(5)}</time><div><Link href={`/data/project/${record.id}`}>{record.company} — {record.action}</Link><p>{record.location} · {record.sector} · {record.sourceType}</p></div><b>{record.valueLabel}</b></article>):<div className="trackerEmpty small newsroomEmpty"><p>Tracked-company events will appear here.</p></div>}</div></section>
      <aside className="trackerNewsAside"><div className="sectionBar trackerBar"><h2>Company Directory</h2></div><input className="trackerSearch newsSearch" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search company, sector or tag"/><div className="directoryNewsList">{filteredCompanies.map(company=><div className="directoryNewsRow" key={company.slug}><div><Link href={`/data/company/${company.slug}`}>{company.name}</Link><small>{company.tags.slice(0,3).join(" · ")}</small></div><TrackCompanyButton slug={company.slug} compact /></div>)}</div><div className="trackerHelpBox"><span>TAG TRACKER</span><h3>Build a Radar</h3><p>Follow combinations such as <b>Robotics + Japan</b> or <b>Semiconductor + New Plant</b>.</p></div><Link href="/account" className="signinLink">Account & billing</Link></aside></div>
  </>;
}

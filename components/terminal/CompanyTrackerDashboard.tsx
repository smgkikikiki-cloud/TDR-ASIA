"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CompanyEntity } from "@/content/companies";
import type { InvestmentRecord } from "@/content/investments";
import { TrackCompanyButton } from "@/components/terminal/TrackCompanyButton";

const STORAGE_KEY = "tdr-asia-tracked-companies";
const MEMBER_KEY = "tdr-asia-demo-member";
type Props = { companies: CompanyEntity[]; records: InvestmentRecord[] };

function readTracked() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[]; }
  catch { return []; }
}

export function CompanyTrackerDashboard({ companies, records }: Props) {
  const [tracked, setTracked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [frequency, setFrequency] = useState("Instant");
  const [member, setMember] = useState(false);

  useEffect(() => {
    const sync = () => {
      setTracked(readTracked());
      setMember(localStorage.getItem(MEMBER_KEY) === "1");
    };
    sync();
    window.addEventListener("tdr-tracker-change", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("tdr-tracker-change", sync); window.removeEventListener("storage", sync); };
  }, []);

  const trackedCompanies = companies.filter((company) => tracked.includes(company.slug));
  const trackedRecords = records.filter((record) => tracked.includes(record.companySlug));
  const filteredCompanies = companies.filter((company) => `${company.name} ${company.aliases.join(" ")} ${company.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  const value = useMemo(() => trackedRecords.reduce((sum, record) => sum + record.valueThbBn, 0), [trackedRecords]);
  const sampleRecords = records.slice(0, 3);

  if (!member) {
    return <>
      <section className="trackerNewsHead">
        <div className="newsKicker">TDR ASIA TRACKER <span>PRO</span></div>
        <div className="trackerTitleRow"><div><h1>Track the companies that matter.</h1><p>Follow companies, tags and investment themes. TDR Asia watches new filings and verified investment updates for you.</p></div></div>
      </section>

      <section className="paywallSample">
        <div className="sectionBar trackerBar"><h2>Latest Investment Activity</h2><span>Public preview</span></div>
        <div className="editorialFeed">{sampleRecords.map((record) => <article className="editorialFeedRow" key={record.id}>
          <time>{record.date.slice(5)}</time><div><Link href={`/data/project/${record.id}`}>{record.company} — {record.action}</Link><p>{record.location} · {record.sector} · {record.sourceType}</p></div><b>{record.valueLabel}</b>
        </article>)}</div>
      </section>

      <section className="newspaperPaywall" aria-label="TDR Asia Tracker subscription">
        <div className="paywallRule"><span>SUBSCRIBER ACCESS</span></div>
        <div className="paywallGrid">
          <div className="paywallCopy">
            <h2>Build your own investment watchlist.</h2>
            <p>Tracker turns TDR Asia’s company and tag database into a personal monitoring feed. The news remains open; the monitoring tools are for subscribers.</p>
            <ul>
              <li>Track companies and tag combinations</li>
              <li>Instant, daily or weekly alerts</li>
              <li>Full historical tracker search</li>
              <li>Saved searches and watchlists</li>
              <li>CSV / XLSX export</li>
            </ul>
          </div>
          <div className="paywallOffer">
            <span className="offerLabel">TDR TRACKER PRO</span>
            <strong>฿990</strong><small>/ month</small>
            <Link href="/subscribe" className="subscribeButton">Subscribe to Tracker</Link>
            <a className="signinLink" href="#">Already a subscriber? Sign in</a>
            <button className="prototypeUnlock" onClick={() => { localStorage.setItem(MEMBER_KEY, "1"); setMember(true); }}>Prototype: preview subscriber view</button>
          </div>
        </div>
      </section>

      <section className="lockedTrackerPreview" aria-hidden="true">
        <div className="lockedColumn"><div className="sectionBar trackerBar"><h2>My Companies</h2><span>Subscriber</span></div>{companies.slice(0,3).map((company) => <div className="lockedRow" key={company.slug}><b>{company.name}</b><span>{company.tags.slice(0,3).join(" · ")}</span></div>)}</div>
        <div className="lockedColumn"><div className="sectionBar trackerBar"><h2>My Radars</h2><span>Subscriber</span></div><div className="lockedRow"><b>Robotics + Japan</b><span>4 new events</span></div><div className="lockedRow"><b>Semiconductor + New Plant</b><span>2 new events</span></div><div className="lockedRow"><b>Data Center + Thailand</b><span>6 new events</span></div></div>
        <div className="lockedStamp">PRO</div>
      </section>
    </>;
  }

  return <>
    <section className="trackerNewsHead">
      <div className="newsKicker">TDR ASIA TRACKER <span>PRO</span></div>
      <div className="trackerTitleRow"><div><h1>Company Tracker</h1><p>Follow companies investing in Thailand. New filings, project announcements and verified updates appear in one personal feed.</p></div><div className="trackerAlertControl"><label>Alert frequency</label><select value={frequency} onChange={(event) => setFrequency(event.target.value)}><option>Instant</option><option>Daily digest</option><option>Weekly digest</option></select></div></div>
    </section>

    <section className="trackerTicker">
      <div><span>TRACKING</span><strong>{trackedCompanies.length}</strong><small>companies</small></div>
      <div><span>NEW FEED</span><strong>{trackedRecords.length}</strong><small>matching events</small></div>
      <div><span>RECORDED VALUE</span><strong>฿{value.toFixed(1)}bn</strong><small>tracked projects</small></div>
      <div className="tickerNote"><b>Subscriber tools active</b><small>Company tracking, alerts and saved combinations are enabled.</small></div>
    </section>

    <div className="trackerNewsGrid">
      <section className="trackerMainColumn">
        <div className="sectionBar trackerBar"><h2>My Companies</h2><span>{trackedCompanies.length} followed</span></div>
        {trackedCompanies.length ? <div className="watchNewsList">{trackedCompanies.map((company) => {
          const companyRecords = records.filter((record) => record.companySlug === company.slug);
          const latest = companyRecords[0];
          return <article className="watchNewsItem" key={company.slug}>
            <div className="watchCompanyLine"><div><Link href={`/data/company/${company.slug}`} className="watchCompanyName">{company.name}</Link><div className="trackerTags">{company.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div></div><TrackCompanyButton slug={company.slug} compact /></div>
            {latest && <Link href={`/data/project/${latest.id}`} className="watchHeadline"><small>{latest.date}</small><h3>{latest.action}</h3><div><span>{latest.location}</span><span>{latest.sector}</span><b>{latest.valueLabel}</b></div></Link>}
          </article>;
        })}</div> : <div className="trackerEmpty newsroomEmpty"><strong>Your watchlist is empty.</strong><p>Add companies from the directory. Their latest verified Thailand investment activity will appear here.</p></div>}

        <div className="sectionBar trackerBar feedBar"><h2>Latest From Your Watchlist</h2><span>Most recent first</span></div>
        <div className="editorialFeed">{trackedRecords.length ? trackedRecords.map((record) => <article className="editorialFeedRow" key={record.id}>
          <time>{record.date.slice(5)}</time><div><Link href={`/data/project/${record.id}`}>{record.company} — {record.action}</Link><p>{record.location} · {record.sector} · {record.sourceType}</p></div><b>{record.valueLabel}</b>
        </article>) : <div className="trackerEmpty small newsroomEmpty"><p>Tracked-company events will appear here.</p></div>}</div>
      </section>

      <aside className="trackerNewsAside">
        <div className="sectionBar trackerBar"><h2>Company Directory</h2></div>
        <input className="trackerSearch newsSearch" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, sector or tag" />
        <div className="directoryNewsList">{filteredCompanies.map((company) => <div className="directoryNewsRow" key={company.slug}><div><Link href={`/data/company/${company.slug}`}>{company.name}</Link><small>{company.tags.slice(0, 3).join(" · ")}</small></div><TrackCompanyButton slug={company.slug} compact /></div>)}</div>
        <div className="trackerHelpBox"><span>TAG TRACKER</span><h3>Build a Radar</h3><p>Follow combinations such as <b>Robotics + Japan</b> or <b>Semiconductor + New Plant</b> in the same feed.</p></div>
        <button className="prototypeReset" onClick={() => { localStorage.removeItem(MEMBER_KEY); setMember(false); }}>Prototype: show paywall</button>
      </aside>
    </div>
  </>;
}

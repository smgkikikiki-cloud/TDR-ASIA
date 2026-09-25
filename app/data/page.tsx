import Link from "next/link";
import { investmentRecords, terminalStats } from "@/content/investments";

export default function Data(){
  const latest = investmentRecords.slice(0, 6);
  const biggest = [...investmentRecords].sort((a,b)=>b.valueThbBn-a.valueThbBn).slice(0,4);
  return <main className="terminalPage">
    <div className="terminalBanner">
      <div className="shell terminalBannerInner">
        <div><span className="liveDot"></span> Thailand Investment Monitor</div>
        <div>Updated {terminalStats.updatedAt}</div>
      </div>
    </div>

    <div className="shell terminalTop">
      <div>
        <div className="terminalEyebrow">TDR Asia Data</div>
        <h1>Live Deals</h1>
        <p>Foreign corporate investment into Thailand, tracked from primary disclosures and official sources.</p>
      </div>
      <div className="terminalActions"><Link href="/data/projects">Search database</Link><button type="button">Sign in</button></div>
    </div>

    <div className="shell terminalStats">
      <div><span>Tracked value</span><strong>฿{terminalStats.announcedValue.toFixed(1)}bn</strong><small>Demo records shown</small></div>
      <div><span>Projects</span><strong>{terminalStats.projectCount}</strong><small>Current sample</small></div>
      <div><span>Companies</span><strong>{terminalStats.companyCount}</strong><small>Tracked investors</small></div>
      <div><span>Method</span><strong>Bottom-up</strong><small>Project-level records</small></div>
    </div>

    <div className="shell terminalLayout">
      <section>
        <div className="terminalSectionHead"><h2>Latest investments</h2><Link href="/data/projects">View database →</Link></div>
        <div className="dealList">{latest.map((record) => <article className="dealRow" key={record.id}>
          <div className="dealDate">{record.date.slice(5)}</div>
          <div className="dealMain"><Link href={`/data/project/${record.id}`}>{record.company} — {record.action}</Link><div className="dealMeta"><span>{record.location}</span><span>{record.sector}</span><span>{record.sourceType}</span></div></div>
          <div className="dealValue">{record.valueLabel}</div>
        </article>)}</div>
      </section>

      <aside className="terminalSide">
        <div className="sideBlock"><div className="sideTitle">Largest tracked</div>{biggest.map((record)=><Link href={`/data/project/${record.id}`} className="rankRow" key={record.id}><div><b>{record.company}</b><span>{record.action}</span></div><strong>{record.valueLabel}</strong></Link>)}</div>
        <div className="sideBlock"><div className="sideTitle">What this is</div><p>A project-level record of identifiable foreign corporate investment commitments in Thailand. It is not the same series as BOT realized FDI or BOI applications.</p></div>
        <div className="sideBlock payBox"><div className="sideTitle">TDR Asia Tracker</div><p>Track companies and tags, collect matching events in one feed, and choose instant or digest alerts.</p><Link href="/tracker">Open Tracker</Link></div>
      </aside>
    </div>
  </main>;
}

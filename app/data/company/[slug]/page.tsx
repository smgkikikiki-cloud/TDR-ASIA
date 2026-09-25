import Link from "next/link";
import { TrackCompanyButton } from "@/components/terminal/TrackCompanyButton";
import { getCompany } from "@/content/companies";
import { getCompanyRecords } from "@/content/investments";

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const records = getCompanyRecords(slug);
  const companyEntity = getCompany(slug);
  if (!records.length || !companyEntity) return <main className="shell terminalEmpty"><h1>Company not found</h1><Link href="/companies">Back to companies</Link></main>;

  const total = records.reduce((sum, record) => sum + record.valueThbBn, 0);
  return <main className="terminalPage">
    <div className="shell companyHero">
      <Link className="backLink" href="/companies">← Companies</Link>
      <div className="companyHeroTop">
        <div>
          <div className="terminalEyebrow">Company tracker</div>
          <h1>{companyEntity.name}</h1>
          <p>{companyEntity.summary}</p>
        </div>
        <TrackCompanyButton slug={slug} />
      </div>
      <div className="trackerTags companyHeroTags">{companyEntity.tags.map((tag)=><span key={tag}>{tag}</span>)}</div>
      <div className="companyStats">
        <div><strong>฿{total.toFixed(1)}bn</strong><span>tracked investment</span></div>
        <div><strong>{records.length}</strong><span>tracked event{records.length===1?"":"s"}</span></div>
        <div><strong>{records[0].sector}</strong><span>primary sector</span></div>
      </div>
    </div>
    <div className="shell companyLayout">
      <section>
        <div className="terminalSectionHead"><h2>Thailand activity</h2><span>{records.length} records</span></div>
        <div className="dealList">{records.map((record) => <article className="dealRow" key={record.id}>
          <div className="dealDate">{record.date}</div>
          <div className="dealMain"><Link href={`/data/project/${record.id}`}>{record.action}</Link><p>{record.note}</p><div className="dealMeta"><span>{record.location}</span><span>{record.sector}</span><span>{record.sourceType}</span></div></div>
          <div className="dealValue">{record.valueLabel}</div>
        </article>)}</div>
      </section>
      <aside className="sourcePanel companySidePanel">
        <h3>Track this company</h3>
        <p>Tracking adds future Thailand investment events for {companyEntity.name} to your personal feed. Alert delivery and shared watchlists belong to the paid Tracker layer.</p>
        <Link className="sideTrackerLink" href="/tracker">Open Tracker →</Link>
        <h3>Entity aliases</h3>
        <p>{companyEntity.aliases.join(" · ")}</p>
        {companyEntity.ticker && <><h3>Ticker</h3><p>{companyEntity.ticker}</p></>}
        <h3>Profile rule</h3>
        <p>This page is assembled from individual sourced events. It does not estimate company-wide Thailand exposure.</p>
      </aside>
    </div>
  </main>;
}

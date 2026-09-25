import Link from "next/link";
import { TrackCompanyButton } from "@/components/terminal/TrackCompanyButton";
import { companies } from "@/content/companies";
import { investmentRecords } from "@/content/investments";

export default function Companies(){
  return <div className="shell page">
    <div className="eyebrow">Companies</div>
    <h1>Company Tracker</h1>
    <p className="companyDirectoryIntro">Open company pages for free. Track companies to collect their Thailand investment activity in your paid watchlist.</p>
    <div className="companyDirectoryGrid">{companies.map((company) => {
      const records = investmentRecords.filter((record) => record.companySlug === company.slug);
      const total = records.reduce((sum, record) => sum + record.valueThbBn, 0);
      return <article className="companyDirectoryCard" key={company.slug}>
        <div className="companyCardHead"><Link href={`/data/company/${company.slug}`}>{company.name}</Link><TrackCompanyButton slug={company.slug} compact /></div>
        <p>{company.summary}</p>
        <div className="trackerTags">{company.tags.slice(0,4).map((tag)=><span key={tag}>{tag}</span>)}</div>
        <div className="companyCardStats"><span><b>{records.length}</b> tracked event{records.length===1?"":"s"}</span><span><b>฿{total.toFixed(1)}bn</b> tracked value</span></div>
      </article>;
    })}</div>
    <div className="trackerCta"><div><span>PRO</span><h2>Stop checking company pages manually.</h2><p>Build a watchlist and receive one feed from the companies you care about.</p></div><Link href="/tracker">Open Company Tracker →</Link></div>
  </div>
}

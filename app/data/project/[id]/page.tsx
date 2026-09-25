import Link from "next/link";
import { investmentRecords } from "@/content/investments";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = investmentRecords.find((item) => item.id === id);
  if (!record) return <main className="shell terminalEmpty"><h1>Project not found</h1><Link href="/data/projects">Back to database</Link></main>;

  return <main className="terminalPage">
    <div className="shell projectHero">
      <Link className="backLink" href="/data/projects">← Investment database</Link>
      <div className="terminalEyebrow">{record.id} · {record.status}</div>
      <h1>{record.company}</h1>
      <p className="projectAction">{record.action}</p>
      <div className="projectFacts">
        <div><span>Investment</span><strong>{record.valueLabel}</strong></div>
        <div><span>Location</span><strong>{record.location}</strong></div>
        <div><span>Sector</span><strong>{record.sector}</strong></div>
        <div><span>Announced</span><strong>{record.date}</strong></div>
      </div>
    </div>
    <div className="shell projectLayout">
      <article className="projectBody">
        <h2>What happened</h2>
        <p>{record.note}</p>
        <h2>Source</h2>
        <div className="sourceRecord"><span>{record.sourceType}</span><strong>{record.sourceLabel}</strong><a href={record.sourceUrl}>Open original source ↗</a></div>
        <p className="demoNotice">Demo record for the interface prototype. Production records must link to a verified source before publication.</p>
      </article>
      <aside className="sourcePanel">
        <h3>Project metadata</h3>
        <dl><div><dt>Province</dt><dd>{record.province}</dd></div><div><dt>Status</dt><dd>{record.status}</dd></div><div><dt>Source class</dt><dd>{record.sourceType}</dd></div><div><dt>Record ID</dt><dd>{record.id}</dd></div></dl>
      </aside>
    </div>
  </main>;
}

import { notFound } from 'next/navigation';
import { getMegaProject, getMegaEvents, getMegaProjectParticipants, fmtThb } from '@/lib/mega-store';
const stages=['announced','approved','tendering','awarded','construction','completed'];

export default async function ProjectDetail({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const p=await getMegaProject(slug);
  if(!p)notFound();
  const [events,participants]=await Promise.all([getMegaEvents(100),getMegaProjectParticipants(p.id)]);
  const current=stages.indexOf(p.stage);
  const related=events.filter(e=>e.projectName===p.name).slice(0,6);
  return <>
    <section className="megaDetailHero"><div className="megaShell"><div className="megaEyebrow">{p.sector} · {p.province||p.location||'Thailand'}</div><h1>{p.name}</h1><div className="megaValue">{fmtThb(p.valueThb)}</div><div>{p.owner}</div></div></section>
    <section className="megaSection"><div className="megaShell megaDetailGrid">
      <div>
        <div className="megaPanel"><h2>Project overview</h2><p>{p.summary}</p><div className="megaTimeline">{stages.map((s,i)=><span key={s} className={`megaStep ${i<=current?'active':''}`}>{s}</span>)}</div><table className="megaTable"><tbody><tr><th>Owner</th><td>{p.owner||'—'}</td></tr><tr><th>Sector</th><td>{p.sector}</td></tr><tr><th>Location</th><td>{p.location||p.province||'—'}</td></tr><tr><th>Current stage</th><td>{p.stage}</td></tr><tr><th>Tracked value</th><td>{fmtThb(p.valueThb)}</td></tr><tr><th>Source</th><td>{p.sourceUrl?<a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.sourceLabel||'Official source'} ↗</a>:'—'}</td></tr><tr><th>Last verified</th><td>{p.verifiedAt?new Date(p.verifiedAt).toLocaleDateString('en-GB'):'—'}</td></tr></tbody></table></div>
        <div className="megaPanel megaParticipants"><div className="megaSectionHead"><h2>Project participants</h2><span className="megaMuted">Verified entity links</span></div>{participants.length?<div className="megaParticipantList">{participants.map(participant=><div className="megaParticipant" key={`${participant.companyId}-${participant.role}`}><div><span className="megaPill">{participant.role.replaceAll('_',' ')}</span><b>{participant.name}</b><small>{participant.companyType||'entity'}</small></div><div className="megaParticipantSource">{participant.sourceUrl?<a href={participant.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a>:null}{participant.verifiedAt?<span>Verified {new Date(participant.verifiedAt).toLocaleDateString('en-GB')}</span>:null}</div></div>)}</div>:<div className="megaNotice">No verified participant links yet. Owner, contractor, EPC, consultant and supplier roles can be added as evidence is collected.</div>}</div>
      </div>
      <aside><div className="megaPanel"><h2>Latest movement</h2>{related.length?related.map(e=><div className="megaNewsItem" key={e.id}><div className="megaPill">{e.eventType.replaceAll('_',' ')}</div><h3>{e.sourceTitle||e.projectName}</h3><a className="megaLink" href={e.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a></div>):<div className="megaNotice">No matched event history yet.</div>}</div></aside>
    </div></section>
  </>;
}

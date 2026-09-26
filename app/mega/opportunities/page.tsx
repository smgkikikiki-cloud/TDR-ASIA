import Link from 'next/link';
import { headers } from 'next/headers';
import { fmtThb, getMegaPackages } from '@/lib/mega-store';

function megaBase(host:string){const bare=host.split(':')[0].toLowerCase();const configured=process.env.MEGA_HOST?.toLowerCase();return Boolean((configured&&bare===configured)||bare.startsWith('mega.'))?'':'/mega';}

export default async function OpportunitiesPage(){
  const h=await headers();
  const base=megaBase(h.get('host')||'');
  const packages=await getMegaPackages();
  const open=packages.filter((item)=>['planned','prequalification','tendering'].includes(item.status));
  const awarded=packages.filter((item)=>item.status==='awarded');
  const openValue=open.reduce((sum,item)=>sum+(item.valueThb||0),0);
  return <section className="megaSection"><div className="megaShell">
    <div className="megaSectionHead"><div><div className="megaEyebrow">Commercial pipeline</div><h2>Opportunities & work packages</h2><p className="megaMuted megaSectionIntro">Verified procurement packages linked to tracked projects. Planned, prequalification and tendering packages represent the live opportunity pipeline; awarded and construction packages preserve contract history.</p></div><span className="megaMuted">{packages.length} verified packages</span></div>
    <div className="megaExplorerStats"><div><b>{packages.length}</b><span>packages tracked</span></div><div><b>{open.length}</b><span>open / pre-award</span></div><div><b>{fmtThb(openValue)}</b><span>known open value</span></div><div><b>{awarded.length}</b><span>awarded packages</span></div></div>
    {packages.length?<div className="megaTableWrap"><table className="megaTable megaProjectTable"><thead><tr><th>Package</th><th>Project</th><th>Category</th><th>Status</th><th>Value</th><th>Procurement</th></tr></thead><tbody>{packages.map(item=><tr key={item.id}><td><b>{item.packageCode}</b><div>{item.name}</div>{item.sourceUrl?<a className="megaLink" href={item.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a>:null}</td><td>{item.project?<Link href={`${base}/projects/${item.project.slug}`}>{item.project.name}</Link>:'—'}</td><td>{item.category||'—'}</td><td><span className="megaStageBadge">{item.status.replaceAll('_',' ')}</span></td><td>{item.valueThb==null?'—':fmtThb(item.valueThb)}</td><td>{item.procurementMethod||'—'}</td></tr>)}</tbody></table></div>:<div className="megaEmpty"><b>No verified work packages yet.</b><span className="megaMuted">The schema is live, but TDR Mega will only show package records backed by source evidence. No synthetic tenders are generated from project names.</span></div>}
  </div></section>;
}

import Link from 'next/link';
import { headers } from 'next/headers';
import { fmtThb, getMegaPackages } from '@/lib/mega-store';

function megaBase(host:string){const bare=host.split(':')[0].toLowerCase();const configured=process.env.MEGA_HOST?.toLowerCase();return Boolean((configured&&bare===configured)||bare.startsWith('mega.'))?'':'/mega';}

export default async function OpportunitiesPage(){
  const h=await headers();
  const base=megaBase(h.get('host')||'');
  const packages=await getMegaPackages();
  const opportunities=packages.filter((item)=>item.recordType==='opportunity');
  const awarded=packages.filter((item)=>item.recordType==='awarded_package');
  const workstreams=packages.filter((item)=>item.recordType==='tracked_workstream');
  const openValue=opportunities.reduce((sum,item)=>sum+(item.valueThb||0),0);
  return <section className="megaSection"><div className="megaShell">
    <div className="megaSectionHead"><div><div className="megaEyebrow">Commercial pipeline</div><h2>Opportunities & work packages</h2><p className="megaMuted megaSectionIntro">Only records explicitly classified as current procurement opportunities count toward the open pipeline. Awarded packages and tracked project workstreams remain visible for market history without being presented as open tenders.</p></div><span className="megaMuted">{packages.length} verified records</span></div>
    <div className="megaExplorerStats"><div><b>{opportunities.length}</b><span>live opportunities</span></div><div><b>{fmtThb(openValue)}</b><span>known open value</span></div><div><b>{awarded.length}</b><span>awarded packages</span></div><div><b>{workstreams.length}</b><span>tracked workstreams</span></div></div>
    {packages.length?<div className="megaTableWrap"><table className="megaTable megaProjectTable"><thead><tr><th>Record</th><th>Project</th><th>Type</th><th>Status</th><th>Value</th><th>Procurement</th></tr></thead><tbody>{packages.map(item=><tr key={item.id}><td><b>{item.packageCode}</b><div>{item.name}</div>{item.sourceUrl?<a className="megaLink" href={item.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a>:null}</td><td>{item.project?<Link href={`${base}/projects/${item.project.slug}`}>{item.project.name}</Link>:'—'}</td><td><span className="megaStageBadge">{item.recordType.replaceAll('_',' ')}</span><div className="megaMuted">{item.category||'—'}</div></td><td><span className="megaStageBadge">{item.status.replaceAll('_',' ')}</span></td><td>{item.valueThb==null?'—':fmtThb(item.valueThb)}</td><td>{item.procurementMethod||'—'}</td></tr>)}</tbody></table></div>:<div className="megaEmpty"><b>No verified work packages yet.</b><span className="megaMuted">TDR Mega only shows package records backed by source evidence. No synthetic tenders are generated from project names.</span></div>}
  </div></section>;
}

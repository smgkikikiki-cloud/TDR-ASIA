import Link from 'next/link';
import { headers } from 'next/headers';
import { getMegaProjects, fmtThb } from '@/lib/mega-store';

function megaBase(host:string){const bare=host.split(':')[0].toLowerCase();const configured=process.env.MEGA_HOST?.toLowerCase();return Boolean((configured&&bare===configured)||bare.startsWith('mega.'))?'':'/mega';}

export default async function MegaHome(){
  const h=await headers(); const base=megaBase(h.get('host')||''); const projects=await getMegaProjects();
  const total=projects.reduce((s,p)=>s+p.valueThb,0); const construction=projects.filter(p=>p.stage==='construction').length;
  return <>
    <section className="megaHero"><div className="megaShell"><div className="megaEyebrow">Thailand capital projects intelligence</div><h1>What Thailand is building.</h1><p>Track major infrastructure, industrial and large private developments by stage, value, owner and latest movement.</p><div className="megaStats"><div className="megaStat"><b>{projects.length}</b><span>verified project records</span></div><div className="megaStat"><b>{fmtThb(total)}</b><span>tracked project value</span></div><div className="megaStat"><b>{construction}</b><span>under construction</span></div><div className="megaStat"><b>{new Set(projects.map(p=>p.sector)).size}</b><span>sectors tracked</span></div></div><div className="megaNotice">Records shown here are sourced from official project or investment authorities and retain their source link for audit.</div></div></section>
    <section className="megaSection"><div className="megaShell"><div className="megaSectionHead"><h2>Largest tracked projects</h2><Link className="megaLink" href={`${base}/projects`}>View all projects →</Link></div><div className="megaGrid">{projects.slice(0,8).map(p=><Link className="megaCard" href={`${base}/projects/${p.slug}`} key={p.slug}><div className="megaMeta"><span className="megaPill">{p.sector}</span><span className="megaPill">{p.stage}</span>{p.province&&<span className="megaPill">{p.province}</span>}</div><h3>{p.name}</h3><div className="megaValue">{fmtThb(p.valueThb)}</div><div className="megaMuted">{p.owner}</div></Link>)}</div></div></section>
    <section className="megaSection"><div className="megaShell"><div className="megaSectionHead"><h2>Thailand map</h2><span className="megaMuted">GIS coordinates are the next data layer</span></div><div className="megaMapMock">Project geography currently resolves to province/location; canonical coordinates will drive this map next.</div></div></section>
  </>;
}

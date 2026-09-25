import Link from 'next/link';
import { headers } from 'next/headers';
import { megaProjects, fmtThb } from '@/lib/mega-data';

function megaBase(host:string){
  const bare = host.split(':')[0].toLowerCase();
  const configured = process.env.MEGA_HOST?.toLowerCase();
  const standalone = Boolean((configured && bare === configured) || bare.startsWith('mega.'));
  return standalone ? '' : '/mega';
}

export default async function MegaHome(){
  const h = await headers();
  const base = megaBase(h.get('host') || '');
  const total = megaProjects.reduce((s,p)=>s+p.valueThb,0);
  const construction = megaProjects.filter(p=>p.stage==='construction').length;
  return <>
    <section className="megaHero"><div className="megaShell"><div className="megaEyebrow">Thailand capital projects intelligence</div><h1>What Thailand is building.</h1><p>Track major infrastructure, industrial and large private developments by stage, value, owner and latest movement.</p><div className="megaStats"><div className="megaStat"><b>{megaProjects.length}</b><span>prototype projects</span></div><div className="megaStat"><b>{fmtThb(total)}</b><span>tracked prototype value</span></div><div className="megaStat"><b>{construction}</b><span>under construction</span></div><div className="megaStat"><b>3</b><span>core views</span></div></div><div className="megaNotice">Prototype interface. Project values/statuses here are seed records and must be source-verified before public production use.</div></div></section>
    <section className="megaSection"><div className="megaShell"><div className="megaSectionHead"><h2>Project pipeline</h2><Link className="megaLink" href={`${base}/projects`}>View all projects →</Link></div><div className="megaGrid">{megaProjects.map(p=><Link className="megaCard" href={`${base}/projects/${p.slug}`} key={p.slug}><div className="megaMeta"><span className="megaPill">{p.sector}</span><span className="megaPill">{p.stage}</span><span className="megaPill">{p.province}</span></div><h3>{p.name}</h3><div className="megaValue">{fmtThb(p.valueThb)}</div><div className="megaMuted">{p.owner}</div></Link>)}</div></div></section>
    <section className="megaSection"><div className="megaShell"><div className="megaSectionHead"><h2>Thailand map</h2><span className="megaMuted">Interactive GIS comes after canonical project data</span></div><div className="megaMapMock">Prototype map surface — project markers will be driven from canonical coordinates.</div></div></section>
  </>
}

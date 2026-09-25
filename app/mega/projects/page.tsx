import Link from 'next/link';
import { headers } from 'next/headers';
import { megaProjects, fmtThb } from '@/lib/mega-data';

function megaBase(host:string){
  const bare = host.split(':')[0].toLowerCase();
  const configured = process.env.MEGA_HOST?.toLowerCase();
  const standalone = Boolean((configured && bare === configured) || bare.startsWith('mega.'));
  return standalone ? '' : '/mega';
}

export default async function ProjectsPage(){
  const h = await headers();
  const base = megaBase(h.get('host') || '');
  return <section className="megaSection"><div className="megaShell"><div className="megaSectionHead"><div><div className="megaEyebrow">Database</div><h2>Projects</h2></div></div><div className="megaSearchBar"><input placeholder="Search project or owner"/><select defaultValue="all"><option value="all">All sectors</option><option>Rail</option><option>Mixed-use</option><option>Data Center</option><option>Port & Logistics</option></select><select defaultValue="all"><option value="all">All stages</option><option>announced</option><option>approved</option><option>construction</option></select></div><table className="megaTable"><thead><tr><th>Project</th><th>Sector</th><th>Province</th><th>Stage</th><th>Value</th></tr></thead><tbody>{megaProjects.map(p=><tr key={p.slug}><td><Link href={`${base}/projects/${p.slug}`}>{p.name}</Link><div className="megaMuted">{p.owner}</div></td><td>{p.sector}</td><td>{p.province}</td><td>{p.stage}</td><td>{fmtThb(p.valueThb)}</td></tr>)}</tbody></table></div></section>;
}

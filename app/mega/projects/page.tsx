import { headers } from 'next/headers';
import { getMegaProjects } from '@/lib/mega-store';
import { MegaProjectExplorer } from '@/components/mega/MegaProjectExplorer';

function megaBase(host:string){const bare=host.split(':')[0].toLowerCase();const configured=process.env.MEGA_HOST?.toLowerCase();return Boolean((configured&&bare===configured)||bare.startsWith('mega.'))?'':'/mega';}

export default async function ProjectsPage(){
  const h=await headers();
  const base=megaBase(h.get('host')||'');
  const projects=await getMegaProjects();
  return <section className="megaSection"><div className="megaShell">
    <div className="megaSectionHead"><div><div className="megaEyebrow">Project intelligence database</div><h2>Project Explorer</h2><p className="megaMuted megaSectionIntro">Search Thailand's tracked capital projects by sector, stage, location and investment value. Save projects locally to build a working watchlist before opening the full project profile.</p></div><span className="megaMuted">{projects.length} sourced records</span></div>
    <MegaProjectExplorer projects={projects} base={base}/>
  </div></section>;
}

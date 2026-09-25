import Link from 'next/link';
import { headers } from 'next/headers';
import './mega.css';

export const metadata = { title: 'TDR Megaproject', description: 'Thailand major projects tracker' };

function isMegaHost(host:string){
  const bare = host.split(':')[0].toLowerCase();
  const configured = process.env.MEGA_HOST?.toLowerCase();
  return Boolean((configured && bare === configured) || bare.startsWith('mega.'));
}

export default async function MegaLayout({children}:{children:React.ReactNode}){
  const h = await headers();
  const standalone = isMegaHost(h.get('host') || '');
  const base = standalone ? '' : '/mega';
  const asiaUrl = process.env.NEXT_PUBLIC_ASIA_URL || '/';
  return <div className="megaRoot">
    <div className="megaNetwork"><div className="megaShell"><span>TDR NETWORK</span><a href={asiaUrl}>ASIA</a><strong>MEGAPROJECT</strong></div></div>
    <header className="megaHeader"><div className="megaShell megaHeaderInner"><Link href={base || '/'} className="megaBrand">TDR <span>MEGAPROJECT</span></Link><nav><Link href={`${base}/projects`}>Projects</Link><Link href={`${base}/companies`}>Companies</Link><Link href={`${base}/news`}>News</Link></nav></div></header>
    <main>{children}</main>
    <footer className="megaFooter"><div className="megaShell">TDR Megaproject · Thailand major projects tracker · Prototype data until source verification is complete.</div></footer>
  </div>
}

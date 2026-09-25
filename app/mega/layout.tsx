import Link from 'next/link';
import './mega.css';

export const metadata = { title: 'TDR Megaproject', description: 'Thailand major projects tracker' };

export default function MegaLayout({children}:{children:React.ReactNode}){
  return <div className="megaRoot">
    <header className="megaHeader"><div className="megaShell megaHeaderInner"><Link href="/mega" className="megaBrand">TDR <span>MEGAPROJECT</span></Link><nav><Link href="/mega/projects">Projects</Link><Link href="/mega/companies">Companies</Link><Link href="/mega/news">News</Link></nav></div></header>
    <main>{children}</main>
    <footer className="megaFooter"><div className="megaShell">TDR Megaproject · Thailand major projects tracker · Prototype data until source verification is complete.</div></footer>
  </div>
}

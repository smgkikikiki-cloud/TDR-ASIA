import Link from "next/link";
import { site } from "@/content/site";

export function Header(){
  const megaUrl = process.env.NEXT_PUBLIC_MEGA_URL || "/mega";
  return <>
    <div className="utility"><div className="shell utilityInner"><div className="utilityLeft"><span>Bangkok, Thailand</span><span className="utilitySep">•</span><span>Technology · Manufacturing · Investment</span></div><div className="utilityRight"><span>TDR NETWORK</span><a href={megaUrl}>Megaproject</a><Link href="/latest">Latest News</Link><Link href="/about">About</Link><Link href="/account">Account</Link></div></div></div>
    <header className="masthead">
      <div className="shell mastheadInner">
        <div className="editionMark">BUSINESS &amp; TECHNOLOGY</div>
        <Link href="/" className="brand">TDR <span>ASIA</span></Link>
        <div className="mastheadTools"><span>Bangkok Edition</span><Link href="/tracker" className="proLink">TRACKER PRO</Link></div>
      </div>
      <div className="navBand"><div className="shell"><nav className="nav"><Link href="/latest">News</Link><Link href="/investment">Investment</Link><Link href="/companies">Companies</Link><Link href="/tracker" className="trackerNav">Tracker</Link></nav></div></div>
    </header>
  </>;
}

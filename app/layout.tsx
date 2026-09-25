import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SiteChrome } from "@/components/SiteChrome";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title:{default:site.name,template:`%s | ${site.name}`},
  description:site.description,
  metadataBase:new URL(site.url),
  openGraph:{siteName:site.name,type:"website",locale:"en_US"},
  robots:{index:true,follow:true}
};

function isMegaHost(host:string){
  const bare = host.split(":")[0].toLowerCase();
  const configured = process.env.MEGA_HOST?.toLowerCase();
  return Boolean((configured && bare === configured) || bare.startsWith("mega."));
}

export default async function RootLayout({children}:{children:React.ReactNode}){
  const h = await headers();
  const forceMega = isMegaHost(h.get("host") || "");
  return <html lang="en"><body><SiteChrome forceMega={forceMega}>{children}</SiteChrome></body></html>;
}

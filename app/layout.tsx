import type { Metadata } from "next";
import "./globals.css";
import { SiteChrome } from "@/components/SiteChrome";
import { site } from "@/content/site";
export const metadata: Metadata = { title:{default:site.name,template:`%s | ${site.name}`}, description:site.description, metadataBase:new URL(site.url), openGraph:{siteName:site.name,type:"website",locale:"en_US"}, robots:{index:true,follow:true} };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><SiteChrome>{children}</SiteChrome></body></html>}

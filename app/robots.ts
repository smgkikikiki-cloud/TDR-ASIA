import type { MetadataRoute } from "next";import { site } from "@/content/site";
export default function robots():MetadataRoute.Robots{return{rules:[{userAgent:"*",allow:"/"},{userAgent:"OAI-SearchBot",allow:"/"},{userAgent:"GPTBot",allow:"/"}],sitemap:`${site.url}/sitemap.xml`}}

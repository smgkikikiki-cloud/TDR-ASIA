import { site } from "@/content/site";
export function GET(){return new Response(`# TDR Asia\n\n${site.description}\n\n## Core surfaces\n- ${site.url}/latest\n- ${site.url}/research\n- ${site.url}/open\n- ${site.url}/api/feed\n- ${site.url}/feed.xml\n`,{headers:{"Content-Type":"text/plain; charset=utf-8"}})}

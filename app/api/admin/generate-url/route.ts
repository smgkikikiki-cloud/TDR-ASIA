import { NextRequest, NextResponse } from "next/server";
import { readCms, writeCms } from "@/lib/cms-store";
import { generateArticle } from "@/lib/openai-newsroom";
import { adminAllowed } from "@/lib/admin-auth";
import type { Candidate } from "@/lib/cms-types";

export const runtime = "nodejs";
export const maxDuration = 300;

function uniqueSlug(base:string, existing:string[]) {
  const root = base || `story-${Date.now()}`;
  if (!existing.includes(root)) return root;
  let i = 2;
  while (existing.includes(`${root}-${i}`)) i++;
  return `${root}-${i}`;
}

export async function POST(req: NextRequest) {
  if (!adminAllowed(req)) return NextResponse.json({error:"Unauthorized"},{status:401});
  try {
    const { url } = await req.json() as { url?:string };
    if (!url) return NextResponse.json({error:"URL required"},{status:400});
    let parsed:URL;
    try { parsed = new URL(url); } catch { return NextResponse.json({error:"Invalid URL"},{status:400}); }
    if (!["http:","https:"].includes(parsed.protocol)) return NextResponse.json({error:"Only http/https URLs are allowed"},{status:400});

    const state = await readCms();
    let candidate = state.candidates.find(c=>c.sourceUrl===parsed.toString());
    if (!candidate) {
      candidate = {
        id:crypto.randomUUID(),
        title:"Manual source",
        summary:"Manually submitted source for article generation.",
        sourceName:parsed.hostname.replace(/^www\./,""),
        sourceUrl:parsed.toString(),
        discoveredAt:new Date().toISOString(),
        suggestedTags:[],
        selected:true,
      } satisfies Candidate;
      state.candidates.unshift(candidate);
    }

    const article = await generateArticle(candidate,state.tags);
    const now = new Date().toISOString();
    const slug = uniqueSlug(article.slug,state.articles.map(a=>a.slug));
    const record = { ...article, slug, id:crypto.randomUUID(), createdAt:now, updatedAt:now };
    state.articles.unshift(record);
    candidate.generated = true;
    candidate.ignored = false;
    await writeCms(state);
    return NextResponse.json({ok:true,article:record});
  } catch (error:any) {
    return NextResponse.json({ok:false,error:error?.message || "Generation failed"},{status:500});
  }
}

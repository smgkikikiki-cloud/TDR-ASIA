import { NextRequest, NextResponse } from "next/server";
import { readCms, writeCms } from "@/lib/cms-store";
import { generateArticle } from "@/lib/openai-newsroom";
import { adminAllowed } from "@/lib/admin-auth";

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
  const { candidateIds } = await req.json() as { candidateIds:string[] };
  const state = await readCms();
  const now = new Date().toISOString();
  const created:any[] = [];
  const failures:any[] = [];
  for (const id of candidateIds || []) {
    const candidate = state.candidates.find(c=>c.id===id);
    if (!candidate) continue;
    try {
      const article = await generateArticle(candidate,state.tags);
      const slug = uniqueSlug(article.slug, state.articles.map(a=>a.slug));
      const record = { ...article, slug, id:crypto.randomUUID(), createdAt:now, updatedAt:now };
      state.articles.unshift(record);
      candidate.generated = true;
      created.push(record);
    } catch (error:any) { failures.push({id,error:error?.message || "Generation failed"}); }
  }
  await writeCms(state);
  return NextResponse.json({ok:true,created,failures});
}

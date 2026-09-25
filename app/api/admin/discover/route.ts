import { NextRequest, NextResponse } from "next/server";
import { readCms, appendDiscoveredCandidates } from "@/lib/cms-store";
import { discoverCandidates } from "@/lib/openai-newsroom";
import { adminAllowed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!adminAllowed(req)) return NextResponse.json({error:"Unauthorized"},{status:401});
  try {
    const state = await readCms();
    const candidates = await discoverCandidates(state.sources, state.candidates.map(c=>c.sourceUrl));
    const next = await appendDiscoveredCandidates(candidates);
    return NextResponse.json({ok:true,candidates,state:next});
  } catch (error:any) {
    return NextResponse.json({ok:false,error:error?.message || "Discovery failed"},{status:500});
  }
}

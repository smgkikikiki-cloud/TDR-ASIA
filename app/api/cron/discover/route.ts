import { NextRequest, NextResponse } from "next/server";
import { readCms, appendDiscoveredCandidates } from "@/lib/cms-store";
import { discoverCandidates } from "@/lib/openai-newsroom";
import { discoverDealRadarCandidates } from "@/lib/deal-radar";
import { enqueueNewsroomCandidateJobs } from "@/lib/newsroom-jobs";
import type { Candidate } from "@/lib/cms-types";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function canonicalUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

function freshUnique(candidates: Candidate[], priorUrls: string[]) {
  const seen = new Set(priorUrls.map(canonicalUrl));
  const fresh: Candidate[] = [];
  for (const candidate of candidates) {
    const key = canonicalUrl(candidate.sourceUrl);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    fresh.push(candidate);
  }
  return fresh;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") return NextResponse.json({error:"CRON_SECRET is not configured"},{status:503});
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({error:"Unauthorized"},{status:401});
  try {
    const state = await readCms();
    const prior = state.candidates.map(c=>c.sourceUrl);

    const [generalResult, radarResult] = await Promise.allSettled([
      discoverCandidates(state.sources, prior),
      discoverDealRadarCandidates(state.sources, prior, 2),
    ]);

    const general = generalResult.status === "fulfilled" ? generalResult.value : [];
    const radar = radarResult.status === "fulfilled" ? radarResult.value : [];
    if (!general.length && !radar.length) {
      const errors = [generalResult, radarResult]
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => result.reason?.message || String(result.reason || "Discovery failed"));
      throw new Error(errors.join(" | ") || "Discovery returned no candidates");
    }

    // Radar goes first so an event found by both lanes keeps the deal-radar tag and direct-to-writer behavior.
    const candidates = freshUnique([...radar, ...general], prior);
    await appendDiscoveredCandidates(candidates);
    const { queued } = await enqueueNewsroomCandidateJobs(candidates);

    return NextResponse.json({
      ok:true,
      count:candidates.length,
      dealRadarCount:candidates.filter(candidate=>candidate.suggestedTags.includes("deal-radar")).length,
      generalCount:candidates.filter(candidate=>!candidate.suggestedTags.includes("deal-radar")).length,
      queued,
      warnings:[
        ...(generalResult.status === "rejected" ? [`general: ${generalResult.reason?.message || generalResult.reason}`] : []),
        ...(radarResult.status === "rejected" ? [`deal-radar: ${radarResult.reason?.message || radarResult.reason}`] : []),
      ],
      candidates,
    });
  } catch (error:any) {
    return NextResponse.json({ok:false,error:error?.message || "Discovery failed"},{status:500});
  }
}

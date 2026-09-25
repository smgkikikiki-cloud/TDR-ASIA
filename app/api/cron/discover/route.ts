import { NextRequest, NextResponse } from "next/server";
import { readCms, appendDiscoveredCandidates } from "@/lib/cms-store";
import { discoverCandidates } from "@/lib/openai-newsroom";
import { autoPromoteDiscoveredCandidates, type NewsroomAutomationResult } from "@/lib/newsroom-automation";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function notifyLine(count: number, automation: NewsroomAutomationResult) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_USER_ID;
  if (!token || !to) return;
  const url = `${process.env.SITE_URL || ""}/newsroom`;
  const errorLine = automation.errors.length ? `\nAutomation errors: ${automation.errors.length}` : "";
  await fetch("https://api.line.me/v2/bot/message/push", {
    method:"POST",
    headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},
    body:JSON.stringify({to,messages:[{type:"text",text:`TDR Newsroom: ${count} candidates found, ${automation.promoted} auto-promoted to Story + FB/X drafts.${errorLine}\n${url}`}]}),
  });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") return NextResponse.json({error:"CRON_SECRET is not configured"},{status:503});
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({error:"Unauthorized"},{status:401});
  try {
    const state = await readCms();
    const prior = state.candidates.map(c=>c.sourceUrl);
    const candidates = await discoverCandidates(state.sources, prior);
    await appendDiscoveredCandidates(candidates);

    const automation = await autoPromoteDiscoveredCandidates(candidates);
    await notifyLine(candidates.length, automation);

    return NextResponse.json({ok:true,count:candidates.length,candidates,automation});
  } catch (error:any) {
    return NextResponse.json({ok:false,error:error?.message || "Discovery failed"},{status:500});
  }
}

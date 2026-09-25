import { NextRequest, NextResponse } from "next/server";
import { autoPromoteDiscoveredCandidates } from "@/lib/newsroom-automation";
import { claimNewsroomJobBatch, completeNewsroomJobs, failNewsroomJobs } from "@/lib/newsroom-jobs";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batch = await claimNewsroomJobBatch(10);
  if (!batch.jobs.length) return NextResponse.json({ ok: true, processed: 0, message: "No queued newsroom jobs" });

  const jobIds = batch.jobs.map((job) => job.id);
  try {
    const automation = await autoPromoteDiscoveredCandidates(batch.candidates);
    await completeNewsroomJobs(jobIds, automation);
    return NextResponse.json({ ok: true, processed: batch.jobs.length, automation });
  } catch (error: any) {
    const message = error?.message || "Newsroom worker failed";
    await failNewsroomJobs(jobIds, message);
    return NextResponse.json({ ok: false, processed: batch.jobs.length, error: message }, { status: 500 });
  }
}

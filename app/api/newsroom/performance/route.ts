import { NextRequest, NextResponse } from "next/server";
import { adminAllowed } from "@/lib/admin-auth";
import { addPerformanceSnapshot, listPerformanceRows, markDistributionPosted } from "@/lib/newsroom-performance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!adminAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ items: await listPerformanceRows() });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not load performance" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!adminAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (body?.action === "mark-posted") {
      if (!body.distributionItemId || !body.postUrl) return NextResponse.json({ error: "distributionItemId and postUrl are required" }, { status: 400 });
      await markDistributionPosted(String(body.distributionItemId), String(body.postUrl));
      return NextResponse.json({ ok: true, items: await listPerformanceRows() });
    }
    if (body?.action === "snapshot") {
      if (!body.distributionItemId) return NextResponse.json({ error: "distributionItemId is required" }, { status: 400 });
      await addPerformanceSnapshot(String(body.distributionItemId), body.metrics || {});
      return NextResponse.json({ ok: true, items: await listPerformanceRows() });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Performance update failed" }, { status: 500 });
  }
}

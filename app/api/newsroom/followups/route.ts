import { NextRequest, NextResponse } from "next/server";
import { adminAllowed } from "@/lib/admin-auth";
import { generateBreakoutFollowups } from "@/lib/newsroom-followups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!adminAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const distributionItemId = String(body?.distributionItemId || "").trim();
    if (!distributionItemId) return NextResponse.json({ error: "distributionItemId is required" }, { status: 400 });
    return NextResponse.json(await generateBreakoutFollowups(distributionItemId));
  } catch (error: any) {
    const message = error?.message || "Follow-up generation failed";
    const status = message === "FOLLOWUPS_REQUIRE_BREAKOUT" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

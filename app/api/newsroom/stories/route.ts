import { NextRequest, NextResponse } from "next/server";
import { adminAllowed } from "@/lib/admin-auth";
import { createStoryFromCandidate } from "@/lib/newsroom-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!adminAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { candidateId } = await req.json() as { candidateId?: string };
    if (!candidateId) return NextResponse.json({ error: "candidateId required" }, { status: 400 });
    const story = await createStoryFromCandidate(candidateId);
    return NextResponse.json({ ok: true, story });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Could not create story" }, { status: 500 });
  }
}

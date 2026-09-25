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
    const message = error?.message || "Could not create story";
    const status = message === "Candidate not found" ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

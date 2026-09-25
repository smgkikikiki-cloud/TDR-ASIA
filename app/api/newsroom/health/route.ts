import { NextRequest, NextResponse } from "next/server";
import { adminAllowed } from "@/lib/admin-auth";
import { getNewsroomHealth } from "@/lib/newsroom-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!adminAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const health = await getNewsroomHealth();
    return NextResponse.json({ health });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not load newsroom health" }, { status: 500 });
  }
}

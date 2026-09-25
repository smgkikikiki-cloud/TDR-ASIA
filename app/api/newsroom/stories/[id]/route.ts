import { NextRequest, NextResponse } from "next/server";
import { adminAllowed } from "@/lib/admin-auth";
import { getNewsroomStory, updateNewsroomStory } from "@/lib/newsroom-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERTICALS = new Set(["unassigned", "auto", "industry", "mega", "cross_vertical"]);
const DESTINATIONS = new Set(["tdr_auto", "tdr_asia", "tdr_mega", "none"]);

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  if (!adminAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const story = await getNewsroomStory(id);
  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
  return NextResponse.json({ story });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!adminAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  try {
    const body = await req.json() as {
      headline?: string;
      summary?: string | null;
      vertical?: string;
      destinationType?: string | null;
      destinationUrl?: string | null;
    };

    const headline = body.headline?.trim() || "";
    const vertical = body.vertical || "unassigned";
    const destinationType = body.destinationType ?? null;

    if (!headline) return NextResponse.json({ error: "Headline is required" }, { status: 400 });
    if (!VERTICALS.has(vertical)) return NextResponse.json({ error: "Invalid vertical" }, { status: 400 });
    if (destinationType !== null && !DESTINATIONS.has(destinationType)) {
      return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
    }

    const story = await updateNewsroomStory(id, {
      headline,
      summary: body.summary?.trim() || null,
      vertical: vertical as "unassigned" | "auto" | "industry" | "mega" | "cross_vertical",
      destinationType: destinationType as "tdr_auto" | "tdr_asia" | "tdr_mega" | "none" | null,
      destinationUrl: body.destinationUrl?.trim() || null,
    });

    return NextResponse.json({ ok: true, story });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Could not update story" }, { status: 500 });
  }
}

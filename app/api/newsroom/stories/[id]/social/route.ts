import { NextRequest, NextResponse } from "next/server";
import { adminAllowed } from "@/lib/admin-auth";
import {
  getNewsroomStory,
  getStorySourceContext,
  listDistributionItems,
  saveDistributionItem,
  updateDistributionStatus,
  type DistributionChannel,
} from "@/lib/newsroom-store";
import { generateSocialDraft } from "@/lib/openai-newsroom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
const CHANNELS = new Set(["facebook", "x"]);
const EDITABLE_STATUSES = new Set(["draft", "ready"]);

function validChannel(value: unknown): value is DistributionChannel {
  return typeof value === "string" && CHANNELS.has(value);
}

export async function GET(req: NextRequest, context: RouteContext) {
  if (!adminAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const story = await getNewsroomStory(id);
  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
  const items = await listDistributionItems(id);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (!adminAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  try {
    const body = await req.json() as { channel?: string };
    if (!validChannel(body.channel)) return NextResponse.json({ error: "Invalid channel" }, { status: 400 });

    const story = await getNewsroomStory(id);
    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    const source = await getStorySourceContext(story.candidateId);
    const copy = await generateSocialDraft(story, source, body.channel);
    const item = await saveDistributionItem(id, body.channel, copy, story.destinationUrl, true);
    return NextResponse.json({ ok: true, item });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Could not generate social draft" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  if (!adminAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  try {
    const body = await req.json() as { channel?: string; copy?: string; status?: string };
    if (!validChannel(body.channel)) return NextResponse.json({ error: "Invalid channel" }, { status: 400 });

    const story = await getNewsroomStory(id);
    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    if (body.status !== undefined) {
      if (!EDITABLE_STATUSES.has(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      const item = await updateDistributionStatus(id, body.channel, body.status as "draft" | "ready");
      return NextResponse.json({ ok: true, item });
    }

    const copy = body.copy?.trim() || "";
    if (!copy) return NextResponse.json({ error: "Copy is required" }, { status: 400 });
    const item = await saveDistributionItem(id, body.channel, copy, story.destinationUrl, false);
    return NextResponse.json({ ok: true, item });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Could not update social draft" }, { status: 500 });
  }
}

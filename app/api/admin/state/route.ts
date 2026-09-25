import { NextRequest, NextResponse } from "next/server";
import { readCms, writeCms } from "@/lib/cms-store";
import type { CmsState } from "@/lib/cms-types";
import { adminAllowed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!adminAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await readCms());
}

export async function PUT(req: NextRequest) {
  if (!adminAllowed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as CmsState;
  if (!body || !Array.isArray(body.articles) || !Array.isArray(body.tags) || !Array.isArray(body.sources) || !Array.isArray(body.candidates)) {
    return NextResponse.json({ error: "Invalid CMS state" }, { status: 400 });
  }
  await writeCms(body);
  return NextResponse.json({ ok: true, state: body });
}

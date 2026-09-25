import { NextRequest, NextResponse } from "next/server";
import { readCms } from "@/lib/cms-store";
import { adminAllowed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!adminAllowed(req)) return NextResponse.json({error:"Unauthorized"},{status:401});
  try {
    const state = await readCms();
    return NextResponse.json({
      ok:true,
      backend: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY ? "supabase" : "local-fallback",
      counts:{
        candidates:state.candidates.length,
        articles:state.articles.length,
        tags:state.tags.length,
        sources:state.sources.length,
      },
      lastDiscoveryAt:state.lastDiscoveryAt || null,
    });
  } catch (error:any) {
    return NextResponse.json({ok:false,error:error?.message || "Health check failed"},{status:500});
  }
}

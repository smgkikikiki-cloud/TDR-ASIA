import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

export function adminAllowed(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN;
  // Never leave production admin APIs open just because an env var was forgotten.
  if (!token) return process.env.NODE_ENV !== "production";
  const supplied = req.headers.get("x-admin-token") || "";
  return safeEqual(supplied, token);
}

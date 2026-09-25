import "server-only";

export type AuthUser = { id:string; email?:string };

export async function requireUserFromRequest(req: Request): Promise<AuthUser> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const token = auth.slice(7);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_AUTH_NOT_CONFIGURED");
  const res = await fetch(`${url}/auth/v1/user`, { headers: { Authorization:`Bearer ${token}`, apikey:key }, cache:"no-store" });
  if (!res.ok) throw new Error("UNAUTHORIZED");
  const user = await res.json();
  return { id:String(user.id), email:user.email ? String(user.email) : undefined };
}

export async function serviceRest<T=any>(resource:string, init:RequestInit = {}):Promise<T>{
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_NOT_CONFIGURED");
  const headers:Record<string,string> = { apikey:key, Authorization:`Bearer ${key}`, ...((init.headers||{}) as Record<string,string>) };
  if (init.body) headers["Content-Type"] = headers["Content-Type"] || "application/json";
  const res = await fetch(`${url}/rest/v1/${resource}`, { ...init, headers, cache:"no-store" });
  if (!res.ok) throw new Error(`SUPABASE_${res.status}:${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

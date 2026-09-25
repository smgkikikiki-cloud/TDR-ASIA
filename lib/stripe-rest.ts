import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const STRIPE_API = "https://api.stripe.com/v1";

function secret(){
  const value=process.env.STRIPE_SECRET_KEY;
  if(!value) throw new Error("STRIPE_SECRET_KEY_NOT_CONFIGURED");
  return value;
}

export async function stripeForm<T=any>(path:string, params:URLSearchParams, method="POST"):Promise<T>{
  const res=await fetch(`${STRIPE_API}${path}`,{
    method,
    headers:{Authorization:`Bearer ${secret()}`,"Content-Type":"application/x-www-form-urlencoded"},
    body:method === "GET" ? undefined : params.toString(),
    cache:"no-store"
  });
  if(!res.ok) throw new Error(`STRIPE_${res.status}:${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function stripeGet<T=any>(path:string):Promise<T>{
  const res=await fetch(`${STRIPE_API}${path}`,{headers:{Authorization:`Bearer ${secret()}`},cache:"no-store"});
  if(!res.ok) throw new Error(`STRIPE_${res.status}:${await res.text()}`);
  return res.json() as Promise<T>;
}

export function verifyStripeSignature(raw:string, header:string|null){
  const webhookSecret=process.env.STRIPE_WEBHOOK_SECRET;
  if(!webhookSecret || !header) return false;
  const parts=header.split(",").map(x=>x.split("="));
  const timestamp=parts.find(([k])=>k==="t")?.[1];
  const signatures=parts.filter(([k])=>k==="v1").map(([,v])=>v);
  if(!timestamp || !signatures.length) return false;
  const age=Math.abs(Date.now()/1000-Number(timestamp));
  if(!Number.isFinite(age) || age>300) return false;
  const expected=createHmac("sha256",webhookSecret).update(`${timestamp}.${raw}`).digest("hex");
  const a=Buffer.from(expected);
  return signatures.some(sig=>{const b=Buffer.from(sig);return a.length===b.length&&timingSafeEqual(a,b)});
}

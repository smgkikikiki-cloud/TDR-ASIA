"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function SubscribeActions({plan,label,className="subscribeButton"}:{plan:"pro"|"team";label:string;className?:string}){
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  async function start(){
    setBusy(true);setMessage("");
    const supabase=getSupabaseBrowser();
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){location.href=`/account?next=/subscribe`;return;}
    const r=await fetch("/api/billing/checkout",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({plan})});
    const j=await r.json();setBusy(false);
    if(r.ok&&j.url) location.href=j.url; else setMessage(j.error||"Could not start checkout.");
  }
  return <><button className={className} onClick={start} disabled={busy}>{busy?"Opening checkout…":label}</button>{message&&<small className="billingError">{message}</small>}</>;
}

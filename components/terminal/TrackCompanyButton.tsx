"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function TrackCompanyButton({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [tracked,setTracked]=useState(false);
  const [busy,setBusy]=useState(false);

  async function refresh(){
    const supabase=getSupabaseBrowser();
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setTracked(false);return;}
    const {data}=await supabase.from("tracked_companies").select("company_slug").eq("company_slug",slug).maybeSingle();
    setTracked(Boolean(data));
  }
  useEffect(()=>{void refresh();},[slug]);

  async function toggle(){
    const supabase=getSupabaseBrowser();
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){location.href="/account?next=/tracker";return;}
    setBusy(true);
    const result=tracked
      ? await supabase.from("tracked_companies").delete().eq("company_slug",slug)
      : await supabase.from("tracked_companies").insert({user_id:session.user.id,company_slug:slug});
    setBusy(false);
    if(result.error){
      if(result.error.message.toLowerCase().includes("row-level security")) location.href="/subscribe";
      return;
    }
    setTracked(!tracked);
    window.dispatchEvent(new Event("tdr-tracker-change"));
  }

  return <button type="button" disabled={busy} className={`${compact ? "trackButton compact" : "trackButton"} ${tracked ? "isTracked" : ""}`} onClick={toggle}>
    {busy?"…":tracked?"✓ Tracking":"+ Track company"}
  </button>;
}

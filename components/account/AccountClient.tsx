"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type Profile={email?:string;display_name?:string;plan?:string;alert_frequency?:string;stripe_customer_id?:string|null};
type Subscription={plan:string;status:string;current_period_end?:string|null;cancel_at_period_end?:boolean};

export function AccountClient(){
  const supabase=getSupabaseBrowser();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [mode,setMode]=useState<"signin"|"signup">("signin");
  const [userId,setUserId]=useState<string|null>(null);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [subscription,setSubscription]=useState<Subscription|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function refresh(){
    const {data:{session}}=await supabase.auth.getSession();
    setUserId(session?.user.id||null);
    if(!session){setProfile(null);setSubscription(null);return;}
    const [{data:p},{data:s}]=await Promise.all([
      supabase.from("profiles").select("email,display_name,plan,alert_frequency,stripe_customer_id").single(),
      supabase.from("subscriptions").select("plan,status,current_period_end,cancel_at_period_end").order("updated_at",{ascending:false}).limit(1).maybeSingle()
    ]);
    setProfile(p||null);setSubscription(s||null);
  }

  useEffect(()=>{void refresh();const {data:{subscription:listener}}=supabase.auth.onAuthStateChange(()=>void refresh());return()=>listener.unsubscribe();},[]);

  async function submit(){
    setBusy(true);setMessage("");
    const result=mode==="signin"?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});
    setBusy(false);
    if(result.error){setMessage(result.error.message);return;}
    setMessage(mode==="signup"&&!result.data.session?"Account created. Check your email if confirmation is enabled.":"Signed in.");
    await refresh();
  }

  async function signOut(){await supabase.auth.signOut();await refresh();}
  async function portal(){
    const {data:{session}}=await supabase.auth.getSession(); if(!session)return;
    setBusy(true);const r=await fetch("/api/billing/portal",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`}});const j=await r.json();setBusy(false);if(r.ok&&j.url)location.href=j.url;else setMessage(j.error||"Could not open billing portal.");
  }

  if(!userId)return <div className="accountPanel"><div className="newsKicker">TDR ASIA ACCOUNT</div><h1>{mode==="signin"?"Sign in":"Create account"}</h1><p>Use one account for Tracker, watchlists, alerts and billing.</p><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{message&&<p className="adminNotice">{message}</p>}<button className="subscribeButton" disabled={busy||!email||!password} onClick={submit}>{busy?"Working…":mode==="signin"?"Sign in":"Create account"}</button><button className="signinLink" onClick={()=>setMode(mode==="signin"?"signup":"signin")}>{mode==="signin"?"Need an account? Create one":"Already have an account? Sign in"}</button></div>;

  const paid=subscription&&["active","trialing"].includes(subscription.status);
  return <div className="accountPanel"><div className="newsKicker">TDR ASIA ACCOUNT</div><h1>My Account</h1><div className="accountSummary"><div><span>Email</span><strong>{profile?.email||email||"—"}</strong></div><div><span>Plan</span><strong>{paid?(subscription?.plan||profile?.plan||"pro").toUpperCase():"FREE"}</strong></div><div><span>Status</span><strong>{subscription?.status||"free"}</strong></div>{subscription?.current_period_end&&<div><span>Current period ends</span><strong>{new Date(subscription.current_period_end).toLocaleDateString()}</strong></div>}</div><div className="accountActions">{paid?<><Link href="/tracker" className="subscribeButton">Open Tracker</Link><button className="subscribeButton secondary" onClick={portal} disabled={busy}>Manage billing</button></>:<Link href="/subscribe" className="subscribeButton">Upgrade to Tracker Pro</Link>}<button className="signinLink" onClick={signOut}>Sign out</button></div>{message&&<p className="adminNotice">{message}</p>}</div>;
}

"use client";

import { useEffect, useState } from "react";

export function QuickGenerate(){
  const [url,setUrl]=useState("");
  const [token,setToken]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>setToken(sessionStorage.getItem("tdr-admin-token")||""),[]);

  async function run(){
    if(!url.trim()) return;
    setBusy(true);setMessage("");
    try{
      const r=await fetch("/api/admin/generate-url",{
        method:"POST",
        headers:{"Content-Type":"application/json",...(token?{"x-admin-token":token}:{})},
        body:JSON.stringify({url:url.trim()}),
      });
      const j=await r.json();
      if(!r.ok) throw new Error(j.error||"Generation failed");
      setUrl("");
      setMessage(`Draft created: ${j.article?.title||"article"}`);
    }catch(error:any){setMessage(error?.message||"Generation failed");}
    finally{setBusy(false);}
  }

  return <main style={{maxWidth:900,margin:"48px auto",padding:"0 24px",fontFamily:"Arial, sans-serif"}}>
    <a href="/admin" style={{color:"#6b1f2b",textDecoration:"none"}}>← Newsroom Admin</a>
    <h1 style={{fontFamily:"Georgia, serif",fontSize:42,marginBottom:8}}>Generate from URL</h1>
    <p style={{color:"#666",marginBottom:28}}>Paste a news or company-disclosure URL. TDR Asia reads it, writes the article, applies existing tags and saves a draft.</p>
    <label style={{display:"block",fontSize:12,fontWeight:700,marginBottom:6}}>ADMIN TOKEN</label>
    <input type="password" value={token} onChange={e=>{setToken(e.target.value);sessionStorage.setItem("tdr-admin-token",e.target.value)}} style={{width:"100%",padding:12,border:"1px solid #bbb",marginBottom:18}} placeholder="production token"/>
    <label style={{display:"block",fontSize:12,fontWeight:700,marginBottom:6}}>SOURCE URL</label>
    <div style={{display:"flex",gap:10}}>
      <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void run()}} style={{flex:1,padding:14,border:"1px solid #999",fontSize:16}} placeholder="https://..."/>
      <button onClick={run} disabled={busy||!url.trim()} style={{padding:"0 22px",background:"#6b1f2b",color:"white",border:0,fontWeight:700,cursor:"pointer"}}>{busy?"Writing…":"Generate draft"}</button>
    </div>
    {message&&<p style={{marginTop:18,fontWeight:700}}>{message}</p>}
  </main>
}

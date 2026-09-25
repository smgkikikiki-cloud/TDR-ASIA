"use client";

import { FormEvent, useEffect, useState } from "react";

type QueueItem = {
  id: string;
  storyId: string;
  channel: "facebook" | "x";
  status: "draft" | "ready";
  storyHeadline: string;
};

export function NewsroomPostConfirm() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [token, setToken] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load(adminToken: string) {
    const res = await fetch("/api/newsroom/queue", { headers: { "x-admin-token": adminToken }, cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) {
      sessionStorage.removeItem("tdr-admin-token");
      setToken("");
      setItems([]);
      return;
    }
    if (!res.ok) {
      setMessage(json.error || "Could not load ready outputs");
      return;
    }
    setItems((json.items || []).filter((item: QueueItem) => item.status === "ready"));
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("tdr-admin-token") || "";
    if (saved) {
      setToken(saved);
      void load(saved);
    }
  }, []);

  async function markPosted(event: FormEvent, item: QueueItem) {
    event.preventDefault();
    const postUrl = (urls[item.id] || "").trim();
    if (!postUrl) return;
    setBusyId(item.id);
    setMessage("");
    const res = await fetch("/api/newsroom/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ action: "mark-posted", distributionItemId: item.id, postUrl }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setMessage(json.error || "Could not mark posted");
      return;
    }
    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
    setUrls((current) => ({ ...current, [item.id]: "" }));
    window.dispatchEvent(new Event("newsroom-performance-refresh"));
  }

  if (!token) return null;

  return (
    <section style={{ background: "#fff", borderTop: "5px solid #111", padding: 20, marginTop: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#666" }}>After posting</div>
      <h2 style={{ margin: "4px 0 0", fontSize: 26 }}>Confirm posted</h2>
      <p style={{ margin: "8px 0 0", fontSize: 13, color: "#666" }}>Paste the real Facebook/X post URL only after you have posted it. This moves the output into Performance.</p>
      {message ? <div style={{ marginTop: 10, color: "#8b1e1e", fontSize: 13 }}>{message}</div> : null}
      <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
        {items.length ? items.map((item) => (
          <form key={item.id} onSubmit={(event) => void markPosted(event, item)} style={{ display: "grid", gridTemplateColumns: "minmax(180px,1fr) minmax(240px,1fr) auto", gap: 8, alignItems: "center", borderTop: "1px solid #ddd", paddingTop: 9 }}>
            <div><b style={{ fontSize: 12, textTransform: "uppercase" }}>{item.channel}</b><div style={{ fontSize: 13, marginTop: 3 }}>{item.storyHeadline}</div></div>
            <input type="url" required placeholder="https://facebook.com/... or https://x.com/..." value={urls[item.id] || ""} onChange={(event) => setUrls((current) => ({ ...current, [item.id]: event.target.value }))} style={{ minWidth: 0, padding: 9, border: "1px solid #bbb" }} />
            <button type="submit" disabled={busyId !== null} style={{ border: 0, background: "#111", color: "#fff", padding: "9px 11px", fontWeight: 800 }}>{busyId === item.id ? "Saving…" : "Mark posted"}</button>
          </form>
        )) : <div style={{ color: "#777", fontSize: 13 }}>No ready outputs waiting for post confirmation.</div>}
      </div>
    </section>
  );
}

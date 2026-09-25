"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PerformanceClass = "learning" | "dead" | "normal" | "rising" | "breakout";
type PerformanceItem = {
  distributionItemId: string;
  storyId: string;
  storyHeadline: string;
  channel: "facebook" | "x";
  postUrl: string | null;
  postedAt: string | null;
  latest: null | {
    capturedAt: string;
    views: number;
    reach: number;
    reactions: number;
    comments: number;
    shares: number;
    clicks: number;
    followersGained: number;
  };
  baselineExposure: number | null;
  exposureRatio: number | null;
  performanceClass: PerformanceClass;
};

const emptyMetrics = { views: "", reach: "", reactions: "", comments: "", shares: "", clicks: "", followersGained: "" };

function fmt(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString();
}

function when(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

export function NewsroomPerformancePanel() {
  const router = useRouter();
  const [items, setItems] = useState<PerformanceItem[]>([]);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [followupBusyId, setFollowupBusyId] = useState<string | null>(null);
  const [followupMessage, setFollowupMessage] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState<Record<string, typeof emptyMetrics>>({});

  async function load(adminToken: string) {
    const res = await fetch("/api/newsroom/performance", { headers: { "x-admin-token": adminToken }, cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) {
      sessionStorage.removeItem("tdr-admin-token");
      setToken("");
      setItems([]);
      setMessage("Admin token required");
      return;
    }
    if (!res.ok) {
      setMessage(json.error || "Could not load performance");
      return;
    }
    setItems(json.items || []);
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("tdr-admin-token") || "";
    if (saved) {
      setToken(saved);
      void load(saved);
    }
  }, []);

  async function saveSnapshot(event: FormEvent, item: PerformanceItem) {
    event.preventDefault();
    if (!token || busyId) return;
    setBusyId(item.distributionItemId);
    setMessage("");
    const form = metrics[item.distributionItemId] || emptyMetrics;
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === "" ? 0 : Number(value)]));
    const res = await fetch("/api/newsroom/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ action: "snapshot", distributionItemId: item.distributionItemId, metrics: payload }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setMessage(json.error || "Could not save snapshot");
      return;
    }
    setItems(json.items || []);
    setMetrics((current) => ({ ...current, [item.distributionItemId]: { ...emptyMetrics } }));
  }

  async function generateFollowups(item: PerformanceItem) {
    if (!token || followupBusyId) return;
    setFollowupBusyId(item.distributionItemId);
    setFollowupMessage((current) => ({ ...current, [item.distributionItemId]: "" }));
    const res = await fetch("/api/newsroom/followups", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ distributionItemId: item.distributionItemId }),
    });
    const json = await res.json().catch(() => ({}));
    setFollowupBusyId(null);
    if (!res.ok) {
      setFollowupMessage((current) => ({ ...current, [item.distributionItemId]: json.error || "Could not generate follow-ups" }));
      return;
    }
    const text = json.alreadyExists
      ? `${json.candidateIds?.length || 0} follow-up candidates already exist in Radar.`
      : `${json.created || 0} follow-up candidates sent to Radar.`;
    setFollowupMessage((current) => ({ ...current, [item.distributionItemId]: text }));
    router.refresh();
  }

  const winners = useMemo(() => items.filter((item) => item.performanceClass === "breakout" || item.performanceClass === "rising"), [items]);

  if (!token) return null;

  return (
    <section style={{ background: "#fff", borderTop: "5px solid #111", padding: 20, marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#666" }}>Performance</div>
          <h2 style={{ margin: "4px 0 0", fontSize: 26 }}>Winners desk</h2>
        </div>
        <div style={{ fontSize: 12 }}><b>{winners.length} rising/breakout</b> · {items.length} posted</div>
      </div>

      <p style={{ fontSize: 13, color: "#666", marginTop: 10 }}>Manual-first: add snapshots whenever you check a post. Classification starts after at least 3 peer posts exist on the same channel.</p>
      {message ? <div style={{ marginTop: 10, color: "#8b1e1e", fontSize: 13 }}>{message}</div> : null}

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {items.length ? items.map((item) => {
          const form = metrics[item.distributionItemId] || emptyMetrics;
          const isBreakout = item.performanceClass === "breakout";
          return (
            <article key={item.distributionItemId} style={{ border: "1px solid #ddd", padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                    <b style={{ textTransform: "uppercase", fontSize: 12 }}>{item.channel}</b>
                    <span style={{ fontSize: 10, border: "1px solid #bbb", padding: "2px 5px", textTransform: "uppercase" }}>{item.performanceClass}</span>
                    {item.exposureRatio !== null ? <span style={{ fontSize: 11, color: "#666" }}>{item.exposureRatio.toFixed(2)}× baseline</span> : null}
                  </div>
                  <a href={`/newsroom/story/${item.storyId}`} style={{ display: "inline-block", marginTop: 5, color: "#111", fontWeight: 800, textDecoration: "none" }}>{item.storyHeadline}</a>
                  <div style={{ marginTop: 4, fontSize: 11, color: "#777" }}>Posted {when(item.postedAt)} · latest snapshot {when(item.latest?.capturedAt)}</div>
                </div>
                {item.postUrl ? <a href={item.postUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 800, color: "#111" }}>Open post ↗</a> : null}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 8, marginTop: 12 }}>
                {[["Views", item.latest?.views], ["Reach", item.latest?.reach], ["React", item.latest?.reactions], ["Comments", item.latest?.comments], ["Shares", item.latest?.shares], ["Clicks", item.latest?.clicks], ["Followers", item.latest?.followersGained]].map(([label, value]) => (
                  <div key={String(label)} style={{ background: "#f5f3ee", padding: 8 }}><small>{label}</small><b style={{ display: "block", marginTop: 3 }}>{fmt(value as number | undefined)}</b></div>
                ))}
              </div>

              {isBreakout ? (
                <div style={{ marginTop: 12, padding: 12, border: "1px solid #111", background: "#fafaf7", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <b style={{ fontSize: 13 }}>Breakout: extend the momentum</b>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>Generate four distinct follow-up angles and send them back to Radar. Repeated clicks are idempotent.</div>
                    {followupMessage[item.distributionItemId] ? <div style={{ fontSize: 12, marginTop: 5 }}>{followupMessage[item.distributionItemId]}</div> : null}
                  </div>
                  <button
                    type="button"
                    disabled={followupBusyId !== null}
                    onClick={() => void generateFollowups(item)}
                    style={{ border: 0, background: "#111", color: "#fff", padding: "9px 12px", fontWeight: 800, cursor: followupBusyId ? "wait" : "pointer" }}
                  >
                    {followupBusyId === item.distributionItemId ? "Generating…" : "Generate follow-ups"}
                  </button>
                </div>
              ) : null}

              <form onSubmit={(event) => void saveSnapshot(event, item)} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 7, marginTop: 12 }}>
                {Object.keys(emptyMetrics).map((key) => (
                  <input key={key} type="number" min="0" placeholder={key === "followersGained" ? "followers +" : key} value={form[key as keyof typeof form]} onChange={(event) => setMetrics((current) => ({ ...current, [item.distributionItemId]: { ...(current[item.distributionItemId] || emptyMetrics), [key]: event.target.value } }))} style={{ minWidth: 0, padding: 8, border: "1px solid #ccc" }} />
                ))}
                <button type="submit" disabled={busyId !== null} style={{ border: 0, background: "#111", color: "#fff", padding: "8px 10px", fontWeight: 800 }}>{busyId === item.distributionItemId ? "Saving…" : "Add snapshot"}</button>
              </form>
            </article>
          );
        }) : <div style={{ color: "#777", fontSize: 13 }}>No posted outputs yet. Mark one posted from the Publishing desk first.</div>}
      </div>
    </section>
  );
}

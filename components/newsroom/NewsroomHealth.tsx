"use client";

import { FormEvent, useEffect, useState } from "react";

type HealthAttention = {
  kind: "failed" | "stuck" | "partial" | "routing";
  title: string;
  detail: string;
  storyId?: string;
  candidateId?: string;
  jobId?: string;
  createdAt?: string;
};

type NewsroomHealth = {
  queued: number;
  running: number;
  failed: number;
  completed24h: number;
  promoted24h: number;
  generatedDrafts24h: number;
  lastDiscoveryAt: string | null;
  lastWorkerAt: string | null;
  attention: HealthAttention[];
};

function when(value: string | null | undefined) {
  if (!value) return "never";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function NewsroomHealthPanel() {
  const [health, setHealth] = useState<NewsroomHealth | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function load(adminToken: string) {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/newsroom/health", {
      headers: { "x-admin-token": adminToken },
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.status === 401) {
      sessionStorage.removeItem("tdr-admin-token");
      setToken("");
      setHealth(null);
      setMessage("Admin token required");
      return;
    }
    if (!res.ok) {
      setMessage(json.error || "Could not load automation health");
      return;
    }
    setHealth(json.health);
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("tdr-admin-token") || "";
    if (saved) {
      setToken(saved);
      void load(saved);
    }
  }, []);

  function unlock(event: FormEvent) {
    event.preventDefault();
    const clean = token.trim();
    if (!clean) return;
    sessionStorage.setItem("tdr-admin-token", clean);
    void load(clean);
  }

  if (!health) {
    return (
      <section style={{ background: "#111", color: "#fff", padding: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", opacity: .65 }}>Automation</div>
        <h2 style={{ margin: "6px 0 10px", fontSize: 27 }}>Needs You + System</h2>
        <p style={{ margin: "0 0 14px", color: "#ccc", fontSize: 13, lineHeight: 1.5 }}>Unlock once to see failures, stuck jobs, routing gaps and the last 24 hours of newsroom automation.</p>
        <form onSubmit={unlock} style={{ display: "flex", gap: 7 }}>
          <input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Admin token" style={{ flex: 1, minWidth: 0, padding: 9, border: "1px solid #555", background: "#fff" }} />
          <button type="submit" style={{ border: 0, padding: "9px 11px", fontWeight: 800 }}>Unlock</button>
        </form>
        {message ? <div style={{ marginTop: 8, fontSize: 12, color: "#ffb4b4" }}>{message}</div> : null}
      </section>
    );
  }

  const healthy = health.failed === 0 && health.running === 0 && health.attention.length === 0;

  return (
    <section style={{ background: "#111", color: "#fff", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", opacity: .65 }}>Automation health</div>
          <h2 style={{ margin: "6px 0 0", fontSize: 27 }}>{health.attention.length ? `${health.attention.length} need attention` : "System clear"}</h2>
        </div>
        <button type="button" onClick={() => void load(token)} disabled={loading} style={{ border: "1px solid #666", background: "transparent", color: "#fff", padding: "6px 9px", fontWeight: 700 }}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16 }}>
        {[
          ["Queued", health.queued],
          ["Running", health.running],
          ["Failed", health.failed],
          ["Processed 24h", health.completed24h],
          ["Promoted 24h", health.promoted24h],
          ["Drafts 24h", health.generatedDrafts24h],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ borderTop: "1px solid #555", paddingTop: 8 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", color: "#aaa" }}>{label}</div>
            <b style={{ display: "block", fontSize: 22, marginTop: 3 }}>{value}</b>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #555", fontSize: 11, lineHeight: 1.6, color: "#bbb" }}>
        Last discovery: <b style={{ color: "#fff" }}>{when(health.lastDiscoveryAt)}</b><br />
        Last worker activity: <b style={{ color: "#fff" }}>{when(health.lastWorkerAt)}</b>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: healthy ? "#b9f6c7" : "#ffd1a8" }}>Needs You</div>
        {health.attention.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {health.attention.map((item, index) => (
              <article key={`${item.kind}-${item.jobId || item.storyId || item.candidateId || index}`} style={{ background: "#202020", border: "1px solid #444", padding: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <b style={{ fontSize: 12 }}>{item.title}</b>
                  <span style={{ fontSize: 9, textTransform: "uppercase", color: "#aaa" }}>{item.kind}</span>
                </div>
                <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.45, color: "#ccc" }}>{item.detail}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 7, fontSize: 10, color: "#999" }}>
                  <span>{when(item.createdAt)}</span>
                  {item.storyId ? <a href={`/newsroom/story/${item.storyId}`} style={{ color: "#fff", fontWeight: 800 }}>Open Story →</a> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 8, fontSize: 13, color: "#b9f6c7" }}>Nothing needs intervention right now.</div>
        )}
      </div>

      {message ? <div style={{ marginTop: 9, fontSize: 12, color: "#ffb4b4" }}>{message}</div> : null}
    </section>
  );
}

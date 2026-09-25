"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Channel = "facebook" | "x";
type QueueStatus = "draft" | "ready";

type QueueItem = {
  id: string;
  storyId: string;
  channel: Channel;
  copy: string;
  status: QueueStatus;
  destinationUrl: string | null;
  generatedAt: string | null;
  updatedAt: string;
  storyHeadline: string;
  storyVertical: string;
  storyDestinationType: string | null;
};

export function NewsroomQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadQueue(adminToken: string) {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/newsroom/queue", {
      headers: { "x-admin-token": adminToken },
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.status === 401) {
      sessionStorage.removeItem("tdr-admin-token");
      setToken("");
      setItems([]);
      setMessage("Admin token required");
      return;
    }
    if (!res.ok) {
      setMessage(json.error || "Could not load queue");
      return;
    }
    setItems(json.items || []);
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("tdr-admin-token") || "";
    if (saved) {
      setToken(saved);
      void loadQueue(saved);
    }
  }, []);

  function unlock(event: FormEvent) {
    event.preventDefault();
    const clean = token.trim();
    if (!clean) return;
    sessionStorage.setItem("tdr-admin-token", clean);
    void loadQueue(clean);
  }

  async function setStatus(item: QueueItem, status: QueueStatus) {
    if (!token || busyId) return;
    setBusyId(item.id);
    setMessage("");
    const res = await fetch(`/api/newsroom/stories/${item.storyId}/social`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify({ channel: item.channel, status }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);

    if (res.status === 401) {
      sessionStorage.removeItem("tdr-admin-token");
      setToken("");
      setItems([]);
      setMessage("Wrong admin token");
      return;
    }
    if (!res.ok) {
      setMessage(json.error || "Could not update queue status");
      return;
    }

    setItems((current) => current.map((currentItem) => (
      currentItem.id === item.id ? { ...currentItem, status: json.item.status } : currentItem
    )));
  }

  async function copyItem(item: QueueItem) {
    await navigator.clipboard.writeText(item.copy);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId((current) => current === item.id ? null : current), 1400);
  }

  const ready = useMemo(() => items.filter((item) => item.status === "ready"), [items]);
  const drafts = useMemo(() => items.filter((item) => item.status === "draft"), [items]);

  if (!token) {
    return (
      <section style={{ background: "#fff", borderTop: "5px solid #111", padding: 20, marginTop: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#666" }}>Queue</div>
        <h2 style={{ margin: "4px 0 12px", fontSize: 26 }}>Publishing desk</h2>
        <form onSubmit={unlock} style={{ display: "flex", gap: 8, maxWidth: 520 }}>
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Admin token"
            style={{ flex: 1, minWidth: 0, padding: 10, border: "1px solid #bbb" }}
          />
          <button type="submit" style={{ border: 0, background: "#111", color: "#fff", padding: "9px 14px", fontWeight: 800 }}>Unlock queue</button>
        </form>
        {message ? <div style={{ marginTop: 9, color: "#8b1e1e", fontSize: 13 }}>{message}</div> : null}
      </section>
    );
  }

  return (
    <section style={{ background: "#fff", borderTop: "5px solid #111", padding: 20, marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#666" }}>Queue</div>
          <h2 style={{ margin: "4px 0 0", fontSize: 26 }}>Publishing desk</h2>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12 }}>
          <b>{ready.length} ready</b>
          <span style={{ color: "#777" }}>{drafts.length} draft</span>
          <button type="button" onClick={() => void loadQueue(token)} disabled={loading} style={{ border: "1px solid #bbb", background: "#fff", padding: "6px 9px", fontWeight: 700 }}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {message ? <div style={{ marginTop: 12, color: "#8b1e1e", fontSize: 13 }}>{message}</div> : null}

      <div style={{ display: "grid", gap: 22, marginTop: 18 }}>
        <QueueGroup
          title="Ready to post"
          items={ready}
          busyId={busyId}
          copiedId={copiedId}
          readyGroup
          onStatus={setStatus}
          onCopy={copyItem}
        />
        <QueueGroup
          title="Drafts"
          items={drafts}
          busyId={busyId}
          copiedId={copiedId}
          readyGroup={false}
          onStatus={setStatus}
          onCopy={copyItem}
        />
      </div>
    </section>
  );
}

function QueueGroup({
  title,
  items,
  busyId,
  copiedId,
  readyGroup,
  onStatus,
  onCopy,
}: {
  title: string;
  items: QueueItem[];
  busyId: string | null;
  copiedId: string | null;
  readyGroup: boolean;
  onStatus: (item: QueueItem, status: QueueStatus) => Promise<void>;
  onCopy: (item: QueueItem) => Promise<void>;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #111", paddingBottom: 8 }}>
        <b>{title}</b>
        <span style={{ fontSize: 12, color: "#777" }}>{items.length}</span>
      </div>
      {items.length ? (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {items.map((item) => (
            <article key={item.id} style={{ border: "1px solid #ddd", padding: 14, background: readyGroup ? "#fafaf7" : "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <b style={{ fontSize: 12, textTransform: "uppercase" }}>{item.channel === "facebook" ? "Facebook" : "X"}</b>
                    <span style={{ fontSize: 10, border: "1px solid #ccc", padding: "2px 5px", textTransform: "uppercase" }}>{item.storyVertical}</span>
                    <span style={{ fontSize: 10, color: "#777", textTransform: "uppercase" }}>{item.status}</span>
                  </div>
                  <a href={`/newsroom/story/${item.storyId}`} style={{ display: "inline-block", marginTop: 5, color: "#111", fontWeight: 800, textDecoration: "none" }}>{item.storyHeadline}</a>
                </div>
                <div style={{ display: "flex", gap: 7, alignItems: "start", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => void onCopy(item)} style={{ border: "1px solid #111", background: "#fff", padding: "7px 9px", fontWeight: 800 }}>
                    {copiedId === item.id ? "Copied" : "Copy"}
                  </button>
                  {item.destinationUrl ? (
                    <a href={item.destinationUrl} target="_blank" rel="noreferrer" style={{ border: "1px solid #bbb", padding: "7px 9px", color: "#111", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>Open destination ↗</a>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void onStatus(item, readyGroup ? "draft" : "ready")}
                    style={{ border: 0, background: readyGroup ? "#eee" : "#111", color: readyGroup ? "#111" : "#fff", padding: "8px 10px", fontWeight: 800, cursor: busyId ? "wait" : "pointer" }}
                  >
                    {busyId === item.id ? "Saving…" : readyGroup ? "Back to draft" : "Mark ready"}
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 12, padding: 12, background: "#f5f3ee", whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: 13, maxHeight: 220, overflow: "auto" }}>{item.copy}</div>
            </article>
          ))}
        </div>
      ) : (
        <div style={{ padding: "16px 0", color: "#777", fontSize: 13 }}>Nothing here.</div>
      )}
    </div>
  );
}

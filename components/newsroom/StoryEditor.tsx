"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Story = {
  id: string;
  headline: string;
  summary: string | null;
  vertical: "unassigned" | "auto" | "industry" | "mega" | "cross_vertical";
  destinationType: "tdr_auto" | "tdr_asia" | "tdr_mega" | "none" | null;
  destinationUrl: string | null;
  status: "draft" | "ready" | "archived";
  updatedAt: string;
};

export function StoryEditor({ storyId }: { storyId: string }) {
  const [story, setStory] = useState<Story | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function loadStory(adminToken: string) {
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/newsroom/stories/${storyId}`, {
      headers: { "x-admin-token": adminToken },
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.status === 401) {
      sessionStorage.removeItem("tdr-admin-token");
      setToken("");
      setMessage("Admin token required");
      return;
    }
    if (!res.ok) {
      setMessage(json.error || "Could not load story");
      return;
    }
    setStory(json.story);
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("tdr-admin-token") || "";
    if (saved) {
      setToken(saved);
      void loadStory(saved);
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  function unlock(event: FormEvent) {
    event.preventDefault();
    const clean = token.trim();
    if (!clean) return;
    sessionStorage.setItem("tdr-admin-token", clean);
    void loadStory(clean);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!story || busy || !token) return;
    setBusy(true);
    setMessage("");

    const res = await fetch(`/api/newsroom/stories/${storyId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify({
        headline: story.headline,
        summary: story.summary,
        vertical: story.vertical,
        destinationType: story.destinationType,
        destinationUrl: story.destinationUrl,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (res.status === 401) {
      sessionStorage.removeItem("tdr-admin-token");
      setStory(null);
      setToken("");
      setMessage("Wrong admin token");
      return;
    }
    if (!res.ok) {
      setMessage(json.error || "Could not save story");
      return;
    }

    setStory(json.story);
    setMessage("Saved");
    router.refresh();
  }

  if (loading) return <div style={{ padding: 24 }}>Loading story…</div>;

  if (!story) {
    return (
      <form onSubmit={unlock} style={{ maxWidth: 440, background: "#fff", border: "1px solid #d8d4cc", padding: 22 }}>
        <h2 style={{ marginTop: 0 }}>Unlock Story Editor</h2>
        <p style={{ color: "#666", fontSize: 14 }}>Use the same ADMIN_TOKEN as the existing newsroom admin actions.</p>
        <input
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Admin token"
          autoFocus
          style={{ width: "100%", boxSizing: "border-box", padding: 10, border: "1px solid #bbb" }}
        />
        <button type="submit" style={{ marginTop: 12, border: 0, background: "#111", color: "#fff", padding: "9px 14px", fontWeight: 800 }}>Open story</button>
        {message ? <div style={{ marginTop: 10, color: "#8b1e1e", fontSize: 13 }}>{message}</div> : null}
      </form>
    );
  }

  return (
    <form onSubmit={save} style={{ display: "grid", gap: 18 }}>
      <section style={{ background: "#fff", borderTop: "5px solid #111", padding: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#666" }}>Story</div>
        <label style={{ display: "grid", gap: 6, marginTop: 14, fontSize: 12, fontWeight: 800 }}>
          Headline
          <input
            value={story.headline}
            onChange={(event) => setStory({ ...story, headline: event.target.value })}
            style={{ padding: 11, border: "1px solid #bbb", fontSize: 18, fontWeight: 700 }}
          />
        </label>
        <label style={{ display: "grid", gap: 6, marginTop: 14, fontSize: 12, fontWeight: 800 }}>
          Summary
          <textarea
            value={story.summary || ""}
            onChange={(event) => setStory({ ...story, summary: event.target.value })}
            rows={6}
            style={{ padding: 11, border: "1px solid #bbb", font: "inherit", lineHeight: 1.5, resize: "vertical" }}
          />
        </label>
      </section>

      <section style={{ background: "#fff", border: "1px solid #d8d4cc", padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
        <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800 }}>
          Vertical
          <select
            value={story.vertical}
            onChange={(event) => setStory({ ...story, vertical: event.target.value as Story["vertical"] })}
            style={{ padding: 10, border: "1px solid #bbb", background: "#fff" }}
          >
            <option value="unassigned">Unassigned</option>
            <option value="auto">Auto</option>
            <option value="industry">Industry</option>
            <option value="mega">Mega</option>
            <option value="cross_vertical">Cross vertical</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800 }}>
          Destination
          <select
            value={story.destinationType || ""}
            onChange={(event) => setStory({ ...story, destinationType: (event.target.value || null) as Story["destinationType"] })}
            style={{ padding: 10, border: "1px solid #bbb", background: "#fff" }}
          >
            <option value="">Not decided</option>
            <option value="tdr_auto">TDR Auto</option>
            <option value="tdr_asia">TDR Asia</option>
            <option value="tdr_mega">TDR Mega</option>
            <option value="none">No web destination</option>
          </select>
        </label>
      </section>

      <section style={{ background: "#fff", border: "1px solid #d8d4cc", padding: 20 }}>
        <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800 }}>
          Destination URL
          <input
            value={story.destinationUrl || ""}
            onChange={(event) => setStory({ ...story, destinationUrl: event.target.value })}
            placeholder="https://... or leave blank"
            style={{ padding: 10, border: "1px solid #bbb" }}
          />
        </label>
      </section>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" disabled={busy} style={{ border: 0, background: "#111", color: "#fff", padding: "10px 16px", fontWeight: 800, cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Saving…" : "Save story"}
        </button>
        <a href="/newsroom" style={{ fontSize: 13, fontWeight: 800, color: "#111" }}>← Back to Newsroom</a>
        {message ? <span style={{ fontSize: 13, color: message === "Saved" ? "#166534" : "#8b1e1e" }}>{message}</span> : null}
      </div>
    </form>
  );
}

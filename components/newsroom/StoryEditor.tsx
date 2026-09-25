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

type Channel = "facebook" | "x";

type DistributionItem = {
  id: string;
  storyId: string;
  channel: Channel;
  copy: string;
  status: "draft" | "ready" | "posted";
  destinationUrl: string | null;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DraftMap = Partial<Record<Channel, DistributionItem>>;

export function StoryEditor({ storyId }: { storyId: string }) {
  const [story, setStory] = useState<Story | null>(null);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<Channel | null>(null);
  const [message, setMessage] = useState("");
  const [socialMessage, setSocialMessage] = useState("");
  const router = useRouter();

  async function loadSocial(adminToken: string) {
    const res = await fetch(`/api/newsroom/stories/${storyId}/social`, {
      headers: { "x-admin-token": adminToken },
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    if (!res.ok) throw new Error(json.error || "Could not load social drafts");
    const next: DraftMap = {};
    for (const item of (json.items || []) as DistributionItem[]) next[item.channel] = item;
    setDrafts(next);
  }

  async function loadStory(adminToken: string) {
    setLoading(true);
    setMessage("");
    setSocialMessage("");
    const res = await fetch(`/api/newsroom/stories/${storyId}`, {
      headers: { "x-admin-token": adminToken },
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));

    if (res.status === 401) {
      sessionStorage.removeItem("tdr-admin-token");
      setToken("");
      setLoading(false);
      setMessage("Admin token required");
      return;
    }
    if (!res.ok) {
      setLoading(false);
      setMessage(json.error || "Could not load story");
      return;
    }

    setStory(json.story);
    try {
      await loadSocial(adminToken);
    } catch (error: any) {
      if (error?.message === "UNAUTHORIZED") {
        sessionStorage.removeItem("tdr-admin-token");
        setToken("");
        setStory(null);
        setMessage("Admin token required");
      } else {
        setSocialMessage(error?.message || "Could not load social drafts");
      }
    }
    setLoading(false);
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

  async function generateSocial(channel: Channel) {
    if (!token || socialBusy) return;
    setSocialBusy(channel);
    setSocialMessage("");
    const res = await fetch(`/api/newsroom/stories/${storyId}/social`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify({ channel }),
    });
    const json = await res.json().catch(() => ({}));
    setSocialBusy(null);

    if (res.status === 401) {
      sessionStorage.removeItem("tdr-admin-token");
      setStory(null);
      setToken("");
      setMessage("Wrong admin token");
      return;
    }
    if (!res.ok) {
      setSocialMessage(json.error || `Could not generate ${channel} draft`);
      return;
    }

    setDrafts((current) => ({ ...current, [channel]: json.item }));
    setSocialMessage(`${channel === "facebook" ? "Facebook" : "X"} draft generated`);
  }

  async function saveSocial(channel: Channel) {
    const draft = drafts[channel];
    if (!draft || !draft.copy.trim() || !token || socialBusy) return;
    setSocialBusy(channel);
    setSocialMessage("");
    const res = await fetch(`/api/newsroom/stories/${storyId}/social`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify({ channel, copy: draft.copy }),
    });
    const json = await res.json().catch(() => ({}));
    setSocialBusy(null);

    if (!res.ok) {
      setSocialMessage(json.error || `Could not save ${channel} draft`);
      return;
    }
    setDrafts((current) => ({ ...current, [channel]: json.item }));
    setSocialMessage(`${channel === "facebook" ? "Facebook" : "X"} draft saved`);
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
    <div style={{ display: "grid", gap: 18 }}>
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

      <section style={{ background: "#fff", borderTop: "5px solid #111", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#666" }}>Outputs</div>
            <h2 style={{ margin: "4px 0 0", fontSize: 26 }}>Facebook + X drafts</h2>
          </div>
          <div style={{ fontSize: 12, color: "#777" }}>Draft only · nothing is published from this chunk</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, marginTop: 18 }}>
          {(["facebook", "x"] as Channel[]).map((channel) => {
            const draft = drafts[channel];
            const label = channel === "facebook" ? "Facebook" : "X";
            return (
              <article key={channel} style={{ border: "1px solid #d8d4cc", padding: 16, background: "#faf9f6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <b>{label}</b>
                  <span style={{ fontSize: 11, color: "#777", textTransform: "uppercase" }}>{draft?.status || "not generated"}</span>
                </div>

                {draft ? (
                  <textarea
                    value={draft.copy}
                    onChange={(event) => setDrafts((current) => ({
                      ...current,
                      [channel]: { ...draft, copy: event.target.value },
                    }))}
                    rows={channel === "facebook" ? 13 : 9}
                    style={{ width: "100%", boxSizing: "border-box", marginTop: 12, padding: 11, border: "1px solid #bbb", font: "inherit", lineHeight: 1.5, resize: "vertical", background: "#fff" }}
                  />
                ) : (
                  <div style={{ marginTop: 12, padding: "30px 12px", border: "1px dashed #bbb", color: "#777", fontSize: 13, textAlign: "center" }}>
                    No {label} draft yet.
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => void generateSocial(channel)}
                    disabled={socialBusy !== null}
                    style={{ border: 0, background: "#111", color: "#fff", padding: "8px 11px", fontWeight: 800, cursor: socialBusy ? "wait" : "pointer" }}
                  >
                    {socialBusy === channel ? "Generating…" : draft ? `Regenerate ${label}` : `Generate ${label}`}
                  </button>
                  {draft ? (
                    <button
                      type="button"
                      onClick={() => void saveSocial(channel)}
                      disabled={socialBusy !== null || !draft.copy.trim()}
                      style={{ border: "1px solid #111", background: "#fff", color: "#111", padding: "7px 11px", fontWeight: 800, cursor: socialBusy ? "wait" : "pointer" }}
                    >
                      Save draft
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
        {socialMessage ? <div style={{ marginTop: 12, fontSize: 13, color: socialMessage.includes("saved") || socialMessage.includes("generated") ? "#166534" : "#8b1e1e" }}>{socialMessage}</div> : null}
      </section>
    </div>
  );
}

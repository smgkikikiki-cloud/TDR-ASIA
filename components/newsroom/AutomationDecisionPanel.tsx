"use client";

import { useEffect, useState } from "react";

type AutomationStory = {
  growthScore: number | null;
  routeScore: number | null;
  automationReason: string | null;
  autoPromotedAt: string | null;
};

export function AutomationDecisionPanel({ storyId }: { storyId: string }) {
  const [story, setStory] = useState<AutomationStory | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("tdr-admin-token") || "";
    if (!token) return;

    let cancelled = false;
    void fetch(`/api/newsroom/stories/${storyId}`, {
      headers: { "x-admin-token": token },
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const json = await res.json();
        return json.story as AutomationStory;
      })
      .then((value) => {
        if (!cancelled && value?.autoPromotedAt) setStory(value);
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [storyId]);

  if (!story?.autoPromotedAt) return null;

  return (
    <section style={{ marginTop: 18, background: "#111", color: "#fff", padding: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", opacity: .65 }}>Automation decision</div>
      <div style={{ display: "flex", gap: 26, alignItems: "baseline", flexWrap: "wrap", marginTop: 10 }}>
        <div><span style={{ fontSize: 31, fontWeight: 850 }}>{story.growthScore ?? "—"}</span><span style={{ marginLeft: 6, fontSize: 12, opacity: .72 }}>Growth</span></div>
        <div><span style={{ fontSize: 31, fontWeight: 850 }}>{story.routeScore ?? "—"}</span><span style={{ marginLeft: 6, fontSize: 12, opacity: .72 }}>Route</span></div>
      </div>
      {story.automationReason ? <p style={{ margin: "12px 0 0", maxWidth: 760, lineHeight: 1.5, color: "#ddd" }}>{story.automationReason}</p> : null}
      <div style={{ marginTop: 9, fontSize: 11, opacity: .55 }}>Auto-promoted {new Date(story.autoPromotedAt).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" })}</div>
    </section>
  );
}

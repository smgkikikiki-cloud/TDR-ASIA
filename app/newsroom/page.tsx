import { readCms } from "@/lib/cms-store";
import { listNewsroomStories } from "@/lib/newsroom-store";
import { MakeStoryButton } from "@/components/newsroom/MakeStoryButton";

export const metadata = {
  title: "Super Newsroom | TDR",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function timeLabel(value?: string) {
  if (!value) return "time unknown";
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

export default async function NewsroomPage() {
  const [state, stories] = await Promise.all([readCms(), listNewsroomStories()]);
  const storyByCandidateId = new Map(stories.map((story) => [story.candidateId, story]));
  const radar = state.candidates
    .filter((candidate) => !candidate.generated && !candidate.ignored)
    .sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt));
  const visibleRadar = radar.slice(0, 8);
  const recentStories = stories.slice(0, 5);

  const stats = [
    { label: "New radar", value: String(radar.length), note: "Unprocessed candidates already in the newsroom" },
    { label: "Stories", value: String(stories.length), note: "Candidates promoted into newsroom stories" },
    { label: "Needs you", value: "—", note: "Only decisions that need a human" },
    { label: "Winners", value: "—", note: "Posts outperforming baseline" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#f3f1ec", color: "#151515" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 24px 64px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-end", borderBottom: "3px solid #111", paddingBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 8 }}>TDR Group</div>
            <h1 style={{ fontSize: "clamp(34px,5vw,62px)", lineHeight: .95, margin: 0, letterSpacing: "-.04em" }}>Super Newsroom</h1>
            <p style={{ maxWidth: 720, margin: "14px 0 0", fontSize: 17, lineHeight: 1.5, color: "#4d4d4d" }}>
              One control room for finding stories, preparing Facebook and X, routing attention into TDR Auto / TDR Asia / TDR Mega, and catching winners early.
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, lineHeight: 1.5, color: "#555" }}>
            <b style={{ display: "block", color: "#111" }}>Chunk 4</b>
            Story Editor live
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 20 }}>
          {stats.map((item) => (
            <article key={item.label} style={{ background: "#fff", border: "1px solid #d8d4cc", padding: 18 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>{item.label}</div>
              <div style={{ fontSize: 38, fontWeight: 850, lineHeight: 1, margin: "14px 0 8px" }}>{item.value}</div>
              <div style={{ fontSize: 13, color: "#666", lineHeight: 1.4 }}>{item.note}</div>
            </article>
          ))}
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(280px,1fr)", gap: 18, marginTop: 24 }}>
          <section style={{ background: "#fff", borderTop: "5px solid #111" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between", gap: 20, alignItems: "end" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>Radar</div>
                <h2 style={{ margin: "4px 0 0", fontSize: 26 }}>Existing discovery candidates</h2>
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>{radar.length} waiting</div>
            </div>

            {visibleRadar.length ? visibleRadar.map((candidate, index) => {
              const story = storyByCandidateId.get(candidate.id);
              return (
                <article key={candidate.id} style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 14, padding: "18px", borderBottom: "1px solid #e5e1da" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#777", paddingTop: 3 }}>{String(index + 1).padStart(2, "0")}</div>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 7 }}>
                      <b style={{ fontSize: 12 }}>{candidate.sourceName}</b>
                      <span style={{ fontSize: 11, color: "#777" }}>{timeLabel(candidate.publishedAt || candidate.discoveredAt)}</span>
                      {candidate.suggestedTags.slice(0, 3).map((tag) => (
                        <span key={tag} style={{ fontSize: 10, border: "1px solid #d7d2ca", padding: "2px 6px", textTransform: "uppercase", letterSpacing: ".04em" }}>{tag}</span>
                      ))}
                    </div>
                    <h3 style={{ margin: 0, fontSize: 19, lineHeight: 1.25 }}>{candidate.title}</h3>
                    {candidate.summary ? <p style={{ margin: "7px 0 0", color: "#555", lineHeight: 1.45, fontSize: 14 }}>{candidate.summary}</p> : null}
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      {candidate.sourceUrl ? <a href={candidate.sourceUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 9, fontSize: 12, fontWeight: 800, color: "#111" }}>Open source ↗</a> : null}
                      <MakeStoryButton candidateId={candidate.id} storyId={story?.id} />
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div style={{ padding: 28, color: "#666" }}>
                No unprocessed candidates. Existing discovery can populate this without any newsroom schema change.
              </div>
            )}
          </section>

          <aside style={{ display: "grid", gap: 18, alignContent: "start" }}>
            <section style={{ background: "#111", color: "#fff", padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", opacity: .7 }}>Human attention</div>
              <h2 style={{ fontSize: 28, margin: "8px 0 12px" }}>Edit only what matters</h2>
              <p style={{ margin: 0, lineHeight: 1.55, color: "#d8d8d8", fontSize: 14 }}>
                A Story can now be edited and routed to Auto, Asia, Mega or nowhere before social generation exists.
              </p>
            </section>

            <section style={{ background: "#fff", border: "1px solid #d8d4cc", padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>Recent stories</div>
              <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                {recentStories.length ? recentStories.map((story) => (
                  <a key={story.id} href={`/newsroom/story/${story.id}`} style={{ display: "block", padding: "10px 0", borderTop: "1px solid #eee", color: "#111", textDecoration: "none" }}>
                    <b style={{ display: "block", fontSize: 13, lineHeight: 1.3 }}>{story.headline}</b>
                    <div style={{ marginTop: 4, fontSize: 11, color: "#777", textTransform: "uppercase" }}>{story.vertical} · {story.status}</div>
                  </a>
                )) : <div style={{ fontSize: 13, color: "#777" }}>No stories yet.</div>}
              </div>
            </section>

            <section style={{ background: "#fff", border: "1px solid #d8d4cc", padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>Desks</div>
              <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                {[
                  ["Radar", "Live", true],
                  ["Stories", "Editor live", true],
                  ["Queue", "Later", false],
                  ["Winners", "Later", false],
                  ["Sources", "Existing registry", false],
                ].map(([name, description, live]) => (
                  <div key={String(name)} style={{ padding: "10px 0", borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <b>{String(name)}</b>
                    <span style={{ fontSize: 12, color: live ? "#111" : "#777" }}>{String(description)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ background: "#fff", border: "1px solid #d8d4cc", padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>Destinations</div>
              <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                {[
                  ["TDR Auto", "Automotive data, compare, prices"],
                  ["TDR Asia", "Industry and investment"],
                  ["TDR Mega", "Infrastructure and projects"],
                ].map(([name, description]) => (
                  <div key={name} style={{ padding: "10px 0", borderTop: "1px solid #eee" }}>
                    <b>{name}</b>
                    <div style={{ marginTop: 3, fontSize: 12, color: "#666" }}>{description}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

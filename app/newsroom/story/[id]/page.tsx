import { StoryEditor } from "@/components/newsroom/StoryEditor";

export const metadata = {
  title: "Story Editor | Super Newsroom",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function StoryEditorPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main style={{ minHeight: "100vh", background: "#f3f1ec", color: "#151515" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 24px 64px" }}>
        <header style={{ borderBottom: "3px solid #111", paddingBottom: 18, marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 8 }}>TDR Group · Super Newsroom</div>
          <h1 style={{ fontSize: "clamp(32px,5vw,54px)", lineHeight: .98, margin: 0, letterSpacing: "-.04em" }}>Story Editor</h1>
          <p style={{ margin: "12px 0 0", color: "#666", maxWidth: 700 }}>
            Set the editorial bucket and where this story should send attention. Social generation comes later.
          </p>
        </header>

        <StoryEditor storyId={id} />
      </div>
    </main>
  );
}

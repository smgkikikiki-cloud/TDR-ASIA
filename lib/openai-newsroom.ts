import type { Candidate, CmsArticle, CmsTag, CmsSource } from "./cms-types";
import type { NewsroomStory, StorySourceContext, DistributionChannel } from "./newsroom-store";

const API = "https://api.openai.com/v1/responses";

function key() {
  const value = process.env.OPENAI_API_KEY;
  if (!value) throw new Error("OPENAI_API_KEY is not configured");
  return value;
}

function outputText(json: any): string {
  if (typeof json.output_text === "string") return json.output_text;
  const chunks: string[] = [];
  for (const item of json.output || []) {
    for (const c of item.content || []) if (typeof c.text === "string") chunks.push(c.text);
  }
  return chunks.join("\n");
}

function cleanJson(text: string) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function response(input: string, model = process.env.OPENAI_NEWS_MODEL || "gpt-5.6-luna", webSearch = true) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, store: false, tools: webSearch ? [{ type: "web_search" }] : undefined, input })
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  return outputText(await res.json());
}

export async function discoverCandidates(sources: CmsSource[], priorUrls: string[]): Promise<Candidate[]> {
  const sourceText = sources.filter(s => s.enabled).sort((a,b)=>b.priority-a.priority).map(s => `${s.name}: ${s.url}`).join("\n");
  const prompt = `You are the discovery desk for TDR Asia, a Thailand-focused technology, manufacturing and investment news outlet.\n\nSearch the live public web and return exactly 10 NEW story candidates relevant to Thai industry or investment. Prioritize factory investment, corporate expansion, manufacturing, electronics, semiconductors, robotics/automation, EV/batteries, data centers, industrial estates, logistics infrastructure, high-tech policy tied to concrete investment, and material corporate deals involving Thailand.\n\nDo NOT return tourism, lifestyle, generic politics, generic stock-price moves, consumer promotion stories, or recycled background explainers. Collapse multiple reports of the same underlying event into one candidate.\n\nPreferred source registry (use these when relevant, but you may find better primary/company sources):\n${sourceText}\n\nAvoid these URLs already surfaced previously:\n${priorUrls.slice(-150).join("\n")}\n\nReturn ONLY a JSON array. Each object must have: title, summary (one sentence on why it matters), sourceName, sourceUrl (direct article/disclosure URL), publishedAt if known, suggestedTags (2-6 concise tags). No prose outside JSON.`;
  const text = await response(prompt);
  const rows = JSON.parse(cleanJson(text)) as any[];
  const now = new Date().toISOString();
  return rows.slice(0,10).map((r)=>({
    id: crypto.randomUUID(),
    title: String(r.title || "Untitled"),
    summary: String(r.summary || ""),
    sourceName: String(r.sourceName || "Source"),
    sourceUrl: String(r.sourceUrl || ""),
    publishedAt: r.publishedAt ? String(r.publishedAt) : undefined,
    discoveredAt: now,
    suggestedTags: Array.isArray(r.suggestedTags) ? r.suggestedTags.map(String) : []
  }));
}

export async function generateArticle(candidate: Candidate, tags: CmsTag[]): Promise<Omit<CmsArticle,"id"|"createdAt"|"updatedAt">> {
  const allowed = tags.filter(t=>t.active).map(t=>`${t.id}=${t.name}`).join(", ");
  const prompt = `You are writing a straight English-language business news article for TDR Asia.\n\nSELECTED SOURCE:\nHeadline: ${candidate.title}\nSource: ${candidate.sourceName}\nURL: ${candidate.sourceUrl}\nDiscovery summary: ${candidate.summary}\n\nOpen/read the selected source and write the article from it. Treat that selected source as the factual basis. Do not turn this into a separate fact-checking exercise and do not add unsupported claims. If the source is genuinely inaccessible or contains too little usable information to write an article, return {"error":"SOURCE_UNUSABLE"}.\n\nStyle: generic serious business-news outlet; concise; factual; active verbs; no grand-strategy language; no statecraft; no editorial sermon. Lead with what happened. Preserve numbers, company names and locations from the source.\n\nChoose 2-6 tags ONLY from this allowed tag list (return tag IDs): ${allowed}\n\nReturn ONLY JSON with: title, subheadline, section (one of News, Investment, Companies), body (plain text paragraphs separated by \\n\\n), slug, tagIds, sourceUrls. Set imageUrl/imageAlt/imageCredit to empty strings. Set status to draft.`;
  const text = await response(prompt, process.env.OPENAI_WRITE_MODEL || "gpt-5.6-luna");
  const data = JSON.parse(cleanJson(text));
  if (data.error) throw new Error(data.error);
  return {
    slug: String(data.slug || candidate.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")),
    title: String(data.title || candidate.title),
    subheadline: String(data.subheadline || candidate.summary),
    section: (["News","Investment","Companies"].includes(data.section) ? data.section : "News") as any,
    body: String(data.body || ""),
    imageUrl: "",
    imageAlt: "",
    imageCredit: "",
    tagIds: Array.isArray(data.tagIds) ? data.tagIds.filter((id:string)=>tags.some(t=>t.id===id)) : [],
    sourceUrls: Array.isArray(data.sourceUrls) && data.sourceUrls.length ? data.sourceUrls.map(String) : [candidate.sourceUrl],
    status: "draft",
    candidateId: candidate.id
  };
}

export async function generateSocialDraft(
  story: NewsroomStory,
  source: StorySourceContext,
  channel: DistributionChannel,
): Promise<string> {
  const publicDestination = story.destinationUrl && /^https?:\/\//i.test(story.destinationUrl) ? story.destinationUrl : null;
  const destination = publicDestination
    ? `Destination URL: ${publicDestination}`
    : story.destinationUrl
      ? `Destination page is prepared internally at ${story.destinationUrl}, but the public site base URL is not configured. Do not print this relative path and do not add a link CTA.`
      : "Destination URL: none";
  const sourceLine = source.sourceUrl ? `${source.sourceName || "Source"}: ${source.sourceUrl}` : "No source URL is available; use only the Story facts below.";

  const channelInstruction = channel === "facebook"
    ? `Write a Thai-language Facebook post for the TDR Facebook page. The page covers automobiles, industry/investment and megaprojects. Lead with the strongest concrete fact or number. Make it easy to understand and share. Keep the tone confident, data-led and newsroom-like, not corporate PR and not AI-sounding. Use short paragraphs. Do not invent context, numbers or claims. If a public destination URL exists, end with one natural CTA line pointing readers there. Do not add generic engagement bait. Do not add more than 2 hashtags, and prefer none.`
    : `Write a Thai-language X post for TDR. Make it sharper and more thesis-driven than Facebook: one defensible claim that invites disagreement, followed by the strongest supporting fact. Controlled provocation is good; rage bait, insults and unsupported certainty are not. Keep it concise enough for a normal X post unless the facts truly require a short 2-post thread. Do not invent context, numbers or claims. If a public destination URL exists, include it naturally. No generic engagement bait and no hashtag pile.`;

  const prompt = `You are the social desk inside TDR Super Newsroom.\n\n${channelInstruction}\n\nSTORY\nHeadline: ${story.headline}\nSummary: ${story.summary || ""}\nVertical: ${story.vertical}\n${destination}\n\nSOURCE\n${sourceLine}\nPublished at: ${source.publishedAt || "unknown"}\n\nUse the selected source as the factual basis when it is available. You may open it to understand the facts, but do not wander into unrelated research or turn this into a fact-checking exercise. Preserve exact company names, places and numbers. Return ONLY the finished social copy as plain text. No JSON, no explanation, no labels.`;

  const text = await response(prompt, process.env.OPENAI_WRITE_MODEL || "gpt-5.6-luna", Boolean(source.sourceUrl));
  const copy = text.trim();
  if (!copy) throw new Error("EMPTY_SOCIAL_DRAFT");
  return copy;
}

export type CandidateAutomationScore = {
  candidateId: string;
  growthScore: number;
  routeScore: number;
  vertical: "auto" | "industry" | "mega" | "cross_vertical";
  destinationType: "tdr_auto" | "tdr_asia" | "tdr_mega" | "none";
  reason: string;
};

function clampScore(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

export async function scoreCandidatesForAutomation(candidates: Candidate[]): Promise<CandidateAutomationScore[]> {
  if (!candidates.length) return [];

  const compact = candidates.map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    summary: candidate.summary,
    sourceName: candidate.sourceName,
    publishedAt: candidate.publishedAt || null,
    tags: candidate.suggestedTags,
  }));

  const prompt = `You are the triage desk for TDR Super Newsroom. TDR uses Facebook and X to grow a shared audience and route it into three products: TDR Auto (cars/market/data), TDR Asia (industry/investment), and TDR Mega (infrastructure/megaprojects).\n\nScore each candidate independently.\n\nGrowth score 0-100 = likelihood that a timely Thai-language Facebook/X post can win non-follower attention, shares, discussion or follower growth. Reward concrete numbers, major brands, large investments, surprising changes, strong Thailand relevance, market conflict and freshness. Penalize routine PR, vague policy statements, duplicates and niche items with no hook.\n\nRoute score 0-100 = how naturally interest can be routed into one of TDR Auto / TDR Asia / TDR Mega. This is product fit, not whether a destination URL already exists.\n\nChoose vertical: auto, industry, mega, or cross_vertical. Choose destinationType: tdr_auto, tdr_asia, tdr_mega, or none. Auto includes vehicle launches/prices/market/production. Industry includes manufacturing, investment, electronics, batteries, data centers, corporate expansion. Mega includes rail, road, airports, ports, utilities and major infrastructure.\n\nReturn ONLY a JSON array with exactly one object per candidate: candidateId, growthScore, routeScore, vertical, destinationType, reason. Reason must be one short sentence explaining the score; do not repeat the headline. Do not browse the web; score only what is supplied.\n\nCANDIDATES\n${JSON.stringify(compact)}`;

  const text = await response(prompt, process.env.OPENAI_NEWS_MODEL || "gpt-5.6-luna", false);
  const rows = JSON.parse(cleanJson(text)) as any[];
  const allowedIds = new Set(candidates.map((candidate) => candidate.id));
  const verticals = new Set(["auto", "industry", "mega", "cross_vertical"]);
  const destinations = new Set(["tdr_auto", "tdr_asia", "tdr_mega", "none"]);

  return rows.flatMap((row) => {
    const candidateId = String(row.candidateId || "");
    if (!allowedIds.has(candidateId)) return [];
    const vertical = verticals.has(row.vertical) ? row.vertical : "industry";
    const destinationType = destinations.has(row.destinationType) ? row.destinationType : "tdr_asia";
    return [{
      candidateId,
      growthScore: clampScore(row.growthScore),
      routeScore: clampScore(row.routeScore),
      vertical,
      destinationType,
      reason: String(row.reason || "Automated newsroom triage"),
    } as CandidateAutomationScore];
  });
}

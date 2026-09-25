import type { Candidate, CmsArticle, CmsTag, CmsSource } from "./cms-types";

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
  return rows.slice(0,10).map((r,i)=>({
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

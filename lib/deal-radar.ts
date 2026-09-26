import "server-only";

import type { Candidate, CmsSource } from "./cms-types";

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

async function response(input: string) {
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_NEWS_MODEL || "gpt-5.6-luna",
      store: false,
      tools: [{ type: "web_search" }],
      input,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  return outputText(await res.json());
}

function tags(value: unknown) {
  const base = Array.isArray(value) ? value.map(String) : [];
  return [...new Set(["deal-radar", ...base])].slice(0, 7);
}

export async function discoverDealRadarCandidates(
  sources: CmsSource[],
  priorUrls: string[],
  limit = 2,
): Promise<Candidate[]> {
  const count = Math.max(1, Math.min(2, Math.round(limit)));
  const sourceText = sources
    .filter((source) => source.enabled)
    .sort((a, b) => b.priority - a.priority)
    .map((source) => `${source.name}: ${source.url}`)
    .join("\n");

  const prompt = `You are the Thailand Industry Deal Radar feeding TDR Super Newsroom directly. Search the live public web for the strongest NEW individual corporate deals or company decisions involving Thailand from roughly the last several hours. Return AT MOST ${count} candidates. If fewer than ${count} genuinely strong new items exist, return fewer; never add filler.\n\nPRIORITY 1 — electronics/manufacturing: semiconductors, PCB, EMS, electronic components, data-center hardware, electrical/electronic manufacturing, factories, capacity, supply-chain relocation, JV, procurement, market entry and concrete corporate investment.\n\nPRIORITY 2 — automotive: OEM/supplier investment, new/expanded factories, production or model allocation, EV/HEV/PHEV/ICE manufacturing, distribution deals, material sales/production decisions and supply-chain moves affecting Thailand. Exclude routine consumer promotions and trivial model marketing.\n\nSOURCE PRIORITY: Thai business/industry media and first-party company/regulatory/PR sources first; then Asian business, PR and newswire sources, especially Chinese, Japanese and Korean local-language reporting about a company or deal in Thailand. Search Thai, English, Chinese, Japanese and Korean when useful. Large global outlets are optional, not preferred, unless they are the best source.\n\nEach candidate must be a distinct underlying event. Deduplicate syndicated copies. Prefer the primary or most information-rich source. Capture the concrete company/deal, investment amount or capacity when available, location/factory/model when available, evidence stage (announced/signed/construction/production/launch) and why it matters to a Thailand-focused B2B reader.\n\nPreferred source registry when relevant:\n${sourceText}\n\nDo NOT return any URL already surfaced here:\n${priorUrls.slice(-200).join("\n")}\n\nReturn ONLY a JSON array. Each object must have: title, summary (one concise sentence containing the concrete deal and B2B significance), sourceName, sourceUrl (direct article/disclosure URL), publishedAt if known, suggestedTags (2-6 concise tags). No prose outside JSON.`;

  const text = await response(prompt);
  const rows = JSON.parse(cleanJson(text)) as any[];
  const now = new Date().toISOString();

  return rows
    .slice(0, count)
    .map((row) => ({
      id: crypto.randomUUID(),
      title: String(row.title || "Untitled"),
      summary: String(row.summary || ""),
      sourceName: String(row.sourceName || "Source"),
      sourceUrl: String(row.sourceUrl || ""),
      publishedAt: row.publishedAt ? String(row.publishedAt) : undefined,
      discoveredAt: now,
      suggestedTags: tags(row.suggestedTags),
    }))
    .filter((candidate) => /^https?:\/\//i.test(candidate.sourceUrl));
}

import "server-only";

import { getNewsroomStory, getStorySourceContext, listDistributionItems } from "./newsroom-store";
import { listPerformanceRows } from "./newsroom-performance";

const OPENAI_API = "https://api.openai.com/v1/responses";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export type BreakoutFollowupResult = {
  created: number;
  alreadyExists: boolean;
  candidateIds: string[];
};

function configured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

async function rest<T>(resource: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase server credentials are not configured");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${resource}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...((init.headers || {}) as Record<string, string>),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${init.method || "GET"} ${resource} failed: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function outputText(json: any): string {
  if (typeof json.output_text === "string") return json.output_text;
  const chunks: string[] = [];
  for (const item of json.output || []) {
    for (const content of item.content || []) if (typeof content.text === "string") chunks.push(content.text);
  }
  return chunks.join("\n");
}

function cleanJson(text: string) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function sourceWithAngleFragment(sourceUrl: string, distributionItemId: string, index: number) {
  const base = sourceUrl.split("#")[0];
  return `${base}#tdr-breakout-followup-${distributionItemId}-${index + 1}`;
}

async function generateAngles(input: {
  headline: string;
  summary: string | null;
  channel: "facebook" | "x";
  socialCopy: string;
  postUrl: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  exposureRatio: number;
  views: number;
  reach: number;
  reactions: number;
  comments: number;
  shares: number;
  clicks: number;
  followersGained: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const prompt = `You are the follow-up editor inside TDR Super Newsroom. A social post has materially outperformed its normal channel baseline and is classified BREAKOUT. Generate exactly 4 distinct follow-up story angles while momentum is alive.\n\nDo not invent new facts. Use the original Story and source only as the factual base. The follow-up may be a deeper data breakdown, comparison, consequence, unanswered question, market implication, or adjacent Thailand-specific angle. Each angle must be useful as a new Radar candidate, not merely a rewrite of the winning post. Avoid clickbait and generic "why this matters" filler.\n\nORIGINAL STORY\nHeadline: ${input.headline}\nSummary: ${input.summary || ""}\nSource: ${input.sourceName || "unknown"} ${input.sourceUrl || ""}\n\nWINNING ${input.channel.toUpperCase()} POST\n${input.socialCopy}\nPost URL: ${input.postUrl || "unknown"}\nPerformance: ${input.exposureRatio.toFixed(2)}x baseline; views ${input.views}; reach ${input.reach}; reactions ${input.reactions}; comments ${input.comments}; shares ${input.shares}; clicks ${input.clicks}; followers gained ${input.followersGained}.\n\nReturn ONLY a JSON array of exactly 4 objects. Each object must contain: title, summary, suggestedTags (2-5 concise tags), reason. The title may be analytical but must not assert facts not supplied above. The summary should say concretely what the follow-up would examine. The reason should be one short sentence explaining why this angle extends the breakout rather than repeating it.`;

  const res = await fetch(OPENAI_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_WRITE_MODEL || process.env.OPENAI_NEWS_MODEL || "gpt-5.6-luna",
      store: false,
      input: prompt,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const rows = JSON.parse(cleanJson(outputText(await res.json()))) as any[];
  const angles = rows.slice(0, 4).map((row, index) => ({
    angleKey: `angle-${index + 1}`,
    title: String(row.title || "Breakout follow-up").trim(),
    summary: String(row.summary || "Follow up the breakout with a deeper angle.").trim(),
    suggestedTags: Array.isArray(row.suggestedTags) ? row.suggestedTags.map(String).slice(0, 5) : [],
    reason: String(row.reason || "Extends the breakout without repeating the original post.").trim(),
  }));
  if (angles.length !== 4) throw new Error("FOLLOWUP_GENERATION_INCOMPLETE");
  return angles;
}

export async function generateBreakoutFollowups(distributionItemId: string): Promise<BreakoutFollowupResult> {
  if (!configured()) throw new Error("Supabase server credentials are not configured");

  const performance = await listPerformanceRows();
  const winner = performance.find((item) => item.distributionItemId === distributionItemId);
  if (!winner) throw new Error("POSTED_OUTPUT_NOT_FOUND");
  if (winner.performanceClass !== "breakout" || winner.exposureRatio === null || !winner.latest) {
    throw new Error("FOLLOWUPS_REQUIRE_BREAKOUT");
  }

  const duplicatePrefix = `breakout:${distributionItemId}:`;
  const existing = await rest<any[]>("candidates?select=id,duplicate_key&duplicate_key=not.is.null");
  const existingIds = existing
    .filter((row) => typeof row.duplicate_key === "string" && row.duplicate_key.startsWith(duplicatePrefix))
    .map((row) => String(row.id));
  if (existingIds.length) return { created: 0, alreadyExists: true, candidateIds: existingIds };

  const story = await getNewsroomStory(winner.storyId);
  if (!story) throw new Error("STORY_NOT_FOUND");
  const source = await getStorySourceContext(story.candidateId);
  const distributions = await listDistributionItems(story.id);
  const distribution = distributions.find((item) => item.id === distributionItemId);
  if (!distribution) throw new Error("DISTRIBUTION_ITEM_NOT_FOUND");

  const factualSourceUrl = source.sourceUrl || winner.postUrl;
  if (!factualSourceUrl || !/^https?:\/\//i.test(factualSourceUrl)) throw new Error("FOLLOWUP_SOURCE_URL_MISSING");

  const angles = await generateAngles({
    headline: story.headline,
    summary: story.summary,
    channel: winner.channel,
    socialCopy: distribution.copy,
    postUrl: winner.postUrl,
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    exposureRatio: winner.exposureRatio,
    views: winner.latest.views,
    reach: winner.latest.reach,
    reactions: winner.latest.reactions,
    comments: winner.latest.comments,
    shares: winner.latest.shares,
    clicks: winner.latest.clicks,
    followersGained: winner.latest.followersGained,
  });

  const now = new Date().toISOString();
  const rows = angles.map((angle, index) => ({
    id: crypto.randomUUID(),
    headline: angle.title,
    summary: angle.summary,
    source_name: `Breakout follow-up · ${source.sourceName || winner.channel}`,
    source_url: sourceWithAngleFragment(factualSourceUrl, distributionItemId, index),
    published_at: source.publishedAt || winner.postedAt || null,
    status: "new",
    duplicate_key: `${duplicatePrefix}${angle.angleKey}`,
    raw_metadata: {
      suggestedTags: Array.from(new Set(["follow-up", "breakout", ...angle.suggestedTags])),
      originType: "breakout_followup",
      followupParentStoryId: story.id,
      followupParentDistributionItemId: distributionItemId,
      followupAngleKey: angle.angleKey,
      followupReason: angle.reason,
      breakoutExposureRatio: winner.exposureRatio,
      breakoutChannel: winner.channel,
      breakoutPostUrl: winner.postUrl,
    },
    created_at: now,
    updated_at: now,
  }));

  const inserted = await rest<any[]>("candidates?on_conflict=source_url", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });

  return {
    created: inserted.length,
    alreadyExists: false,
    candidateIds: inserted.map((row) => String(row.id)),
  };
}

import "server-only";

export type NewsroomStory = {
  id: string;
  candidateId: string;
  headline: string;
  summary: string | null;
  vertical: "unassigned" | "auto" | "industry" | "mega" | "cross_vertical";
  destinationType: "tdr_auto" | "tdr_asia" | "tdr_mega" | "none" | null;
  destinationUrl: string | null;
  status: "draft" | "ready" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type NewsroomStoryUpdate = Pick<
  NewsroomStory,
  "headline" | "summary" | "vertical" | "destinationType" | "destinationUrl"
>;

export type DistributionChannel = "facebook" | "x";
export type DistributionStatus = "draft" | "ready" | "posted";

export type DistributionItem = {
  id: string;
  storyId: string;
  channel: DistributionChannel;
  copy: string;
  status: DistributionStatus;
  destinationUrl: string | null;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QueueItem = DistributionItem & {
  storyHeadline: string;
  storyVertical: NewsroomStory["vertical"];
  storyDestinationType: NewsroomStory["destinationType"];
};

export type StorySourceContext = {
  sourceName: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
};

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

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

function mapStory(row: any): NewsroomStory {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    headline: row.headline,
    summary: row.summary ?? null,
    vertical: row.vertical,
    destinationType: row.destination_type ?? null,
    destinationUrl: row.destination_url ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDistributionItem(row: any): DistributionItem {
  return {
    id: row.id,
    storyId: row.story_id,
    channel: row.channel,
    copy: row.copy || "",
    status: row.status,
    destinationUrl: row.destination_url ?? null,
    generatedAt: row.generated_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listNewsroomStories(): Promise<NewsroomStory[]> {
  if (!configured()) return [];
  const rows = await rest<any[]>("stories?select=*&order=created_at.desc");
  return rows.map(mapStory);
}

export async function getNewsroomStory(storyId: string): Promise<NewsroomStory | null> {
  if (!configured()) return null;
  const rows = await rest<any[]>(`stories?select=*&id=eq.${encodeURIComponent(storyId)}&limit=1`);
  return rows[0] ? mapStory(rows[0]) : null;
}

export async function getStorySourceContext(candidateId: string): Promise<StorySourceContext> {
  const rows = await rest<any[]>(`candidates?select=source_name,source_url,published_at&id=eq.${encodeURIComponent(candidateId)}&limit=1`);
  const row = rows[0] || {};
  return {
    sourceName: row.source_name ?? null,
    sourceUrl: row.source_url ?? null,
    publishedAt: row.published_at ?? null,
  };
}

export async function updateNewsroomStory(storyId: string, update: NewsroomStoryUpdate): Promise<NewsroomStory> {
  const rows = await rest<any[]>(`stories?id=eq.${encodeURIComponent(storyId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      headline: update.headline,
      summary: update.summary || null,
      vertical: update.vertical,
      destination_type: update.destinationType,
      destination_url: update.destinationUrl || null,
    }),
  });

  if (!rows[0]) throw new Error("Story not found");
  return mapStory(rows[0]);
}

export async function listDistributionItems(storyId: string): Promise<DistributionItem[]> {
  if (!configured()) return [];
  const rows = await rest<any[]>(`distribution_items?select=*&story_id=eq.${encodeURIComponent(storyId)}&order=channel.asc`);
  return rows.map(mapDistributionItem);
}

export async function listQueueItems(): Promise<QueueItem[]> {
  if (!configured()) return [];
  const [rows, stories] = await Promise.all([
    rest<any[]>("distribution_items?select=*&order=updated_at.desc"),
    listNewsroomStories(),
  ]);
  const storyById = new Map(stories.map((story) => [story.id, story]));
  return rows.flatMap((row) => {
    if (row.status === "posted") return [];
    const story = storyById.get(row.story_id);
    if (!story) return [];
    return [{
      ...mapDistributionItem(row),
      storyHeadline: story.headline,
      storyVertical: story.vertical,
      storyDestinationType: story.destinationType,
    } satisfies QueueItem];
  });
}

export async function saveDistributionItem(
  storyId: string,
  channel: DistributionChannel,
  copy: string,
  destinationUrl: string | null,
  generated = false,
): Promise<DistributionItem> {
  const rows = await rest<any[]>("distribution_items?on_conflict=story_id,channel", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      story_id: storyId,
      channel,
      copy,
      status: "draft",
      destination_url: destinationUrl || null,
      ...(generated ? { generated_at: new Date().toISOString() } : {}),
    }),
  });
  if (!rows[0]) throw new Error("Distribution draft was not saved");
  return mapDistributionItem(rows[0]);
}

export async function updateDistributionStatus(
  storyId: string,
  channel: DistributionChannel,
  status: Extract<DistributionStatus, "draft" | "ready">,
): Promise<DistributionItem> {
  const rows = await rest<any[]>(
    `distribution_items?story_id=eq.${encodeURIComponent(storyId)}&channel=eq.${encodeURIComponent(channel)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status }),
    },
  );
  if (!rows[0]) throw new Error("Distribution draft not found");
  return mapDistributionItem(rows[0]);
}

export async function createStoryFromCandidate(candidateId: string): Promise<NewsroomStory> {
  const existing = await rest<any[]>(`stories?select=*&candidate_id=eq.${encodeURIComponent(candidateId)}&limit=1`);
  if (existing[0]) return mapStory(existing[0]);

  const candidates = await rest<any[]>(`candidates?select=id,headline,summary&id=eq.${encodeURIComponent(candidateId)}&limit=1`);
  const candidate = candidates[0];
  if (!candidate) throw new Error("Candidate not found");

  const rows = await rest<any[]>("stories?on_conflict=candidate_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({
      candidate_id: candidate.id,
      headline: candidate.headline,
      summary: candidate.summary || null,
      status: "draft",
    }),
  });

  if (rows[0]) return mapStory(rows[0]);
  const afterConflict = await rest<any[]>(`stories?select=*&candidate_id=eq.${encodeURIComponent(candidateId)}&limit=1`);
  if (!afterConflict[0]) throw new Error("Story was not created");
  return mapStory(afterConflict[0]);
}

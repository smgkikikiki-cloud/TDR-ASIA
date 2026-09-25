import "server-only";

export type PerformanceClass = "learning" | "dead" | "normal" | "rising" | "breakout";

export type PerformanceSnapshotInput = {
  views?: number;
  reach?: number;
  reactions?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  followersGained?: number;
};

export type PerformanceRow = {
  distributionItemId: string;
  storyId: string;
  storyHeadline: string;
  channel: "facebook" | "x";
  postUrl: string | null;
  postedAt: string | null;
  latest: null | {
    id: string;
    capturedAt: string;
    views: number;
    reach: number;
    reactions: number;
    comments: number;
    shares: number;
    clicks: number;
    followersGained: number;
  };
  baselineExposure: number | null;
  exposureRatio: number | null;
  performanceClass: PerformanceClass;
};

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

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

function n(value: unknown) {
  const x = Number(value || 0);
  return Number.isFinite(x) && x >= 0 ? Math.round(x) : 0;
}

function exposure(snapshot: any) {
  return Math.max(n(snapshot?.views), n(snapshot?.reach));
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function classify(ratio: number | null, hasBaseline: boolean): PerformanceClass {
  if (!hasBaseline || ratio === null) return "learning";
  if (ratio < 0.5) return "dead";
  if (ratio < 1.5) return "normal";
  if (ratio < 3) return "rising";
  return "breakout";
}

export async function markDistributionPosted(distributionItemId: string, postUrl: string) {
  const url = postUrl.trim();
  if (!/^https?:\/\//i.test(url)) throw new Error("POST_URL_MUST_BE_ABSOLUTE");
  const rows = await rest<any[]>(`distribution_items?id=eq.${encodeURIComponent(distributionItemId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "posted", post_url: url, posted_at: new Date().toISOString() }),
  });
  if (!rows[0]) throw new Error("Distribution item not found");
  return rows[0];
}

export async function addPerformanceSnapshot(distributionItemId: string, input: PerformanceSnapshotInput) {
  const rows = await rest<any[]>("performance_snapshots", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      distribution_item_id: distributionItemId,
      views: n(input.views),
      reach: n(input.reach),
      reactions: n(input.reactions),
      comments: n(input.comments),
      shares: n(input.shares),
      clicks: n(input.clicks),
      followers_gained: n(input.followersGained),
    }),
  });
  if (!rows[0]) throw new Error("Performance snapshot was not saved");
  return rows[0];
}

export async function listPerformanceRows(): Promise<PerformanceRow[]> {
  const [items, stories, snapshots] = await Promise.all([
    rest<any[]>("distribution_items?select=id,story_id,channel,status,post_url,posted_at,updated_at&status=eq.posted&order=posted_at.desc"),
    rest<any[]>("stories?select=id,headline"),
    rest<any[]>("performance_snapshots?select=*&order=captured_at.desc"),
  ]);

  const storyById = new Map(stories.map((story) => [story.id, story]));
  const latestByItem = new Map<string, any>();
  for (const snapshot of snapshots) if (!latestByItem.has(snapshot.distribution_item_id)) latestByItem.set(snapshot.distribution_item_id, snapshot);

  const exposureByChannel: Record<string, Array<{ id: string; exposure: number }>> = { facebook: [], x: [] };
  for (const item of items) {
    const latest = latestByItem.get(item.id);
    if (latest) exposureByChannel[item.channel]?.push({ id: item.id, exposure: exposure(latest) });
  }

  return items.map((item) => {
    const latest = latestByItem.get(item.id) || null;
    const peerValues = (exposureByChannel[item.channel] || []).filter((peer) => peer.id !== item.id).map((peer) => peer.exposure).filter((value) => value > 0);
    const baseline = peerValues.length >= 3 ? median(peerValues) : null;
    const currentExposure = latest ? exposure(latest) : 0;
    const ratio = baseline && baseline > 0 && currentExposure > 0 ? currentExposure / baseline : null;
    const performanceClass = classify(ratio, baseline !== null);
    const story = storyById.get(item.story_id);
    return {
      distributionItemId: item.id,
      storyId: item.story_id,
      storyHeadline: story?.headline || "Untitled story",
      channel: item.channel,
      postUrl: item.post_url ?? null,
      postedAt: item.posted_at ?? null,
      latest: latest ? {
        id: latest.id,
        capturedAt: latest.captured_at,
        views: n(latest.views),
        reach: n(latest.reach),
        reactions: n(latest.reactions),
        comments: n(latest.comments),
        shares: n(latest.shares),
        clicks: n(latest.clicks),
        followersGained: n(latest.followers_gained),
      } : null,
      baselineExposure: baseline,
      exposureRatio: ratio,
      performanceClass,
    } satisfies PerformanceRow;
  });
}

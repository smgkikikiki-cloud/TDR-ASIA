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

export async function listNewsroomStories(): Promise<NewsroomStory[]> {
  if (!configured()) return [];
  const rows = await rest<any[]>("stories?select=*&order=created_at.desc");
  return rows.map(mapStory);
}

export async function createStoryFromCandidate(candidateId: string): Promise<NewsroomStory> {
  const existing = await rest<any[]>(`stories?select=*&candidate_id=eq.${encodeURIComponent(candidateId)}&limit=1`);
  if (existing[0]) return mapStory(existing[0]);

  const candidates = await rest<any[]>(`candidates?select=id,headline,summary&id=eq.${encodeURIComponent(candidateId)}&limit=1`);
  const candidate = candidates[0];
  if (!candidate) throw new Error("Candidate not found");

  const rows = await rest<any[]>("stories", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      candidate_id: candidate.id,
      headline: candidate.headline,
      summary: candidate.summary || null,
      status: "draft",
    }),
  });

  if (!rows[0]) throw new Error("Story was not created");
  return mapStory(rows[0]);
}

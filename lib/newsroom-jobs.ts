import "server-only";

import type { Candidate } from "./cms-types";

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

type JobRow = {
  id: string;
  candidate_id: string | null;
  status: "queued" | "running" | "completed" | "failed";
  attempts: number;
};

export type NewsroomJobBatch = {
  jobs: JobRow[];
  candidates: Candidate[];
};

export async function enqueueNewsroomCandidateJobs(candidates: Candidate[]) {
  if (!configured() || !candidates.length) return { queued: 0 };

  const ids = candidates.map((candidate) => candidate.id);
  const inFilter = ids.map((id) => `"${id}"`).join(",");
  const persisted = await rest<any[]>(`candidates?select=id&id=in.(${encodeURIComponent(inFilter)})`);
  const persistedIds = new Set(persisted.map((row) => String(row.id)));
  const existing = await rest<any[]>(`automation_jobs?select=candidate_id&job_type=eq.newsroom&candidate_id=in.(${encodeURIComponent(inFilter)})`);
  const existingIds = new Set(existing.map((row) => String(row.candidate_id)));

  const rows = candidates
    .filter((candidate) => persistedIds.has(candidate.id) && !existingIds.has(candidate.id))
    .map((candidate) => ({
      job_type: "newsroom",
      status: "queued",
      candidate_id: candidate.id,
      payload: { discoveredAt: candidate.discoveredAt },
    }));

  if (!rows.length) return { queued: 0 };
  await rest("automation_jobs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  return { queued: rows.length };
}

export async function claimNewsroomJobBatch(limit = 10): Promise<NewsroomJobBatch> {
  if (!configured()) return { jobs: [], candidates: [] };
  const safeLimit = Math.max(1, Math.min(10, Math.round(limit)));
  const jobs = await rest<JobRow[]>(`automation_jobs?select=id,candidate_id,status,attempts&job_type=eq.newsroom&status=eq.queued&run_after=lte.${encodeURIComponent(new Date().toISOString())}&order=created_at.asc&limit=${safeLimit}`);
  if (!jobs.length) return { jobs: [], candidates: [] };

  const now = new Date().toISOString();
  await Promise.all(jobs.map((job) => rest(`automation_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.queued`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "running", started_at: now, attempts: (job.attempts || 0) + 1, error_message: null }),
  })));

  const ids = jobs.map((job) => job.candidate_id).filter(Boolean) as string[];
  if (!ids.length) return { jobs, candidates: [] };
  const inFilter = ids.map((id) => `"${id}"`).join(",");
  const rows = await rest<any[]>(`candidates?select=*&id=in.(${encodeURIComponent(inFilter)})`);
  const candidates: Candidate[] = rows.map((r) => ({
    id: r.id,
    title: r.headline,
    summary: r.summary || "",
    sourceName: r.source_name || "Source",
    sourceUrl: r.source_url,
    publishedAt: r.published_at || undefined,
    discoveredAt: r.created_at,
    suggestedTags: Array.isArray(r.raw_metadata?.suggestedTags) ? r.raw_metadata.suggestedTags.map(String) : [],
    selected: r.status === "selected",
    generated: r.status === "generated",
    ignored: r.status === "ignored",
  }));
  return { jobs, candidates };
}

export async function completeNewsroomJobs(jobIds: string[], result: unknown) {
  if (!configured() || !jobIds.length) return;
  const completedAt = new Date().toISOString();
  await Promise.all(jobIds.map((id) => rest(`automation_jobs?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "completed", result, completed_at: completedAt }),
  })));
}

export async function failNewsroomJobs(jobIds: string[], error: string) {
  if (!configured() || !jobIds.length) return;
  const completedAt = new Date().toISOString();
  await Promise.all(jobIds.map((id) => rest(`automation_jobs?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "failed", error_message: error, completed_at: completedAt }),
  })));
}

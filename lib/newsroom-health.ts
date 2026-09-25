import "server-only";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

function configured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

async function rest<T>(resource: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase server credentials are not configured");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${resource}`, {
    cache: "no-store",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase GET ${resource} failed: ${res.status} ${await res.text()}`);
  return await res.json() as T;
}

export type HealthAttention = {
  kind: "failed" | "stuck" | "partial" | "routing";
  title: string;
  detail: string;
  storyId?: string;
  candidateId?: string;
  jobId?: string;
  createdAt?: string;
};

export type NewsroomHealth = {
  queued: number;
  running: number;
  failed: number;
  completed24h: number;
  promoted24h: number;
  generatedDrafts24h: number;
  lastDiscoveryAt: string | null;
  lastWorkerAt: string | null;
  attention: HealthAttention[];
};

export async function getNewsroomHealth(): Promise<NewsroomHealth> {
  if (!configured()) {
    return {
      queued: 0,
      running: 0,
      failed: 0,
      completed24h: 0,
      promoted24h: 0,
      generatedDrafts24h: 0,
      lastDiscoveryAt: null,
      lastWorkerAt: null,
      attention: [],
    };
  }

  const [jobs, runs, stories, distribution, articles] = await Promise.all([
    rest<any[]>("automation_jobs?select=id,status,candidate_id,attempts,error_message,result,created_at,started_at,completed_at&job_type=eq.newsroom&order=created_at.desc"),
    rest<any[]>("discovery_runs?select=started_at,completed_at&order=started_at.desc&limit=1"),
    rest<any[]>("stories?select=id,candidate_id,headline,destination_type,destination_url,auto_promoted_at,created_at&order=created_at.desc"),
    rest<any[]>("distribution_items?select=id,story_id,status,generated_at,created_at&order=created_at.desc"),
    rest<any[]>("articles?select=id,source_candidate_id,status,slug,updated_at&source_candidate_id=not.is.null"),
  ]);

  const now = Date.now();
  const since24h = now - 24 * 60 * 60 * 1000;
  const staleBefore = now - 30 * 60 * 1000;
  const inLast24h = (value?: string | null) => Boolean(value && new Date(value).getTime() >= since24h);

  const queued = jobs.filter((job) => job.status === "queued").length;
  const running = jobs.filter((job) => job.status === "running").length;
  const failed = jobs.filter((job) => job.status === "failed" && inLast24h(job.completed_at || job.created_at)).length;
  const completed24h = jobs.filter((job) => job.status === "completed" && inLast24h(job.completed_at)).length;
  const promoted24h = stories.filter((story) => inLast24h(story.auto_promoted_at)).length;
  const generatedDrafts24h = distribution.filter((item) => inLast24h(item.generated_at)).length;
  const articleByCandidateId = new Map(articles.map((article) => [article.source_candidate_id, article]));

  const attention: HealthAttention[] = [];

  for (const job of jobs.filter((row) => row.status === "failed" && inLast24h(row.completed_at || row.created_at)).slice(0, 5)) {
    attention.push({
      kind: "failed",
      title: "Newsroom job failed",
      detail: job.error_message || `Candidate ${job.candidate_id || "unknown"} failed after ${job.attempts || 0} attempt(s).`,
      candidateId: job.candidate_id || undefined,
      jobId: job.id,
      createdAt: job.completed_at || job.created_at,
    });
  }

  for (const job of jobs.filter((row) => row.status === "running" && row.started_at && new Date(row.started_at).getTime() < staleBefore).slice(0, 5)) {
    attention.push({
      kind: "stuck",
      title: "Worker may be stuck",
      detail: `Job has been running for more than 30 minutes (attempt ${job.attempts || 1}).`,
      candidateId: job.candidate_id || undefined,
      jobId: job.id,
      createdAt: job.started_at,
    });
  }

  for (const job of jobs.filter((row) => row.status === "completed" && inLast24h(row.completed_at) && Array.isArray(row.result?.errors) && row.result.errors.length).slice(0, 5)) {
    const first = job.result.errors[0];
    attention.push({
      kind: "partial",
      title: "Automation completed with an error",
      detail: `${first?.stage || "automation"}: ${first?.error || "One or more outputs failed"}`,
      candidateId: first?.candidateId && first.candidateId !== "batch" ? first.candidateId : (job.candidate_id || undefined),
      jobId: job.id,
      createdAt: job.completed_at || job.created_at,
    });
  }

  for (const story of stories.filter((row) => row.auto_promoted_at && row.destination_type && row.destination_type !== "none" && !row.destination_url).slice(0, 8)) {
    const megaUnmatched = story.destination_type === "tdr_mega";
    attention.push({
      kind: "routing",
      title: megaUnmatched ? "TDR Mega catalog has no confident project match" : "Destination URL missing",
      detail: megaUnmatched
        ? `${story.headline} → add/verify the project in Mega before routing traffic.`
        : `${story.headline} → ${story.destination_type}`,
      storyId: story.id,
      candidateId: story.candidate_id,
      createdAt: story.auto_promoted_at || story.created_at,
    });
  }

  for (const story of stories.filter((row) => row.destination_type === "tdr_auto" && typeof row.destination_url === "string" && row.destination_url.startsWith("/")).slice(0, 8)) {
    attention.push({
      kind: "routing",
      title: "TDR Auto model matched; public base URL missing",
      detail: `${story.headline} → ${story.destination_url}. Set TDR_AUTO_SITE_URL before using the destination as a social CTA.`,
      storyId: story.id,
      candidateId: story.candidate_id,
      createdAt: story.auto_promoted_at || story.created_at,
    });
  }

  for (const story of stories.filter((row) => row.destination_type === "tdr_mega" && typeof row.destination_url === "string" && row.destination_url.startsWith("/")).slice(0, 8)) {
    attention.push({
      kind: "routing",
      title: "TDR Mega project matched; public base URL missing",
      detail: `${story.headline} → ${story.destination_url}. Set SITE_URL or TDR_MEGA_SITE_URL before using the destination as a social CTA.`,
      storyId: story.id,
      candidateId: story.candidate_id,
      createdAt: story.auto_promoted_at || story.created_at,
    });
  }

  for (const story of stories.filter((row) => row.destination_type === "tdr_asia" && row.destination_url).slice(0, 12)) {
    const article = articleByCandidateId.get(story.candidate_id);
    if (!article || article.status === "published") continue;
    attention.push({
      kind: "routing",
      title: "TDR Asia article draft waiting publish",
      detail: `${story.headline} → /story/${article.slug}`,
      storyId: story.id,
      candidateId: story.candidate_id,
      createdAt: article.updated_at || story.auto_promoted_at || story.created_at,
    });
  }

  attention.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const workerTimestamps = jobs
    .map((job) => job.completed_at || job.started_at || job.created_at)
    .filter(Boolean)
    .sort()
    .reverse();

  return {
    queued,
    running,
    failed,
    completed24h,
    promoted24h,
    generatedDrafts24h,
    lastDiscoveryAt: runs[0]?.completed_at || runs[0]?.started_at || null,
    lastWorkerAt: workerTimestamps[0] || null,
    attention: attention.slice(0, 12),
  };
}

import "server-only";

const FALLBACK_TDR_AUTO_SUPABASE_URL = "https://ltvwzkffmpudpjfjomrg.supabase.co";
const FALLBACK_TDR_AUTO_PUBLISHABLE_KEY = "sb_publishable_bFWJkCQOyVU07PYMebjLgQ_yfb6bgQX";

const TDR_AUTO_SUPABASE_URL = (process.env.TDR_AUTO_SUPABASE_URL || FALLBACK_TDR_AUTO_SUPABASE_URL).replace(/\/$/, "");
const TDR_AUTO_PUBLISHABLE_KEY = process.env.TDR_AUTO_SUPABASE_PUBLISHABLE_KEY || FALLBACK_TDR_AUTO_PUBLISHABLE_KEY;

export type TdrAutoModel = {
  canonicalId: string;
  slug: string;
  nameEn: string;
  nameTh: string | null;
  brandEn: string | null;
  brandTh: string | null;
  status: string | null;
};

export type TdrAutoMatch = {
  model: TdrAutoModel;
  score: number;
  reason: string;
};

let cache: { expiresAt: number; rows: TdrAutoModel[] } | null = null;

function normalize(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function containsPhrase(haystack: string, needle: string) {
  if (!needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function singleToken(value: string) {
  return Boolean(value) && !value.includes(" ");
}

function brandNames(row: TdrAutoModel) {
  return [normalize(row.brandEn), normalize(row.brandTh)].filter(Boolean);
}

function modelNames(row: TdrAutoModel) {
  return [normalize(row.nameEn), normalize(row.nameTh)].filter(Boolean);
}

function rowFromApi(row: any): TdrAutoModel | null {
  const slug = String(row.slug || "").trim();
  const canonicalId = String(row.canonical_id || "").trim();
  const nameEn = String(row.name_en || "").trim();
  if (!slug || !canonicalId || !nameEn) return null;
  const brand = row.payload?.brand || {};
  return {
    canonicalId,
    slug,
    nameEn,
    nameTh: row.name_th ? String(row.name_th) : null,
    brandEn: brand.name_en ? String(brand.name_en) : null,
    brandTh: brand.name_th ? String(brand.name_th) : null,
    status: row.status ? String(row.status) : null,
  };
}

export async function listTdrAutoModels(): Promise<TdrAutoModel[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.rows;

  const query = new URLSearchParams({
    select: "canonical_id,slug,name_en,name_th,status,payload",
    limit: "600",
  });
  const res = await fetch(`${TDR_AUTO_SUPABASE_URL}/rest/v1/current_vehicle_models?${query.toString()}`, {
    cache: "no-store",
    headers: {
      apikey: TDR_AUTO_PUBLISHABLE_KEY,
      Authorization: `Bearer ${TDR_AUTO_PUBLISHABLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`TDR_AUTO_CATALOG_UNAVAILABLE:${res.status}`);

  const raw = await res.json() as any[];
  const rows = raw.flatMap((row) => {
    const mapped = rowFromApi(row);
    return mapped ? [mapped] : [];
  });
  cache = { expiresAt: Date.now() + 10 * 60 * 1000, rows };
  return rows;
}

export async function resolveTdrAutoModel(headline: string, summary?: string | null): Promise<TdrAutoMatch | null> {
  const rows = await listTdrAutoModels();
  const headlineNorm = normalize(headline);
  const summaryNorm = normalize(summary);
  const combined = `${headlineNorm} ${summaryNorm}`.trim();

  const scored = rows.flatMap((row) => {
    const names = modelNames(row);
    const brands = brandNames(row);
    const headlineModel = names.some((name) => containsPhrase(headlineNorm, name));
    const summaryModel = names.some((name) => containsPhrase(summaryNorm, name));
    if (!headlineModel && !summaryModel) return [];

    const brandInHeadline = brands.some((brand) => containsPhrase(headlineNorm, brand));
    const brandInSummary = brands.some((brand) => containsPhrase(summaryNorm, brand));
    const brandPresent = brandInHeadline || brandInSummary;
    const matchedName = names.find((name) => containsPhrase(combined, name)) || "";

    // One-token model names are often ordinary words or short alphanumerics.
    // Require the canonical brand as a guard against false positives such as
    // "City", "Seal" or numeric model names appearing in unrelated copy.
    if (singleToken(matchedName) && !brandPresent) return [];

    let score = 0;
    if (headlineModel) score += 100;
    if (summaryModel) score += 45;
    if (brandInHeadline) score += 45;
    if (brandInSummary) score += 20;

    const joined = brands.flatMap((brand) => names.map((name) => `${brand} ${name}`));
    if (joined.some((phrase) => containsPhrase(headlineNorm, phrase))) score += 60;
    else if (joined.some((phrase) => containsPhrase(summaryNorm, phrase))) score += 30;

    return [{
      model: row,
      score,
      reason: `${brandPresent ? "brand + " : ""}canonical model name matched newsroom text`,
    } satisfies TdrAutoMatch];
  }).sort((a, b) => b.score - a.score || a.model.slug.localeCompare(b.model.slug));

  const best = scored[0];
  if (!best || best.score < 100) return null;
  const second = scored[1];
  if (second && best.score - second.score < 20) return null;
  return best;
}

import "server-only";

import { megaProjects, type MegaProject } from "./mega-data";

export type MegaProjectMatch = {
  project: MegaProject;
  score: number;
  matchedAlias: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[–—-]/g, " ")
    .replace(/[^a-z0-9ก-๙]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const aliases: Record<string, string[]> = {
  "eec-hsr": [
    "high speed rail linking three airports",
    "three airports high speed rail",
    "3 airports high speed rail",
    "don mueang suvarnabhumi utapao",
    "don mueang suvarnabhumi u tapao",
    "รถไฟความเร็วสูงเชื่อมสามสนามบิน",
    "รถไฟความเร็วสูงเชื่อม 3 สนามบิน",
  ],
  "one-bangkok": [
    "one bangkok",
    "วัน แบงค็อก",
  ],
  landbridge: [
    "southern land bridge",
    "southern landbridge",
    "ranong chumphon land bridge",
    "ranong chumphon landbridge",
    "land bridge ranong chumphon",
    "แลนด์บริดจ์ ระนอง ชุมพร",
    "แลนด์บริดจ์",
  ],
  "google-data-center": [
    "google data center thailand",
    "google thailand data center",
    "google data centre thailand",
    "google data center chonburi",
    "google data centre chonburi",
    "ศูนย์ข้อมูล google",
    "ดาต้าเซ็นเตอร์ google",
  ],
};

function projectAliases(project: MegaProject) {
  return [project.name, project.slug.replace(/-/g, " "), ...(aliases[project.slug] || [])]
    .map(normalize)
    .filter(Boolean);
}

export function resolveTdrMegaProject(headline: string, summary?: string | null): MegaProjectMatch | null {
  const text = normalize(`${headline} ${summary || ""}`);
  if (!text) return null;

  const matches = megaProjects.flatMap((project) => {
    const hit = projectAliases(project)
      .map((alias) => ({ alias, score: alias.length }))
      .filter(({ alias }) => text.includes(alias))
      .sort((a, b) => b.score - a.score)[0];
    if (!hit) return [];

    // "แลนด์บริดจ์" alone is common enough that we also require one of the
    // programme's geographic/Thailand cues before routing automatically.
    if (project.slug === "landbridge" && hit.alias === normalize("แลนด์บริดจ์")) {
      const hasContext = ["ระนอง", "ชุมพร", "ไทย", "thailand", "ranong", "chumphon"].some((cue) => text.includes(normalize(cue)));
      if (!hasContext) return [];
    }

    return [{ project, score: hit.score, matchedAlias: hit.alias } satisfies MegaProjectMatch];
  }).sort((a, b) => b.score - a.score);

  if (!matches.length) return null;
  if (matches[1] && matches[0].score - matches[1].score < 4) return null;
  return matches[0];
}

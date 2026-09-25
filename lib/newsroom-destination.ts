import "server-only";

import { readCms, writeCms } from "./cms-store";
import { generateArticle } from "./openai-newsroom";
import { resolveTdrAutoModel } from "./tdr-auto-catalog";
import { resolveTdrMegaProject } from "./tdr-mega-catalog";
import { updateNewsroomStory, type NewsroomStory } from "./newsroom-store";

export type DestinationResolution = {
  story: NewsroomStory;
  resolved: boolean;
  createdArticle: boolean;
  articleId?: string;
  articleSlug?: string;
  autoCanonicalId?: string;
  autoModelSlug?: string;
  megaProjectSlug?: string;
};

function uniqueSlug(base: string, existing: string[]) {
  const root = base || `story-${Date.now()}`;
  if (!existing.includes(root)) return root;
  let i = 2;
  while (existing.includes(`${root}-${i}`)) i++;
  return `${root}-${i}`;
}

function tdrAsiaStoryUrl(slug: string) {
  const path = `/story/${slug}`;
  const base = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

function tdrAutoModelUrl(slug: string) {
  const path = `/models/${slug}`;
  const base = (process.env.TDR_AUTO_SITE_URL || "").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

function tdrMegaProjectUrl(slug: string) {
  const path = `/mega/projects/${slug}`;
  const base = (process.env.TDR_MEGA_SITE_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

async function saveDestination(story: NewsroomStory, destinationUrl: string) {
  return updateNewsroomStory(story.id, {
    headline: story.headline,
    summary: story.summary,
    vertical: story.vertical,
    destinationType: story.destinationType,
    destinationUrl,
  });
}

async function resolveTdrAsia(story: NewsroomStory): Promise<DestinationResolution> {
  const state = await readCms();
  let article = state.articles.find((item) => item.candidateId === story.candidateId);
  let createdArticle = false;

  if (!article) {
    const candidate = state.candidates.find((item) => item.id === story.candidateId);
    if (!candidate) throw new Error("DESTINATION_CANDIDATE_NOT_FOUND");

    const generated = await generateArticle(candidate, state.tags);
    const now = new Date().toISOString();
    const slug = uniqueSlug(generated.slug, state.articles.map((item) => item.slug));
    article = {
      ...generated,
      slug,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    state.articles.unshift(article);
    candidate.generated = true;
    await writeCms(state);
    createdArticle = true;
  }

  const updatedStory = await saveDestination(story, tdrAsiaStoryUrl(article.slug));
  return {
    story: updatedStory,
    resolved: true,
    createdArticle,
    articleId: article.id,
    articleSlug: article.slug,
  };
}

async function resolveTdrAuto(story: NewsroomStory): Promise<DestinationResolution> {
  const match = await resolveTdrAutoModel(story.headline, story.summary);
  if (!match) return { story, resolved: false, createdArticle: false };

  const updatedStory = await saveDestination(story, tdrAutoModelUrl(match.model.slug));
  return {
    story: updatedStory,
    resolved: true,
    createdArticle: false,
    autoCanonicalId: match.model.canonicalId,
    autoModelSlug: match.model.slug,
  };
}

async function resolveTdrMega(story: NewsroomStory): Promise<DestinationResolution> {
  const match = resolveTdrMegaProject(story.headline, story.summary);
  if (!match) return { story, resolved: false, createdArticle: false };

  const updatedStory = await saveDestination(story, tdrMegaProjectUrl(match.project.slug));
  return {
    story: updatedStory,
    resolved: true,
    createdArticle: false,
    megaProjectSlug: match.project.slug,
  };
}

export async function resolveStoryDestination(story: NewsroomStory): Promise<DestinationResolution> {
  if (story.destinationUrl) {
    return { story, resolved: true, createdArticle: false };
  }

  if (story.destinationType === "tdr_asia") return resolveTdrAsia(story);
  if (story.destinationType === "tdr_auto") return resolveTdrAuto(story);
  if (story.destinationType === "tdr_mega") return resolveTdrMega(story);

  return { story, resolved: false, createdArticle: false };
}

import "server-only";

import { readCms, writeCms } from "./cms-store";
import { generateArticle } from "./openai-newsroom";
import { updateNewsroomStory, type NewsroomStory } from "./newsroom-store";

export type DestinationResolution = {
  story: NewsroomStory;
  resolved: boolean;
  createdArticle: boolean;
  articleId?: string;
  articleSlug?: string;
};

function uniqueSlug(base: string, existing: string[]) {
  const root = base || `story-${Date.now()}`;
  if (!existing.includes(root)) return root;
  let i = 2;
  while (existing.includes(`${root}-${i}`)) i++;
  return `${root}-${i}`;
}

function storyUrl(slug: string) {
  const path = `/story/${slug}`;
  const base = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

export async function resolveStoryDestination(story: NewsroomStory): Promise<DestinationResolution> {
  if (story.destinationUrl) {
    return { story, resolved: true, createdArticle: false };
  }

  if (story.destinationType !== "tdr_asia") {
    return { story, resolved: false, createdArticle: false };
  }

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

  const destinationUrl = storyUrl(article.slug);
  const updatedStory = await updateNewsroomStory(story.id, {
    headline: story.headline,
    summary: story.summary,
    vertical: story.vertical,
    destinationType: story.destinationType,
    destinationUrl,
  });

  return {
    story: updatedStory,
    resolved: true,
    createdArticle,
    articleId: article.id,
    articleSlug: article.slug,
  };
}

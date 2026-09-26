import "server-only";

import type { Candidate } from "./cms-types";
import {
  applyAutomationDecision,
  createStoryFromCandidate,
  getNewsroomStoryByCandidateId,
  getStorySourceContext,
  saveDistributionItem,
  type DistributionChannel,
} from "./newsroom-store";
import { resolveStoryDestination } from "./newsroom-destination";
import { generateSocialDraft, scoreCandidatesForAutomation } from "./openai-newsroom";

export type NewsroomAutomationResult = {
  scored: number;
  promoted: number;
  destinationsResolved: number;
  promotedCandidateIds: string[];
  skippedExisting: string[];
  errors: Array<{ candidateId: string; stage: string; error: string }>;
};

function envNumber(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isDealRadar(candidate: Candidate | undefined) {
  return Boolean(candidate?.suggestedTags.some((tag) => tag.toLowerCase() === "deal-radar"));
}

export async function autoPromoteDiscoveredCandidates(candidates: Candidate[]): Promise<NewsroomAutomationResult> {
  const result: NewsroomAutomationResult = {
    scored: 0,
    promoted: 0,
    destinationsResolved: 0,
    promotedCandidateIds: [],
    skippedExisting: [],
    errors: [],
  };

  if (!candidates.length) return result;
  if ((process.env.NEWSROOM_AUTO_PROMOTE || "true").toLowerCase() === "false") return result;

  const growthMin = envNumber("NEWSROOM_AUTO_GROWTH_MIN", 82);
  const routeMin = envNumber("NEWSROOM_AUTO_ROUTE_MIN", 60);
  const maxPerRun = Math.max(0, Math.min(10, Math.round(envNumber("NEWSROOM_AUTO_MAX_PER_RUN", 3))));
  if (!maxPerRun) return result;

  const eligibleCandidates: Candidate[] = [];
  for (const candidate of candidates) {
    try {
      const existing = await getNewsroomStoryByCandidateId(candidate.id);
      if (existing) {
        result.skippedExisting.push(candidate.id);
        continue;
      }
      eligibleCandidates.push(candidate);
    } catch (error: any) {
      result.errors.push({ candidateId: candidate.id, stage: "existing-check", error: error?.message || "Unknown error" });
    }
  }

  if (!eligibleCandidates.length) return result;

  let scores;
  try {
    scores = await scoreCandidatesForAutomation(eligibleCandidates);
    result.scored = scores.length;
  } catch (error: any) {
    result.errors.push({ candidateId: "batch", stage: "score", error: error?.message || "Scoring failed" });
    return result;
  }

  const candidateById = new Map(eligibleCandidates.map((candidate) => [candidate.id, candidate]));
  const forcedDealRadarIds = new Set(
    eligibleCandidates.filter((candidate) => isDealRadar(candidate)).map((candidate) => candidate.id),
  );

  const selected = scores
    .filter((score) => forcedDealRadarIds.has(score.candidateId) || (score.growthScore >= growthMin && (score.routeScore >= routeMin || score.growthScore >= 92)))
    .sort((a, b) => {
      const forcedDelta = Number(forcedDealRadarIds.has(b.candidateId)) - Number(forcedDealRadarIds.has(a.candidateId));
      if (forcedDelta) return forcedDelta;
      return (b.growthScore * 0.7 + b.routeScore * 0.3) - (a.growthScore * 0.7 + a.routeScore * 0.3);
    })
    .slice(0, maxPerRun);

  for (const decision of selected) {
    try {
      const existing = await getNewsroomStoryByCandidateId(decision.candidateId);
      if (existing) {
        result.skippedExisting.push(decision.candidateId);
        continue;
      }

      const candidate = candidateById.get(decision.candidateId);
      const dealRadar = isDealRadar(candidate);
      let story = await createStoryFromCandidate(decision.candidateId);
      story = await applyAutomationDecision(story.id, {
        growthScore: decision.growthScore,
        routeScore: decision.routeScore,
        reason: dealRadar ? `Deal Radar direct-to-writer: ${decision.reason}` : decision.reason,
        vertical: decision.vertical,
        // Deal Radar is a business-news lane. Force a TDR Asia destination so resolution creates the article draft;
        // Facebook/X distribution still uses the story's scored vertical for tone/routing context.
        destinationType: dealRadar ? "tdr_asia" : decision.destinationType,
      });

      try {
        const resolution = await resolveStoryDestination(story);
        story = resolution.story;
        if (resolution.resolved) result.destinationsResolved += 1;
      } catch (error: any) {
        result.errors.push({
          candidateId: decision.candidateId,
          stage: "resolve-destination",
          error: error?.message || "Destination resolution failed",
        });
      }

      const source = await getStorySourceContext(story.candidateId);
      const channels: DistributionChannel[] = ["facebook", "x"];
      const generated = await Promise.allSettled(
        channels.map(async (channel) => {
          const copy = await generateSocialDraft(story, source, channel);
          return saveDistributionItem(story.id, channel, copy, story.destinationUrl, true);
        }),
      );

      generated.forEach((outcome, index) => {
        if (outcome.status === "rejected") {
          result.errors.push({
            candidateId: decision.candidateId,
            stage: `generate-${channels[index]}`,
            error: outcome.reason?.message || String(outcome.reason || "Generation failed"),
          });
        }
      });

      result.promoted += 1;
      result.promotedCandidateIds.push(decision.candidateId);
    } catch (error: any) {
      result.errors.push({ candidateId: decision.candidateId, stage: "promote", error: error?.message || "Promotion failed" });
    }
  }

  return result;
}

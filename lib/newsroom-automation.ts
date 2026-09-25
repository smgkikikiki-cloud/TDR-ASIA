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
import { generateSocialDraft, scoreCandidatesForAutomation } from "./openai-newsroom";

export type NewsroomAutomationResult = {
  scored: number;
  promoted: number;
  promotedCandidateIds: string[];
  skippedExisting: string[];
  errors: Array<{ candidateId: string; stage: string; error: string }>;
};

function envNumber(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function autoPromoteDiscoveredCandidates(candidates: Candidate[]): Promise<NewsroomAutomationResult> {
  const result: NewsroomAutomationResult = {
    scored: 0,
    promoted: 0,
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

  const selected = scores
    .filter((score) => score.growthScore >= growthMin && (score.routeScore >= routeMin || score.growthScore >= 92))
    .sort((a, b) => (b.growthScore * 0.7 + b.routeScore * 0.3) - (a.growthScore * 0.7 + a.routeScore * 0.3))
    .slice(0, maxPerRun);

  for (const decision of selected) {
    try {
      const existing = await getNewsroomStoryByCandidateId(decision.candidateId);
      if (existing) {
        result.skippedExisting.push(decision.candidateId);
        continue;
      }

      let story = await createStoryFromCandidate(decision.candidateId);
      story = await applyAutomationDecision(story.id, {
        growthScore: decision.growthScore,
        routeScore: decision.routeScore,
        reason: decision.reason,
        vertical: decision.vertical,
        destinationType: decision.destinationType,
      });

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

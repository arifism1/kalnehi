// Score predictor: deterministic projection based on mastery and practice.
//
// Returns a projected score RANGE, never a single exact score.

import type { Topic } from "../types/topic";
import type { UserProgress } from "../types/userProgress";

export interface ScoreRange {
  min: number;
  max: number;
}

export function estimateScoreRange(params: {
  topics: Topic[];
  progress: UserProgress[];
}): ScoreRange {
  const { topics, progress } = params;
  const progressByTopic = new Map<number, UserProgress>();
  for (const p of progress) {
    progressByTopic.set(p.topic_id, p);
  }

  let optimistic = 0;
  let conservative = 0;

  for (const t of topics) {
    const p = progressByTopic.get(t.id);
    const mastery = p?.mastery_score ?? 0;
    const accuracy = p?.accuracy ?? 0;
    const practiceFactor =
      p && p.questions_attempted > 0 ? Math.min(1, accuracy + 0.1) : 0.4;

    const effective = mastery * practiceFactor;

    optimistic += t.expected_marks * effective;
    conservative += t.expected_marks * effective * 0.85;
  }

  // Round to nearest 5 marks for readability.
  const roundTo5 = (v: number) => Math.round(v / 5) * 5;

  const min = Math.max(0, roundTo5(conservative));
  const max = Math.max(min, roundTo5(optimistic));

  return { min, max };
}


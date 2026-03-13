// Strategy engine: selects high-impact topics deterministically.
//
// It does NOT use AI. It reads topics & progress, computes impact_score
// and returns the best topics that fit within the available study time.

import type { Topic } from "../types/topic";
import type { UserProgress } from "../types/userProgress";
import type { StrategyResult, TopicWithImpact } from "../types/strategy";
import type { TopicDependency } from "../db/topicQueries";
import { computeImpactScore } from "../utils/impactScore";

export function selectHighImpactTopics(params: {
  topics: Topic[];
  progress: UserProgress[];
  dependencies: TopicDependency[];
  hoursAvailable: number;
  daysLeft: number;
  triageModeActive?: boolean;
}): StrategyResult {
  const { topics, progress, dependencies, hoursAvailable, triageModeActive } = params;

  const minutesAvailable = Math.max(Math.round(hoursAvailable * 60), 0);
  const progressByTopic = new Map<number, UserProgress>();
  for (const p of progress) {
    progressByTopic.set(p.topic_id, p);
  }

  const prereqsByTopic = new Map<number, number[]>();
  for (const dep of dependencies) {
    if (!prereqsByTopic.has(dep.topic_id)) {
      prereqsByTopic.set(dep.topic_id, []);
    }
    prereqsByTopic.get(dep.topic_id)!.push(dep.prerequisite_topic_id);
  }

  // Apply triage pre-filter: drop very low-yield topics by weightage_score
  const candidateTopics = triageModeActive
    ? topics.filter((topic) => (topic.weightage_score ?? 0) >= 3)
    : topics;

  const scored: TopicWithImpact[] = candidateTopics.map((topic) => {
    const p = progressByTopic.get(topic.id);

    // Probability of completion: start from 0.9 and reduce for low mastery.
    let probability = 0.9;
    const mastery = p?.mastery_score ?? 0;
    if (mastery < 0.3) probability -= 0.4;
    else if (mastery < 0.6) probability -= 0.2;

    const accuracy = p?.accuracy ?? 0;
    if (accuracy < 0.4) probability -= 0.2;

    probability = Math.max(0.1, Math.min(0.95, probability));

    const baseImpact = computeImpactScore({
      expectedMarks: topic.expected_marks,
      studyMinutes: topic.study_time,
      practiceMinutes: topic.practice_time,
      probabilityOfCompletion: probability,
    });

    // Dependency-aware penalty: if important prerequisites are weak,
    // we still allow the topic, but its impact is reduced so that
    // prerequisites are naturally prioritized.
    const prereqs = prereqsByTopic.get(topic.id) ?? [];
    let weakPrereqs = 0;
    for (const prereqId of prereqs) {
      const prereqProgress = progressByTopic.get(prereqId);
      const m = prereqProgress?.mastery_score ?? 0;
      if (m < 0.5) {
        weakPrereqs += 1;
      }
    }

    let dependencyPenalty = 1;
    if (weakPrereqs === 1) dependencyPenalty = 0.6;
    else if (weakPrereqs > 1) dependencyPenalty = 0.4;

    let impact_score: number;

    if (triageModeActive) {
      // In triage mode, sort strictly by Return on Effort:
      // ROE = weightage_score / est_minutes_mastery
      const weight = topic.weightage_score ?? topic.expected_marks ?? 0;
      const estMinutes =
        topic.est_minutes_mastery ??
        (topic.study_time + topic.practice_time || 1);
      const minutesForRoe = Math.max(estMinutes, 1);
      impact_score = weight / minutesForRoe;
    } else {
      impact_score = baseImpact * dependencyPenalty;
    }

    return {
      ...topic,
      impact_score,
      probability_of_completion: probability,
    };
  });

  // Sort by highest impact score.
  scored.sort((a, b) => b.impact_score - a.impact_score);

  // Greedily pick topics until we exhaust available time.
  const chosen: TopicWithImpact[] = [];
  let usedMinutes = 0;

  for (const t of scored) {
    const required = t.study_time + t.practice_time;
    if (required <= 0) continue;
    if (usedMinutes + required > minutesAvailable) continue;
    chosen.push(t);
    usedMinutes += required;
  }

  return {
    topics: chosen,
    total_study_minutes: usedMinutes,
  };
}


// Revision engine: deterministic spaced repetition schedules.
//
// It decides when a topic should be revised based on mastery level.

type MasteryBand = "new" | "medium" | "high";

export interface RevisionEntry {
  topic_id: number;
  day_offset: number;
}

export function buildRevisionSchedule(params: {
  topicId: number;
  masteryBand: MasteryBand;
}): RevisionEntry[] {
  const { topicId, masteryBand } = params;

  let offsets: number[];
  if (masteryBand === "new") {
    offsets = [1, 3, 7, 14, 30];
  } else if (masteryBand === "high") {
    offsets = [7, 21, 45];
  } else {
    offsets = [3, 7, 14, 30];
  }

  return offsets.map((day_offset) => ({
    topic_id: topicId,
    day_offset,
  }));
}


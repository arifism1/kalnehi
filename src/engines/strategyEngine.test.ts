import { describe, it, expect } from "vitest";
import { selectHighImpactTopics } from "./strategyEngine";
import type { Topic } from "../types/topic";
import type { UserProgress } from "../types/userProgress";
import type { TopicDependency } from "../db/topicQueries";

const baseTopics: Topic[] = [
  {
    id: 1,
    subject: "Physics",
    chapter: "Basics",
    name: "A (Prerequisite)",
    expected_marks: 4,
    study_time: 30,
    practice_time: 30,
    difficulty: "easy",
  },
  {
    id: 2,
    subject: "Physics",
    chapter: "Advanced",
    name: "B (Depends on A)",
    expected_marks: 8,
    study_time: 60,
    practice_time: 60,
    difficulty: "hard",
  },
];

const noDeps: TopicDependency[] = [];
const deps: TopicDependency[] = [{ topic_id: 2, prerequisite_topic_id: 1 }];

const emptyProgress: UserProgress[] = [];

describe("selectHighImpactTopics", () => {
  it("selects the highest impact topics within available time when no dependencies", () => {
    const result = selectHighImpactTopics({
      topics: baseTopics,
      progress: emptyProgress,
      dependencies: noDeps,
      hoursAvailable: 3, // 180 minutes, enough for both
      daysLeft: 30,
    });

    expect(result.topics.length).toBe(2);
    // With no dependency penalties and higher expected marks,
    // topic B should come before topic A.
    expect(result.topics[0].name).toBe("B (Depends on A)");
    expect(result.topics[1].name).toBe("A (Prerequisite)");
  });

  it("penalizes topics whose prerequisites are weak so prerequisites are prioritized", () => {
    const progress: UserProgress[] = [
      {
        id: "p1",
        user_id: "u1",
        topic_id: 1,
        status: "not_started",
        mastery_score: 0.1, // very weak on A
        questions_attempted: 0,
        accuracy: 0,
        confidence: 0,
        last_studied_at: null,
      },
      {
        id: "p2",
        user_id: "u1",
        topic_id: 2,
        status: "studying",
        mastery_score: 0.5,
        questions_attempted: 10,
        accuracy: 0.6,
        confidence: 50,
        last_studied_at: null,
      },
    ];

    const result = selectHighImpactTopics({
      topics: baseTopics,
      progress,
      dependencies: deps,
      hoursAvailable: 3, // 180 minutes, enough for both
      daysLeft: 30,
    });

    expect(result.topics.length).toBe(2);
    // Because A is a weak prerequisite for B, the dependency penalty
    // should make A appear before B in the final ranked list.
    expect(result.topics[0].name).toBe("A (Prerequisite)");
    expect(result.topics[1].name).toBe("B (Depends on A)");
  });

  it("does not exceed available time budget", () => {
    const result = selectHighImpactTopics({
      topics: baseTopics,
      progress: emptyProgress,
      dependencies: noDeps,
      hoursAvailable: 1, // 60 minutes, only enough for topic A
      daysLeft: 30,
    });

    // Topic A requires 60 minutes total, topic B requires 120.
    expect(result.topics.length).toBe(1);
    expect(result.topics[0].name).toBe("A (Prerequisite)");
    expect(result.total_study_minutes).toBe(60);
  });
}


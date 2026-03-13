import type { Topic } from "./topic";
import type { TopicStatus } from "./userProgress";

// Result of strategy engine topic selection.
export interface StrategyResult {
  topics: TopicWithImpact[];
  total_study_minutes: number;
}

export interface TopicWithImpact extends Topic {
  impact_score: number;
  probability_of_completion: number;
}

// Daily task structure used by schedule engine and APIs.
export type TaskType = "study" | "practice" | "revision";

export interface DailyTask {
  id?: string;
  user_id: string;
  topic_id: number | null;
  type: TaskType;
  duration_minutes: number;
  label: string;
}

// Simple weakness diagnostic entry.
export interface WeaknessItem {
  topic_id: number;
  topic_name: string;
  status: TopicStatus;
  mastery_score: number;
  accuracy: number;
}


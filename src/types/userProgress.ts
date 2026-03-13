// User progress types for kalnehi engines.

export type TopicStatus = "not_started" | "studying" | "practicing" | "mastered";

export interface UserProgress {
  id: string;
  user_id: string;
  topic_id: number;
  status: TopicStatus;
  mastery_score: number; // 0..1
  questions_attempted: number;
  accuracy: number; // 0..1
  confidence: number; // 0..100
  last_studied_at: string | null;
}


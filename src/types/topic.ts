// Topic-related types for kalnehi preparation engine.

export type DifficultyLevel = "easy" | "medium" | "hard";

// Single syllabus microtopic row.
export interface Topic {
  id: number;
  subject: string;
  chapter: string;
  name: string;
  expected_marks: number;
  study_time: number; // minutes
  practice_time: number; // minutes
  difficulty: DifficultyLevel;
  // Optional canonical features (may be null in DB and filled later via migrations)
  weightage_score?: number | null; // 0-100, historical importance
  est_minutes_mastery?: number | null; // total minutes to reach mastery
}


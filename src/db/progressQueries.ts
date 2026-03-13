// Progress and schedule queries for kalnehi engines.

import { supabaseAdmin } from "@/lib/supabase-server";
import type { UserProgress } from "../types/userProgress";

export async function fetchUserProgress(userId: string): Promise<UserProgress[]> {
  const { data, error } = await supabaseAdmin
    .from("user_topic_progress")
    .select(
      "id, user_id, topic_id, status, mastery_score, questions_attempted, accuracy, confidence, last_studied_at"
    )
    .eq("user_id", userId);

  if (error) {
    console.error("fetchUserProgress error", error);
    throw new Error("Failed to fetch user progress");
  }

  return (data ?? []) as UserProgress[];
}


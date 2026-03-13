import { supabaseAdmin } from "@/lib/supabase-server";

export type PreparationMemoryRow = {
  topic_name: string;
  subject: string | null;
  mastery_score: number;
  accuracy: number;
  last_studied_at: string | null;
  status: string;
};

export async function getPreparationMemory(
  userId: string
): Promise<PreparationMemoryRow[]> {
  if (!userId) {
    throw new Error("getPreparationMemory: userId is required");
  }

  const { data, error } = await supabaseAdmin
    .from("user_topic_progress")
    .select(
      `
      topic_id,
      mastery_score,
      accuracy,
      last_studied_at,
      status,
      micro_topics:topic_id (
        topic_name,
        subject
      )
    `
    )
    .eq("user_id", userId);

  if (error) {
    console.error("getPreparationMemory: query error", error);
    throw new Error("Failed to load preparation memory");
  }

  if (!data) return [];

  return data.map((row: any) => {
    const topic = row.micro_topics as { topic_name: string; subject: string | null } | null;
    return {
      topic_name: topic?.topic_name ?? `Topic ${row.topic_id}`,
      subject: topic?.subject ?? null,
      mastery_score: row.mastery_score ?? 0,
      accuracy: row.accuracy ?? 0,
      last_studied_at: row.last_studied_at ?? null,
      status: row.status ?? "not_started",
    };
  });
}


import { supabaseAdmin } from "@/lib/supabase-server";

export type WeakTopicSummary = {
  topic_name: string;
  mastery_score: number;
};

export async function findWeakTopics(
  userId: string
): Promise<WeakTopicSummary[]> {
  if (!userId) {
    throw new Error("findWeakTopics: userId is required");
  }

  const { data, error } = await supabaseAdmin
    .from("user_topic_progress")
    .select(
      `
      topic_id,
      mastery_score,
      micro_topics:topic_id (
        topic_name
      )
    `
    )
    .eq("user_id", userId)
    .lt("mastery_score", 0.5)
    .order("mastery_score", { ascending: true })
    .limit(10);

  if (error) {
    console.error("findWeakTopics: query error", error);
    throw new Error("Failed to load weak topics");
  }

  if (!data) return [];

  return data.map((row: any) => ({
    topic_name:
      (row.micro_topics?.topic_name as string | undefined) ??
      `Topic ${row.topic_id}`,
    mastery_score: row.mastery_score ?? 0,
  }));
}


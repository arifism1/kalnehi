import { supabaseAdmin } from "@/lib/supabase-server";

export type RevisionDueTopic = {
  topic_id: number;
  topic_name: string;
  subject: string | null;
  difficulty: string | null;
  last_studied_at: string | null;
};

// Helper to map difficulty text to days-before-due
function getDaysForDifficulty(difficulty: string | null): number {
  const d = (difficulty ?? "").toLowerCase();
  if (d === "easy") return 14;
  if (d === "hard") return 3;
  // Treat anything else (including "medium" or unknown) as medium
  return 7;
}

export async function getRevisionDue(userId: string): Promise<RevisionDueTopic[]> {
  if (!userId) {
    throw new Error("getRevisionDue: userId is required");
  }

  // Fetch progress joined with topic difficulty in one query.
  const { data, error } = await supabaseAdmin
    .from("user_topic_progress")
    .select(
      `
      topic_id,
      last_studied_at,
      micro_topics:topic_id (
        topic_name,
        subject,
        difficulty
      )
    `
    )
    .eq("user_id", userId);

  if (error) {
    console.error("getRevisionDue: query error", error);
    throw new Error("Failed to load revision candidates");
  }

  if (!data) return [];

  const now = new Date();

  return (data as any[])
    .filter((row) => {
      const topic = row.micro_topics as {
        topic_name: string;
        subject: string | null;
        difficulty: string | null;
      } | null;

      if (!row.last_studied_at) return false;

      const last = new Date(row.last_studied_at as string);
      const msSince = now.getTime() - last.getTime();
      const daysSince = msSince / (1000 * 60 * 60 * 24);

      const daysThreshold = getDaysForDifficulty(topic?.difficulty ?? null);
      return daysSince >= daysThreshold;
    })
    .map((row) => {
      const topic = row.micro_topics as {
        topic_name: string;
        subject: string | null;
        difficulty: string | null;
      } | null;

      return {
        topic_id: row.topic_id as number,
        topic_name: topic?.topic_name ?? `Topic ${row.topic_id}`,
        subject: topic?.subject ?? null,
        difficulty: topic?.difficulty ?? null,
        last_studied_at: row.last_studied_at as string | null,
      };
    });
}


import { supabaseAdmin } from "@/lib/supabase-server";
import type { Database } from "@/types/supabase";

type MicroTopicRow = Database["public"]["Tables"]["micro_topics"]["Row"];
type ProgressRow = Database["public"]["Tables"]["student_topic_progress"]["Row"];
type MetadataRow = Database["public"]["Tables"]["topic_metadata"]["Row"];
type RankRow = Database["public"]["Tables"]["topic_graph_rank"]["Row"];
type DependencyRow = Database["public"]["Tables"]["topic_dependencies"]["Row"];

export type WeakTopic = {
  topic_id: number;
  topic_name: string;
  accuracy: number;
};

export type RepairSuggestion = {
  weak_topic_id: number;
  weak_topic_name: string;
  repair_topics: string[];
};

export type StudyPlanItem = {
  topic_id: number;
  topic_name: string;
  priority_score: number;
};

export async function getWeakTopics(userId: string): Promise<WeakTopic[]> {
  const { data: progress, error } = await supabaseAdmin
    .from("student_topic_progress")
    .select("topic_id, accuracy")
    .eq("user_id", userId)
    .lt("accuracy", 0.6);

  if (error) {
    console.error("getWeakTopics: progress error", error);
    throw new Error("Failed to load weak topics");
  }

  if (!progress || progress.length === 0) return [];

  const topicIds = Array.from(
    new Set(progress.map((row) => row.topic_id).filter((id): id is number => id != null))
  );
  if (topicIds.length === 0) return [];

  const { data: topics, error: topicsError } = await supabaseAdmin
    .from("micro_topics")
    .select("id, topic_name")
    .in("id", topicIds);

  if (topicsError) {
    console.error("getWeakTopics: topics error", topicsError);
    throw new Error("Failed to join weak topics");
  }

  const topicMap = new Map<number, string>(
    (topics ?? []).map((t) => [t.id as number, (t as any).topic_name as string])
  );

  return (progress as ProgressRow[]).map((row) => ({
    topic_id: row.topic_id,
    topic_name: topicMap.get(row.topic_id) ?? `Topic ${row.topic_id}`,
    accuracy: row.accuracy ?? 0,
  }));
}

export async function getRepairTopics(topicId: number): Promise<string[]> {
  const { data: deps, error } = await supabaseAdmin
    .from("topic_dependencies")
    .select("prerequisite_topic_id")
    .eq("topic_id", topicId);

  if (error) {
    console.error("getRepairTopics: dependencies error", error);
    throw new Error("Failed to load topic dependencies");
  }

  if (!deps || deps.length === 0) return [];

  const prereqIds = Array.from(
    new Set(
      (deps as DependencyRow[])
        .map((d) => d.prerequisite_topic_id)
        .filter((id): id is number => id != null)
    )
  );

  if (prereqIds.length === 0) return [];

  const { data: prereqTopics, error: prereqError } = await supabaseAdmin
    .from("micro_topics")
    .select("id, topic_name")
    .in("id", prereqIds);

  if (prereqError) {
    console.error("getRepairTopics: prereq topics error", prereqError);
    throw new Error("Failed to load prerequisite topics");
  }

  return (prereqTopics ?? []).map((t) => (t as any).topic_name as string);
}

export async function generateStudyPlan(userId: string): Promise<StudyPlanItem[]> {
  const { data: progress, error: progressError } = await supabaseAdmin
    .from("student_topic_progress")
    .select("topic_id, accuracy")
    .eq("user_id", userId);

  if (progressError) {
    console.error("generateStudyPlan: progress error", progressError);
    throw new Error("Failed to load progress");
  }

  if (!progress || progress.length === 0) return [];

  const topicIds = Array.from(
    new Set(progress.map((row) => row.topic_id).filter((id): id is number => id != null))
  );
  if (topicIds.length === 0) return [];

  const [{ data: metadata, error: metaError }, { data: ranks, error: rankError }] =
    await Promise.all([
      supabaseAdmin
        .from("topic_metadata")
        .select("topic_id, weightage, difficulty, importance_score")
        .in("topic_id", topicIds),
      supabaseAdmin
        .from("topic_graph_rank")
        .select("topic_id, graph_rank")
        .in("topic_id", topicIds),
    ]);

  if (metaError) {
    console.error("generateStudyPlan: metadata error", metaError);
    throw new Error("Failed to load topic metadata");
  }

  if (rankError) {
    console.error("generateStudyPlan: rank error", rankError);
    throw new Error("Failed to load topic graph ranks");
  }

  const metaMap = new Map<number, MetadataRow>();
  for (const row of (metadata ?? []) as MetadataRow[]) {
    metaMap.set(row.topic_id, row);
  }

  const rankMap = new Map<number, RankRow>();
  for (const row of (ranks ?? []) as RankRow[]) {
    rankMap.set(row.topic_id, row);
  }

  const { data: topicRows, error: topicsError } = await supabaseAdmin
    .from("micro_topics")
    .select("id, topic_name")
    .in("id", topicIds);

  if (topicsError) {
    console.error("generateStudyPlan: topics error", topicsError);
    throw new Error("Failed to load topic names");
  }

  const topicNameMap = new Map<number, string>(
    (topicRows ?? []).map((row) => [
      (row as any).id as number,
      (row as any).topic_name as string,
    ])
  );

  const items: StudyPlanItem[] = (progress as ProgressRow[]).map((p) => {
    const meta = metaMap.get(p.topic_id);
    const rank = rankMap.get(p.topic_id);

    const weightage = meta?.weightage ?? 1;
    const difficulty = meta?.difficulty ?? 1;
    const graphRank = rank?.graph_rank ?? 1;
    const accuracy = typeof p.accuracy === "number" ? p.accuracy : 0;

    const clampedAccuracy = Math.min(Math.max(accuracy, 0), 1);

    const priority_score =
      weightage * difficulty * (1 - clampedAccuracy) * graphRank;

    return {
      topic_id: p.topic_id,
      topic_name: topicNameMap.get(p.topic_id) ?? `Topic ${p.topic_id}`,
      priority_score,
    };
  });

  items.sort((a, b) => b.priority_score - a.priority_score);
  return items.slice(0, 5);
}


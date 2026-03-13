// Read-only topic queries against Supabase.

import { supabaseAdmin } from "@/lib/supabase-server";
import type { Topic } from "../types/topic";

export interface TopicDependency {
  topic_id: number;
  prerequisite_topic_id: number;
}

export interface TopicWithGraph extends Topic {
  prerequisites: number[];
  dependents: number[];
}

export async function fetchAllTopics(): Promise<Topic[]> {
  const { data, error } = await supabaseAdmin
    .from("micro_topics")
    .select(
      "id, subject, chapter, name, expected_marks, study_time, practice_time, difficulty, weightage_score, est_minutes_mastery"
    );

  if (error) {
    console.error("fetchAllTopics error", error);
    throw new Error("Failed to fetch topics");
  }

  return (data ?? []) as Topic[];
}

export async function fetchTopicDependencies(): Promise<TopicDependency[]> {
  const { data, error } = await supabaseAdmin
    .from("topic_dependencies")
    .select("topic_id, prerequisite_topic_id");

  if (error) {
    console.error("fetchTopicDependencies error", error);
    throw new Error("Failed to fetch topic dependencies");
  }

  return (data ?? []) as TopicDependency[];
}

// Convenience helper: fetch all topics and wire their prerequisites
// and dependents based on topic_dependencies.
export async function fetchTopicsWithDependencies(): Promise<TopicWithGraph[]> {
  const [topics, deps] = await Promise.all([
    fetchAllTopics(),
    fetchTopicDependencies(),
  ]);

  const prereqsByTopic = new Map<number, number[]>();
  const dependentsByTopic = new Map<number, number[]>();

  for (const dep of deps) {
    if (!prereqsByTopic.has(dep.topic_id)) {
      prereqsByTopic.set(dep.topic_id, []);
    }
    prereqsByTopic.get(dep.topic_id)!.push(dep.prerequisite_topic_id);

    if (!dependentsByTopic.has(dep.prerequisite_topic_id)) {
      dependentsByTopic.set(dep.prerequisite_topic_id, []);
    }
    dependentsByTopic.get(dep.prerequisite_topic_id)!.push(dep.topic_id);
  }

  return topics.map((t) => ({
    ...t,
    prerequisites: prereqsByTopic.get(t.id) ?? [],
    dependents: dependentsByTopic.get(t.id) ?? [],
  }));
}


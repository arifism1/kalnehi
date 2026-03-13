"use server";

import { supabaseAdmin } from "@/lib/supabase-server";
import {
  generateDailyPlan,
  type DailyPlan,
  type DepthTopic,
  type DueRevision,
} from "@/lib/strategy-engine";

export async function fetchAndGeneratePlan(
  userId: string,
  availableMinutes: number
): Promise<DailyPlan> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [
    { data: profileRow },
    { data: topics },
    { data: progress },
    { data: deps },
    { data: revisions },
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("triage_mode_active")
      .eq("id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("micro_topics")
      .select(
        "id, topic_name, subject, weightage_score, est_minutes_mastery, study_time, practice_time"
      ),
    supabaseAdmin
      .from("user_topic_progress")
      .select("topic_id, status"),
    supabaseAdmin
      .from("topic_dependencies")
      .select("topic_id, prerequisite_topic_id"),
    supabaseAdmin
      .from("revision_schedule")
      .select("topic_id, next_revision_date")
      .lte("next_revision_date", todayStr),
  ]);

  const triageModeActive =
    typeof profileRow?.triage_mode_active === "boolean"
      ? profileRow.triage_mode_active
      : false;

  const statusByTopic = new Map<number, string>();
  (progress ?? []).forEach((row: any) => {
    statusByTopic.set(row.topic_id, row.status ?? "not_started");
  });

  const prereqsByTopic = new Map<number, number[]>();
  (deps ?? []).forEach((row: any) => {
    if (!prereqsByTopic.has(row.topic_id)) {
      prereqsByTopic.set(row.topic_id, []);
    }
    prereqsByTopic.get(row.topic_id)!.push(row.prerequisite_topic_id);
  });

  const depthTopics: DepthTopic[] = (topics ?? []).map((row: any) => {
    const est = typeof row.est_minutes_mastery === "number"
      ? row.est_minutes_mastery
      : (row.study_time ?? 60);
    const practice = typeof row.practice_time === "number"
      ? row.practice_time
      : 30;

    return {
      id: row.id,
      subject: row.subject,
      topic_name: row.topic_name,
      status: (statusByTopic.get(row.id) as any) ?? "not_started",
      weightage_score: Number(row.weightage_score ?? 0),
      est_mastery_minutes: est,
      practice_minutes: practice,
      prerequisites: prereqsByTopic.get(row.id) ?? [],
    };
  });

  const topicById = new Map<number, { subject: string; topic_name: string }>();
  depthTopics.forEach((t) => {
    topicById.set(t.id, { subject: t.subject, topic_name: t.topic_name });
  });

  const dueRevisions: DueRevision[] = (revisions ?? []).map((row: any) => {
    const meta = topicById.get(row.topic_id);
    return {
      topicId: row.topic_id,
      subject: meta?.subject ?? "Topic",
      topicName: meta?.topic_name ?? `Topic ${row.topic_id}`,
      minutes: 30,
    };
  });

  return generateDailyPlan({
    availableMinutesToday: availableMinutes,
    allTopics: depthTopics,
    dueRevisions,
    triageModeActive,
  });
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getAuthFromRequest } from "@/lib/auth-server";
import { scheduleRevision } from "@/lib/revision-engine";
import { toDatabaseTopicId } from "@/lib/topic-id";

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);

  if (!auth?.userId) {
    return NextResponse.json({ ok: false });
  }

  const userId = auth.userId;

  const {
    taskId,
    topicId,
    durationMinutes,
    difficultyRating,
    timeSpent,
  }: {
    taskId: string;
    topicId?: string;
    durationMinutes?: number;
    difficultyRating?: number;
    timeSpent?: number;
  } = await req.json();

  const effectiveTimeSpent =
    typeof timeSpent === "number" && timeSpent > 0 ? Math.round(timeSpent) : null;
  const databaseTopicId = toDatabaseTopicId(topicId);

  // 1) Mark task complete — only set the columns that are guaranteed to exist.
  //    completed_at and time_spent require the migration in
  //    supabase/migrations/20250312000007_daily_tasks_completion_fields.sql to be applied first.
  const updatePayload: Record<string, unknown> = { status: "done" };

  try {
    // Attempt to write the new tracking columns; silently ignored if not yet migrated.
    const { error: extendedError } = await supabaseAdmin
      .from("daily_tasks")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
        time_spent: effectiveTimeSpent,
      })
      .eq("id", taskId);

    if (extendedError) throw extendedError;
  } catch {
    // Fall back to the baseline update that works before migration.
    await supabaseAdmin
      .from("daily_tasks")
      .update(updatePayload)
      .eq("id", taskId);
  }

  // 2) Schedule revisions only when this task maps to a syllabus topic.
  if (databaseTopicId != null) {
    const revisions = scheduleRevision(databaseTopicId, userId);
    await supabaseAdmin.from("revision_queue").insert(revisions);
  }

  // 3) Log study event into preparation memory
  let effectiveDuration = effectiveTimeSpent ?? durationMinutes;

  if (effectiveDuration == null) {
    const { data: taskRow } = await supabaseAdmin
      .from("daily_tasks")
      .select("duration_minutes")
      .eq("id", taskId)
      .maybeSingle();

    effectiveDuration = taskRow?.duration_minutes ?? null;
  }

  const normalizedDifficulty =
    difficultyRating && difficultyRating >= 1 && difficultyRating <= 5
      ? difficultyRating
      : 3;

  await supabaseAdmin.from("study_events").insert({
    user_id: userId,
    topic_id: databaseTopicId,
    event_type: "completed",
    duration_minutes: effectiveDuration,
    difficulty_rating: normalizedDifficulty,
  });

  // 4) Log a study session row for execution tracking
  if (effectiveDuration && effectiveDuration > 0) {
    const now = new Date();
    const endedAt = now.toISOString();
    const started = new Date(now.getTime() - effectiveDuration * 60 * 1000);

    await supabaseAdmin.from("study_sessions").insert({
      user_id: userId,
      task_id: taskId,
      started_at: started.toISOString(),
      ended_at: endedAt,
      duration_minutes: effectiveDuration,
    });
  }

  return NextResponse.json({ ok: true });
}

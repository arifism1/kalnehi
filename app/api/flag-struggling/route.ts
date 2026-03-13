import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getAuthFromRequest } from "@/lib/auth-server";

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);

  if (!auth?.userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: { topicId?: string | number } = {};
  try {
    body = await req.json();
  } catch {
    // fall through
  }

  const rawId = body.topicId;
  const numericId = typeof rawId === "string" ? Number(rawId) : rawId;

  if (!numericId || Number.isNaN(numericId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid topicId" },
      { status: 400 }
    );
  }

  // Fetch prerequisite topic IDs from topic_dependencies
  const { data: deps, error: depsError } = await supabaseAdmin
    .from("topic_dependencies")
    .select("prerequisite_topic_id")
    .eq("topic_id", numericId);

  if (depsError) {
    console.error("flag-struggling: deps error", depsError);
    return NextResponse.json(
      { ok: false, error: "Failed to load prerequisites" },
      { status: 500 }
    );
  }

  const prereqIds = (deps ?? [])
    .map((d: any) => d.prerequisite_topic_id)
    .filter((id: number | null) => typeof id === "number");

  if (prereqIds.length === 0) {
    return NextResponse.json({
      ok: true,
      injected: 0,
      message: "No prerequisites found for this topic.",
    });
  }

  // Look up study/practice time from micro_topics so duration is grounded
  const { data: topics, error: topicsError } = await supabaseAdmin
    .from("micro_topics")
    .select("id, study_time, practice_time")
    .in("id", prereqIds);

  if (topicsError) {
    console.error("flag-struggling: topics error", topicsError);
    return NextResponse.json(
      { ok: false, error: "Failed to load prerequisite topics" },
      { status: 500 }
    );
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const scheduledDate = tomorrow.toISOString().split("T")[0];

  const tasksPayload = (topics ?? []).map((t: any) => {
    const study = typeof t.study_time === "number" ? t.study_time : 30;
    const practice = typeof t.practice_time === "number" ? t.practice_time : 30;
    const duration = Math.max(30, Math.min(study + practice, 180));

    return {
      user_id: auth.userId,
      topic_id: t.id,
      task_type: "study" as const,
      duration_minutes: duration,
      scheduled_date: scheduledDate,
    };
  });

  if (tasksPayload.length === 0) {
    return NextResponse.json({
      ok: true,
      injected: 0,
      message: "No valid prerequisite topics to schedule.",
    });
  }

  const { error: insertError } = await supabaseAdmin
    .from("daily_tasks")
    .insert(tasksPayload);

  if (insertError) {
    console.error("flag-struggling: insert error", insertError);
    return NextResponse.json(
      { ok: false, error: "Failed to schedule prerequisite tasks" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    injected: tasksPayload.length,
    scheduled_date: scheduledDate,
  });
}


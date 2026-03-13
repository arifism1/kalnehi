import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getAuthFromRequest } from "@/lib/auth-server";

type Level = "hard" | "normal" | "easy";

function getOffsetForLevel(level: Level): number {
  if (level === "hard") return 3;
  if (level === "easy") return 21;
  return 7;
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);

  if (!auth?.userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: { topicId?: string | number; level?: Level } = {};
  try {
    body = await req.json();
  } catch {
    // fall through
  }

  const rawId = body.topicId;
  const level = body.level ?? "normal";

  if (level !== "hard" && level !== "normal" && level !== "easy") {
    return NextResponse.json(
      { ok: false, error: "Invalid level" },
      { status: 400 }
    );
  }

  const numericId = typeof rawId === "string" ? Number(rawId) : rawId;

  if (!numericId || Number.isNaN(numericId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid topicId" },
      { status: 400 }
    );
  }

  const offsetDays = getOffsetForLevel(level);
  const today = new Date();
  const next = new Date(today);
  next.setDate(today.getDate() + offsetDays);
  const nextDateStr = next.toISOString().split("T")[0];

  try {
    // Upsert revision_schedule row
    const { error: revError } = await supabaseAdmin
      .from("revision_schedule")
      .upsert(
        {
          user_id: auth.userId,
          topic_id: numericId,
          next_revision_date: nextDateStr,
          last_revision_date: today.toISOString().split("T")[0],
        } as any,
        { onConflict: "user_id,topic_id" }
      );

    if (revError) {
      console.error("schedule-revision: revision error", revError);
      return NextResponse.json(
        { ok: false, error: "Failed to schedule revision" },
        { status: 500 }
      );
    }

    // Mark topic as mastered in user_topic_progress
    const { error: progressError } = await supabaseAdmin
      .from("user_topic_progress")
      .upsert(
        {
          user_id: auth.userId,
          topic_id: numericId,
          status: "mastered",
          mastery_score: 1,
          last_studied_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id,topic_id" }
      );

    if (progressError) {
      console.error("schedule-revision: progress error", progressError);
      return NextResponse.json(
        { ok: false, error: "Failed to update mastery state" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      next_revision_date: nextDateStr,
      offset_days: offsetDays,
    });
  } catch (error) {
    console.error("schedule-revision: unexpected error", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}


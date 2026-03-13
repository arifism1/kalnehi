import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Missing userId" },
      { status: 400 }
    );
  }

  try {
    const { data: progress, error } = await supabaseAdmin
      .from("student_topic_progress")
      .select("topic_id, accuracy")
      .eq("user_id", userId)
      .lt("accuracy", 0.6);

    if (error) {
      console.error("weak-topics: progress error", error);
      return NextResponse.json(
        { ok: false, error: "Failed to load weak topics" },
        { status: 500 }
      );
    }

    if (!progress || progress.length === 0) {
      return NextResponse.json({ ok: true, topics: [] });
    }

    const topicIds = Array.from(
      new Set(progress.map((row) => row.topic_id).filter(Boolean))
    );

    if (topicIds.length === 0) {
      return NextResponse.json({ ok: true, topics: [] });
    }

    const { data: topics, error: topicsError } = await supabaseAdmin
      .from("micro_topics")
      .select("id, topic_name")
      .in("id", topicIds);

    if (topicsError) {
      console.error("weak-topics: topics error", topicsError);
      return NextResponse.json(
        { ok: false, error: "Failed to join topics" },
        { status: 500 }
      );
    }

    const topicMap = new Map(
      (topics ?? []).map((t: any) => [t.id, t.topic_name as string])
    );

    const result = (progress ?? []).map((row: any) => ({
      topic_name: topicMap.get(row.topic_id) ?? `Topic ${row.topic_id}`,
      accuracy: row.accuracy ?? 0,
    }));

    return NextResponse.json({ ok: true, topics: result });
  } catch (err) {
    console.error("weak-topics: unexpected error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

type WeakTopicEntry = {
  topic_id: number;
  topic_name: string;
};

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
    // 1) Find weak topics for this user (reusing the weak-topic logic)
    const { data: progress, error } = await supabaseAdmin
      .from("student_topic_progress")
      .select("topic_id, accuracy")
      .eq("user_id", userId)
      .lt("accuracy", 0.6);

    if (error) {
      console.error("repair-topics: progress error", error);
      return NextResponse.json(
        { ok: false, error: "Failed to load weak topics" },
        { status: 500 }
      );
    }

    if (!progress || progress.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const weakTopicIds = Array.from(
      new Set(progress.map((row) => row.topic_id).filter(Boolean))
    );

    if (weakTopicIds.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    // 2) Load weak topic names
    const { data: weakTopics, error: weakTopicsError } = await supabaseAdmin
      .from("micro_topics")
      .select("id, topic_name")
      .in("id", weakTopicIds);

    if (weakTopicsError) {
      console.error("repair-topics: weak topics error", weakTopicsError);
      return NextResponse.json(
        { ok: false, error: "Failed to load weak topic names" },
        { status: 500 }
      );
    }

    const weakTopicMap = new Map<number, string>(
      (weakTopics ?? []).map((t: any) => [t.id as number, t.topic_name as string])
    );

    // 3) For all weak topics, get their prerequisites
    const { data: deps, error: depsError } = await supabaseAdmin
      .from("topic_dependencies")
      .select("topic_id, prerequisite_topic_id")
      .in("topic_id", weakTopicIds);

    if (depsError) {
      console.error("repair-topics: dependencies error", depsError);
      return NextResponse.json(
        { ok: false, error: "Failed to load topic dependencies" },
        { status: 500 }
      );
    }

    const prereqIds = Array.from(
      new Set((deps ?? []).map((d: any) => d.prerequisite_topic_id).filter(Boolean))
    );

    let prereqMap = new Map<number, string>();

    if (prereqIds.length > 0) {
      const { data: prereqTopics, error: prereqError } = await supabaseAdmin
        .from("micro_topics")
        .select("id, topic_name")
        .in("id", prereqIds);

      if (prereqError) {
        console.error("repair-topics: prereq topics error", prereqError);
        return NextResponse.json(
          { ok: false, error: "Failed to load prerequisite topics" },
          { status: 500 }
        );
      }

      prereqMap = new Map(
        (prereqTopics ?? []).map((t: any) => [t.id as number, t.topic_name as string])
      );
    }

    // 4) Build repair suggestions per weak topic
    const byWeakTopic = new Map<number, number[]>();
    for (const d of deps ?? []) {
      const topicId = d.topic_id as number;
      const prereqId = d.prerequisite_topic_id as number;
      const list = byWeakTopic.get(topicId) ?? [];
      list.push(prereqId);
      byWeakTopic.set(topicId, list);
    }

    const items = weakTopicIds.map((id) => {
      const weakName = weakTopicMap.get(id) ?? `Topic ${id}`;
      const prereqs = (byWeakTopic.get(id) ?? []).map(
        (prereqId) => prereqMap.get(prereqId) ?? `Topic ${prereqId}`
      );
      return {
        weak_topic: weakName,
        repair_topics: Array.from(new Set(prereqs)),
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("repair-topics: unexpected error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

type ProgressRow = {
  topic_id: number;
  accuracy: number | null;
};

type MetadataRow = {
  topic_id: number;
  weightage: number | null;
  difficulty: number | null;
  importance_score?: number | null;
};

type RankRow = {
  topic_id: number;
  graph_rank: number | null;
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
    // 1) Student progress
    const { data: progress, error: progressError } = await supabaseAdmin
      .from("student_topic_progress")
      .select("topic_id, accuracy")
      .eq("user_id", userId);

    if (progressError) {
      console.error("study-plan: progress error", progressError);
      return NextResponse.json(
        { ok: false, error: "Failed to load progress" },
        { status: 500 }
      );
    }

    if (!progress || progress.length === 0) {
      return NextResponse.json({ ok: true, topics: [] });
    }

    const topicIds = Array.from(
      new Set(progress.map((row) => row.topic_id).filter(Boolean))
    ) as number[];

    if (topicIds.length === 0) {
      return NextResponse.json({ ok: true, topics: [] });
    }

    // 2) Metadata
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
      console.error("study-plan: metadata error", metaError);
      return NextResponse.json(
        { ok: false, error: "Failed to load topic metadata" },
        { status: 500 }
      );
    }

    if (rankError) {
      console.error("study-plan: rank error", rankError);
      return NextResponse.json(
        { ok: false, error: "Failed to load graph ranks" },
        { status: 500 }
      );
    }

    const metaMap = new Map<number, MetadataRow>();
    for (const row of (metadata ?? []) as any[]) {
      metaMap.set(row.topic_id as number, row as MetadataRow);
    }

    const rankMap = new Map<number, RankRow>();
    for (const row of (ranks ?? []) as any[]) {
      rankMap.set(row.topic_id as number, row as RankRow);
    }

    // 3) Topic names
    const { data: topicRows, error: topicsError } = await supabaseAdmin
      .from("micro_topics")
      .select("id, topic_name")
      .in("id", topicIds);

    if (topicsError) {
      console.error("study-plan: topics error", topicsError);
      return NextResponse.json(
        { ok: false, error: "Failed to load topic names" },
        { status: 500 }
      );
    }

    const topicNameMap = new Map<number, string>();
    for (const row of topicRows ?? []) {
      topicNameMap.set((row as any).id as number, (row as any).topic_name as string);
    }

    // 4) Compute priorities
    const items = (progress as ProgressRow[]).map((p) => {
      const meta = metaMap.get(p.topic_id);
      const rank = rankMap.get(p.topic_id);

      const weightage = meta?.weightage ?? 1;
      const difficulty = meta?.difficulty ?? 1;
      const graphRank = rank?.graph_rank ?? 1;
      const accuracy = typeof p.accuracy === "number" ? p.accuracy : 0;

      const priority =
        weightage *
        difficulty *
        (1 - Math.min(Math.max(accuracy, 0), 1)) *
        graphRank;

      return {
        topic_id: p.topic_id,
        topic_name: topicNameMap.get(p.topic_id) ?? `Topic ${p.topic_id}`,
        priority_score: priority,
      };
    });

    // 5) Sort and return top 5
    items.sort((a, b) => b.priority_score - a.priority_score);
    const top = items.slice(0, 5);

    return NextResponse.json({ ok: true, topics: top });
  } catch (err) {
    console.error("study-plan: unexpected error", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}


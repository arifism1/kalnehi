import { NextResponse } from "next/server";
import { fetchAllTopics, fetchTopicDependencies } from "@/src/db/topicQueries";
import { fetchUserProgress } from "@/src/db/progressQueries";
import { selectHighImpactTopics } from "@/src/engines/strategyEngine";
import { estimateScoreRange } from "@/src/engines/scorePredictor";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const hoursAvailable = Number(searchParams.get("hours") ?? "4");
    const daysLeft = Number(searchParams.get("daysLeft") ?? "60");

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const [topics, progress, dependencies, profile] = await Promise.all([
      fetchAllTopics(),
      fetchUserProgress(userId),
      fetchTopicDependencies(),
      supabaseAdmin
        .from("profiles")
        .select("triage_mode_active")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const triageModeActive =
      typeof profile.data?.triage_mode_active === "boolean"
        ? profile.data.triage_mode_active
        : false;

    const strategy = selectHighImpactTopics({
      topics,
      progress,
      dependencies,
      hoursAvailable,
      daysLeft,
      triageModeActive,
    });

    const scoreRange = estimateScoreRange({ topics, progress });

    const weakTopics = progress
      .filter((p) => p.mastery_score < 0.5)
      .slice(0, 20)
      .map((p) => {
        const t = topics.find((t) => t.id === p.topic_id);
        return {
          topic_id: p.topic_id,
          topic_name: t?.name ?? `Topic ${p.topic_id}`,
          status: p.status,
          mastery_score: p.mastery_score,
          accuracy: p.accuracy,
        };
      });

    return NextResponse.json({
      ok: true,
      topics: strategy.topics,
      total_study_minutes: strategy.total_study_minutes,
      projected_score: scoreRange,
      weak_topics: weakTopics,
    });
  } catch (error) {
    console.error("/api/strategy error", error);
    return NextResponse.json(
      { ok: false, error: "Failed to compute strategy" },
      { status: 500 }
    );
  }
}


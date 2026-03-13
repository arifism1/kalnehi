import { NextResponse } from "next/server";
import { fetchAllTopics, fetchTopicDependencies } from "@/src/db/topicQueries";
import { fetchUserProgress } from "@/src/db/progressQueries";
import { selectHighImpactTopics } from "@/src/engines/strategyEngine";
import { buildDailySchedule } from "@/src/engines/scheduleEngine";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const hoursPerDay = Number(searchParams.get("hours") ?? "4");

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const [topics, progress, dependencies] = await Promise.all([
      fetchAllTopics(),
      fetchUserProgress(userId),
      fetchTopicDependencies(),
    ]);

    const strategy = selectHighImpactTopics({
      topics,
      progress,
      dependencies,
      hoursAvailable: hoursPerDay,
      daysLeft: 1,
    });

    const studyTopics = strategy.topics.map((t) => ({
      topic_id: t.id,
      label: `${t.subject} – ${t.name}`,
      study_minutes: t.study_time,
      practice_minutes: t.practice_time,
    }));

    // Simple heuristic: dedicate 20% of time to revision.
    const totalMinutes = hoursPerDay * 60;
    const revisionMinutes = Math.round(totalMinutes * 0.2);

    const tasks = buildDailySchedule({
      userId,
      hoursPerDay,
      studyTopics,
      revisionMinutes,
    });

    return NextResponse.json({
      ok: true,
      tasks,
    });
  } catch (error) {
    console.error("/api/daily-plan error", error);
    return NextResponse.json(
      { ok: false, error: "Failed to build daily plan" },
      { status: 500 }
    );
  }
}


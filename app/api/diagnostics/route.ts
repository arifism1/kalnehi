import { NextResponse } from "next/server";
import { fetchAllTopics } from "@/src/db/topicQueries";
import { fetchUserProgress } from "@/src/db/progressQueries";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const [topics, progress] = await Promise.all([
      fetchAllTopics(),
      fetchUserProgress(userId),
    ]);

    // Weakness analysis: lowest mastery and accuracy topics.
    const progressWithTopic = progress
      .map((p) => {
        const t = topics.find((t) => t.id === p.topic_id);
        return t
          ? {
              topic_id: p.topic_id,
              topic_name: t.name,
              subject: t.subject,
              mastery_score: p.mastery_score,
              accuracy: p.accuracy,
              status: p.status,
            }
          : null;
      })
      .filter(Boolean) as {
      topic_id: number;
      topic_name: string;
      subject: string;
      mastery_score: number;
      accuracy: number;
      status: string;
    }[];

    progressWithTopic.sort((a, b) => a.mastery_score - b.mastery_score);
    const weakest = progressWithTopic.slice(0, 10);

    return NextResponse.json({
      ok: true,
      weak_topics: weakest,
    });
  } catch (error) {
    console.error("/api/diagnostics error", error);
    return NextResponse.json(
      { ok: false, error: "Failed to run diagnostics" },
      { status: 500 }
    );
  }
}


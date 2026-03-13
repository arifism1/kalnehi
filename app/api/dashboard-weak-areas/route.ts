import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getAuthFromRequest } from "@/lib/auth-server";

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req);

  if (!auth?.userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = auth.userId;
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  try {
    const [weakProgress, upcomingRev] = await Promise.all([
      supabaseAdmin
        .from("user_topic_progress")
        .select(
          "topic_id, mastery_score, accuracy, status, micro_topics!inner(id, topic_name, subject)"
        )
        .lt("mastery_score", 0.5),
      supabaseAdmin
        .from("revision_schedule")
        .select(
          "topic_id, next_revision_date, micro_topics!inner(id, topic_name, subject)"
        )
        .gte("next_revision_date", todayStr)
        .order("next_revision_date", { ascending: true })
        .limit(10),
    ]);

    const weakTopics =
      (weakProgress.data ?? []).map((row: any) => ({
        topic_id: row.topic_id,
        topic_name: row.micro_topics.topic_name,
        subject: row.micro_topics.subject,
        mastery_score: row.mastery_score,
        accuracy: row.accuracy,
        status: row.status,
      })) ?? [];

    const upcomingRevisions =
      (upcomingRev.data ?? []).map((row: any) => ({
        topic_id: row.topic_id,
        topic_name: row.micro_topics.topic_name,
        subject: row.micro_topics.subject,
        next_revision_date: row.next_revision_date,
      })) ?? [];

    return NextResponse.json({
      ok: true,
      weak_topics: weakTopics,
      upcoming_revisions: upcomingRevisions,
    });
  } catch (error) {
    console.error("/api/dashboard-weak-areas error", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load weak areas" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getAuthFromRequest } from "@/lib/auth-server";
import { toDatabaseTopicId } from "@/lib/topic-id";

export async function POST(request: Request) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = auth.userId;

  try {
    const body = await request.json();
    const topicId = body?.topic_id;
    const databaseTopicId = toDatabaseTopicId(topicId);

    if (databaseTopicId == null) {
      return NextResponse.json(
        { error: "Missing or invalid topic_id" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("user_progress").upsert(
      {
        user_id: userId,
        topic_id: databaseTopicId,
        status: "completed",
        next_revision_date: null,
      },
      {
        onConflict: "user_id,topic_id",
      }
    );

    if (error) {
      console.error("user_progress upsert error:", error);
      return NextResponse.json(
        { error: "Failed to mark topic mastered" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/master-topic error:", err);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}

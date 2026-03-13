import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getAuthFromRequest } from "@/lib/auth-server";
import { toDatabaseTopicId } from "@/lib/topic-id";

export async function POST(request: Request) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { topicId, isMastered } = await request.json();
    const databaseTopicId = toDatabaseTopicId(topicId);

    if (databaseTopicId == null) {
      return NextResponse.json({ error: "Invalid topicId" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("user_progress")
      .upsert({
        user_id: auth.userId,
        topic_id: databaseTopicId,
        is_mastered: isMastered,
        last_studied_at: new Date().toISOString()
      }, { onConflict: 'user_id, topic_id' });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
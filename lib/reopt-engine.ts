import { supabaseAdmin } from "@/lib/supabase-server";

type DailyTask = {
  id?: string;
  user_id: string;
  topic_id?: string | null;
  subject: string;
  topic: string;
  duration_minutes: number;
  scheduled_date: string;
  status: "pending" | "done" | "skipped";
};

export async function reoptimizeDailyPlan(userId: string) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Algorithmic forgiveness: treat 1 day out of every 14 as a buffer day
  // where we intentionally avoid pulling missed tasks forward. This absorbs
  // delays without treating them as failures.
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  const isBufferDay = daysSinceEpoch % 14 === 13;

  const { data: tasks } = await supabaseAdmin
    .from("daily_tasks")
    .select("*")
    .eq("user_id", userId)
    .lte("scheduled_date", todayStr);

  if (!tasks || tasks.length === 0) {
    return [];
  }

  const missed = (tasks as DailyTask[]).filter(
    (t) => t.status !== "done" && t.scheduled_date < todayStr
  );

  if (!missed.length) return [];

  if (isBufferDay) {
    // On buffer days we leave space intentionally and do not pull tasks forward.
    return [];
  }

  const pushed: DailyTask[] = missed.map((t) => ({
    ...t,
    id: undefined,
    scheduled_date: todayStr,
    status: "pending",
  }));

  await supabaseAdmin.from("daily_tasks").insert(pushed);

  return pushed;
}


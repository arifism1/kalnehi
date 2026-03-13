import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAuthFromRequest } from "@/lib/auth-server"
import type { PlannerPreferences } from "@/lib/planner-generator"
import { planDay } from "@/lib/strategy-engine"
import { toDatabaseTopicId } from "@/lib/topic-id"

// Annotate each plan task with a stable temporary id derived from topic_id + index.
// This lets the timer and task cards work even when daily_tasks is unavailable.
function withTempIds(tasks: any[]) {
  return tasks.map((task, index) => ({
    ...task,
    id: task.id ?? `temp-${task.topic_id ?? "task"}-${index}`,
    status: task.status ?? "pending",
  }))
}

// Tries to read or write daily_tasks.
// Returns { tasks, persisted } — tasks are always present, persisted=false means DB was unavailable.
async function syncDailyTasks(
  userId: string,
  today: string,
  planTasks: any[]
): Promise<{ tasks: any[]; persisted: boolean }> {
  try {
    // Return today's existing tasks if they are already there
    const { data: existingTasks, error: fetchError } = await supabaseAdmin
      .from("daily_tasks")
      .select("id, topic_id, subject, topic, duration_minutes, status")
      .eq("user_id", userId)
      .eq("scheduled_date", today)

    if (fetchError) throw fetchError

    if ((existingTasks ?? []).length > 0) {
      return { tasks: existingTasks!, persisted: true }
    }

    // No tasks today — delete stale rows and insert fresh ones
    await supabaseAdmin
      .from("daily_tasks")
      .delete()
      .eq("user_id", userId)
      .eq("scheduled_date", today)

    if (planTasks.length === 0) return { tasks: [], persisted: true }

    const { data: insertedTasks, error: insertError } = await supabaseAdmin
      .from("daily_tasks")
      .insert(
        planTasks.map((task: any) => ({
          user_id: userId,
          topic_id: toDatabaseTopicId(task.topic_id),
          subject: task.subject,
          topic: task.topic,
          duration_minutes: task.duration ?? task.duration_minutes ?? 25,
          scheduled_date: today,
        }))
      )
      .select("id, topic_id, subject, topic, duration_minutes, status")

    if (insertError) throw insertError

    return { tasks: insertedTasks ?? [], persisted: true }
  } catch (err) {
    // daily_tasks unavailable (schema cache miss, table missing, etc.)
    // Return plan tasks with temp ids so the UI still works.
    console.warn("daily_tasks unavailable — returning plan without DB persistence:", err)
    return { tasks: withTempIds(planTasks), persisted: false }
  }
}

async function buildPlanPayload({
  userId,
  today,
  availableMinutes,
  preferences,
}: {
  userId: string
  today: string
  availableMinutes: number
  preferences?: PlannerPreferences
}) {
  const { source, plan, tasks: planTasks } = await planDay(userId, {
    availableMinutes,
    preferences,
  })

  const { tasks, persisted } = await syncDailyTasks(userId, today, planTasks)

  return {
    ok: true,
    ...plan,
    tasks,
    persisted,
    source,
    summary:
      source === "ai"
        ? "AI generated a backup study plan for today."
        : plan.summary,
    notes:
      source === "ai" && (!plan.notes || plan.notes.length === 0)
        ? [
            "Database planner had no usable topics, so Kalnehi generated a high-impact fallback plan.",
          ]
        : plan.notes,
  }
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthFromRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const userId = auth.userId
    const today = new Date().toISOString().split("T")[0]

    const payload = await buildPlanPayload({
      userId,
      today,
      availableMinutes: 120,
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error("GET /api/generate-plan failed", error)
    return NextResponse.json({ ok: false, error: "Failed to generate plan" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthFromRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const today = new Date().toISOString().split("T")[0]
    const payload = await buildPlanPayload({
      userId: auth.userId,
      today,
      availableMinutes: body.availableMinutes,
      preferences: {
        availableMinutes: body.availableMinutes,
        energyLevel: body.energyLevel,
        weakSubjects: body.weakSubjects,
        strongSubjects: body.strongSubjects,
        priorityTopics: body.priorityTopics,
        blockers: body.blockers,
        fullContext: body.fullContext,
      },
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error("POST /api/generate-plan failed", error)
    return NextResponse.json({ ok: false, error: "Failed to generate plan" }, { status: 500 })
  }
}
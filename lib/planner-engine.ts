import { PriorityTopic } from "./priority-engine"

export type StudyTask = {
  subject: string
  topic: string
  topic_id: string
  duration: number
}

type PlanGenerationOptions = {
  energyLevel?: "low" | "medium" | "high"
  maxTasks?: number
}

export function generateDailyPlan(
  topics: PriorityTopic[],
  availableMinutes: number,
  options: PlanGenerationOptions = {}
): StudyTask[] {

  const tasks: StudyTask[] = []

  let remaining = availableMinutes
  const taskCap = options.maxTasks ?? 5
  const energyMultiplier =
    options.energyLevel === "low"
      ? 0.85
      : options.energyLevel === "high"
        ? 1.15
        : 1

  for (const topic of topics) {

    if (remaining <= 0 || tasks.length >= taskCap) break

    const baseDuration = topic.difficulty > 3 ? 40 : 25
    const duration = Math.max(20, Math.round(baseDuration * energyMultiplier / 5) * 5)

    if (duration > remaining) continue

    tasks.push({
      subject: topic.subject,
      topic: topic.topic,
      topic_id: String(topic.id),
      duration
    })

    remaining -= duration
  }

  return tasks
}

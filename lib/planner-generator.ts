import { calculateTopicPriority } from "./priority-engine"
import { generateDailyPlan } from "./planner-engine"
import type { MicroTopic, PriorityTopic, UserProgress } from "./priority-engine"
import { normalizeTopicId } from "./topic-id"

type RevisionTask = {
  topic_id: string
  next_revision?: string
}

export type PlannerPreferences = {
  availableMinutes?: number
  energyLevel?: "low" | "medium" | "high"
  weakSubjects?: string[]
  strongSubjects?: string[]
  priorityTopics?: string[]
  blockers?: string
  fullContext?: string
}

type BuildPlannerInput = {
  topics: MicroTopic[]
  progress: UserProgress[]
  revisions: RevisionTask[]
  availableMinutes?: number
  preferences?: PlannerPreferences
}

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase()
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map(normalize).filter(Boolean))]
}

function parseAvailableMinutes(text: string) {
  const normalized = text.toLowerCase()
  const hoursMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs)/)
  const minutesMatch = normalized.match(/(\d+)\s*(minute|minutes|min|mins)/)

  let total = 0

  if (hoursMatch) total += Math.round(Number(hoursMatch[1]) * 60)
  if (minutesMatch) total += Number(minutesMatch[1])

  return total > 0 ? total : null
}

function matchTopicPreferences(topics: MicroTopic[], phrases: string[]) {
  if (!phrases.length) return new Set<string>()

  const matchedTopicIds = new Set<string>()

  for (const topic of topics) {
    const topicText = `${topic.subject ?? ""} ${topic.chapter ?? ""} ${topic.topic ?? ""}`.toLowerCase()

    for (const phrase of phrases) {
      if (!phrase) continue
      if (topicText.includes(phrase)) {
        matchedTopicIds.add(normalizeTopicId(topic.id))
      }
    }
  }

  return matchedTopicIds
}

function buildRevisionTasks(revisions: RevisionTask[], topics: MicroTopic[]) {
  const topicMap = new Map(topics.map((topic) => [normalizeTopicId(topic.id), topic]))

  return revisions.map((revision) => {
    const topic = topicMap.get(normalizeTopicId(revision.topic_id))

    return {
      subject: topic?.subject ?? "Revision",
      topic: topic ? `Revise ${topic.chapter}: ${topic.topic}` : `Revise Topic ${revision.topic_id}`,
      topic_id: normalizeTopicId(revision.topic_id),
      duration: 20
    }
  })
}

function buildPlannerSummary({
  availableMinutes,
  weakSubjects,
  priorityTopics,
  blockers,
  fullContext
}: {
  availableMinutes: number
  weakSubjects: string[]
  priorityTopics: string[]
  blockers: string
  fullContext: string
}) {
  const parts = [`Built for ${availableMinutes} minutes today`]

  if (weakSubjects.length) {
    parts.push(`extra focus on ${weakSubjects.join(", ")}`)
  }

  if (priorityTopics.length) {
    parts.push(`must-cover requests: ${priorityTopics.join(", ")}`)
  }

  if (blockers) {
    parts.push(`blockers noted: ${blockers}`)
  } else if (fullContext) {
    parts.push("based on your full prep story")
  }

  return parts.join(" • ")
}

export function buildPlanner({
  topics,
  progress,
  revisions,
  availableMinutes,
  preferences
}: BuildPlannerInput) {
  const fullContext = preferences?.fullContext?.trim() ?? ""
  const preferenceMinutes = preferences?.availableMinutes
  const parsedMinutes = fullContext ? parseAvailableMinutes(fullContext) : null
  const finalAvailableMinutes = Math.max(
    30,
    Math.min(preferenceMinutes ?? availableMinutes ?? parsedMinutes ?? 120, 360)
  )

  const weakSubjects = uniqueStrings(preferences?.weakSubjects ?? [])
  const strongSubjects = uniqueStrings(preferences?.strongSubjects ?? [])
  const blockers = preferences?.blockers?.trim().toLowerCase() ?? ""
  const priorityTopicPhrases = uniqueStrings(preferences?.priorityTopics ?? [])
  const contextMatchedTopics = matchTopicPreferences(
    topics,
    fullContext
      .split(/[\n,.;]/)
      .map((part) => normalize(part))
      .filter((part) => part.length >= 4)
  )
  const directTopicMatches = matchTopicPreferences(topics, priorityTopicPhrases)

  const ranked = calculateTopicPriority(topics, progress, 60).map((topic) => {
    let priority = topic.priority
    const subjectName = normalize(topic.subject)
    const chapterName = normalize(topic.chapter)
    const topicName = normalize(topic.topic)

    if (weakSubjects.includes(subjectName)) priority += 7
    if (strongSubjects.includes(subjectName)) priority -= 2
    if (blockers && (topicName.includes(blockers) || chapterName.includes(blockers))) priority += 8
    if (blockers && blockers.includes(topicName)) priority += 6
    if (directTopicMatches.has(normalizeTopicId(topic.id))) priority += 10
    if (contextMatchedTopics.has(normalizeTopicId(topic.id))) priority += 6
    if (fullContext.includes("start from beginning") || fullContext.includes("from the beginning")) {
      priority += topic.difficulty <= 3 ? 2 : -1
    }

    return {
      ...topic,
      priority
    }
  }).sort((a, b) => b.priority - a.priority)

  const revisionTasks = buildRevisionTasks(revisions, topics)
  const revisionMinutes = revisionTasks.length * 20
  const reservedRevisionMinutes = Math.min(
    revisionMinutes,
    Math.round(finalAvailableMinutes * 0.4)
  )
  const studyMinutes = Math.max(finalAvailableMinutes - reservedRevisionMinutes, 25)

  const studyTasks = generateDailyPlan(ranked as PriorityTopic[], studyMinutes, {
    energyLevel: preferences?.energyLevel,
    maxTasks: finalAvailableMinutes >= 180 ? 6 : 4
  })

  const notes = [
    weakSubjects.length ? `Weak areas prioritized: ${weakSubjects.join(", ")}.` : null,
    priorityTopicPhrases.length ? `Requested topics pulled forward: ${priorityTopicPhrases.join(", ")}.` : null,
    blockers ? `Blocker considered while ranking: ${blockers}.` : null,
    fullContext ? "Your free-form prep summary was used to detect chapters and urgency." : null
  ].filter(Boolean)

  return {
    tasks: [...revisionTasks, ...studyTasks],
    summary: buildPlannerSummary({
      availableMinutes: finalAvailableMinutes,
      weakSubjects,
      priorityTopics: priorityTopicPhrases,
      blockers: preferences?.blockers?.trim() ?? "",
      fullContext
    }),
    notes,
    availableMinutes: finalAvailableMinutes
  }
}
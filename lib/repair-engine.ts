import { supabaseAdmin } from "@/lib/supabase-server"

type TopicNode = {
  id: string
  subject: string | null
  chapter: string | null
  topic: string | null
}

type DiagnosticFrame = {
  topic_id: string
  remaining_dependency_ids: string[]
  found_weak: boolean
}

export type DiagnosticSession = {
  root_topic: string
  current_topic: string
  checked_topics: string[]
  weak_topics: string[]
  pending_topics: string[]
  stack: DiagnosticFrame[]
}

type DiagnosticPromptResult = {
  type: "diagnostic"
  topic: string
  topic_id: string
  question: string
  session: DiagnosticSession
}

type RepairPathTask = {
  topic_id: string
  subject: string
  topic: string
  duration_minutes: number
}

type RepairPathResult = {
  type: "repair"
  text: string
  tasks: RepairPathTask[]
  weakTopicIds: string[]
}

type DiagnosticResult = DiagnosticPromptResult | RepairPathResult

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))]
}

function topicLabel(topic: TopicNode | null | undefined) {
  if (!topic) return "this concept"
  return topic.topic || topic.chapter || topic.subject || "this concept"
}

async function getTopicsByIds(topicIds: string[]) {
  const ids = uniqueIds(topicIds)
  if (ids.length === 0) return []

  const { data } = await supabaseAdmin
    .from("micro_topics")
    .select("id, subject, chapter, topic")
    .in("id", ids)

  return (data ?? []) as TopicNode[]
}

async function getTopicById(topicId: string) {
  const topics = await getTopicsByIds([topicId])
  return topics[0] ?? null
}

export async function getDependencies(topicId: string) {
  const { data: dependencyRows } = await supabaseAdmin
    .from("topic_dependencies")
    .select("prerequisite_topic_id")
    .eq("topic_id", topicId)

  const prerequisiteIds = uniqueIds(
    (dependencyRows ?? []).map((row) => row.prerequisite_topic_id)
  )

  if (prerequisiteIds.length === 0) return []

  const topics = await getTopicsByIds(prerequisiteIds)
  const topicMap = new Map(topics.map((topic) => [topic.id, topic]))

  return prerequisiteIds
    .map((id) => topicMap.get(id))
    .filter(Boolean) as TopicNode[]
}

function markFramesWeak(stack: DiagnosticFrame[]) {
  for (const frame of stack) {
    frame.found_weak = true
  }
}

async function buildDiagnosticPrompt(session: DiagnosticSession): Promise<DiagnosticPromptResult> {
  const currentTopic = await getTopicById(session.current_topic)

  return {
    type: "diagnostic",
    topic: topicLabel(currentTopic),
    topic_id: session.current_topic,
    question: `Are you comfortable with ${topicLabel(currentTopic)}?`,
    session,
  }
}

async function loadDependencyTree(
  topicId: string,
  parentMap: Map<string, string>,
  visited = new Set<string>()
) {
  if (visited.has(topicId)) return
  visited.add(topicId)

  const dependencies = await getDependencies(topicId)
  for (const dependency of dependencies) {
    if (!parentMap.has(dependency.id)) {
      parentMap.set(dependency.id, topicId)
    }
    await loadDependencyTree(dependency.id, parentMap, visited)
  }
}

async function buildRepairTasks(rootTopicId: string, weakTopicIds: string[]) {
  const effectiveWeakIds = uniqueIds(weakTopicIds.length > 0 ? weakTopicIds : [rootTopicId])
  const parentMap = new Map<string, string>()

  await loadDependencyTree(rootTopicId, parentMap)

  const orderedTopicIds: string[] = []
  const seen = new Set<string>()

  for (const weakId of effectiveWeakIds) {
    const path: string[] = []
    let current: string | undefined = weakId

    while (current) {
      path.push(current)
      if (current === rootTopicId) break
      current = parentMap.get(current)
    }

    for (const topicId of path) {
      if (!seen.has(topicId)) {
        seen.add(topicId)
        orderedTopicIds.push(topicId)
      }
    }
  }

  const topics = await getTopicsByIds(orderedTopicIds)
  const topicMap = new Map(topics.map((topic) => [topic.id, topic]))

  return orderedTopicIds.map((topicId) => {
    const topic = topicMap.get(topicId)
    return {
      topic_id: topicId,
      subject: topic?.subject ?? "Repair",
      topic: topicLabel(topic),
      duration_minutes: 25,
    }
  })
}

async function buildRepairResult(rootTopicId: string, weakTopicIds: string[]): Promise<RepairPathResult> {
  const tasks = await buildRepairTasks(rootTopicId, weakTopicIds)

  return {
    type: "repair",
    text: "Fix these concepts in order.",
    tasks,
    weakTopicIds: uniqueIds(weakTopicIds.length > 0 ? weakTopicIds : [rootTopicId]),
  }
}

export async function startDiagnosticSession(rootTopicId: string): Promise<DiagnosticResult> {
  const dependencies = await getDependencies(rootTopicId)

  if (dependencies.length === 0) {
    return buildRepairResult(rootTopicId, [rootTopicId])
  }

  const [firstDependency, ...restDependencies] = dependencies
  const session: DiagnosticSession = {
    root_topic: rootTopicId,
    current_topic: firstDependency.id,
    checked_topics: [],
    weak_topics: [],
    pending_topics: restDependencies.map((topic) => topic.id),
    stack: [
      {
        topic_id: rootTopicId,
        remaining_dependency_ids: restDependencies.map((topic) => topic.id),
        found_weak: false,
      },
    ],
  }

  return buildDiagnosticPrompt(session)
}

export async function continueDiagnosticSession(
  session: DiagnosticSession,
  answer: "yes" | "not_really"
): Promise<DiagnosticResult> {
  const nextSession: DiagnosticSession = {
    root_topic: session.root_topic,
    current_topic: session.current_topic,
    checked_topics: uniqueIds([...session.checked_topics, session.current_topic]),
    weak_topics: uniqueIds(session.weak_topics),
    pending_topics: [...session.pending_topics],
    stack: session.stack.map((frame) => ({
      topic_id: frame.topic_id,
      remaining_dependency_ids: [...frame.remaining_dependency_ids],
      found_weak: frame.found_weak,
    })),
  }

  if (answer === "not_really") {
    const dependencies = await getDependencies(nextSession.current_topic)

    if (dependencies.length > 0) {
      const [firstDependency, ...restDependencies] = dependencies
      nextSession.stack.push({
        topic_id: nextSession.current_topic,
        remaining_dependency_ids: restDependencies.map((topic) => topic.id),
        found_weak: false,
      })
      nextSession.current_topic = firstDependency.id
      nextSession.pending_topics = restDependencies.map((topic) => topic.id)
      return buildDiagnosticPrompt(nextSession)
    }

    nextSession.weak_topics = uniqueIds([...nextSession.weak_topics, nextSession.current_topic])
    markFramesWeak(nextSession.stack)
  }

  while (nextSession.stack.length > 0) {
    const frame = nextSession.stack[nextSession.stack.length - 1]

    if (frame.remaining_dependency_ids.length > 0) {
      const nextTopicId = frame.remaining_dependency_ids.shift()!
      nextSession.current_topic = nextTopicId
      nextSession.pending_topics = [...frame.remaining_dependency_ids]
      return buildDiagnosticPrompt(nextSession)
    }

    const completedFrame = nextSession.stack.pop()!

    if (!completedFrame.found_weak && completedFrame.topic_id !== nextSession.root_topic) {
      nextSession.weak_topics = uniqueIds([
        ...nextSession.weak_topics,
        completedFrame.topic_id,
      ])
      markFramesWeak(nextSession.stack)
    }
  }

  return buildRepairResult(nextSession.root_topic, nextSession.weak_topics)
}

export async function scheduleRepairPath(
  topicId: string,
  userId: string
) {

  // get prerequisite topics
  const { data: dependencies } = await supabaseAdmin
    .from("topic_dependencies")
    .select("prerequisite_topic_id")
    .eq("topic_id", topicId)

  if (!dependencies || dependencies.length === 0) {
    return []
  }

  const prerequisiteIds = dependencies.map(
    (d) => d.prerequisite_topic_id
  )

  // check user mastery
  const { data: progress } = await supabaseAdmin
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .in("topic_id", prerequisiteIds)

  const weakTopics =
    progress?.filter((p) => !p.is_mastered) ?? []

  if (weakTopics.length === 0) {
    return []
  }

  const today = new Date().toISOString().split("T")[0]

  const repairTasks = weakTopics.map((p) => ({
    user_id: userId,
    topic_id: p.topic_id,
    subject: "Repair",
    topic: "Repair prerequisite topic",
    duration_minutes: 25,
    scheduled_date: today,
    status: "pending"
  }))

  await supabaseAdmin
    .from("daily_tasks")
    .insert(repairTasks)

  return repairTasks
}
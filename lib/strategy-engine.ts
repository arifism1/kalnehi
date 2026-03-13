import { supabaseAdmin } from "@/lib/supabase-server"
import { buildPlanner } from "./planner-generator"
import type { MicroTopic, UserProgress } from "./priority-engine"
import { reoptimizeDailyPlan } from "./reopt-engine"
import {
  continueDiagnosticSession,
  startDiagnosticSession,
  type DiagnosticSession,
} from "./repair-engine"
import { normalizeTopicId } from "./topic-id"

export type StrategyInput = {
  daysLeft: number;
  targetScore?: number;
  topics: {
    id: string;
    subject: string;
    chapter: string;
    topic: string;
    weightage: number;
    difficulty: number;
  }[];
  progress: {
    topic_id: string;
    is_mastered: boolean;
    confidence?: number | null;
  }[];
  studyEvents?: {
    topic_id: string | null;
    event_type: "started" | "completed" | "skipped";
    duration_minutes: number | null;
    difficulty_rating: number | null;
    created_at: string;
  }[];
};

export type HighImpactTopic = {
  id: string;
  subject: string;
  chapter: string;
  topic: string;
  priority: number;
  reason: string;
};

export type StrategySummary = {
  examLevel: "behind" | "on_track" | "ahead";
  coveragePercent: number;
  highImpact: {
    subject: string;
    topics: HighImpactTopic[];
  }[];
};

export function computeStrategy(input: StrategyInput): StrategySummary {
  const { daysLeft, topics, progress, studyEvents = [] } = input;

  if (!topics.length) {
    return {
      examLevel: "behind",
      coveragePercent: 0,
      highImpact: [],
    };
  }

  const progressMap = new Map(
    progress.map((p) => [p.topic_id, p as Required<StrategyInput>["progress"][number]])
  );

  const eventsByTopic = new Map<
    string,
    NonNullable<StrategyInput["studyEvents"]>[number][]
  >();

  for (const ev of studyEvents) {
    if (!ev.topic_id) continue;
    const list = eventsByTopic.get(ev.topic_id) ?? [];
    list.push(ev);
    eventsByTopic.set(ev.topic_id, list);
  }

  const scored: HighImpactTopic[] = topics.map((t) => {
    const p = progressMap.get(t.id);

    const isMastered = p?.is_mastered ?? false;
    const confidence = p?.confidence ?? 0.3;

    const masteryFactor = isMastered ? -5 : 5;
    const weaknessFactor = 1 - confidence;
    const urgencyFactor = Math.min(30 / Math.max(daysLeft, 1), 3);
    const weightageFactor = t.weightage * 2;
    const difficultyFactor = t.difficulty;

    const events = eventsByTopic.get(t.id) ?? [];
    const attempts = events.length;
    const totalDuration = events.reduce(
      (sum, ev) => sum + (ev.duration_minutes ?? 0),
      0
    );
    const avgDuration = attempts > 0 ? totalDuration / attempts : 0;

    let behaviourBoost = 0;
    if (!isMastered && attempts >= 3) {
      behaviourBoost += 3;
    }
    if (!isMastered && attempts >= 5) {
      behaviourBoost += 2;
    }
    if (!isMastered && avgDuration >= 45) {
      behaviourBoost += 2;
    }
    if (isMastered && attempts >= 2 && avgDuration > 0 && avgDuration <= 30) {
      behaviourBoost -= 2;
    }

    const priority =
      weightageFactor +
      masteryFactor +
      weaknessFactor * 5 +
      urgencyFactor +
      difficultyFactor +
      behaviourBoost;

    let reason = "High scoring potential topic.";
    if (!isMastered && attempts >= 4) {
      reason = `You have attempted this topic ${attempts} times and it's still not stable—fix this early.`;
    } else if (!isMastered && weaknessFactor > 0.4) {
      reason = "High marks with significant weakness—fix this early.";
    } else if (!isMastered && difficultyFactor >= 3) {
      reason = "Moderately hard but high-yield topic.";
    } else if (isMastered) {
      reason = "Already strong—only light revision needed.";
    }

    return {
      id: t.id,
      subject: t.subject,
      chapter: t.chapter,
      topic: t.topic,
      priority,
      reason,
    };
  });

  scored.sort((a, b) => b.priority - a.priority);

  const masteredCount = progress.filter((p) => p.is_mastered).length;
  const coveragePercent = Math.round(
    (topics.length ? (masteredCount / topics.length) * 100 : 0) * 10
  ) / 10;

  let examLevel: StrategySummary["examLevel"] = "behind";
  if (coveragePercent >= 70) examLevel = "ahead";
  else if (coveragePercent >= 40) examLevel = "on_track";

  const grouped = new Map<string, HighImpactTopic[]>();
  for (const s of scored.slice(0, 15)) {
    const list = grouped.get(s.subject) ?? [];
    list.push(s);
    grouped.set(s.subject, list);
  }

  const highImpact = Array.from(grouped.entries()).map(
    ([subject, subjectTopics]) => ({
      subject,
      topics: subjectTopics,
    })
  );

  return {
    examLevel,
    coveragePercent,
    highImpact,
  };
}

// High-level orchestrators

type PlanDayOptions = {
  availableMinutes?: number
  preferences?: import("./planner-generator").PlannerPreferences
}

export async function planDay(userId: string, options: PlanDayOptions = {}) {
  const today = new Date().toISOString().split("T")[0]

  const [{ data: topics }, { data: progress }, { data: revisions }] = await Promise.all([
    supabaseAdmin.from("micro_topics").select("*"),
    supabaseAdmin.from("user_progress").select("*").eq("user_id", userId),
    supabaseAdmin.from("revision_queue").select("*").eq("user_id", userId).lte("next_revision", today),
  ])

  const baseMinutes = options.availableMinutes ?? 120

  const plan = buildPlanner({
    topics: (topics ?? []) as MicroTopic[],
    progress: (progress ?? []) as UserProgress[],
    revisions: (revisions ?? []).map((r: any) => ({
      topic_id: normalizeTopicId(r.topic_id),
      next_revision: r.next_revision ?? undefined,
    })),
    availableMinutes: baseMinutes,
    preferences: options.preferences,
  })

  const source: "database" = "database"
  const tasks: any[] = plan.tasks ?? []

  return {
    source,
    plan,
    tasks,
    today,
  }
}

export async function diagnoseConcept(
  topicId: string,
  session?: DiagnosticSession,
  answer?: "yes" | "not_really"
) {
  if (session && answer) {
    return continueDiagnosticSession(session, answer)
  }

  return startDiagnosticSession(topicId)
}

export async function generateRepairPathFromWeakness(
  rootTopicId: string,
  session: DiagnosticSession
) {
  // Reuse continueDiagnosticSession until it yields a repair result
  const result = await continueDiagnosticSession(session, "not_really")
  return result
}

export async function computeStrategyForUser(userId: string, daysLeft: number) {
  const [{ data: topics }, { data: progress }, { data: studyEvents }] = await Promise.all([
    supabaseAdmin.from("micro_topics").select("*"),
    supabaseAdmin.from("user_progress").select("*").eq("user_id", userId),
    supabaseAdmin.from("study_events").select("*").eq("user_id", userId),
  ])

  const summary = computeStrategy({
    daysLeft,
    topics: (topics ?? []) as any,
    progress: (progress ?? []) as any,
    studyEvents: (studyEvents ?? []) as any,
  })

  const reoptimizedTasks = await reoptimizeDailyPlan(userId)

  return {
    summary,
    reoptimizedTasks,
  }
}

// Depth-Aware Scheduling Engine: Return-on-Effort–based daily plan

export type TopicStatus = "not_started" | "studying" | "practicing" | "mastered";

export type DepthTopic = {
  id: number;
  subject: string;
  topic_name: string;
  status: TopicStatus;
  weightage_score: number;
  est_mastery_minutes: number;
  practice_minutes: number;
  prerequisites: number[];
};

export type DueRevision = {
  topicId: number;
  subject: string;
  topicName: string;
  minutes: number;
};

export type PlannedTaskKind = "revision" | "study" | "practice";

export type PlannedTask = {
  kind: PlannedTaskKind;
  topicId: number;
  subject: string;
  topicName: string;
  durationMinutes: number;
};

export type DailyPlan = {
  totalMinutesPlanned: number;
  revisions: PlannedTask[];
  newTopics: PlannedTask[];
};

export function generateDailyPlan(params: {
  availableMinutesToday: number;
  allTopics: DepthTopic[];
  dueRevisions: DueRevision[];
  triageModeActive: boolean;
}): DailyPlan {
  const { availableMinutesToday, allTopics, dueRevisions, triageModeActive } =
    params;

  let remainingMinutes = Math.max(availableMinutesToday, 0);
  const revisions: PlannedTask[] = [];

  // 1. Deduct time for due revisions first.
  for (const rev of dueRevisions) {
    if (remainingMinutes <= 0) break;
    const minutes = Math.min(rev.minutes, remainingMinutes);
    if (minutes <= 0) continue;
    revisions.push({
      kind: "revision",
      topicId: rev.topicId,
      subject: rev.subject,
      topicName: rev.topicName,
      durationMinutes: minutes,
    });
    remainingMinutes -= minutes;
  }

  if (remainingMinutes <= 0) {
    return {
      totalMinutesPlanned: availableMinutesToday,
      revisions,
      newTopics: [],
    };
  }

  // 2. Filter topics: not mastered and all prerequisites mastered.
  const statusById = new Map<number, TopicStatus>(
    allTopics.map((t) => [t.id, t.status])
  );

  let candidates = allTopics.filter((topic) => {
    if (topic.status === "mastered") return false;
    const prereqs = topic.prerequisites ?? [];
    for (const pid of prereqs) {
      const st = statusById.get(pid) ?? "not_started";
      if (st !== "mastered") return false;
    }
    return true;
  });

  // 3. Triage filter: drop topics with low weightage_score when active.
  if (triageModeActive) {
    candidates = candidates.filter((t) => (t.weightage_score ?? 0) >= 3);
  }

  // 4. Compute ROE and sort strictly by ROE descending.
  type Scored = DepthTopic & { roe: number };

  const scored: Scored[] = candidates.map((t) => {
    const weight = t.weightage_score ?? 0;
    const baseMinutes = t.est_mastery_minutes || 0;
    const practice = t.practice_minutes || 0;
    const denom = Math.max(baseMinutes + practice, 1);
    const roe = weight / denom;
    return { ...t, roe };
  });

  scored.sort((a, b) => b.roe - a.roe);

  const newTopics: PlannedTask[] = [];

  // 5. Greedily pack remaining minutes by ROE.
  for (const t of scored) {
    if (remainingMinutes <= 0) break;

    const theory = t.est_mastery_minutes || 0;
    const practice = t.practice_minutes || 0;
    const totalNeeded = theory + practice;

    if (totalNeeded <= 0) continue;

    // If we can fit both study and practice today, do so.
    if (totalNeeded <= remainingMinutes) {
      if (theory > 0) {
        newTopics.push({
          kind: "study",
          topicId: t.id,
          subject: t.subject,
          topicName: t.topic_name,
          durationMinutes: theory,
        });
        remainingMinutes -= theory;
      }
      if (practice > 0 && remainingMinutes >= practice) {
        newTopics.push({
          kind: "practice",
          topicId: t.id,
          subject: t.subject,
          topicName: t.topic_name,
          durationMinutes: practice,
        });
        remainingMinutes -= practice;
      }
      continue;
    }

    // Partial packing: if only enough time for theory, schedule theory today
    // and let practice be covered another day.
    if (theory > 0 && theory <= remainingMinutes) {
      newTopics.push({
        kind: "study",
        topicId: t.id,
        subject: t.subject,
        topicName: t.topic_name,
        durationMinutes: theory,
      });
      remainingMinutes -= theory;
    }
  }

  const totalMinutesPlanned =
    availableMinutesToday - Math.max(remainingMinutes, 0);

  return {
    totalMinutesPlanned,
    revisions,
    newTopics,
  };
}



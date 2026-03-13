"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Brain,
  ClipboardList,
  Loader2,
  MessageSquareText,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import AuthOnboarding from "@/components/AuthOnboarding";
import StudyTimer from "@/components/StudyTimer";
import { supabase } from "@/lib/supabase-client";

type Task = {
  id?: string;
  topic_id?: string;
  subject: string;
  topic: string;
  duration?: number;
  duration_minutes?: number;
  status?: string;
  time_spent?: number;
};

type PlanResponse = {
  tasks: Task[];
  notes?: string[];
  summary?: string;
  availableMinutes?: number;
  persisted?: boolean;
  source?: "database" | "ai";
};

const SUBJECT_OPTIONS = ["Physics", "Chemistry", "Biology", "Mathematics"];
const MINUTE_OPTIONS = [45, 90, 120, 180, 240];
const ACTIVE_TIMER_TASK_KEY = "planner_active_task_id";
const ENERGY_OPTIONS = [
  { value: "low", label: "Low energy" },
  { value: "medium", label: "Normal energy" },
  { value: "high", label: "High energy" },
] as const;

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function splitTopicInput(input: string) {
  return input
    .split(/\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export default function PlannerPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [plannerMode, setPlannerMode] = useState<"guided" | "full">("guided");
  const [availableMinutes, setAvailableMinutes] = useState(120);
  const [energyLevel, setEnergyLevel] = useState<"low" | "medium" | "high">("medium");
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);
  const [strongSubjects, setStrongSubjects] = useState<string[]>([]);
  const [priorityTopics, setPriorityTopics] = useState("");
  const [blockers, setBlockers] = useState("");
  const [guidedContext, setGuidedContext] = useState("");
  const [fullContext, setFullContext] = useState("");
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [strugglingTopics, setStrugglingTopics] = useState<string[]>([]);
  const [revisionMessages, setRevisionMessages] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => setSession(nextSession));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadPlanner() {
      if (!session?.access_token) {
        setIsLoadingPlan(false);
        return;
      }

      setIsLoadingPlan(true);

      try {
        const res = await fetch("/api/generate-plan", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Unable to load planner");
        }

        setPlan(data);
      } catch (err) {
        console.error("Planner load failed", err);
      } finally {
        setIsLoadingPlan(false);
      }
    }

    void loadPlanner();
  }, [session?.access_token]);

  const intakePlaceholder = useMemo(
    () =>
      [
        "Start from the beginning if you want.",
        "Example:",
        "I am preparing for NEET. I have been irregular for two weeks.",
        "I finished electrostatics but I am weak in organic chemistry and plant physiology.",
        "Today I only have 90 minutes and I want one realistic plan.",
      ].join("\n"),
    []
  );

  const activeTask = useMemo(
    () => plan?.tasks.find((task) => task.id === activeTaskId) ?? null,
    [activeTaskId, plan?.tasks]
  );

  useEffect(() => {
    if (!plan?.tasks?.length) return;

    const storedTaskId = localStorage.getItem(ACTIVE_TIMER_TASK_KEY);
    if (!storedTaskId) return;

    const matchingTask = plan.tasks.find((task) => task.id === storedTaskId);
    if (matchingTask) {
      setActiveTaskId(storedTaskId);
    } else {
      localStorage.removeItem(ACTIVE_TIMER_TASK_KEY);
    }
  }, [plan?.tasks]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.access_token) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          availableMinutes,
          energyLevel,
          weakSubjects,
          strongSubjects,
          priorityTopics: splitTopicInput(priorityTopics),
          blockers,
          fullContext: plannerMode === "full" ? fullContext : guidedContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Planner generation failed");
      }

      setPlan(data);
      localStorage.setItem(
        "latest_plan",
        JSON.stringify({
          plan: data.tasks ?? [],
          roast: data.summary ?? "",
          repair: [],
        })
      );
    } catch (err) {
      console.error("Planner generation failed", err);
      setError(err instanceof Error ? err.message : "Planner generation failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openTimer(taskId: string) {
    setActiveTaskId(taskId);
    localStorage.setItem(ACTIVE_TIMER_TASK_KEY, taskId);
  }

  function closeTimer() {
    setActiveTaskId(null);
    localStorage.removeItem(ACTIVE_TIMER_TASK_KEY);
  }

  async function handleTaskComplete(task: Task, timeSpentMinutes: number) {
    if (!session?.access_token || !task.id) return;

    setError("");

    try {
      const response = await fetch("/api/complete-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          taskId: task.id,
          topicId: task.topic_id,
          timeSpent: timeSpentMinutes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to complete task");
      }

      setPlan((currentPlan) => {
        if (!currentPlan) return currentPlan;

        return {
          ...currentPlan,
          tasks: currentPlan.tasks.map((currentTask) =>
            currentTask.id === task.id
              ? {
                  ...currentTask,
                  status: "done",
                  time_spent: timeSpentMinutes,
                }
              : currentTask
          ),
        };
      });

      closeTimer();
    } catch (err) {
      console.error("Task completion failed", err);
      setError(err instanceof Error ? err.message : "Failed to complete task");
    }
  }

  async function toggleStruggling(task: Task) {
    if (!session?.access_token || !task.topic_id) return;

    const topicKey = String(task.topic_id);
    if (strugglingTopics.includes(topicKey)) {
      // Already flagged; we treat this as a one-way toggle for now.
      return;
    }

    try {
      const response = await fetch("/api/flag-struggling", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ topicId: task.topic_id }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to schedule prerequisites");
      }

      setStrugglingTopics((current) => [...current, topicKey]);
    } catch (err) {
      console.error("Flag struggling failed", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to schedule prerequisite topics"
      );
    }
  }

  async function handleMastered(task: Task, level: "hard" | "normal" | "easy") {
    if (!session?.access_token || !task.topic_id) return;

    try {
      const response = await fetch("/api/schedule-revision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ topicId: task.topic_id, level }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to schedule revision");
      }

      const topicKey = String(task.topic_id);
      const label =
        level === "hard" ? "3 days" : level === "normal" ? "7 days" : "21 days";

      setRevisionMessages((current) => ({
        ...current,
        [topicKey]: `Revision scheduled in ${label}.`,
      }));
    } catch (err) {
      console.error("Schedule revision failed", err);
      setError(
        err instanceof Error ? err.message : "Failed to schedule revision"
      );
    }
  }

  if (!session) return <AuthOnboarding />;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <main className="space-y-5 px-1 py-2">
        <div className="mb-8 flex flex-col gap-4 pl-1">
          <div className="min-w-0 pl-1">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
              Planner
            </p>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-white">
              Build today&apos;s study plan with context.
            </h1>
            <p className="mt-3 break-words text-sm text-white/70">
              Answer a few questions, or tell Kalnehi your full prep story from the beginning.
            </p>
          </div>
          <Link
            href="/"
            className="glass-button flex w-full items-center justify-center gap-2 truncate whitespace-nowrap text-sm font-medium"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="glass-card overflow-hidden p-5">
            <div className="flex items-center gap-2 text-white/70">
              <ClipboardList size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-widest">
                How should Kalnehi plan?
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlannerMode("guided")}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors duration-200 ${
                  plannerMode === "guided"
                    ? "border-blue-300/30 bg-blue-500/30 text-white"
                    : "border-white/20 bg-white/10 text-white/70"
                }`}
              >
                Guided questions
              </button>
              <button
                type="button"
                onClick={() => setPlannerMode("full")}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors duration-200 ${
                  plannerMode === "full"
                    ? "border-blue-300/30 bg-blue-500/30 text-white"
                    : "border-white/20 bg-white/10 text-white/70"
                }`}
              >
                From the beginning
              </button>
            </div>
          </section>

          <section className="glass-card overflow-hidden p-5">
            <div className="flex items-center gap-2 text-white/70">
              <Sparkles size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-widest">
                Question 1: Time and energy
              </h2>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {MINUTE_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setAvailableMinutes(minutes)}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                    availableMinutes === minutes
                      ? "bg-blue-500/30 text-white"
                      : "border border-white/20 bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {minutes} min
                </button>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                Custom minutes
              </span>
              <input
                type="number"
                min={30}
                max={360}
                value={availableMinutes}
                onChange={(event) => setAvailableMinutes(Number(event.target.value) || 30)}
                className="glass-input mt-2"
              />
            </label>

            <div className="mt-4 grid grid-cols-1 gap-2">
              {ENERGY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEnergyLevel(option.value)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors duration-200 ${
                    energyLevel === option.value
                      ? "border-blue-300/30 bg-blue-500/30 text-white"
                      : "border-white/20 bg-white/10 text-white/70"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          {plannerMode === "guided" ? (
            <section className="space-y-5">
              <div className="glass-card overflow-hidden p-5">
                <div className="flex items-center gap-2 text-white/70">
                  <Brain size={18} className="text-blue-600" />
                  <h2 className="text-sm font-bold uppercase tracking-widest">
                    Question 2: Where are you weak right now?
                  </h2>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {SUBJECT_OPTIONS.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => setWeakSubjects((current) => toggleValue(current, subject))}
                      className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                        weakSubjects.includes(subject)
                          ? "bg-amber-500/20 text-amber-100"
                          : "border border-white/20 bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card overflow-hidden p-5">
                <div className="flex items-center gap-2 text-white/70">
                  <Sparkles size={18} className="text-blue-600" />
                  <h2 className="text-sm font-bold uppercase tracking-widest">
                    Question 3: What feels stable?
                  </h2>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {SUBJECT_OPTIONS.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => setStrongSubjects((current) => toggleValue(current, subject))}
                      className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                        strongSubjects.includes(subject)
                          ? "bg-emerald-500/20 text-emerald-100"
                          : "border border-white/20 bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card overflow-hidden p-5">
                <div className="flex items-center gap-2 text-white/70">
                  <MessageSquareText size={18} className="text-blue-600" />
                  <h2 className="text-sm font-bold uppercase tracking-widest">
                    Question 4: What must be covered today?
                  </h2>
                </div>
                <textarea
                  value={priorityTopics}
                  onChange={(event) => setPriorityTopics(event.target.value)}
                  placeholder="Examples: Rotational dynamics, aldehydes and ketones, plant physiology"
                  className="glass-input mt-4 min-h-28"
                />
              </div>

              <div className="glass-card overflow-hidden p-5">
                <div className="flex items-center gap-2 text-white/70">
                  <MessageSquareText size={18} className="text-blue-600" />
                  <h2 className="text-sm font-bold uppercase tracking-widest">
                    Question 5: What is blocking you?
                  </h2>
                </div>
                <textarea
                  value={blockers}
                  onChange={(event) => setBlockers(event.target.value)}
                  placeholder="Examples: I forget electrochemistry formulas, I cannot solve ray optics numericals"
                  className="glass-input mt-4 min-h-24"
                />
              </div>

              <div className="glass-card overflow-hidden p-5">
                <div className="flex items-center gap-2 text-white/70">
                  <MessageSquareText size={18} className="text-blue-600" />
                  <h2 className="text-sm font-bold uppercase tracking-widest">
                    Question 6: Anything else Kalnehi should know?
                  </h2>
                </div>
                <textarea
                  value={guidedContext}
                  onChange={(event) => setGuidedContext(event.target.value)}
                  placeholder="Add any extra prep context, test result, deadline, or mood."
                  className="glass-input mt-4 min-h-28"
                />
              </div>
            </section>
          ) : (
            <section className="glass-card overflow-hidden p-5">
              <div className="flex items-center gap-2 text-white/70">
                <MessageSquareText size={18} className="text-blue-600" />
                <h2 className="text-sm font-bold uppercase tracking-widest">
                  Tell everything from the beginning
                </h2>
              </div>
              <p className="mt-3 break-words text-sm text-white/70">
                Share your full story: what exam you are targeting, what you finished, where you are weak, what you keep avoiding, and how much time you realistically have.
              </p>
              <textarea
                value={fullContext}
                onChange={(event) => setFullContext(event.target.value)}
                placeholder={intakePlaceholder}
                className="glass-input mt-4 min-h-64"
              />
            </section>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (plannerMode === "full" && fullContext.trim().length === 0)}
            className="glass-button flex w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isSubmitting ? "Building plan..." : "Generate my plan"}
          </button>
        </form>

        <section className="mt-8 space-y-4">
          <div className="glass-card overflow-hidden p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
              Today&apos;s Directives
            </p>
            {plan?.source === "ai" ? (
              <div className="mt-3 inline-flex rounded-full border border-blue-300/20 bg-blue-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-blue-100">
                AI Generated Plan
              </div>
            ) : null}
            <h2 className="mt-2 text-lg font-bold text-white">
              {plan?.summary || "Your current planner"}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {isLoadingPlan
                ? "Loading your latest plan..."
                : "Use the intake above to rebuild a more realistic plan whenever your prep changes."}
            </p>
          </div>

          {plan?.notes?.length ? (
            <div className="glass-card overflow-hidden p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                Planner notes
              </p>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                {plan.notes.map((note) => (
                  <li key={note} className="glass-card-soft px-3 py-2">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-3">
            {plan?.tasks?.map((task, index) => (
              <div
                key={`${task.topic_id ?? task.topic}-${index}`}
                className="glass-card overflow-hidden p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
                      {task.subject}
                    </p>
                    <h3 className="mt-1 break-words text-sm font-semibold text-white">
                      {task.topic}
                    </h3>
                  </div>
                  <div className="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                    {task.duration ?? task.duration_minutes ?? 25} min
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1 text-xs text-white/60">
                    <span>
                      {task.status === "done"
                        ? `Completed${
                            task.time_spent
                              ? ` · ${task.time_spent} min logged`
                              : ""
                          }`
                        : "Ready to start"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void toggleStruggling(task)}
                      disabled={!task.topic_id || strugglingTopics.includes(String(task.topic_id))}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <TriangleAlert size={12} />
                      {strugglingTopics.includes(String(task.topic_id))
                        ? "Prereqs scheduled for tomorrow"
                        : "I'm struggling with this"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => task.id && openTimer(task.id)}
                    disabled={!task.id || task.status === "done"}
                    className="glass-button px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {task.status === "done" ? "Completed" : "Start Study"}
                  </button>
                </div>
                {task.topic_id && (
                  <div className="mt-3 space-y-1 text-[11px] text-white/70">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>3-tap retention:</span>
                      <button
                        type="button"
                        onClick={() => void handleMastered(task, "hard")}
                        className="rounded-full bg-red-500/20 px-2 py-1 text-[11px] font-semibold text-red-100"
                      >
                        🔴 Hard
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleMastered(task, "normal")}
                        className="rounded-full bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-100"
                      >
                        🟡 Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleMastered(task, "easy")}
                        className="rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-100"
                      >
                        🟢 Easy
                      </button>
                    </div>
                    {revisionMessages[String(task.topic_id)] && (
                      <p className="text-[11px] text-emerald-200">
                        {revisionMessages[String(task.topic_id)]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {plan?.persisted === false && (
              <div className="overflow-hidden rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                {plan.source === "ai"
                  ? "AI generated this plan, but task progress is currently local-only until the daily_tasks table is available in Supabase."
                  : "This plan is ready, but progress will not sync until the daily_tasks table is available in Supabase."}
              </div>
            )}

            {!isLoadingPlan && !plan?.tasks?.length && (
              <div className="overflow-hidden rounded-2xl border border-dashed border-white/20 bg-white/5 p-5 text-sm text-white/70 backdrop-blur-md">
                No directives yet. Answer the planner questions above to generate one.
              </div>
            )}
          </div>
        </section>
      </main>

      {activeTask?.id && (
        <StudyTimer
          key={activeTask.id}
          taskId={activeTask.id}
          durationMinutes={activeTask.duration_minutes ?? activeTask.duration ?? 25}
          onClose={closeTimer}
          onComplete={async (timeSpentMinutes) => {
            await handleTaskComplete(activeTask, timeSpentMinutes);
          }}
        />
      )}
    </div>
  );
}
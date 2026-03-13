"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RankPredictor from "@/components/RankPredictor";
import AuthOnboarding from "@/components/AuthOnboarding";
import { supabase } from "@/lib/supabase-client";
import type { Session } from "@supabase/supabase-js";
import { ArrowRight, ListTodo, TrendingUp, TriangleAlert } from "lucide-react";

export type TaskItem = {
  subject: string;
  topic: string;
  topic_id?: string | null;
  is_repair?: boolean;
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [profileTargetExam, setProfileTargetExam] = useState<string>("NEET");
  const [latestPlan, setLatestPlan] = useState<any>(null);
  const [triageMode, setTriageMode] = useState<boolean>(false);
  const [weakTopics, setWeakTopics] = useState<
    { topic_name: string; subject: string; mastery_score: number; accuracy: number }[]
  >([]);
  const [upcomingRevisions, setUpcomingRevisions] = useState<
    { topic_name: string; subject: string; next_revision_date: string }[]
  >([]);
  const [isLoadingWeak, setIsLoadingWeak] = useState(false);
  const [todaysPlan, setTodaysPlan] = useState<{
    revisions: { topicId: number; subject: string; topicName: string; durationMinutes: number }[];
    newTopics: { topicId: number; subject: string; topicName: string; durationMinutes: number; kind: string }[];
  } | null>(null);
  const [isLoadingPlanLive, setIsLoadingPlanLive] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("target_exam, triage_mode_active")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.target_exam) setProfileTargetExam(data.target_exam);
        if (typeof data?.triage_mode_active === "boolean") {
          setTriageMode(data.triage_mode_active);
        }
      });
  }, [session?.user?.id]);

  useEffect(() => {
    const raw = localStorage.getItem("latest_plan");
    if (!raw) return;

    try {
      setLatestPlan(JSON.parse(raw));
    } catch (err) {
      console.error("Failed to parse latest plan", err);
    }
  }, []);

  useEffect(() => {
    async function loadWeakAreas() {
      if (!session?.access_token) return;
      setIsLoadingWeak(true);
      try {
        const res = await fetch("/api/dashboard-weak-areas", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const data = await res.json();
        if (!res.ok || !data.ok) return;
        setWeakTopics(data.weak_topics ?? []);
        setUpcomingRevisions(data.upcoming_revisions ?? []);
      } catch (err) {
        console.error("Failed to load weak areas", err);
      } finally {
        setIsLoadingWeak(false);
      }
    }

    void loadWeakAreas();
  }, [session?.access_token]);

  useEffect(() => {
    async function loadTodaysPlan() {
      if (!session?.access_token) return;
      setIsLoadingPlanLive(true);
      try {
        const res = await fetch("/api/todays-plan?minutes=120", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const data = await res.json();
        if (!res.ok || !data.ok) return;
        setTodaysPlan(data.plan ?? null);
      } catch (err) {
        console.error("Failed to load today's plan", err);
      } finally {
        setIsLoadingPlanLive(false);
      }
    }

    void loadTodaysPlan();
  }, [session?.access_token]);

  async function toggleTriageMode(next: boolean) {
    if (!session?.user?.id) return;

    setTriageMode(next);
    const { error } = await supabase
      .from("profiles")
      .update({ triage_mode_active: next })
      .eq("id", session.user.id);

    if (error) {
      console.error("Failed to update triage mode", error);
    }
  }

  if (!session) return <AuthOnboarding />;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <main className="space-y-4 px-1 py-2">
        <section>
          <div className="mb-4 flex flex-col gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                Morning Dashboard
              </p>
              <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-white">
                kalnehi dashboard
              </h1>
            </div>
            <div className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-md">
              {profileTargetExam}
            </div>
          </div>
          <RankPredictor
            userId={session.user.id}
            targetExam={profileTargetExam as any}
            accessToken={session.access_token ?? ""}
          />
        </section>

        <section className="glass-card overflow-hidden p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                Triage Mode
              </p>
              <p className="mt-1 break-words text-sm text-white/70">
                Drops target score to cutoff and filters out low-yield topics to save time.
              </p>
              <p className="mt-1 text-[11px] text-amber-200">
                When enabled, the engine only schedules high-return topics based on weightage and
                estimated mastery time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleTriageMode(!triageMode)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-200 ${
                triageMode
                  ? "border-emerald-300/40 bg-emerald-500/30 text-emerald-50"
                  : "border-white/30 bg-white/10 text-white/70"
              }`}
            >
              {triageMode ? "ON" : "OFF"}
            </button>
          </div>
        </section>

        <section className="mt-4 space-y-4">
          <div className="glass-card overflow-hidden p-4">
            <div className="mb-3 flex items-center gap-2 text-blue-600">
              <TrendingUp size={18} />
              <h2 className="text-sm font-bold uppercase tracking-widest text-white/70">
                Today's Directives (legacy)
              </h2>
            </div>
            {latestPlan?.plan?.length ? (
              <ul className="space-y-2 text-sm text-white/80">
                {latestPlan.plan.slice(0, 3).map((task: any, idx: number) => (
                  <li key={idx} className="glass-card-soft overflow-hidden px-3 py-2 break-words">
                    <span className="font-semibold text-white">{task.subject}</span>
                    {" · "}
                    {task.topic}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/70">
                No fresh directives yet. Submit a preparation report to generate today&apos;s plan.
              </p>
            )}
          </div>

          <div className="glass-card overflow-hidden p-4">
            <div className="mb-3 flex items-center gap-2 text-amber-300">
              <TriangleAlert size={18} />
              <h2 className="text-sm font-bold uppercase tracking-widest text-white/70">
                Weak Areas
              </h2>
            </div>
            {isLoadingWeak ? (
              <p className="text-sm text-white/70">Loading weak topics…</p>
            ) : upcomingRevisions.length > 0 ? (
              <ul className="space-y-2 text-sm text-white/80">
                {upcomingRevisions.slice(0, 3).map((item, idx) => {
                  const daysLeft = (() => {
                    const today = new Date();
                    const target = new Date(item.next_revision_date);
                    const diffMs = target.getTime() - today.getTime();
                    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
                  })();
                  return (
                    <li
                      key={`${item.topic_name}-${idx}`}
                      className="overflow-hidden rounded-xl border border-amber-200/20 bg-amber-500/10 px-3 py-2 break-words"
                    >
                      <span className="font-semibold text-white">
                        {item.subject}
                      </span>
                      {" · "}
                      {item.topic_name}
                      <span className="ml-2 text-[11px] text-amber-100">
                        (revision in {daysLeft} day{daysLeft === 1 ? "" : "s"})
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : weakTopics.length > 0 ? (
              <ul className="space-y-2 text-sm text-white/80">
                {weakTopics.slice(0, 3).map((item, idx) => (
                  <li
                    key={`${item.topic_name}-${idx}`}
                    className="overflow-hidden rounded-xl border border-amber-200/20 bg-amber-500/10 px-3 py-2 break-words"
                  >
                    <span className="font-semibold text-white">
                      {item.subject}
                    </span>
                    {" · "}
                    {item.topic_name}
                    <span className="ml-2 text-[11px] text-amber-100">
                      (mastery {(item.mastery_score * 100).toFixed(0)}%, accuracy{" "}
                      {(item.accuracy * 100).toFixed(0)}%)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/70">
                Weakness diagnostics will appear here once the engine detects unstable topics or
                upcoming revisions.
              </p>
            )}
          </div>

          <div className="glass-card overflow-hidden p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <span className="text-lg">🔥</span>
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/70">
                  Priority Revisions
                </h2>
              </div>
            </div>
            {isLoadingPlanLive ? (
              <p className="text-sm text-white/70">Calculating today&apos;s plan…</p>
            ) : todaysPlan?.revisions?.length ? (
              <ul className="space-y-2 text-sm text-white/80">
                {todaysPlan.revisions.slice(0, 5).map((task, idx) => (
                  <li
                    key={`${task.topicId}-${idx}`}
                    className="glass-card-soft overflow-hidden px-3 py-2 break-words"
                  >
                    <span className="font-semibold text-white">
                      {task.subject}
                    </span>
                    {" · "}
                    {task.topicName}
                    <span className="ml-2 text-[11px] text-blue-100">
                      ({task.durationMinutes} min)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/70">
                No revision blocks scheduled for today yet.
              </p>
            )}
          </div>

          <div className="glass-card overflow-hidden p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <span className="text-lg">🎯</span>
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/70">
                  High-Yield Topics Today
                </h2>
              </div>
            </div>
            {isLoadingPlanLive ? (
              <p className="text-sm text-white/70">Calculating today&apos;s plan…</p>
            ) : todaysPlan?.newTopics?.length ? (
              <ul className="space-y-2 text-sm text-white/80">
                {todaysPlan.newTopics.slice(0, 8).map((task, idx) => (
                  <li
                    key={`${task.topicId}-${idx}-${task.kind}`}
                    className="glass-card-soft overflow-hidden px-3 py-2 break-words"
                  >
                    <span className="font-semibold text-white">
                      {task.subject}
                    </span>
                    {" · "}
                    {task.topicName}
                    <span className="ml-2 text-[11px] text-blue-100">
                      ({task.kind === "study" ? "theory" : "practice"},{" "}
                      {task.durationMinutes} min)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/70">
                No new high-yield topics scheduled today yet.
              </p>
            )}
          </div>
        </section>

        <section className="glass-card mt-4 overflow-hidden p-4">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
              Planner
            </p>
            <h2 className="mt-1 break-words text-lg font-bold text-white">
              Go to today&apos;s directives.
            </h2>
            <p className="mt-2 break-words text-sm text-white/70">
              Your plan is built deterministically from your syllabus and progress. No chat needed.
            </p>
          </div>
          <Link
            href="/planner"
            className="glass-button flex w-full items-center justify-center gap-2 truncate whitespace-nowrap text-sm font-medium"
          >
            Open Planner
            <ArrowRight size={16} />
          </Link>
        </section>

        {latestPlan?.roast && (
          <div className="glass-card mt-4 overflow-hidden p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-200">
              Strategy Insight
            </h3>
            <p className="mb-4 break-words text-sm italic leading-relaxed text-white/80">
              "{latestPlan.roast}"
            </p>
            <Link
              href="/planner"
              className="glass-button flex w-full items-center justify-center gap-2 truncate whitespace-nowrap text-sm font-medium"
            >
              <span>VIEW DAILY DIRECTIVES</span>
              <ListTodo size={20} />
            </Link>
          </div>
        )}
      </main>

    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import AuthOnboarding from "@/components/AuthOnboarding";

type WeakTopic = {
  topic_name: string;
  accuracy: number;
};

type RepairItem = {
  weak_topic: string;
  repair_topics: string[];
};

type PlanTopic = {
  topic_name: string;
  priority_score: number;
};

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [plan, setPlan] = useState<PlanTopic[]>([]);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [repairs, setRepairs] = useState<RepairItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadData(userId: string) {
      setLoading(true);
      setError("");
      try {
        const [planRes, weakRes, repairRes] = await Promise.all([
          fetch(`/api/study-plan?userId=${encodeURIComponent(userId)}`),
          fetch(`/api/weak-topics?userId=${encodeURIComponent(userId)}`),
          fetch(`/api/repair-topics?userId=${encodeURIComponent(userId)}`),
        ]);

        const [planJson, weakJson, repairJson] = await Promise.all([
          planRes.json(),
          weakRes.json(),
          repairRes.json(),
        ]);

        if (!planRes.ok || !planJson.ok) {
          throw new Error(planJson.error || "Failed to load study plan");
        }
        if (!weakRes.ok || !weakJson.ok) {
          throw new Error(weakJson.error || "Failed to load weak topics");
        }
        if (!repairRes.ok || !repairJson.ok) {
          throw new Error(repairJson.error || "Failed to load repair suggestions");
        }

        setPlan((planJson.topics ?? []) as PlanTopic[]);
        setWeakTopics((weakJson.topics ?? []) as WeakTopic[]);
        setRepairs((repairJson.items ?? []) as RepairItem[]);
      } catch (err) {
        console.error("Dashboard load failed", err);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data"
        );
      } finally {
        setLoading(false);
      }
    }

    if (session?.user?.id) {
      void loadData(session.user.id);
    } else {
      setLoading(false);
    }
  }, [session?.user?.id]);

  if (!session) return <AuthOnboarding />;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <main className="space-y-5 px-1 py-2">
        <section className="glass-card overflow-hidden p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
            Today&apos;s Study Plan
          </p>
          <h1 className="mt-2 text-lg font-bold text-white">
            Top focus topics for you
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Built from your topic accuracy, weightage, difficulty and concept graph.
          </p>
          {loading ? (
            <p className="mt-4 text-sm text-white/70">Loading plan...</p>
          ) : plan.length === 0 ? (
            <p className="mt-4 text-sm text-white/70">
              No priority topics yet. Start studying to build your history.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {plan.map((item) => (
                <li
                  key={item.topic_name}
                  className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80"
                >
                  <span className="mr-3 line-clamp-2">{item.topic_name}</span>
                  <span className="shrink-0 rounded-full bg-blue-500/20 px-2 py-1 text-[11px] font-semibold text-blue-100">
                    Priority {item.priority_score.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-card overflow-hidden p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-200">
            Weak Topics
          </p>
          <p className="mt-2 text-sm text-white/70">
            Topics where your accuracy is below 60%.
          </p>
          {loading ? (
            <p className="mt-4 text-sm text-white/70">Checking weaknesses...</p>
          ) : weakTopics.length === 0 ? (
            <p className="mt-4 text-sm text-white/70">
              No weak topics detected from your progress yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {weakTopics.map((item) => (
                <li
                  key={item.topic_name}
                  className="flex items-center justify-between rounded-xl border border-amber-200/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-50"
                >
                  <span className="mr-3 line-clamp-2">{item.topic_name}</span>
                  <span className="shrink-0 text-[11px] font-semibold text-amber-200">
                    {(item.accuracy * 100).toFixed(0)}% accuracy
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-card overflow-hidden p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">
            Repair Suggestions
          </p>
          <p className="mt-2 text-sm text-white/70">
            Foundational topics that unlock your weak areas.
          </p>
          {loading ? (
            <p className="mt-4 text-sm text-white/70">Building repair paths...</p>
          ) : repairs.length === 0 ? (
            <p className="mt-4 text-sm text-white/70">
              No repair suggestions yet. Once weak topics appear, Kalnehi will
              suggest prerequisites here.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {repairs.map((item) => (
                <li key={item.weak_topic} className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                    {item.weak_topic}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.repair_topics.map((name) => (
                      <span
                        key={name}
                        className="glass-chip text-[11px] font-semibold"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";

type ScoreData = {
  score2025: number;
  score2024: number;
  score2023: number;
};

const EXAM_TOTALS: Record<string, number> = {
  NEET: 720,
  JEE_MAIN: 300,
  JEE_ADVANCED: 360,
};

type RankPredictorProps = {
  userId: string;
  refreshTrigger?: number;
  targetExam?: "NEET" | "JEE_MAIN" | "JEE_ADVANCED";
  accessToken?: string;
};

export default function RankPredictor({
  userId,
  refreshTrigger = 0,
  targetExam = "NEET",
  accessToken = "",
}: RankPredictorProps) {
  const totalMarks = EXAM_TOTALS[targetExam] ?? 720;
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId || !accessToken) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch("/api/predict-score", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Predict score failed");
        return res.json();
      })
      .then((payload: ScoreData) => {
        if (!cancelled) {
          // Using || 0 ensures that NaN results also fall back to 0
          setData({
            score2025: Number(payload.score2025) || 0,
            score2024: Number(payload.score2024) || 0,
            score2023: Number(payload.score2023) || 0,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, refreshTrigger, accessToken]);

  if (!userId) return null;

  return (
    <section
      className="glass-card overflow-hidden p-4 text-white"
      aria-label="Rank predictor"
    >
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-3/4 rounded bg-white/10"></div>
          <div className="h-10 w-1/2 rounded bg-white/10"></div>
        </div>
      ) : error ? (
        <p className="font-medium text-red-300">Could not load score prediction.</p>
      ) : data ? (
        <>
          <p className="break-words text-sm font-medium text-white/70">
            Based on the 2025 exam paper, you would approximately score:
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="truncate whitespace-nowrap text-4xl font-bold tracking-tight text-white">
              {data.score2025 || 0}
            </span>
            <span className="truncate whitespace-nowrap text-2xl font-normal text-white/50">
              / {totalMarks}
            </span>
          </div>

          <p className="mt-2 break-words text-xs text-white/60">
            Approximate marks out of {totalMarks} based on your current prep level.
          </p>

          <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                2024 paper estimate
              </span>
              <span className="truncate whitespace-nowrap text-sm font-mono text-white/80">
                {data.score2024} / {totalMarks}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                2023 paper estimate
              </span>
              <span className="truncate whitespace-nowrap text-sm font-mono text-white/80">
                {data.score2023} / {totalMarks}
              </span>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

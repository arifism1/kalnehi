"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, XCircle } from "lucide-react";

type TimerSnapshot = {
  timeRemaining: number;
  isRunning: boolean;
  pomodoroMode: boolean;
  phase: "study" | "break";
  timeSpentSeconds: number;
  lastTickAt: number | null;
};

type StudyTimerProps = {
  taskId: string;
  durationMinutes: number;
  onClose: () => void;
  onComplete: (timeSpentMinutes: number) => Promise<void> | void;
};

const POMODORO_STUDY_SECONDS = 25 * 60;
const POMODORO_BREAK_SECONDS = 5 * 60;

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function storageKey(taskId: string) {
  return `study_timer_${taskId}`;
}

export default function StudyTimer({
  taskId,
  durationMinutes,
  onClose,
  onComplete,
}: StudyTimerProps) {
  const defaultSeconds = Math.max(1, durationMinutes) * 60;
  const [timeRemaining, setTimeRemaining] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [phase, setPhase] = useState<"study" | "break">("study");
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(taskId));
    if (!raw) return;

    try {
      const snapshot = JSON.parse(raw) as TimerSnapshot;
      const now = Date.now();
      let nextRemaining = snapshot.timeRemaining;
      let nextTimeSpent = snapshot.timeSpentSeconds;

      if (snapshot.isRunning && snapshot.lastTickAt) {
        const elapsedSeconds = Math.max(
          0,
          Math.floor((now - snapshot.lastTickAt) / 1000)
        );
        nextRemaining = Math.max(0, snapshot.timeRemaining - elapsedSeconds);
        if (snapshot.phase === "study") {
          nextTimeSpent += Math.min(elapsedSeconds, snapshot.timeRemaining);
        }
      }

      setPomodoroMode(snapshot.pomodoroMode);
      setPhase(snapshot.phase);
      setTimeRemaining(nextRemaining);
      setTimeSpentSeconds(nextTimeSpent);
      setIsRunning(snapshot.isRunning && nextRemaining > 0);
    } catch (error) {
      console.error("Failed to restore study timer", error);
    }
  }, [taskId]);

  useEffect(() => {
    const snapshot: TimerSnapshot = {
      timeRemaining,
      isRunning,
      pomodoroMode,
      phase,
      timeSpentSeconds,
      lastTickAt: isRunning ? Date.now() : null,
    };

    localStorage.setItem(storageKey(taskId), JSON.stringify(snapshot));
  }, [taskId, timeRemaining, isRunning, pomodoroMode, phase, timeSpentSeconds]);

  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(() => {
      setTimeRemaining((current) => {
        if (current <= 1) {
          return 0;
        }
        return current - 1;
      });

      setTimeSpentSeconds((current) => {
        if (phase !== "study") return current;
        return current + 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, phase]);

  useEffect(() => {
    if (timeRemaining > 0 || hasCompletedRef.current) return;

    if (pomodoroMode && phase === "study") {
      setPhase("break");
      setTimeRemaining(POMODORO_BREAK_SECONDS);
      setIsRunning(true);
      return;
    }

    if (pomodoroMode && phase === "break") {
      setPhase("study");
      setTimeRemaining(POMODORO_STUDY_SECONDS);
      setIsRunning(false);
      return;
    }

    setIsRunning(false);
  }, [timeRemaining, pomodoroMode, phase]);

  const timerLabel = useMemo(() => {
    if (!pomodoroMode) return "Focus Timer";
    return phase === "study" ? "Pomodoro Study" : "Pomodoro Break";
  }, [phase, pomodoroMode]);

  function handlePomodoroToggle() {
    const nextPomodoro = !pomodoroMode;
    setPomodoroMode(nextPomodoro);
    setPhase("study");
    setIsRunning(false);
    setTimeRemaining(nextPomodoro ? POMODORO_STUDY_SECONDS : defaultSeconds);
  }

  async function handleComplete() {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    setIsRunning(false);
    localStorage.removeItem(storageKey(taskId));
    await onComplete(Math.max(1, Math.round(timeSpentSeconds / 60)));
  }

  function handleClose() {
    setIsRunning(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="glass-card w-full max-w-sm p-6 text-center">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
            {timerLabel}
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-white/20 bg-white/10 p-2 text-white/70 transition-colors duration-200 hover:bg-white/20 hover:text-white"
          >
            <XCircle size={18} />
          </button>
        </div>

        <div className="mt-6 text-4xl font-mono text-white">
          {formatTime(timeRemaining)}
        </div>

        <p className="mt-2 text-sm text-white/70">
          {phase === "study"
            ? "Stay on the current task until the timer ends."
            : "Take a short break. Study will be ready again after this."}
        </p>

        <button
          type="button"
          onClick={handlePomodoroToggle}
          className={`mt-5 w-full rounded-xl border px-4 py-3 text-sm font-medium transition-colors duration-200 ${
            pomodoroMode
              ? "border-blue-300/30 bg-blue-500/30 text-white"
              : "border-white/20 bg-white/10 text-white/80 hover:bg-white/20"
          }`}
        >
          Pomodoro Mode {pomodoroMode ? "On" : "Off"}
        </button>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setIsRunning(true)}
            className="glass-button flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Play size={16} />
            Start
          </button>
          <button
            type="button"
            onClick={() => setIsRunning(false)}
            className="glass-button flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Pause size={16} />
            Pause
          </button>
          <button
            type="button"
            onClick={() => void handleComplete()}
            className="glass-button flex items-center justify-center gap-2 text-sm font-medium"
          >
            Complete
          </button>
        </div>

        <p className="mt-4 text-xs text-white/60">
          Logged study time: {Math.max(1, Math.round(timeSpentSeconds / 60))} min
        </p>
      </div>
    </div>
  );
}

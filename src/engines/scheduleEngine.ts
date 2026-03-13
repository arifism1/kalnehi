// Schedule engine: converts selected topics and revision tasks
// into concrete daily tasks within the available time window.

import type { DailyTask } from "../types/strategy";

interface ScheduleParams {
  userId: string;
  hoursPerDay: number;
  studyTopics: {
    topic_id: number;
    label: string;
    study_minutes: number;
    practice_minutes: number;
  }[];
  revisionMinutes: number;
}

export function buildDailySchedule(params: ScheduleParams): DailyTask[] {
  const { userId, hoursPerDay, studyTopics, revisionMinutes } = params;
  const minutesAvailable = Math.max(Math.round(hoursPerDay * 60), 0);

  const tasks: DailyTask[] = [];
  let used = 0;

  // Reserve revision block first if requested.
  if (revisionMinutes > 0 && used + revisionMinutes <= minutesAvailable) {
    tasks.push({
      user_id: userId,
      topic_id: null,
      type: "revision",
      duration_minutes: revisionMinutes,
      label: "Revision block",
    });
    used += revisionMinutes;
  }

  for (const t of studyTopics) {
    const total = t.study_minutes + t.practice_minutes;
    if (total <= 0) continue;
    if (used + total > minutesAvailable) continue;

    if (t.study_minutes > 0) {
      tasks.push({
        user_id: userId,
        topic_id: t.topic_id,
        type: "study",
        duration_minutes: t.study_minutes,
        label: `${t.label} – concept study`,
      });
      used += t.study_minutes;
    }

    if (t.practice_minutes > 0 && used + t.practice_minutes <= minutesAvailable) {
      tasks.push({
        user_id: userId,
        topic_id: t.topic_id,
        type: "practice",
        duration_minutes: t.practice_minutes,
        label: `${t.label} – practice questions`,
      });
      used += t.practice_minutes;
    }
  }

  return tasks;
}


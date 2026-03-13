// Simple helpers related to time estimation in minutes/hours.

export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

// Clamp a time window between sensible bounds.
export function clampStudyMinutes(value: number, min = 15, max = 600): number {
  return Math.max(min, Math.min(max, value));
}


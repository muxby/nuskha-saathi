/**
 * Course position from the day a prescription was saved.
 *
 * This is a calendar aid, not adherence tracking: the app does not know
 * whether a dose was taken, so nothing here claims that it was.
 */
export type CourseProgress = {
  day: number;
  total: number;
  remaining: number;
  finished: boolean;
  fraction: number;
};

const DAY_MS = 86_400_000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Returns null when the duration is unknown or the start date is invalid. */
export function courseProgress(
  startedIso: string,
  durationDays: number | null | undefined,
  now: Date = new Date(),
): CourseProgress | null {
  if (!durationDays || !Number.isFinite(durationDays) || durationDays <= 0) return null;
  const started = new Date(startedIso);
  if (Number.isNaN(started.getTime())) return null;
  const total = Math.round(durationDays);
  const elapsed = Math.floor((startOfDay(now) - startOfDay(started)) / DAY_MS);
  if (elapsed < 0) return null;
  const finished = elapsed >= total;
  const day = finished ? total : elapsed + 1;
  return { day, total, remaining: total - day, finished, fraction: day / total };
}

/** Day 3 or later of an unfinished antibiotic course: the stewardship moment. */
export function isDay3Window(progress: CourseProgress | null): boolean {
  return Boolean(progress && !progress.finished && progress.day >= 3);
}


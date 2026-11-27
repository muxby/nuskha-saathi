"use client";
import type { Medication } from "@/lib/api";
import { cabinetCopy, pick } from "@/lib/copy";
import { courseLabel, courseProgress, isDay3Window } from "@/lib/courseProgress";
import { useLanguage } from "@/lib/i18n";

/**
 * Calendar position within a saved course. It counts days since the
 * prescription was saved; it does not claim any dose was taken.
 */
export default function CourseProgressBar({
  startedIso,
  medication,
}: {
  startedIso: string;
  medication: Medication;
}) {
  const { language } = useLanguage();
  const copy = pick(cabinetCopy, language);
  const progress = courseProgress(startedIso, medication.schedule?.duration_days);
  if (!progress) return null;
  const label = courseLabel(progress, language);
  return (
    <div className={`course-progress ${progress.finished ? "is-finished" : ""}`}>
      <div className="course-progress-label">
        <span>{copy.courseProgress}</span>
        <bdi>{label}</bdi>
      </div>
      <div
        className="course-progress-track"
        role="progressbar"
        aria-label={copy.courseProgress}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.day}
        aria-valuetext={label}
      >
        <span style={{ inlineSize: `${Math.round(progress.fraction * 100)}%` }} />
      </div>
      {medication.requires_day3_checkin && isDay3Window(progress) && (
        <p className="course-day3">{copy.day3}</p>
      )}
    </div>
  );
}

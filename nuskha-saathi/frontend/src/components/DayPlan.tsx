"use client";
import { Moon, Sun, Sunrise, TriangleAlert } from "lucide-react";
import type { Medication } from "@/lib/api";
import { dayPlanCopy, pick } from "@/lib/copy";
import { buildDayPlan, DAY_SLOTS, dosesPerDay, isPlanEmpty, unscheduled, type DaySlot } from "@/lib/dayPlan";
import { formatQuantity, formatStrength } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

const SLOT_ICON = { morning: Sunrise, afternoon: Sun, night: Moon } satisfies Record<DaySlot, typeof Sun>;

export default function DayPlan({ medications }: { medications: Medication[] }) {
  const { language } = useLanguage();
  const copy = pick(dayPlanCopy, language);
  const plan = buildDayPlan(medications);
  const untimed = unscheduled(medications);
  const hidden = medications.filter((m) => m.status !== "VERIFIED").length;
  if (isPlanEmpty(plan) && !untimed.length) return null;

  return (
    <section className="day-plan" aria-labelledby="day-plan-title">
      <header className="day-plan-head">
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h2 id="day-plan-title">{copy.title}</h2>
        </div>
        {!isPlanEmpty(plan) && <span className="day-plan-count">{copy.perDay(dosesPerDay(plan))}</span>}
      </header>
      <ol className="day-plan-slots">
        {DAY_SLOTS.map((slot) => {
          const Icon = SLOT_ICON[slot];
          const entries = plan[slot];
          return (
            <li className={`day-slot day-slot-${slot} ${entries.length ? "" : "is-empty"}`} key={slot}>
              <div className="day-slot-label">
                <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
                <h3>{copy[slot]}</h3>
              </div>
              {entries.length ? (
                <ul>
                  {entries.map((entry) => (
                    <li key={`${slot}-${entry.lineId}`}>
                      <span className="day-dose-qty" aria-hidden="true">
                        <bdi>{formatQuantity(entry.quantity)}</bdi>
                      </span>
                      <span className="day-dose-name">
                        <bdi dir="ltr">
                          {entry.brand} {formatStrength(entry.strengthMg)}
                        </bdi>
                        {copy[entry.mealTiming] && <small>{copy[entry.mealTiming]}</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="day-slot-none">{copy.nothing}</p>
              )}
            </li>
          );
        })}
      </ol>
      {/* @@ feat(results): list verified medicines whose timing is unknown */}
      {untimed.length > 0 && (
        <div className="day-plan-note day-plan-untimed">
          <TriangleAlert size={18} aria-hidden="true" />
          <p>
            <strong>{copy.untimed}.</strong> {copy.untimedBody}{" "}
            <bdi dir="ltr">{untimed.map((m) => m.brand_matched).join(", ")}</bdi>
          </p>
        </div>
      )}
      {/* @@ feat(results): disclose lines withheld from the day plan */}
      {hidden > 0 && (
        <p className="day-plan-note">
          <TriangleAlert size={18} aria-hidden="true" />
          {copy.hidden(hidden)}
        </p>
      )}
    </section>
  );
}

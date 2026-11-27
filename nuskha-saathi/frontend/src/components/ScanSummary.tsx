"use client";
import { CircleHelp, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { ScanResult } from "@/lib/api";
import { pick, summaryCopy } from "@/lib/copy";
import { useLanguage } from "@/lib/i18n";
import { summarizeScan, type ScanTone } from "@/lib/scanSummary";

const ICON = {
  stop: ShieldAlert,
  ask: ShieldQuestion,
  clear: ShieldCheck,
  empty: CircleHelp,
} satisfies Record<ScanTone, typeof ShieldAlert>;

export default function ScanSummary({ scan }: { scan: ScanResult }) {
  const { language } = useLanguage();
  const copy = pick(summaryCopy, language);
  const summary = summarizeScan(scan);
  const Icon = ICON[summary.tone];
  const warnings = summary.highInteractions + summary.moderateInteractions;
  const matchedShare = summary.total ? (summary.verified / summary.total) * 100 : 0;

  return (
    <section className={`scan-summary tone-${summary.tone}`} aria-labelledby="scan-summary-title">
      <div className="scan-summary-lead">
        <span className="scan-summary-icon" aria-hidden="true">
          <Icon size={30} strokeWidth={1.7} />
        </span>
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h2 id="scan-summary-title">{copy[summary.tone]}</h2>
          <p>{copy[`${summary.tone}Body`]}</p>
        </div>
      </div>
      {/* @@ feat(results): show line counts and warnings in the summary */}
      <dl className="scan-summary-stats">
        <div>
          <dt>{copy.linesRead}</dt>
          <dd><bdi>{summary.total}</bdi></dd>
        </div>
        <div className="stat-matched">
          <dt>{copy.matched}</dt>
          <dd><bdi>{summary.verified}</bdi></dd>
        </div>
        <div className={summary.needsConfirmation ? "stat-ask" : undefined}>
          <dt>{copy.needConfirmation}</dt>
          <dd><bdi>{summary.needsConfirmation}</bdi></dd>
        </div>
        <div className={summary.highInteractions ? "stat-stop" : warnings ? "stat-ask" : undefined}>
          <dt>{copy.warnings}</dt>
          <dd><bdi>{warnings}</bdi></dd>
        </div>
      </dl>
      {/* @@ feat(results): add matched versus unconfirmed proportion bar */}
      {summary.total > 0 && (
        <div
          className="scan-summary-bar"
          role="img"
          aria-label={`${copy.proportion}: ${summary.verified} / ${summary.total}`}
        >
          <span style={{ inlineSize: `${matchedShare}%` }} />
        </div>
      )}
    </section>
  );
}

import type { ScanResult } from "@/lib/api";

/**
 * One honest headline for a scan. Derived only from fields the safety engine
 * returned; nothing here upgrades an uncertain line.
 */
export type ScanTone = "stop" | "ask" | "clear" | "empty";

export type ScanSummary = {
  total: number;
  verified: number;
  needsConfirmation: number;
  highInteractions: number;
  moderateInteractions: number;
  antibiotics: number;
  tone: ScanTone;
};

type SummaryInput = Pick<ScanResult, "medications" | "interactions">;

function countLines(scan: SummaryInput) {
  const verified = scan.medications.filter((m) => m.status === "VERIFIED").length;
  return { total: scan.medications.length, verified, needsConfirmation: scan.medications.length - verified };
}

function countInteractions(scan: SummaryInput) {
  const high = scan.interactions.filter((i) => i.severity === "HIGH").length;
  return { highInteractions: high, moderateInteractions: scan.interactions.length - high };
}


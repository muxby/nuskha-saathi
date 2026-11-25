import { isScanResult, type ScanResult } from "./api";
export type SavedPrescription = { savedAt: string; scan: ScanResult };
const KEY = "nuskha-prescriptions-v1";
export function readRecords(): SavedPrescription[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (r): r is SavedPrescription =>
          r &&
          typeof r.savedAt === "string" &&
          !Number.isNaN(Date.parse(r.savedAt)) &&
          isScanResult(r.scan),
      )
      .slice(0, 20);
  } catch {
    return [];
  }
}
export function writeRecords(records: SavedPrescription[]) {
  localStorage.setItem(KEY, JSON.stringify(records.slice(0, 20)));
}

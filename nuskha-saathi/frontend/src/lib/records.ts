import { isScanResult, type CabinetItem, type ScanResult } from "./api";

export type SavedPrescription = { savedAt: string; scan: ScanResult };

const KEY = "nuskha-prescriptions-v1";
const CABINET_KEY = "nuskha-cabinet-v1";
const PATIENT_KEY = "nuskha-patient-id-v1";

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

export function readLocalCabinet(): CabinetItem[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(CABINET_KEY) || "[]");
    if (!Array.isArray(data)) return [];
    return data.filter(
      (item): item is CabinetItem =>
        Boolean(item) &&
        typeof item.id === "string" &&
        typeof item.brand_name === "string",
    );
  } catch {
    return [];
  }
}

export function writeLocalCabinet(items: CabinetItem[]) {
  try {
    localStorage.setItem(CABINET_KEY, JSON.stringify(items.slice(0, 30)));
  } catch {}
}

export function getPatientId(): string {
  try {
    const existing = localStorage.getItem(PATIENT_KEY);
    if (existing && /^[a-zA-Z0-9_-]{4,64}$/.test(existing)) return existing;
    const created = `pk-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(PATIENT_KEY, created);
    return created;
  } catch {
    return "anonymous";
  }
}

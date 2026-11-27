"use client";
import { CloudOff, FileWarning, KeyRound, RefreshCw } from "lucide-react";
import type { ScanResult } from "@/lib/api";
import { pick, visionCopy } from "@/lib/copy";
import { useLanguage } from "@/lib/i18n";

/**
 * Shown when the reader did not analyse the photo. Without this, a server
 * outage looks identical to "your handwriting is unclear", which sends the
 * patient to retake a photo that was never the problem.
 */
export default function VisionNotice({
  scan,
  onRetake,
}: {
  scan: ScanResult;
  onRetake: () => void;
}) {
  const { language } = useLanguage();
  const copy = pick(visionCopy, language);
  const status = scan.vision_status;
  if (!status || status === "OK" || status === "UNREADABLE") return null;

  const view =
    status === "NOT_CONFIGURED"
      ? { Icon: KeyRound, title: copy.notConfiguredTitle, body: copy.notConfiguredBody }
      : status === "INVALID_IMAGE"
        ? { Icon: FileWarning, title: copy.invalidTitle, body: copy.invalidBody }
        : { Icon: CloudOff, title: copy.serviceTitle, body: copy.serviceBody };

  return (
    <section className="vision-notice" role="alert">
      <view.Icon size={26} aria-hidden="true" />
      <div>
        <h2>{view.title}</h2>
        <p>{view.body}</p>
        <button type="button" className="secondary-button" onClick={onRetake}>
          <RefreshCw size={18} aria-hidden="true" />
          {copy.retry}
        </button>
      </div>
    </section>
  );
}

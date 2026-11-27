"use client";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { pick, statusCopy } from "@/lib/copy";
import { useLanguage } from "@/lib/i18n";
import { useOnline } from "@/lib/useOnline";

export default function ConnectionStatus() {
  const { language } = useLanguage();
  const copy = pick(statusCopy, language);
  const online = useOnline();
  const wasOffline = useRef(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setRestored(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setRestored(true);
    const timer = window.setTimeout(() => setRestored(false), 3200);
    return () => window.clearTimeout(timer);
  }, [online]);

  if (online && !restored) return <div className="connection-status" role="status" aria-live="polite" />;
  return (
    <div className={`connection-status is-visible ${online ? "is-online" : "is-offline"}`} role="status" aria-live="polite">
      {online ? <Wifi size={18} aria-hidden="true" /> : <WifiOff size={18} aria-hidden="true" />}
      <span>{online ? copy.backOnline : copy.offline}</span>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import {
  sendWhatsAppReminder,
  simulateWhatsAppReply,
  type ScanResult,
  type WhatsAppReminderResult,
  type WhatsAppWebhookResult,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { getPatientId } from "@/lib/records";

export default function WhatsAppPreviewModal({
  open,
  scan,
  onClose,
}: {
  open: boolean;
  scan: ScanResult | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const confirmedBrand =
    scan?.medications.find((m) => m.status === "VERIFIED")?.brand_matched ||
    "Augmentin";
  const [phone, setPhone] = useState("+923001234567");
  const [busy, setBusy] = useState(false);
  const [reminder, setReminder] = useState<WhatsAppReminderResult | null>(null);
  const [replyOut, setReplyOut] = useState<WhatsAppWebhookResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
    }
  }, [open]);

  if (!open) return null;

  async function triggerCheckin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setReplyOut(null);
    try {
      const res = await sendWhatsAppReminder({
        patient_id: getPatientId(),
        scan_id: scan?.scan_id || null,
        brand_name: confirmedBrand,
        phone_e164: phone,
        reminder_type: "day3_checkin",
      });
      setReminder(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("networkError"));
    } finally {
      setBusy(false);
    }
  }

  async function testWebhookReply(sample: string) {
    setBusy(true);
    setError("");
    try {
      const res = await simulateWhatsAppReply({ from: phone, body: sample });
      setReplyOut(res);
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="strip-dialog demo-dialog"
      aria-labelledby="wa-modal-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-header">
          <span className="eyebrow">
            <MessageCircle size={14} /> {t("whatsapp")}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t("close")}
          >
            <X size={20} />
          </button>
        </div>

        <h2 id="wa-modal-title">{t("waPreviewHeading")}</h2>
        <p className="demo-sub">{t("waPreviewDesc")}</p>

        <form className="wa-sim-form" onSubmit={(e) => void triggerCheckin(e)}>
          <label htmlFor="wa-phone-input">{t("waPhoneLabel")}</label>
          <div className="wa-sim-row">
            <input
              id="wa-phone-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              required
            />
            <button type="submit" className="primary-button" disabled={busy}>
              <Send size={16} />
              <span>{t("waTriggerBtn")}</span>
            </button>
          </div>
        </form>

        {error && (
          <p className="capture-error" role="alert">
            {error}
          </p>
        )}

        {reminder && (
          <div className="wa-thread-box">
            <div className="wa-meta-row" dir="ltr">
              <span>Status: {reminder.status}</span>
              <span>
                Scheduled: {String(reminder.whatsapp_scheduled)}
              </span>
            </div>
            <div className="wa-bubble wa-outbound" dir="ltr">
              {reminder.urdu_message}
            </div>
            <div className="wa-reply-buttons">
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => void testWebhookReply("1 haan theek hai")}
              >
                {t("waSimContinue")}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => void testWebhookReply("2 ab bukhar theek hai, dawa rok di")}
              >
                {t("waSimStop")}
              </button>
            </div>
          </div>
        )}

        {replyOut && (
          <div className="wa-thread-box">
            <div className="wa-meta-row" dir="ltr">
              <strong>Webhook classification: {replyOut.classification}</strong>
            </div>
            <div className="wa-bubble wa-reply" dir="ltr">
              {replyOut.urdu_reply}
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}

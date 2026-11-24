import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Interaction, Medication } from "@/lib/api";
import SpeakerButton from "./SpeakerButton";

export default function SafetyAlertBanner({ interactions, medications }: { interactions: Interaction[]; medications: Medication[] }) {
  const refused = medications.filter(m => m.status !== "VERIFIED");
  return <div className="space-y-4">
    {interactions.map((hit, index) => <section className="alert-card alert-red" key={`${hit.drug_a}-${index}`} role="alert">
      <div className="alert-icon"><ShieldAlert size={24} /></div><div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="eyebrow text-red-700">اہم حفاظتی انتباہ · FDA</span><SpeakerButton text={hit.urdu_warning} /></div>
        <h3 className="alert-title">رک جائیں — یہ دوائیں ایک ساتھ خطرناک ہو سکتی ہیں</h3>
        <p dir="ltr" className="english-detail">{hit.drug_a} + {hit.drug_b}</p>
        <p className="urdu-copy">{hit.urdu_warning}</p>
        <details className="source-detail"><summary>FDA حوالہ دیکھیں</summary><p dir="ltr">{hit.fda_verbatim_excerpt}</p><small>{hit.source}</small></details>
      </div>
    </section>)}
    {refused.map(med => <section className="alert-card alert-amber" key={med.line_id} role="alert">
      <div className="alert-icon"><AlertTriangle size={24} /></div><div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="eyebrow text-amber-800">تصدیق ضروری ہے</span><SpeakerButton text={med.refusal_reason_urdu || "یہ لفظ صاف نہیں ہے۔ فارماسسٹ سے تصدیق کریں۔"} /></div>
        <h3 className="alert-title">اس دوا کا نام یا مقدار واضح نہیں</h3>
        <p className="urdu-copy">{med.refusal_reason_urdu}</p>
        {med.cropped_handwriting_b64 && <div className="crop-wrap"><img src={med.cropped_handwriting_b64} alt="پرچی کا غیر واضح حصہ" className="crop-image" /><span>اصل پرچی کا حصہ</span></div>}
      </div>
    </section>)}
    {!interactions.length && !refused.length && medications.length > 0 && <section className="alert-card alert-green"><ShieldCheck size={24} /><div><span className="eyebrow text-emerald-800">جانچ مکمل</span><p className="urdu-copy">پڑھی گئی دواؤں میں دستیاب معلومات کے مطابق کوئی بڑا تضاد نہیں ملا۔</p></div></section>}
  </div>;
}

"use client";
import { LoaderCircle, ScanLine, FileText, Pill, ShieldCheck, AudioLines } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
export default function ProcessingExperience({ image }: { image: string | null }) {
  const { t } = useLanguage();
  const stages = [{ key: "reading", icon: ScanLine }, { key: "extracting", icon: FileText }, { key: "identifying", icon: Pill }, { key: "checking", icon: ShieldCheck }, { key: "preparing", icon: AudioLines }] as const;
  return <section className="processing-layout" aria-busy="true" aria-label={t("processing")}><div className="processing-image">{image && <img src={image} alt={t("preview")}/>}<div className="processing-scan-line"/><span className="processing-image-caption"><ScanLine size={19}/>{t("intelligence")}</span></div><div className="processing-copy"><span className="eyebrow">{t("inProgress")}</span><div className="processing-orbit" aria-hidden="true"><span/><LoaderCircle size={42}/></div><h2 role="status">{t("processing")}</h2><p>{t("processingBody")}</p><ul className="processing-stages">{stages.map(({key,icon:Icon})=><li key={key}><Icon size={20}/><span>{t(key)}</span></li>)}</ul><p className="processing-note">{t("processingHonest")}</p></div></section>;
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, ScanLine, RefreshCw, Check, Volume2, Zap, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { speak } from "./SpeakerButton";

type TorchTrack = MediaStreamTrack & { getCapabilities: () => MediaTrackCapabilities & { torch?: boolean } };
export default function ParchiCamera({ onSelect, busy, kind = "prescription" }: { onSelect: (file: File) => void; busy: boolean; kind?: "prescription" | "strip" }) {
  const { t, language } = useLanguage();
  const gallery = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const previewUrl = useRef("");
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [live, setLive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(false);
  const mounted = useRef(true);
  const stop = () => { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stop(); URL.revokeObjectURL(previewUrl.current); }; }, []);
  useEffect(() => { if (live && video.current && stream.current) { video.current.srcObject = stream.current; video.current.play().catch(() => { setError(t("cameraDenied")); stop(); setLive(false); }); } }, [live, t]);
  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) { setError(t("cameraUnsupported")); return; }
    setStarting(true);
    try {
      stop();
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      if (!mounted.current) { media.getTracks().forEach(track=>track.stop()); return; }
      stream.current = media; const track = media.getVideoTracks()[0] as TorchTrack;
      setTorchSupported(Boolean((track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean })?.torch)); setTorch(false); setPreview(null); setLive(true);
    } catch { if (mounted.current) setError(t("cameraDenied")); }
    finally { if (mounted.current) setStarting(false); }
  }
  async function choose(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError(t("photoType")); return; }
    if (file.size > 8 * 1024 * 1024) { setError(t("photoLarge")); return; }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (!mounted.current) { URL.revokeObjectURL(url); return; }
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 40;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) { context.drawImage(image,0,0,40,40); const data = context.getImageData(0,0,40,40).data; let luminance=0; for(let i=0;i<data.length;i+=4) luminance+=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]; setDark(luminance/1600<45); }
      URL.revokeObjectURL(previewUrl.current); previewUrl.current=url; setPreview({ file,url }); setError(""); stop(); setLive(false);
    } catch { URL.revokeObjectURL(url); setError(t("photoBroken")); }
  }
  function capture() {
    const source=video.current;
    if (!source?.videoWidth || !source.videoHeight) { setError(t("cameraDenied")); return; }
    const canvas=document.createElement("canvas"); canvas.width=source.videoWidth; canvas.height=source.videoHeight;
    canvas.getContext("2d")?.drawImage(source,0,0);
    canvas.toBlob(blob=>{ if(blob) void choose(new File([blob],"prescription.jpg",{type:"image/jpeg"})); else setError(t("photoBroken")); },"image/jpeg",.9);
  }
  async function toggleTorch() {
    try { const track=stream.current?.getVideoTracks()[0]; await track?.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] }); setTorch(!torch); }
    catch { setError(t("flashUnavailable")); }
  }
  return <section className="capture-layout"><div className="capture-panel"><div className={`camera-viewport ${preview ? "has-preview" : ""}`}>
    {preview ? <img src={preview.url} alt={t(kind==="strip" ? "stripPreview":"preview")}/> : live ? <video ref={video} autoPlay muted playsInline aria-label={t("cameraTitle")}/> : <div className="camera-idle"><ScanLine size={64} strokeWidth={1}/><p>{t(kind==="strip" ? "verifyHint":"cameraHint")}</p><button type="button" className="secondary-button" disabled={starting || busy} onClick={start}><Camera size={21}/>{starting ? t("loading"):t("startCamera")}</button></div>}
    {!preview && <div className="viewport-guides" aria-hidden="true"><i/><i/><i/><i/></div>}
    {live && <span className="camera-live-label"><span/>{t("capture")}</span>}
    </div><div className="capture-controls"><button type="button" className="icon-button" disabled={busy} onClick={()=>gallery.current?.click()} aria-label={t("gallery")}><ImagePlus size={23}/></button>{preview ? <button className="primary-button" type="button" disabled={busy} onClick={()=>onSelect(preview.file)}><Check size={21}/>{t(kind==="strip" ? "verifyPhoto":"confirmPhoto")}</button> : <button className="shutter" type="button" onClick={live ? capture : start} disabled={starting||busy} aria-label={t(live ? "capture":"openCamera")}><span/></button>}{preview ? <button type="button" className="icon-button" disabled={busy} onClick={()=>{ setPreview(null); setDark(false); void start(); }} aria-label={t("retake")}><RefreshCw size={22}/></button> : <button type="button" className="icon-button" onClick={toggleTorch} disabled={!torchSupported||!live||busy} aria-label={t("flash")} title={t(torchSupported ? "flash":"flashUnavailable")} aria-pressed={torch}><Zap size={22}/></button>}</div><input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label={t("gallery")} onChange={e=>{void choose(e.target.files?.[0]);e.target.value="";}}/>
    {!live && !preview && <button className="gallery-link" type="button" disabled={busy} onClick={()=>gallery.current?.click()}><ImagePlus size={18}/>{t("gallery")}</button>}
    {error && <div className="capture-error" role="alert"><AlertCircle size={21}/><p>{error}</p></div>}{dark && preview && <p className="lighting-notice" role="status">{t("poorLight")}</p>}
  </div><aside className="capture-help"><span className="eyebrow">{t("intelligence")}</span><h2>{t(kind==="strip" ? "verifyHeading":"scanTitle")}</h2><p>{t(kind==="strip" ? "verifyHint":"cameraHelp")}</p><div className="capture-tip"><ScanLine size={24}/><p>{t("cameraHint")}</p></div><button type="button" className="secondary-button" onClick={()=>{ if(!speak(t("cameraGuide"),null,language)) setError(t("noVoice")); }}><Volume2 size={20}/>{t("guidance")}</button><p className="privacy-copy">{t("privacyNote")}</p></aside></section>;
}

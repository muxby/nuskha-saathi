"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "ur";

const en = {
  notFoundTitle: "This page could not be found.",
  notFoundBody:
    "Return home to scan a prescription or open your saved records.",
  brand: "Nuskha Saathi",
  tagline: "Your medicine companion",
  home: "Home",
  scan: "Scan prescription",
  verify: "Verify medicine",
  medicines: "My medicines",
  history: "History",
  navHome: "Home",
  navScan: "Scan",
  navMeds: "Medicines",
  navHistory: "History",
  settings: "Settings",
  language: "Language",
  close: "Close",
  back: "Back",
  cancel: "Cancel",
  remove: "Remove",
  continue: "Continue",
  retry: "Try again",
  loading: "Loading…",
  heroOne: "Read your doctor's",
  heroTwo: "prescription clearly.",
  heroBody:
    "Take a photo of any handwritten prescription. Nuskha Saathi matches Pakistani brands, checks for drug clashes, lays out morning, afternoon, and night doses, and plays instructions in Urdu.",
  heroSplitLeft: "SA",
  heroSplitRight: "FE",
  heroTag: "Dawa-Guard · Prescription Clarity",
  heroEditorialCap: "P",
  heroEditorialRest:
    "hotograph any handwritten parchi. We match Pakistani brands, catch dangerous clashes, map daily doses, and read instructions aloud in Urdu.",
  pillPreviewToggle: "Toggle capsule view",
  mobileOne: "Read your medicine",
  mobileTwo: "with confidence.",
  mobileBody:
    "Scan your handwritten parchi, check drug safety, and listen in Urdu.",
  scrollExplore: "Explore workflow",
  badgeOcr: "Handwriting reader",
  badgeGate: "openFDA & formulary checks",
  badgeVoice: "Pakistani Urdu voice",
  workspaceEyebrow: "How a scan works",
  workspaceTitle: "From handwritten parchi to verified daily schedule.",
  workspaceSub:
    "Select a step to inspect what the app extracts and checks. Sample preview only, not patient data.",
  tabRead: "1. Read parchi",
  tabSafety: "2. Dose and safety",
  tabVerify: "3. Strip and Urdu",
  sampleLabel: "Sample preview",
  sampleReadTitle: "Extract text without guessing unclear ink",
  sampleReadDesc:
    "Gemini reads the handwritten lines and crops unclear areas. Any medicine below the fuzzy-match threshold waits for a pharmacist confirmation.",
  sampleReadChip: "Uncertain text requires pharmacist check",
  sampleSafetyTitle: "Visual daily routine and interaction alerts",
  sampleSafetyDesc:
    "Confirmed medicines display morning, afternoon, and night tablet counts with food timing, while severe drug pairs raise a red warning.",
  sampleSafetyChip: "Morning 1 · Afternoon 0 · Night 1",
  sampleVerifyTitle: "Compare your blister strip and hear Urdu audio",
  sampleVerifyDesc:
    "Photograph the strip in your hand to verify brand, generic salt, and milligram strength, then listen in Urdu or print the QR dose card.",
  sampleVerifyChip: "Strip verified · Urdu audio ready",
  timelineHeading: "What each check catches",
  timelineHigh: "High interaction warning",
  timelineHighSub: "Red alert with verbatim FDA excerpt before taking",
  timelineBlur: "Blurry handwriting protection",
  timelineBlurSub: "Refuses safely when strength or name is unclear",
  timelineMatch: "Formulary brand and salt match",
  timelineMatchSub: "Matches Pakistani brands and generic ingredients",
  timelineUrdu: "Spoken Urdu and QR replay",
  timelineUrduSub: "Listen at home or share audio with a caregiver",
  boundaryNumber: "01 · Safety boundary",
  boundaryTitle:
    "The vision model reads the handwriting, and deterministic rules enforce every clinical check.",
  boundaryBody:
    "Nuskha Saathi does not diagnose, prescribe, or recommend switching brands. Unconfirmed doses stay marked unknown, and unclear lines prompt a pharmacist check.",
  coreEyebrow: "Patient tools",
  coreTitle: "Designed for home and the pharmacy counter.",
  coreBody:
    "Every tool maps to a real task: reading the parchi, checking the medicine strip, and confirming when to take each dose.",
  scanTitle: "Read what your doctor wrote.",
  scanDescription: "Turn handwritten prescriptions into clear instructions.",
  intelligence: "Handwriting reader",
  voiceTitle: "Listen in your language.",
  voiceDescription: "Play Urdu audio instructions whenever you need them.",
  voice: "Voice explanation",
  urduVoice: "Pakistani Urdu audio",
  voiceOnly:
    "Recorded explanations are available in Urdu. English voice is not configured.",
  verificationTitle: "Check the medicine strip",
  verificationBody: "Compare your blister pack with your prescription.",
  scheduleTitle: "Daily dose routine",
  scheduleBody: "See morning, afternoon, and night tablet counts.",
  remindersTitle: "WhatsApp reminders",
  remindersBody: "WhatsApp voice reminders are planned for a later phase.",
  safetyTitle: "Built around patient safety",
  safetyBody:
    "Uncertain handwriting asks for pharmacist confirmation, and brand identity is checked against our formulary.",
  today: "Your medicine schedule",
  noSchedule: "Your routine starts with a prescription.",
  noScheduleBody:
    "Scan a prescription to see confirmed medicine instructions here.",
  openCamera: "Open camera",
  gallery: "Upload a photo",
  dropHint: "or drop a JPEG, PNG, or WebP photo here",
  listen: "Listen",
  prescriptions: "Prescriptions",
  savedRecords: "Your saved records",
  whatsapp: "WhatsApp reminders",
  comingSoon: "Not connected yet",
  seeSchedule: "View dose schedule",
  privacyNote:
    "Your health information stays in this session unless you choose to save it on this device.",
  clinicalNote:
    "Follow your clinician’s advice. Check unclear instructions with a pharmacist before taking medicine.",
  footer: "Nuskha Saathi · Dawa-Guard",
  footerMission:
    "Clear reading, formulary safety checks, and spoken Pakistani Urdu for handwritten prescriptions.",
  footerTools: "Tools",
  footerTrust: "Clinical safety",
  footerTrust1: "Deterministic formulary match",
  footerTrust2: "openFDA interaction check",
  footerTrust3: "Fail-closed blurry refusal",
  footerTrust4: "Local browser storage only",
  footerAccess: "Preferences",
  stepCapture: "1. Photo",
  stepReview: "2. Safety & Dose",
  stepStrip: "3. Strip Check",
  clarityLens: "Clarity lens",
  clarityLensActive: "Clarity lens on",
  cabinetOptIn: "Also check against saved medicines on this device",
  backendStatus: "Safety engine status",
  backendConnected: "Connected",
  backendOffline: "Safety engine offline at",
  backendBrands: "Formulary brands",
  backendPairs: "Interaction pairs",
  cameraTitle: "Scan your prescription",
  cameraHint: "Fit the entire prescription inside the frame.",
  cameraHelp: "Use good light, hold steady, and keep the writing in focus.",
  startCamera: "Use camera",
  capture: "Take photo",
  retake: "Retake photo",
  confirmPhoto: "Use this photo",
  preview: "Prescription photo preview",
  cameraDenied:
    "Camera access is unavailable. Allow camera access in your browser settings, or upload a photo.",
  cameraUnsupported:
    "This browser cannot open a live camera. You can still upload a photo.",
  flash: "Toggle camera light",
  flashUnavailable: "Camera light is not supported on this device.",
  photoType: "Choose a JPEG, PNG, or WebP image.",
  photoLarge: "This photo is larger than 8 MB. Choose a smaller image.",
  photoBroken: "This image could not be opened. Try another photo.",
  poorLight:
    "The photo appears dark. Retake it in brighter light if the writing is hard to see.",
  guidance: "Hear camera guidance",
  cameraGuide:
    "Place the prescription in good light. Keep the whole page in the frame and hold the camera steady.",
  networkError:
    "Could not connect. Check your internet connection and try again.",
  uploadError: "The photo could not be checked. Please try again.",
  processing: "Understanding your prescription",
  processingBody:
    "Your photo is being read and checked. Please keep this page open.",
  processingHonest:
    "The server returns one complete result. Individual steps are not reported live.",
  reading: "Reading handwriting",
  extracting: "Extracting instructions",
  identifying: "Identifying medicines",
  checking: "Checking interactions",
  preparing: "Preparing Urdu voice",
  inProgress: "Processing",
  results: "Your prescription",
  resultsBody:
    "Compare the original writing with the information read from it.",
  original: "Original prescription",
  extracted: "What we could read",
  originalUnavailable:
    "The original photo is only available during the current scan session.",
  rawText: "Original wording",
  noRaw: "No readable source text was returned.",
  identityMatched: "Medicine identity matched",
  confirmationRequired: "Professional confirmation required",
  unknownMedicine: "Unconfirmed medicine",
  newScan: "New scan",
  save: "Save on this device",
  saved: "Saved on this device",
  saveFailed:
    "Could not save on this device. Device storage may be full or blocked.",
  refused:
    "We could not confirm these instructions. Retake the photo in good light or ask a pharmacist.",
  noMedicines: "No confirmed medicines were returned.",
  doseSchedule: "Visual dose schedule",
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Night",
  tablet: "tablet(s)",
  noDose: "No scheduled dose",
  unknownDose: "Dose not confirmed",
  beforeFood: "Before food",
  afterFood: "After food",
  mealAny: "With or without food",
  mealUnknown: "Food instructions not confirmed",
  duration: "Duration",
  days: "days",
  notSpecified: "Not specified",
  print: "Print dose card",
  replayQr: "Replay instructions",
  qrHint: "Scan to hear the same Urdu explanation.",
  share: "Share on WhatsApp",
  shareNote:
    "This link gives access to your prescription audio. Share only with someone you trust.",
  shareAudio: "Prescription audio from Nuskha Saathi",
  antibiotic: "Follow your clinician’s instructions for the antibiotic course.",
  aware: "WHO AWaRe classification",
  shortage: "Availability information from the medicine record",
  fullAudio: "Listen to instructions",
  play: "Play",
  pause: "Pause",
  replay: "Replay",
  speed: "Playback speed",
  audioUnavailable:
    "No recorded audio is available. A matching Urdu browser voice may be available on your device.",
  audioFailed:
    "Audio could not be played. Check your connection and try again.",
  noVoice: "A matching voice is not installed on this device.",
  audioLoading: "Loading prescription audio…",
  audioMissing:
    "This audio is unavailable. Please scan the prescription again.",
  audioTitle: "Your prescription audio",
  browserVoice: "Use device Urdu voice",
  audioLanguage: "Urdu · اردو",
  verifyHeading: "Check your medicine strip",
  verifyHint:
    "Photograph the strip so the name and strength are clearly visible.",
  prescribed: "Prescribed medicine",
  detected: "Read from the strip",
  verifyPhoto: "Check this strip",
  verifyBusy: "Checking your medicine strip…",
  exact: "Medicine and strength matched",
  generic: "Generic ingredients and strength matched",
  genericCaution:
    "A generic match is not permission to substitute. Confirm with your pharmacist before changing brands.",
  mismatch: "This strip does not match",
  strengthMismatch: "Strength does not match",
  unreadable: "Could not read the strip",
  verificationFailed: "Verification could not be completed",
  verifyFirst: "Scan a prescription first",
  verifyFirstBody:
    "A confirmed medicine is needed to compare the strip with the prescription.",
  chooseMedicine: "Choose a confirmed medicine",
  stripPreview: "Medicine strip photo",
  noStrength:
    "The prescription strength is not confirmed. Ask a pharmacist before checking this strip.",
  seriousWarning: "Important medicine warning",
  moderateWarning: "Interaction needs professional review",
  warningAction:
    "Speak to your doctor or pharmacist before taking these medicines together.",
  unknownWarning: "The medicine name or dose needs confirmation.",
  pharmacistAction:
    "Ask a pharmacist to read this part before taking medicine.",
  viewSource: "View interaction evidence",
  sourceCrop: "Original prescription detail",
  noInteraction:
    "Medicine identities matched against the formulary. No listed interaction was returned by this check; other risks may still apply.",
  noEndorsement:
    "Source information supports this check; it does not imply FDA or WHO endorsement.",
  backendUrdu: "Original explanation · Urdu",
  cabinetTitle: "A home for your medicines.",
  cabinetBody:
    "Confirmed instructions from prescriptions you save on this device.",
  cabinetEmpty: "Your medicine cabinet is empty",
  cabinetEmptyBody:
    "Save a prescription after scanning to keep its confirmed instructions here.",
  historyTitle: "Your prescription history",
  historyEmpty: "No saved prescriptions yet",
  historyBody:
    "Saved prescriptions stay in this browser on this device. There is no account sync.",
  savedOn: "Saved",
  viewPrescription: "Open prescription",
  deleteRecord: "Delete this saved prescription?",
  clearHistory: "Delete saved records",
  clearQuestion: "Delete all prescriptions saved in this browser?",
  currentSession: "Current scan",
  completedUnknown:
    "Course dates are not recorded, so active and completed courses cannot be determined.",
  reminderTitle: "Reminders, when you need them.",
  reminderUnavailable:
    "WhatsApp scheduling is not connected to this version. No reminders will be sent.",
  reminderTime: "Preferred reminder time",
  reminderLanguage: "Reminder language",
  voiceNote: "Voice note reminder",
  enableReminder: "Enable reminders",
  backendNotScheduled: "The backend has not confirmed a reminder schedule.",
  backendScheduled:
    "The backend reports reminders scheduled for this prescription.",
  reminderNoMedicine: "Scan a prescription with confirmed instructions first.",
  settingsTitle: "Make yourself comfortable.",
  settingsBody: "Choose how Nuskha Saathi looks and reads on this device.",
  theme: "Appearance",
  themeDesc: "Switch between warm porcelain, high-contrast daylight, or midnight blue.",
  editorialTheme: "Porcelain",
  darkTheme: "Midnight",
  lightTheme: "High contrast light",
  languageDesc: "Display menus, alerts, and daily dose cards in English or easy-to-read Urdu.",
  deviceStorage: "On this device",
  storageBody:
    "Only prescriptions you explicitly save are kept in this browser. Anyone using this browser can see them. Delete them from History.",
  diagnostics: "Developer evidence",
  diagnosticsToggle: "Show local diagnostics drawer",
  diagnosticsHint:
    "Enable local diagnostics to inspect the current scan. Prescription evidence can contain sensitive health information.",
  proof: "Developer proof",
  timings: "Processing times",
  costs: "Estimated request cost",
  fuzzy: "Fuzzy match scores",
  rawFda: "Raw interaction evidence",
  proofEmpty: "Complete a scan to inspect real processing evidence.",
  providersUnavailable:
    "The API does not report the selected voice provider or fallback path.",
  notReported: "Not reported",
  skip: "Skip to main content",
  offline: "You appear to be offline. Scanning needs an internet connection.",
} as const;

type Key = keyof typeof en;

const ur: Record<Key, string> = {
  notFoundTitle: "یہ صفحہ نہیں مل سکا۔",
  notFoundBody: "نسخہ اسکین کرنے یا محفوظ ریکارڈ دیکھنے کے لیے ہوم پر واپس جائیں۔",
  brand: "نسخہ ساتھی",
  tagline: "دوا کی محفوظ رہنمائی",
  home: "ہوم",
  scan: "نسخہ اسکین کریں",
  verify: "دوا ملائیں",
  medicines: "میری دوائیں",
  history: "پچھلے نسخے",
  navHome: "ہوم",
  navScan: "اسکین",
  navMeds: "دوائیں",
  navHistory: "ریکارڈ",
  settings: "ترتیبات",
  language: "زبان",
  close: "بند کریں",
  back: "واپس",
  cancel: "منسوخ کریں",
  remove: "حذف کریں",
  continue: "آگے بڑھیں",
  retry: "دوبارہ کوشش کریں",
  loading: "لوڈ ہو رہا ہے…",
  heroOne: "ڈاکٹر کا لکھا نسخہ",
  heroTwo: "آسان اردو میں سمجھیں۔",
  heroBody:
    "ہاتھ سے لکھی پرچی کی تصویر لیں۔ نسخہ ساتھی پاکستانی دوائیں پہچانتا ہے، آپس کے نقصان دہ اثر چیک کرتا ہے، صبح دوپہر رات کی خوراک دکھاتا ہے اور اردو میں سناتا ہے۔",
  heroSplitLeft: "محفوظ",
  heroSplitRight: "دوا",
  heroTag: "دوا گارڈ · نسخے کی واضح رہنمائی",
  heroEditorialCap: "",
  heroEditorialRest:
    "ڈاکٹر کا لکھا نسخہ اسکین کریں۔ پاکستانی برانڈز کی شناخت، خطرناک ٹکراؤ کی جانچ، روزانہ خوراک اور آسان اردو آواز فوری پائیں۔",
  pillPreviewToggle: "کیپسول کا منظر بدلیں",
  mobileOne: "اپنی دوا سمجھیں",
  mobileTwo: "پورے اطمینان کے ساتھ۔",
  mobileBody: "پرچی کی تصویر لیں، دوا کی حفاظت جانچیں اور اردو ہدایات سنیں۔",
  scrollExplore: "طریقہ کار دیکھیں",
  badgeOcr: "لکھائی کی پہچان",
  badgeGate: "حفاظتی جانچ کا نظام",
  badgeVoice: "پاکستانی اردو آواز",
  workspaceEyebrow: "اسکین کیسے کام کرتا ہے",
  workspaceTitle: "ہاتھ سے لکھی پرچی سے روزانہ خوراک کے کارڈ تک۔",
  workspaceSub:
    "ہر مرحلے پر کلک کر کے جانچ کی تفصیل دیکھیں۔ یہ صرف سمجھانے کے لیے نمونہ ہے، کسی مریض کا ریکارڈ نہیں۔",
  tabRead: "۱۔ پرچی پڑھیں",
  tabSafety: "۲۔ خوراک اور حفاظت",
  tabVerify: "۳۔ پٹی اور اردو آواز",
  sampleLabel: "تعارفی نمونہ",
  sampleReadTitle: "اندازے کے بغیر صاف لکھائی پڑھنا",
  sampleReadDesc:
    "سسٹم صرف ڈاکٹر کی لکھی عبارت پڑھتا ہے اور دھندلے الفاظ الگ کر دیتا ہے۔ غیر واضح دوا پر فارماسسٹ سے تصدیق کا مشورہ دیا جاتا ہے۔",
  sampleReadChip: "غیر واضح دوا پر فارماسسٹ سے تصدیق ضروری",
  sampleSafetyTitle: "روزانہ خوراک اور دواؤں کے ٹکراؤ کا الرٹ",
  sampleSafetyDesc:
    "تصدیق شدہ دواؤں کی صبح، دوپہر اور رات کی گولیاں کھانے کے وقت سمیت نظر آتی ہیں، اور خطرناک ٹکراؤ پر سرخ انتباہ آتا ہے۔",
  sampleSafetyChip: "صبح ۱ · دوپہر ۰ · رات ۱",
  sampleVerifyTitle: "دوا کی پٹی چیک کریں اور اردو آواز سنیں",
  sampleVerifyDesc:
    "اپنے ہاتھ میں موجود دوا کی پٹی کی تصویر لے کر برانڈ اور طاقت کی تصدیق کریں، پھر اردو ہدایات سنیں یا QR کارڈ پرنٹ کریں۔",
  sampleVerifyChip: "پٹی درست ہے · اردو آواز تیار",
  timelineHeading: "ہر جانچ میں کیا دیکھا جاتا ہے",
  timelineHigh: "خطرناک دوا ٹکراؤ کا انتباہ",
  timelineHighSub: "دوا لینے سے پہلے سرخ الرٹ اور مستند FDA ثبوت",
  timelineBlur: "دھندلی لکھائی سے مکمل تحفظ",
  timelineBlurSub: "نام یا طاقت واضح نہ ہو تو اندازے کے بجائے محفوظ انکار",
  timelineMatch: "فارمولری سے برانڈ اور سالٹ کی تصدیق",
  timelineMatchSub: "پاکستانی برانڈز اور ان کے اصل سالٹ کی جانچ",
  timelineUrdu: "آسان اردو آواز اور QR کارڈ",
  timelineUrduSub: "گھر پر بار بار سنیں یا گھر والوں کے ساتھ شیئر کریں",
  boundaryNumber: "۰۱ · طبی حفاظت کا اصول",
  boundaryTitle:
    "کیمرہ صرف لکھائی پڑھتا ہے، جبکہ ہر حفاظتی فیصلہ طے شدہ طبی اصولوں کے مطابق ہوتا ہے۔",
  boundaryBody:
    "نسخہ ساتھی نہ مرض کی تشخیص کرتا ہے اور نہ دوا تجویز کرتا ہے۔ غیر واضح خوراک پر اندازہ نہیں لگایا جاتا اور مشکوک حصے پر فارماسسٹ سے تصدیق کی جاتی ہے۔",
  coreEyebrow: "مریض کی سہولیات",
  coreTitle: "گھر اور میڈیکل اسٹور دونوں جگہ آسان استعمال۔",
  coreBody:
    "ہر بٹن ایک واضح کام کے لیے ہے: پرچی پڑھنا، دوا کی پٹی چیک کرنا اور روزانہ خوراک یاد رکھنا۔",
  scanTitle: "سمجھیں، ڈاکٹر نے کیا لکھا ہے۔",
  scanDescription: "ہاتھ سے لکھے نسخے کو آسان اور واضح ہدایات میں بدلیں۔",
  intelligence: "لکھائی کی پہچان",
  voiceTitle: "اپنی زبان میں سنیں۔",
  voiceDescription: "جب چاہیں اردو میں دوا لینے کا مکمل طریقہ سنیں۔",
  voice: "آواز میں ہدایات",
  urduVoice: "پاکستانی اردو میں آواز",
  voiceOnly: "ریکارڈ شدہ ہدایات صرف اردو میں دستیاب ہیں۔",
  verificationTitle: "دوا کی پٹی ملائیں",
  verificationBody: "میڈیکل اسٹور سے لی گئی پٹی کو نسخے سے چیک کریں۔",
  scheduleTitle: "روزانہ خوراک کا وقت",
  scheduleBody: "صبح، دوپہر اور رات کی گولیاں کھانے کے وقت سمیت دیکھیں۔",
  remindersTitle: "واٹس ایپ یاددہانی",
  remindersBody: "واٹس ایپ پر وقت کی یاددہانی اگلے مرحلے میں فعال ہوگی۔",
  safetyTitle: "مریض کی حفاظت سب سے پہلے",
  safetyBody:
    "غیر واضح لکھائی پر فارماسسٹ کی رائے ضروری ہے اور ہر دوا کی تصدیق پاکستانی فارمولری سے کی جاتی ہے۔",
  today: "آج کی دوا کے اوقات",
  noSchedule: "آپ کا شیڈول نسخے سے شروع ہوگا۔",
  noScheduleBody: "تصدیق شدہ خوراک دیکھنے کے لیے پہلے پرچی اسکین کریں۔",
  openCamera: "کیمرہ کھولیں",
  gallery: "گیلری سے تصویر لیں",
  dropHint: "یا JPEG، PNG یا WebP تصویر یہاں رکھیں",
  listen: "سنیں",
  prescriptions: "نسخے",
  savedRecords: "محفوظ ریکارڈ",
  whatsapp: "واٹس ایپ یاددہانی",
  comingSoon: "ابھی منسلک نہیں",
  seeSchedule: "خوراک کا وقت دیکھیں",
  privacyNote:
    "آپ کی معلومات صرف اس وقت تک رہتی ہیں جب تک آپ خود محفوظ نہ کریں۔",
  clinicalNote:
    "ہمیشہ اپنے ڈاکٹر کے مشورے پر عمل کریں۔ کسی بھی ابہام پر دوا لینے سے پہلے فارماسسٹ سے تصدیق کریں۔",
  footer: "نسخہ ساتھی · دوا گارڈ",
  footerMission:
    "ہاتھ سے لکھے نسخوں کے لیے آسان سمجھ، حفاظتی جانچ اور پاکستانی اردو آواز۔",
  footerTools: "سہولیات",
  footerTrust: "حفاظتی اصول",
  footerTrust1: "طے شدہ فارمولری تصدیق",
  footerTrust2: "openFDA باہمی اثر کی جانچ",
  footerTrust3: "دھندلی لکھائی پر محفوظ انکار",
  footerTrust4: "صرف آپ کے آلے پر محفوظ",
  footerAccess: "ترجیحات",
  stepCapture: "۱۔ تصویر",
  stepReview: "۲۔ خوراک اور حفاظت",
  stepStrip: "۳۔ پٹی کی جانچ",
  clarityLens: "وضاحتی عدسہ",
  clarityLensActive: "وضاحتی عدسہ چالو ہے",
  cabinetOptIn: "اس آلے پر محفوظ دواؤں کے ساتھ ٹکراؤ بھی چیک کریں",
  backendStatus: "حفاظتی انجن کی صورتحال",
  backendConnected: "منسلک ہے",
  backendOffline: "حفاظتی سرور دستیاب نہیں:",
  backendBrands: "فارمولری برانڈز",
  backendPairs: "دوا ٹکراؤ کے جوڑے",
  cameraTitle: "نسخے کی تصویر لیں",
  cameraHint: "پورا نسخہ فریم کے اندر واضح رکھیں۔",
  cameraHelp: "اچھی روشنی میں کیمرہ ساکن رکھیں تاکہ ہر لفظ صاف آئے۔",
  startCamera: "کیمرہ شروع کریں",
  capture: "تصویر کھینچیں",
  retake: "دوبارہ تصویر لیں",
  confirmPhoto: "یہی تصویر استعمال کریں",
  preview: "نسخے کی تصویر",
  cameraDenied:
    "کیمرہ کھل نہیں سکا۔ براؤزر میں کیمرے کی اجازت دیں یا گیلری سے تصویر منتخب کریں۔",
  cameraUnsupported:
    "یہ براؤزر براہ راست کیمرہ نہیں کھول سکتا۔ گیلری سے تصویر اپ لوڈ کریں۔",
  flash: "فلیش لائٹ آن یا آف کریں",
  flashUnavailable: "اس آلے پر فلیش لائٹ دستیاب نہیں۔",
  photoType: "براہ کرم JPEG، PNG یا WebP تصویر منتخب کریں۔",
  photoLarge: "یہ تصویر 8 MB سے بڑی ہے۔ براہ کرم چھوٹی تصویر منتخب کریں۔",
  photoBroken: "یہ تصویر کھل نہیں سکی۔ دوسری تصویر منتخب کریں۔",
  poorLight:
    "تصویر اندھیری لگ رہی ہے۔ اگر لکھائی واضح نہ ہو تو روشنی میں دوبارہ تصویر لیں۔",
  guidance: "کیمرے کی ہدایت سنیں",
  cameraGuide:
    "پرچی کو روشنی میں رکھیں۔ پورا صفحہ فریم کے اندر لائیں اور ہاتھ ساکن رکھیں۔",
  networkError:
    "انٹرنیٹ رابطہ نہیں ہو سکا۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔",
  uploadError: "تصویر چیک نہیں ہو سکی۔ براہ کرم دوبارہ کوشش کریں۔",
  processing: "آپ کا نسخہ چیک کیا جا رہا ہے",
  processingBody: "تصویر پڑھی اور پرکھی جا رہی ہے۔ براہ کرم صفحہ کھلا رکھیں۔",
  processingHonest:
    "سرور تمام جانچ مکمل کر کے ایک ساتھ نتیجہ بھیجتا ہے۔",
  reading: "لکھائی پڑھنا",
  extracting: "خوراک اخذ کرنا",
  identifying: "دواؤں کی شناخت",
  checking: "باہمی اثرات چیک کرنا",
  preparing: "اردو آواز تیار کرنا",
  inProgress: "جانچ جاری ہے",
  results: "آپ کا نسخہ",
  resultsBody: "اصل لکھائی کو پڑھی گئی دواؤں سے ملا کر دیکھیں۔",
  original: "اصل نسخہ",
  extracted: "پڑھی گئی تفصیل",
  originalUnavailable: "اصل تصویر صرف اسی وقت تک نظر آتی ہے جب تک صفحہ کھلا ہو۔",
  rawText: "اصل عبارت",
  noRaw: "اصل عبارت موصول نہیں ہوئی۔",
  identityMatched: "دوا کی تصدیق ہو گئی",
  confirmationRequired: "ماہر کی تصدیق ضروری ہے",
  unknownMedicine: "غیر مصدقہ دوا",
  newScan: "نیا اسکین",
  save: "اس آلے پر محفوظ کریں",
  saved: "محفوظ ہو چکا ہے",
  saveFailed: "محفوظ نہیں ہو سکا۔ براؤزر اسٹوریج بھر چکی یا بند ہو سکتی ہے۔",
  refused:
    "ان ہدایات کی تصدیق نہیں ہو سکی۔ روشنی میں دوبارہ تصویر لیں یا فارماسسٹ سے پوچھیں۔",
  noMedicines: "کسی دوا کی تصدیق نہیں ہو سکی۔",
  doseSchedule: "خوراک کا نقشہ",
  morning: "صبح",
  afternoon: "دوپہر",
  night: "رات",
  tablet: "گولی",
  noDose: "اس وقت خوراک نہیں",
  unknownDose: "خوراک غیر واضح ہے",
  beforeFood: "کھانے سے پہلے",
  afterFood: "کھانے کے بعد",
  mealAny: "کھانے کے ساتھ یا بغیر",
  mealUnknown: "کھانے کا وقت درج نہیں",
  duration: "مدت",
  days: "دن",
  notSpecified: "درج نہیں",
  print: "کارڈ پرنٹ کریں",
  replayQr: "ہدایات دوبارہ سنیں",
  qrHint: "یہی اردو آواز سننے کے لیے QR اسکین کریں۔",
  share: "واٹس ایپ پر شیئر کریں",
  shareNote:
    "اس لنک سے نسخے کی آواز کھلتی ہے، اس لیے صرف قریبی فرد کو بھیجیں۔",
  shareAudio: "نسخہ ساتھی کی اردو ہدایات",
  aware: "WHO AWaRe درجہ بندی",
  fullAudio: "مکمل ہدایات سنیں",
  shortage: "مارکیٹ میں دستیابی کی اطلاع",
  antibiotic: "اینٹی بایوٹک کا پورا کورس ڈاکٹر کے مشورے کے مطابق مکمل کریں۔",
  play: "چلائیں",
  pause: "روکیں",
  replay: "دوبارہ سنیں",
  speed: "آواز کی رفتار",
  audioUnavailable:
    "سرور کی آواز دستیاب نہیں۔ اگر فون یا براؤزر میں اردو آواز ہو تو نیچے والے بٹن سے سن سکتے ہیں۔",
  audioFailed: "آواز نہیں چل سکی۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔",
  noVoice: "اس آلے میں اردو بولنے والی آواز انسٹال نہیں ہے۔",
  audioLoading: "نسخے کی آواز لوڈ ہو رہی ہے…",
  audioMissing: "یہ آواز اب دستیاب نہیں۔ براہ کرم نسخہ دوبارہ اسکین کریں۔",
  audioTitle: "نسخے کی اردو آواز",
  browserVoice: "آلے کی اردو آواز میں سنیں",
  audioLanguage: "اردو · Urdu",
  verifyHeading: "دوا کی پٹی چیک کریں",
  verifyHint: "پٹی کی تصویر یوں لیں کہ دوا کا نام اور طاقت صاف نظر آئے۔",
  prescribed: "نسخے میں لکھی دوا",
  detected: "پٹی سے پڑھی گئی تفصیل",
  verifyPhoto: "پٹی چیک کریں",
  verifyBusy: "دوا کی پٹی ملائی جا رہی ہے…",
  exact: "برانڈ اور طاقت بالکل درست ہیں",
  generic: "اصل سالٹ اور طاقت درست ہیں",
  genericCaution:
    "سالٹ ملنے کا مطلب اپنی مرضی سے برانڈ بدلنا نہیں۔ برانڈ بدلنے سے پہلے فارماسسٹ سے ضرور پوچھیں۔",
  mismatch: "یہ پٹی نسخے سے نہیں ملتی",
  strengthMismatch: "دوا کی طاقت مختلف ہے",
  unreadable: "پٹی صاف نہیں پڑھی جا سکی",
  verificationFailed: "جانچ مکمل نہیں ہو سکی",
  verifyFirst: "پہلے نسخہ اسکین کریں",
  verifyFirstBody: "پٹی چیک کرنے کے لیے نسخے کی تصدیق شدہ دوا ہونا ضروری ہے۔",
  chooseMedicine: "دوا منتخب کریں",
  stripPreview: "پٹی کی تصویر",
  noStrength:
    "نسخے میں دوا کی طاقت واضح نہیں۔ پٹی ملا کر لینے سے پہلے فارماسسٹ سے پوچھیں۔",
  seriousWarning: "اہم حفاظتی انتباہ",
  moderateWarning: "ڈاکٹر یا فارماسسٹ کا مشورہ ضروری ہے",
  warningAction: "یہ دوائیں اکٹھی لینے سے پہلے ڈاکٹر یا فارماسسٹ سے پوچھیں۔",
  unknownWarning: "دوا کا نام یا خوراک واضح نہیں ہے۔",
  pharmacistAction: "دوا کھانے سے پہلے یہ حصہ فارماسسٹ کو ضرور دکھائیں۔",
  viewSource: "سائنسی ثبوت اور حوالہ دیکھیں",
  sourceCrop: "اصل پرچی کی تصویر",
  noInteraction:
    "دواؤں کی تصدیق ہو چکی ہے۔ اس چیک میں کوئی درج ٹکراؤ نہیں ملا؛ پھر بھی احتیاط ضروری ہے۔",
  noEndorsement: "یہ حوالہ صرف معلومات کے لیے ہے، FDA یا WHO کی توثیق نہیں۔",
  backendUrdu: "مکمل اردو ہدایت",
  cabinetTitle: "آپ کی محفوظ دوائیں",
  cabinetBody: "اس آلے پر محفوظ نسخوں کی تصدیق شدہ دوائیں اور خوراک۔",
  cabinetEmpty: "آپ کی دوائیں خالی ہیں",
  cabinetEmptyBody: "اسکین کے بعد نسخہ محفوظ کریں تاکہ دوائیں یہاں نظر آئیں۔",
  historyTitle: "پچھلے محفوظ نسخے",
  historyEmpty: "ابھی کوئی نسخہ محفوظ نہیں",
  historyBody:
    "محفوظ نسخے صرف اسی براؤزر میں رہتے ہیں، کسی آن لائن اکاؤنٹ میں نہیں جاتے۔",
  savedOn: "محفوظ کیا گیا",
  viewPrescription: "نسخہ کھولیں",
  deleteRecord: "کیا یہ محفوظ نسخہ حذف کر دیں؟",
  clearHistory: "محفوظ ریکارڈ حذف کریں",
  clearQuestion: "کیا اس براؤزر میں محفوظ تمام نسخے حذف کر دیں؟",
  currentSession: "موجودہ اسکین",
  completedUnknown:
    "کورس کی تاریخیں محفوظ نہیں ہوتیں، اس لیے ختم یا جاری کورس خودکار طے نہیں ہو سکتا۔",
  reminderTitle: "وقت پر دوا کی یاددہانی",
  reminderUnavailable:
    "اس ورژن میں واٹس ایپ یاددہانی ابھی منسلک نہیں ہے۔ کوئی پیغام خودکار نہیں بھیجا جائے گا۔",
  reminderTime: "یاددہانی کا وقت",
  reminderLanguage: "پیغام کی زبان",
  voiceNote: "آواز میں یاددہانی",
  enableReminder: "یاددہانی فعال کریں",
  backendNotScheduled: "سرور نے ابھی کوئی یاددہانی شیڈول نہیں کی۔",
  backendScheduled: "سرور کے مطابق اس دوا کی یاددہانی مقرر ہے۔",
  reminderNoMedicine: "پہلے تصدیق شدہ دوا والا نسخہ اسکین کریں۔",
  settingsTitle: "اپنی سہولت کے مطابق ترتیب دیں۔",
  settingsBody: "اس آلے پر نسخہ ساتھی کی زبان اور ظاہری رنگ منتخب کریں۔",
  theme: "ظاہری انداز",
  themeDesc: "سادہ سفید، تیز روشنی یا گہرے نیلے رنگ میں سے منتخب کریں۔",
  editorialTheme: "سادہ سفید",
  darkTheme: "گہرا نیلا",
  lightTheme: "تیز واضح روشنی",
  languageDesc: "تمام مینو، انتباہات اور خوراک کے کارڈ انگریزی یا آسان اردو میں دیکھیں۔",
  deviceStorage: "اس آلے کا ریکارڈ",
  storageBody:
    "صرف وہی نسخے محفوظ ہوتے ہیں جو آپ خود محفوظ کریں۔ اس براؤزر کا ہر صارف انہیں دیکھ سکتا ہے۔",
  diagnostics: "تکنیکی تفصیلات",
  diagnosticsToggle: "تفصیلی تکنیکی ریکارڈ دکھائیں",
  diagnosticsHint:
    "اسکین کی اندرونی رفتار اور حوالہ جات دیکھنے کے لیے چالو کریں۔ ان میں حساس طبی تفصیل شامل ہو سکتی ہے۔",
  proof: "تکنیکی شواہد",
  timings: "جانچ میں لگا وقت",
  costs: "اسکین کی تخمینی لاگت",
  fuzzy: "نام ملانے کا اسکور",
  rawFda: "FDA باہمی اثر کا اصل ریکارڈ",
  proofEmpty: "تفصیلی شواہد دیکھنے کے لیے پہلے ایک نسخہ اسکین کریں۔",
  providersUnavailable: "آواز بنانے والی سروس اپنی اندرونی تفصیل واپس نہیں بھیجتی۔",
  notReported: "فراہم نہیں کیا گیا",
  skip: "مرکزی صفحے پر جائیں",
  offline: "انٹرنیٹ بند لگ رہا ہے۔ نیا نسخہ اسکین کرنے کے لیے انٹرنیٹ ضروری ہے۔",
};

export const messages = { en, ur };

const Context = createContext<{
  language: Language;
  setLanguage: (v: Language) => void;
  t: (k: Key) => string;
}>({ language: "en", setLanguage: () => { }, t: (k) => en[k] });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, update] = useState<Language>("en");

  useEffect(() => {
    try {
      if (localStorage.getItem("nuskha-language") === "ur") update("ur");
      const savedTheme = localStorage.getItem("nuskha-theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        document.documentElement.dataset.theme = savedTheme;
      } else {
        document.documentElement.dataset.theme = "editorial";
      }
    } catch { }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "ur" ? "ur-PK" : "en";
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
  }, [language]);

  const setLanguage = (value: Language) => {
    update(value);
    try {
      localStorage.setItem("nuskha-language", value);
    } catch { }
  };

  return (
    <Context.Provider
      value={{ language, setLanguage, t: (key) => messages[language][key] }}
    >
      {children}
    </Context.Provider>
  );
}

export function useLanguage() {
  return useContext(Context);
}

export function LanguageSwitch() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="language-switch" role="group" aria-label={t("language")}>
      <button
        type="button"
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
        lang="en"
      >
        EN
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        aria-pressed={language === "ur"}
        onClick={() => setLanguage("ur")}
        lang="ur"
      >
        اردو
      </button>
    </div>
  );
}

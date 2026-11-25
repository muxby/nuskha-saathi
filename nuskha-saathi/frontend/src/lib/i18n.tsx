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
  settings: "Settings",
  language: "Language",
  close: "Close",
  back: "Back",
  cancel: "Cancel",
  remove: "Remove",
  continue: "Continue",
  retry: "Try again",
  loading: "Loading…",
  heroOne: "Your prescription.",
  heroTwo: "Finally understood.",
  heroBody:
    "From handwritten prescriptions to clear, spoken instructions. Understand what to take, when to take it, and what to check.",
  heroKicker: "A little clarity. A healthier everyday.",
  mobileOne: "Understand your medicine.",
  mobileTwo: "With confidence.",
  mobileBody: "Scan your prescription and listen to simple instructions.",
  scanTitle: "Read what your doctor wrote.",
  scanDescription: "Turn handwritten prescriptions into clear instructions.",
  intelligence: "Prescription intelligence",
  voiceTitle: "Listen in your language.",
  voiceDescription: "A familiar voice. Instructions you can replay.",
  voice: "Voice explanation",
  urduVoice: "Pakistani Urdu audio",
  voiceOnly:
    "Recorded explanations are available in Urdu. English voice is not configured.",
  verificationTitle: "The right medicine? Check.",
  verificationBody: "Compare your medicine strip with your prescription.",
  scheduleTitle: "A clearer daily routine.",
  scheduleBody: "Morning, afternoon, night. See each prescribed dose.",
  remindersTitle: "A little help remembering.",
  remindersBody: "WhatsApp voice reminders are planned.",
  safetyTitle: "Designed around patient safety",
  safetyBody:
    "Uncertain handwriting is flagged for professional confirmation. Medicine identity is checked against our formulary.",
  today: "Your medicine schedule",
  noSchedule: "Your routine starts with a prescription.",
  noScheduleBody:
    "Scan a prescription to see confirmed medicine instructions here.",
  openCamera: "Open camera",
  gallery: "Upload a photo",
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
  footer: "Made for a little more peace of mind.",
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
  audioTitle: "Your prescription, spoken clearly.",
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
  darkTheme: "Midnight",
  lightTheme: "High contrast light",
  deviceStorage: "On this device",
  storageBody:
    "Only prescriptions you explicitly save are kept in this browser. Anyone using this browser can see them. Delete them from History.",
  diagnostics: "Developer evidence",
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
  notFoundBody: "نسخہ اسکین کرنے یا محفوظ نسخے دیکھنے کے لیے ہوم پر جائیں۔",
  brand: "نسخہ ساتھی",
  tagline: "آپ کی دوا کا ساتھی",
  home: "ہوم",
  scan: "نسخہ اسکین کریں",
  verify: "دوا چیک کریں",
  medicines: "میری دوائیں",
  history: "پچھلے نسخے",
  settings: "ترتیبات",
  language: "زبان",
  close: "بند کریں",
  back: "واپس",
  cancel: "منسوخ کریں",
  remove: "حذف کریں",
  continue: "آگے بڑھیں",
  retry: "دوبارہ کوشش کریں",
  loading: "لوڈ ہو رہا ہے…",
  heroOne: "اپنا نسخہ سمجھیں،",
  heroTwo: "آسان زبان میں۔",
  heroBody:
    "ہاتھ سے لکھے نسخے کی تصویر لیں اور دوا کی ہدایات سنیں۔ سمجھیں کہ دوا کب لینی ہے اور کس بات کی تصدیق ضروری ہے۔",
  heroKicker: "واضح ہدایات، روزمرہ کا اطمینان",
  mobileOne: "اپنی دوا سمجھیں۔",
  mobileTwo: "پورے اعتماد کے ساتھ۔",
  mobileBody: "نسخے کی تصویر لیں اور آسان ہدایات سنیں۔",
  scanTitle: "سمجھیں، ڈاکٹر نے کیا لکھا ہے۔",
  scanDescription: "ہاتھ سے لکھے نسخے سے آسان ہدایات حاصل کریں۔",
  intelligence: "نسخے کی پہچان",
  voiceTitle: "اپنی زبان میں سنیں۔",
  voiceDescription: "مانوس آواز میں ہدایات، جب چاہیں دوبارہ سنیں۔",
  voice: "آواز میں ہدایات",
  urduVoice: "پاکستانی اردو میں آواز",
  voiceOnly: "ریکارڈ شدہ ہدایات اردو میں ہیں۔ انگریزی آواز ترتیب نہیں دی گئی۔",
  verificationTitle: "کیا دوا وہی ہے؟ چیک کریں۔",
  verificationBody: "دوا کی پٹی کو نسخے میں لکھی دوا سے ملائیں۔",
  scheduleTitle: "دوا کا وقت، آسانی سے۔",
  scheduleBody: "صبح، دوپہر اور رات کی تجویز کردہ خوراک دیکھیں۔",
  remindersTitle: "دوا یاد رکھنے میں مدد۔",
  remindersBody: "واٹس ایپ پر صوتی یاددہانی آئندہ مرحلے میں آئے گی۔",
  safetyTitle: "مریض کی حفاظت ہماری ترجیح",
  safetyBody:
    "غیر واضح لکھائی پر ماہر کی تصدیق ضروری ہے۔ دوا کی شناخت ہمارے ریکارڈ سے ملائی جاتی ہے۔",
  today: "آپ کی دوا کے اوقات",
  noSchedule: "آپ کا معمول نسخے سے شروع ہوگا۔",
  noScheduleBody: "تصدیق شدہ ہدایات یہاں دیکھنے کے لیے نسخہ اسکین کریں۔",
  openCamera: "کیمرہ کھولیں",
  gallery: "تصویر منتخب کریں",
  listen: "سنیں",
  prescriptions: "نسخے",
  savedRecords: "محفوظ کیے گئے نسخے",
  whatsapp: "واٹس ایپ یاددہانی",
  comingSoon: "ابھی منسلک نہیں",
  seeSchedule: "دوا کے اوقات دیکھیں",
  privacyNote:
    "آپ کی معلومات اس نشست تک رہتی ہیں، جب تک آپ انہیں اس آلے پر محفوظ نہ کریں۔",
  clinicalNote:
    "اپنے ڈاکٹر کی ہدایت پر عمل کریں۔ غیر واضح ہدایات پر دوا لینے سے پہلے فارماسسٹ سے تصدیق کریں۔",
  footer: "آپ کے اطمینان کے لیے۔",
  cameraTitle: "نسخے کی تصویر لیں",
  cameraHint: "پورا نسخہ فریم کے اندر رکھیں۔",
  cameraHelp: "اچھی روشنی میں کیمرہ ساکن رکھیں تاکہ لکھائی صاف نظر آئے۔",
  startCamera: "کیمرہ استعمال کریں",
  capture: "تصویر لیں",
  retake: "دوبارہ تصویر لیں",
  confirmPhoto: "یہ تصویر استعمال کریں",
  preview: "نسخے کی تصویر",
  cameraDenied:
    "کیمرہ دستیاب نہیں۔ براؤزر کی ترتیبات میں اجازت دیں یا گیلری سے تصویر منتخب کریں۔",
  cameraUnsupported:
    "یہ براؤزر براہ راست کیمرہ نہیں کھول سکتا۔ گیلری سے تصویر منتخب کریں۔",
  flash: "کیمرے کی روشنی بدلیں",
  flashUnavailable: "اس آلے میں کیمرے کی روشنی دستیاب نہیں۔",
  photoType: "JPEG، PNG یا WebP تصویر منتخب کریں۔",
  photoLarge: "تصویر 8 MB سے بڑی ہے۔ چھوٹی تصویر منتخب کریں۔",
  photoBroken: "تصویر نہیں کھل سکی۔ دوسری تصویر منتخب کریں۔",
  poorLight:
    "تصویر تاریک لگ رہی ہے۔ اگر لکھائی واضح نہیں تو روشن جگہ پر دوبارہ تصویر لیں۔",
  guidance: "کیمرے کی ہدایات سنیں",
  cameraGuide:
    "نسخہ روشن جگہ پر رکھیں۔ پورا صفحہ فریم میں لائیں اور کیمرہ ساکن رکھیں۔",
  networkError:
    "انٹرنیٹ سے رابطہ نہیں ہو سکا۔ رابطہ چیک کر کے دوبارہ کوشش کریں۔",
  uploadError: "تصویر کی جانچ نہیں ہو سکی۔ دوبارہ کوشش کریں۔",
  processing: "آپ کا نسخہ سمجھا جا رہا ہے",
  processingBody: "تصویر پڑھی اور جانچی جا رہی ہے۔ یہ صفحہ کھلا رکھیں۔",
  processingHonest:
    "سرور مکمل نتیجہ ایک ساتھ بھیجتا ہے۔ ہر مرحلے کی براہ راست پیش رفت دستیاب نہیں۔",
  reading: "لکھائی پڑھنا",
  extracting: "ہدایات اخذ کرنا",
  identifying: "دواؤں کی شناخت",
  checking: "دواؤں کے باہمی اثرات کی جانچ",
  preparing: "اردو آواز تیار کرنا",
  inProgress: "جانچ جاری ہے",
  results: "آپ کا نسخہ",
  resultsBody: "اصل لکھائی کو پڑھی گئی معلومات سے ملائیں۔",
  original: "اصل نسخہ",
  extracted: "جو پڑھا جا سکا",
  originalUnavailable: "اصل تصویر صرف موجودہ اسکین کی نشست میں دستیاب ہے۔",
  rawText: "اصل عبارت",
  noRaw: "اصل عبارت پڑھ کر واپس نہیں بھیجی گئی۔",
  identityMatched: "دوا کی شناخت مل گئی",
  confirmationRequired: "ماہر کی تصدیق ضروری ہے",
  unknownMedicine: "غیر مصدقہ دوا",
  newScan: "نیا اسکین",
  save: "اس آلے پر محفوظ کریں",
  saved: "اس آلے پر محفوظ ہے",
  saveFailed: "محفوظ نہیں ہو سکا۔ آلے کی جگہ کم یا رسائی بند ہو سکتی ہے۔",
  refused:
    "ہدایات کی تصدیق نہیں ہو سکی۔ روشن جگہ میں دوبارہ تصویر لیں یا فارماسسٹ سے پوچھیں۔",
  noMedicines: "کسی دوا کی تصدیق نہیں ہو سکی۔",
  doseSchedule: "دوا کے اوقات کا خاکہ",
  morning: "صبح",
  afternoon: "دوپہر",
  night: "رات",
  tablet: "گولی",
  noDose: "اس وقت خوراک نہیں",
  unknownDose: "خوراک غیر مصدقہ ہے",
  beforeFood: "کھانے سے پہلے",
  afterFood: "کھانے کے بعد",
  mealAny: "کھانے کے ساتھ یا بغیر",
  mealUnknown: "کھانے کی ہدایت غیر مصدقہ ہے",
  duration: "مدت",
  days: "دن",
  notSpecified: "درج نہیں",
  print: "دوا کا کارڈ پرنٹ کریں",
  replayQr: "ہدایات دوبارہ سنیں",
  qrHint: "وہی اردو ہدایات سننے کے لیے اسکین کریں۔",
  share: "واٹس ایپ پر بھیجیں",
  shareNote:
    "اس لنک سے نسخے کی آواز سنی جا سکتی ہے۔ صرف قابل اعتماد شخص کو بھیجیں۔",
  shareAudio: "نسخہ ساتھی سے نسخے کی آواز",
  aware: "WHO AWaRe درجہ بندی",
  fullAudio: "ہدایات سنیں",
  shortage: "دوا کے ریکارڈ کے مطابق دستیابی کی معلومات",
  antibiotic: "اینٹی بایوٹک کا کورس ڈاکٹر کی ہدایت کے مطابق مکمل کریں۔",
  play: "چلائیں",
  pause: "روکیں",
  replay: "دوبارہ چلائیں",
  speed: "آواز کی رفتار",
  audioUnavailable:
    "ریکارڈ شدہ آواز دستیاب نہیں۔ آلے پر اردو آواز موجود ہو تو استعمال کی جا سکتی ہے۔",
  audioFailed: "آواز نہیں چل سکی۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔",
  noVoice: "اس آلے میں متعلقہ زبان کی آواز موجود نہیں۔",
  audioLoading: "نسخے کی آواز لوڈ ہو رہی ہے…",
  audioMissing: "یہ آواز دستیاب نہیں۔ نسخہ دوبارہ اسکین کریں۔",
  audioTitle: "آپ کا نسخہ، آسان آواز میں۔",
  browserVoice: "آلے کی اردو آواز سنیں",
  audioLanguage: "اردو · Urdu",
  verifyHeading: "دوا کی پٹی چیک کریں",
  verifyHint: "پٹی کی تصویر لیں تاکہ نام اور طاقت صاف نظر آئیں۔",
  prescribed: "نسخے کی دوا",
  detected: "پٹی سے پڑھی گئی معلومات",
  verifyPhoto: "اس پٹی کو چیک کریں",
  verifyBusy: "دوا کی پٹی چیک ہو رہی ہے…",
  exact: "دوا اور طاقت مل گئی",
  generic: "اجزا اور طاقت مل گئے",
  genericCaution:
    "اجزا ملنے کا مطلب دوا بدلنے کی اجازت نہیں۔ برانڈ بدلنے سے پہلے فارماسسٹ سے پوچھیں۔",
  mismatch: "یہ پٹی نسخے سے نہیں ملتی",
  strengthMismatch: "دوا کی طاقت مختلف ہے",
  unreadable: "پٹی پڑھی نہیں جا سکی",
  verificationFailed: "تصدیق مکمل نہیں ہو سکی",
  verifyFirst: "پہلے نسخہ اسکین کریں",
  verifyFirstBody: "پٹی ملانے کے لیے نسخے کی تصدیق شدہ دوا ضروری ہے۔",
  chooseMedicine: "تصدیق شدہ دوا منتخب کریں",
  stripPreview: "دوا کی پٹی کی تصویر",
  noStrength:
    "نسخے میں طاقت کی تصدیق نہیں ہوئی۔ پٹی چیک کرنے سے پہلے فارماسسٹ سے پوچھیں۔",
  seriousWarning: "اہم حفاظتی انتباہ",
  moderateWarning: "باہمی اثر پر ماہر کی رائے ضروری ہے",
  warningAction: "یہ دوائیں ساتھ لینے سے پہلے ڈاکٹر یا فارماسسٹ سے بات کریں۔",
  unknownWarning: "دوا کے نام یا خوراک کی تصدیق ضروری ہے۔",
  pharmacistAction: "دوا لینے سے پہلے یہ حصہ فارماسسٹ کو دکھائیں۔",
  viewSource: "باہمی اثر کا حوالہ دیکھیں",
  sourceCrop: "اصل نسخے کا حصہ",
  noInteraction:
    "دواؤں کی شناخت ریکارڈ سے مل گئی۔ اس جانچ میں درج باہمی اثر نہیں ملا؛ دوسرے خطرات موجود ہو سکتے ہیں۔",
  noEndorsement: "حوالہ اس جانچ کی بنیاد ہے؛ یہ FDA یا WHO کی توثیق نہیں۔",
  backendUrdu: "اصل وضاحت · اردو",
  cabinetTitle: "آپ کی دواؤں کی جگہ۔",
  cabinetBody: "اس آلے پر محفوظ نسخوں کی تصدیق شدہ ہدایات۔",
  cabinetEmpty: "دواؤں کی الماری خالی ہے",
  cabinetEmptyBody: "اسکین کے بعد نسخہ محفوظ کریں تاکہ ہدایات یہاں نظر آئیں۔",
  historyTitle: "آپ کے پچھلے نسخے",
  historyEmpty: "کوئی نسخہ محفوظ نہیں",
  historyBody:
    "نسخے اسی آلے کے براؤزر میں محفوظ رہتے ہیں۔ اکاؤنٹ سے منسلک نہیں ہیں۔",
  savedOn: "محفوظ کیا گیا",
  viewPrescription: "نسخہ کھولیں",
  deleteRecord: "یہ محفوظ نسخہ حذف کریں؟",
  clearHistory: "محفوظ نسخے حذف کریں",
  clearQuestion: "اس براؤزر میں محفوظ تمام نسخے حذف کریں؟",
  currentSession: "موجودہ اسکین",
  completedUnknown:
    "کورس کی تاریخیں درج نہیں، اس لیے جاری یا مکمل کورس کا تعین نہیں کیا جا سکتا۔",
  reminderTitle: "وقت پر یاددہانی۔",
  reminderUnavailable:
    "اس نسخے میں واٹس ایپ کی سہولت منسلک نہیں۔ کوئی یاددہانی نہیں بھیجی جائے گی۔",
  reminderTime: "یاددہانی کا پسندیدہ وقت",
  reminderLanguage: "یاددہانی کی زبان",
  voiceNote: "آواز میں یاددہانی",
  enableReminder: "یاددہانی فعال کریں",
  backendNotScheduled: "سرور نے یاددہانی کی تصدیق نہیں کی۔",
  backendScheduled: "سرور کے مطابق اس نسخے کی یاددہانی مقرر ہے۔",
  reminderNoMedicine: "پہلے تصدیق شدہ ہدایات والا نسخہ اسکین کریں۔",
  settingsTitle: "اپنی سہولت کے مطابق۔",
  settingsBody: "اس آلے پر نسخہ ساتھی کی زبان اور انداز منتخب کریں۔",
  theme: "ظاہری انداز",
  darkTheme: "گہرا نیلا",
  lightTheme: "زیادہ تضاد والا ہلکا انداز",
  deviceStorage: "اس آلے پر",
  storageBody:
    "صرف آپ کے محفوظ کیے گئے نسخے براؤزر میں رہتے ہیں۔ یہ براؤزر استعمال کرنے والا انہیں دیکھ سکتا ہے۔ پچھلے نسخوں سے حذف کریں۔",
  diagnostics: "تکنیکی شواہد",
  diagnosticsHint:
    "موجودہ اسکین کی تفصیل دیکھنے کے لیے مقامی تشخیص فعال کریں۔ ان شواہد میں حساس طبی معلومات ہو سکتی ہیں۔",
  proof: "تکنیکی ثبوت",
  timings: "جانچ کا وقت",
  costs: "درخواست کی تخمینی لاگت",
  fuzzy: "نام ملانے کے اسکور",
  rawFda: "باہمی اثر کے اصل شواہد",
  proofEmpty: "اصل وقت اور شواہد دیکھنے کے لیے نسخہ اسکین کریں۔",
  providersUnavailable:
    "API آواز فراہم کرنے والی خدمت یا متبادل راستہ نہیں بتاتا۔",
  notReported: "فراہم نہیں کیا گیا",
  skip: "مرکزی مواد پر جائیں",
  offline: "انٹرنیٹ دستیاب نہیں لگ رہا۔ اسکین کے لیے رابطہ ضروری ہے۔",
};
export const messages = { en, ur };
const Context = createContext<{
  language: Language;
  setLanguage: (v: Language) => void;
  t: (k: Key) => string;
}>({ language: "en", setLanguage: () => {}, t: (k) => en[k] });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, update] = useState<Language>("en");
  useEffect(() => {
    try {
      if (localStorage.getItem("nuskha-language") === "ur") update("ur");
      document.documentElement.dataset.theme =
        localStorage.getItem("nuskha-theme") === "light" ? "light" : "dark";
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = language === "ur" ? "ur-PK" : "en";
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
  }, [language]);
  const setLanguage = (value: Language) => {
    update(value);
    try {
      localStorage.setItem("nuskha-language", value);
    } catch {}
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

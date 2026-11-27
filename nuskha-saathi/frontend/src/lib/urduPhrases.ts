/**
 * Urdu-script renderings of the fixed lines the safety engine speaks.
 *
 * The engine's strings are Roman Urdu so every speech vendor pronounces them
 * the same way. A reader using the Urdu interface should see the same sentence
 * in Urdu script. Only exact, known engine strings are mapped: anything else
 * is returned unchanged, so this table can never alter a warning it does not
 * recognise.
 */
const FIXED: Record<string, string> = {
  "Yeh lafz saaf nahi hai — meharbani kar ke pharmacist ya doctor se tasdeeq karein.":
    "یہ لفظ صاف نہیں ہے — مہربانی کر کے فارماسسٹ یا ڈاکٹر سے تصدیق کریں۔",
  "Yeh dawai pehchan mein nahi aai. Meharbani kar ke pharmacist ya doctor se tasdeeq karein.":
    "یہ دوائی پہچان میں نہیں آئی۔ مہربانی کر کے فارماسسٹ یا ڈاکٹر سے تصدیق کریں۔",
  "Yeh miqdar ghalat lag rahi hai. Meharbani kar ke pharmacist ya doctor se tasdeeq karein. Yeh dawai abhi na lein.":
    "یہ مقدار غلط لگ رہی ہے۔ مہربانی کر کے فارماسسٹ یا ڈاکٹر سے تصدیق کریں۔ یہ دوائی ابھی نہ لیں۔",
};


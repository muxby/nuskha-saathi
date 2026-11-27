"""Urdu-script form of the engine's fixed lines, for the voice only.

The safety engine writes Roman Urdu. The Urdu neural voices read Urdu script:
given Roman Urdu they mispronounce it and drop words they do not know. This
module rewrites each fixed engine line into Urdu script before synthesis.

It is a table, not a translator. Every sentence must match a known engine
line or template; a sentence that does not match makes the whole text
unspeakable (``None``), so the voice can never say a warning differently from
the one on screen, or skip part of it.
"""

from __future__ import annotations

import re
from typing import Callable

from services.urdu_names import has_latin, name_to_urdu

_ARABIC = re.compile("[\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF]")

_NAME = r"[A-Za-z0-9][A-Za-z0-9 ()+/'\-]*?"
_NUM = r"\d+(?:\.\d+)?"
_SLOT = r"subah|dopehar|raat"
_WHEN = rf"(?:{_SLOT})(?: aur (?:{_SLOT}))*|doctor ke bataye waqt"

_SLOT_UR = {"subah": "صبح", "dopehar": "دوپہر", "raat": "رات"}
_MEAL_UR = {
    "khane se pehle": "کھانے سے پہلے",
    "khane ke baad": "کھانے کے بعد",
    "kisi bhi waqt": "کسی بھی وقت",
}
_PHRASE_UR = {
    "koi aur dawai": "کوئی اور دوائی",
    "pharmacist ke pas maujood generic": "فارماسسٹ کے پاس موجود جینرک",
}

_CONFIRM = "مہربانی کر کے فارماسسٹ یا ڈاکٹر سے تصدیق کریں۔"
_CALL_DOCTOR = "لینے سے پہلے اپنے ڈاکٹر سے فوراً رابطہ کریں۔"

# Whole engine sentences, word for word.
FIXED: dict[str, str] = {
    "Yeh lafz saaf nahi hai — meharbani kar ke pharmacist ya doctor se tasdeeq karein.":
        "یہ لفظ صاف نہیں ہے — مہربانی کر کے فارماسسٹ یا ڈاکٹر سے تصدیق کریں۔",
    "Yeh dawai pehchan mein nahi aai.": "یہ دوائی پہچان میں نہیں آئی۔",
    "Meharbani kar ke pharmacist ya doctor se tasdeeq karein.": _CONFIRM,
    "Yeh miqdar ghalat lag rahi hai.": "یہ مقدار غلط لگ رہی ہے۔",
    "Yeh dawai abhi na lein.": "یہ دوائی ابھی نہ لیں۔",
    "Yeh strip saaf nahi hai.": "یہ پٹی صاف نہیں ہے۔",
    "Meharbani kar ke pharmacist ko strip dikhayein.": "مہربانی کر کے فارماسسٹ کو پٹی دکھائیں۔",
    "Insulin ki dose is app se tay nahi hoti.": "انسولین کی خوراک اس ایپ سے طے نہیں ہوتی۔",
    "Meharbani kar ke doctor ya pharmacist se tasdeeq karein.":
        "مہربانی کر کے ڈاکٹر یا فارماسسٹ سے تصدیق کریں۔",
    "Yeh Access-group antibiotic hai.": "یہ ایکسس گروپ کی اینٹی بایوٹک ہے۔",
    "Doctor ke bataye huay poore din dawai mukammal karein.":
        "ڈاکٹر کے بتائے ہوئے پورے دن دوائی مکمل کریں۔",
    "Yeh ek taqatwar Watch-group antibiotic hai.": "یہ ایک طاقتور واچ گروپ کی اینٹی بایوٹک ہے۔",
    "Doctor ke bataye huay poore din mukammal karein, beech mein na chorein.":
        "ڈاکٹر کے بتائے ہوئے پورے دن مکمل کریں، بیچ میں نہ چھوڑیں۔",
    "Yeh Reserve-group antibiotic hai.": "یہ ریزرو گروپ کی اینٹی بایوٹک ہے۔",
    "Poora course doctor ke bataye mutabiq mukammal karein aur beech mein na chorein.":
        "پورا کورس ڈاکٹر کے بتائے مطابق مکمل کریں اور بیچ میں نہ چھوڑیں۔",
    "Yeh antibiotic hai.": "یہ اینٹی بایوٹک ہے۔",
    "Course beech mein na chorein.": "کورس بیچ میں نہ چھوڑیں۔",
    "Khabardar! Ciprofloxacin aur Sirdalud (tizanidine) ek sath nahi lene. "
    "Yeh milawat khatarnak ho sakti hai. Doctor se foran rabta karein.":
        "خبردار! سپروفلوکساسن اور سرڈالڈ، یعنی ٹیزانیڈین، ایک ساتھ نہیں لینے۔ "
        "یہ ملاپ خطرناک ہو سکتا ہے۔ ڈاکٹر سے فوراً رابطہ کریں۔",
    "Khabardar! Klaricid (clarithromycin) aur Zocor (simvastatin) ek sath maans peshiyon ko "
    "nuqsan de sakte hain. Doctor se rabta karein, khud dawai na badlein.":
        "خبردار! کلیریسڈ، یعنی کلیریتھرومائسن، اور زوکور، یعنی سمواسٹیٹن، ایک ساتھ پٹھوں کو "
        "نقصان دے سکتے ہیں۔ ڈاکٹر سے رابطہ کریں، خود دوائی نہ بدلیں۔",
    "Khabardar! Aap pehle se khoon patla karne ki dawai Warfarin le rahi hain. "
    "Brufen (ibuprofen) is ke sath lene se bleeding ka khatra barh sakta hai. "
    "Lene se pehle apne doctor se foran rabta karein.":
        "خبردار! آپ پہلے سے خون پتلا کرنے کی دوائی وارفرین لے رہی ہیں۔ "
        "بروفین، یعنی آئبوپروفین، اس کے ساتھ لینے سے خون بہنے کا خطرہ بڑھ سکتا ہے۔ " + _CALL_DOCTOR,
    "Khabardar! Sildenafil aur nitrate dawai (seene ke dard ki goli) ek sath nahi le sakte. "
    "Blood pressure khatarnak had tak gir sakta hai. Foran doctor se rabta karein.":
        "خبردار! سلڈینافل اور نائٹریٹ دوائی، یعنی سینے کے درد کی گولی، ایک ساتھ نہیں لے سکتے۔ "
        "بلڈ پریشر خطرناک حد تک گر سکتا ہے۔ فوراً ڈاکٹر سے رابطہ کریں۔",
    "Khabardar! Tadalafil aur nitrate dawai ek sath nahi le sakte. Foran doctor se rabta karein.":
        "خبردار! ٹاڈالافل اور نائٹریٹ دوائی ایک ساتھ نہیں لے سکتے۔ فوراً ڈاکٹر سے رابطہ کریں۔",
    "Khabardar! Flagyl (metronidazole) Warfarin ke sath bleeding ka khatra barha sakti hai. "
    "Lene se pehle doctor se rabta karein.":
        "خبردار! فلیجل، یعنی میٹرونیڈازول، وارفرین کے ساتھ خون بہنے کا خطرہ بڑھا سکتی ہے۔ "
        "لینے سے پہلے ڈاکٹر سے رابطہ کریں۔",
}
_FIXED_ORDER = sorted(FIXED, key=len, reverse=True)


def _name(value: str) -> str:
    return _PHRASE_UR.get(value) or name_to_urdu(value)


def _mg(value: str | None) -> str:
    return f" {value} ملی گرام" if value else ""


def _dose(m: re.Match) -> str:
    when = m["when"]
    if when == "doctor ke bataye waqt":
        when_ur = "ڈاکٹر کے بتائے ہوئے وقت پر"
    else:
        when_ur = " اور ".join(_SLOT_UR[slot] for slot in when.split(" aur "))
    return f"{_name(m['brand'])}{_mg(m['mg'])} {when_ur} {_MEAL_UR[m['meal']]} لینی ہے۔"


def _exact_strip(m: re.Match) -> str:
    return f"بالکل ٹھیک دوائی ہے — یہ {_name(m['brand'])}{_mg(m['mg'])} ہے۔"


def _strength_mismatch(m: re.Match) -> str:
    return (
        f"رک جائیے! ڈاکٹر نے {_name(m['brand'])}{_mg(m['mg'])} لکھی تھی، "
        f"لیکن آپ کے ہاتھ میں{_mg(m['held'])} کی پٹی ہے۔ فارماسسٹ کو واپس دکھائیں۔"
    )


def _wrong_medicine(m: re.Match) -> str:
    return (
        f"رک جائیے! ڈاکٹر نے {_name(m['expected'])} لکھی تھی، "
        f"لیکن آپ کے ہاتھ میں {_name(m['detected'])} ہے۔ "
        "یہ نہ کھائیں اور فارماسسٹ کو واپس دکھائیں۔"
    )


def _generic_match(m: re.Match) -> str:
    strength = f"، طاقت{_mg(m['mg'])}" if m["mg"] else ""
    return (
        f"یہ {_name(m['detected'])} ہے، جو {_name(m['expected'])} کی جینرک دوائی ہے{strength}۔ "
        "فارماسسٹ سے برانڈ کی تصدیق کر لیں۔"
    )


def _shortage(m: re.Match) -> str:
    names = "، ".join(_name(part.strip()) for part in m["names"].split(","))
    return (
        f"{_name(m['brand'])} ڈریپ کی قلت کی فہرست میں ہو سکتی ہے۔ "
        f"فارماسسٹ سے اسی اثر والے دوسرے برانڈ کے بارے میں پوچھیں: {names}۔ "
        "خود سے دوائی نہ بدلیں۔"
    )


def _dose_note(m: re.Match) -> str:
    return f"یہ {_name(m['brand'])} ہے۔ ڈاکٹر کی بتائی ہوئی مقدار سے زیادہ نہ لیں۔"


def _interaction(m: re.Match) -> str:
    return (
        f"خبردار! {_name(m['a'])} اور {_name(m['b'])} کو ایک ساتھ استعمال کرنا "
        f"نقصان دہ ہو سکتا ہے۔ {_CALL_DOCTOR}"
    )


def _template(pattern: str, build: Callable[[re.Match], str]):
    return re.compile(pattern), build


# Engine templates from ``urdu_formatter.py`` and the datasets, most specific first.
TEMPLATES = (
    _template(
        rf"RUK JAIYE! Doctor ne (?P<brand>{_NAME})(?: (?P<mg>{_NUM}) mg)? likhi thi, "
        rf"lekin aap ke haath mein (?P<held>{_NUM}) mg strip hai\. Pharmacist ko wapas dikhayein\.",
        _strength_mismatch,
    ),
    _template(
        rf"RUK JAIYE! Doctor ne (?P<expected>{_NAME}) likhi thi, "
        rf"lekin aap ke haath mein (?P<detected>{_NAME}) hai\. "
        r"Yeh na khayein aur pharmacist ko wapas dikhayein\.",
        _wrong_medicine,
    ),
    _template(
        rf"Bilkul theek dawai hai — yeh (?P<brand>{_NAME})(?: (?P<mg>{_NUM}) mg)? hai\.",
        _exact_strip,
    ),
    _template(
        rf"Yeh (?P<detected>{_NAME}) hai, jo (?P<expected>{_NAME}) ki generic dawai hai, "
        rf"strength ?(?:(?P<mg>{_NUM}) mg)? ?\. Pharmacist se brand ki tasdeeq kar lein\.",
        _generic_match,
    ),
    _template(
        rf"Yeh (?P<brand>{_NAME}) hai\. Doctor ki batayi hui miqdar se zyada na lein\.",
        _dose_note,
    ),
    _template(
        rf"Khabardar! (?P<a>{_NAME}) aur (?P<b>{_NAME}) ka sang milakar istemal nuqsan deh ho sakta hai\. "
        r"Lene se pehle apne doctor se foran rabta karein\.",
        _interaction,
    ),
    _template(
        rf"(?P<brand>{_NAME}) DRAP shortage list par ho sakti hai\. "
        rf"Pharmacist se bioequivalent brand ke bare mein poochain: (?P<names>{_NAME}(?:, {_NAME})*)\. "
        r"Khud se dawai na badlein\.",
        _shortage,
    ),
    _template(
        rf"(?P<brand>{_NAME}) (?:(?P<mg>{_NUM}) mg )?(?P<when>{_WHEN}) "
        r"(?P<meal>khane se pehle|khane ke baad|kisi bhi waqt) leni hai\.",
        _dose,
    ),
)


def engine_line_to_urdu(roman: str) -> str | None:
    """Urdu-script form of one or more engine lines, or None if any part is unknown."""
    text = " ".join((roman or "").split())
    if not text:
        return None
    out: list[str] = []
    position = 0
    while position < len(text):
        if text[position] == " ":
            position += 1
            continue
        for line in _FIXED_ORDER:
            if text.startswith(line, position):
                out.append(FIXED[line])
                position += len(line)
                break
        else:
            for pattern, build in TEMPLATES:
                match = pattern.match(text, position)
                if match:
                    out.append(build(match))
                    position = match.end()
                    break
            else:
                return None
    spoken = " ".join(out)
    return None if has_latin(spoken) else spoken


def is_urdu_script(text: str) -> bool:
    """True when the text carries Urdu letters. Engine lines never do."""
    return bool(_ARABIC.search(text))


def speech_text(text: str) -> str | None:
    """Text safe to hand to an Urdu voice: Urdu script only, or None.

    Urdu-script text passes through, with any stray Latin word spelt out so it
    is not skipped. Roman Urdu is accepted only when it is a known engine line.
    """
    clean = " ".join((text or "").split())
    if not clean:
        return None
    if is_urdu_script(clean):
        return name_to_urdu(clean) if has_latin(clean) else clean
    return engine_line_to_urdu(clean)

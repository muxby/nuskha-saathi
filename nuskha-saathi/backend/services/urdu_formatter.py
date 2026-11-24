"""Fixed Roman Urdu lines. Voice vendors speak this text. They do not write it."""

from __future__ import annotations

BLURRY_URDU = "Yeh lafz saaf nahi hai — meharbani kar ke pharmacist ya doctor se tasdeeq karein."
UNKNOWN_URDU = "Yeh dawai pehchan mein nahi aai. Meharbani kar ke pharmacist ya doctor se tasdeeq karein."
DOSAGE_URDU = (
    "Yeh miqdar ghalat lag rahi hai. Meharbani kar ke pharmacist ya doctor se tasdeeq karein. "
    "Yeh dawai abhi na lein."
)
UNREADABLE_STRIP_URDU = "Yeh strip saaf nahi hai. Meharbani kar ke pharmacist ko strip dikhayein."

_MEAL = {
    "before_food": "khane se pehle",
    "after_food": "khane ke baad",
    "any": "kisi bhi waqt",
}


def format_mg(value: float | None) -> str:
    if value is None:
        return ""
    number = int(value) if float(value).is_integer() else value
    return f"{number} mg"


def dose_phrase(
    brand: str,
    strength_mg: float | None,
    morning: float | None,
    afternoon: float | None,
    night: float | None,
    meal_timing: str,
) -> str:
    parts = []
    if morning and morning > 0:
        parts.append("subah")
    if afternoon and afternoon > 0:
        parts.append("dopehar")
    if night and night > 0:
        parts.append("raat")
    when = " aur ".join(parts) if parts else "doctor ke bataye waqt"
    meal = _MEAL.get(meal_timing, "kisi bhi waqt")
    amount = format_mg(strength_mg)
    return f"{brand} {amount} {when} {meal} leni hai.".replace("  ", " ").strip()


def exact_strip_urdu(brand: str, strength_mg: float | None, schedule_phrase: str | None = None) -> str:
    base = f"Bilkul theek dawai hai — yeh {brand} {format_mg(strength_mg)} hai."
    if schedule_phrase:
        return f"{base} {schedule_phrase}"
    return base


def strength_mismatch_urdu(brand: str, expected_mg: float | None, detected_mg: float | None) -> str:
    return (
        f"RUK JAIYE! Doctor ne {brand} {format_mg(expected_mg)} likhi thi, "
        f"lekin aap ke haath mein {format_mg(detected_mg)} strip hai. "
        "Pharmacist ko wapas dikhayein."
    )


def wrong_medicine_urdu(expected_brand: str, detected_brand: str) -> str:
    detected = detected_brand or "koi aur dawai"
    return (
        f"RUK JAIYE! Doctor ne {expected_brand} likhi thi, lekin aap ke haath mein {detected} hai. "
        "Yeh na khayein aur pharmacist ko wapas dikhayein."
    )


def generic_match_urdu(detected_brand: str, expected_brand: str, strength_mg: float | None) -> str:
    return (
        f"Yeh {detected_brand} hai, jo {expected_brand} ki generic dawai hai, "
        f"strength {format_mg(strength_mg)}. Pharmacist se brand ki tasdeeq kar lein."
    )


def shortage_urdu(brand: str, alternatives: list[str]) -> str:
    names = ", ".join(alternatives) if alternatives else "pharmacist ke pas maujood generic"
    return (
        f"{brand} DRAP shortage list par ho sakti hai. "
        f"Pharmacist se bioequivalent brand ke bare mein poochain: {names}. "
        "Khud se dawai na badlein."
    )


def join_script(parts: list[str]) -> str:
    cleaned = [part.strip() for part in parts if part and part.strip()]
    return " ".join(cleaned)

"""Offline-first 5 Pakistani clinical demo cases processed by the real safety gate."""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont

from schemas.responses import ScanResponse
from schemas.vision import ExtractedLine, VisionExtraction
from services.formulary_resolver import FormularyResolver
from services.openfda_client import OpenFdaClient
from services.scan_service import scan_parchi


@dataclass(frozen=True)
class DemoCase:
    case_id: str
    title: str
    subtitle: str
    patient_id: str
    highlights: tuple[str, ...]
    lines: tuple[ExtractedLine, ...]
    cabinet: tuple[dict, ...]


class _DemoExtractor:
    """Deterministic scripted extractor marked non-live so demo cost stays $0."""

    counts_as_live = False

    def __init__(self, extraction: VisionExtraction):
        self._extraction = extraction

    async def extract(self, image_bytes: bytes, mime: str, mode: str = "parchi") -> VisionExtraction:
        return self._extraction


DEMO_CASES: tuple[DemoCase, ...] = (
    DemoCase(
        case_id="case-01-zubaida-warfarin",
        title="Amma Zubaida: Cabinet clash + blurry syrup",
        subtitle="Cross-doctor NSAID + Warfarin bleed risk alongside an unclear line crop",
        patient_id="demo-zubaida-01",
        highlights=("HIGH Ibuprofen + Warfarin clash", "REFUSED_BLURRY crop", "Augmentin Day-3 antibiotic"),
        lines=(
            ExtractedLine(
                raw_text="Tab Brufen 400mg BD pc",
                brand_or_salt_guess="Brufen",
                strength_mg=400,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=1,
                meal_timing="after_food",
                duration_days=5,
                ocr_confidence=0.96,
                bbox_1000=[90, 60, 260, 940],
            ),
            ExtractedLine(
                raw_text="Syp ??? (smudged ink)",
                brand_or_salt_guess="???",
                strength_mg=5,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=0,
                meal_timing="any",
                duration_days=3,
                ocr_confidence=0.42,
                bbox_1000=[340, 60, 520, 940],
            ),
            ExtractedLine(
                raw_text="Tab Augmntin 625mg BD x5d",
                brand_or_salt_guess="Augmntin",
                strength_mg=625,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=1,
                meal_timing="after_food",
                duration_days=5,
                ocr_confidence=0.93,
                bbox_1000=[600, 60, 780, 940],
            ),
        ),
        cabinet=(
            {
                "brand_name": "Marevan",
                "generic_salts": ["warfarin"],
                "strength_mg": 5,
                "source_label": "Active Cabinet — Cardiologist 14 Nov",
            },
        ),
    ),
    DemoCase(
        case_id="case-02-tariq-nitrate-sildenafil",
        title="Tariq Mahmood: Nitrate + sildenafil clash",
        subtitle="Detects life-threatening hypotension risk against heart clinic Ismo",
        patient_id="demo-tariq-02",
        highlights=("HIGH Isosorbide Mononitrate + Sildenafil", "Concor beta-blocker verified"),
        lines=(
            ExtractedLine(
                raw_text="Tab Viagra 50mg OD",
                brand_or_salt_guess="Viagra",
                strength_mg=50,
                morning_qty=0,
                afternoon_qty=0,
                night_qty=1,
                meal_timing="any",
                duration_days=7,
                ocr_confidence=0.94,
                bbox_1000=[120, 60, 320, 940],
            ),
            ExtractedLine(
                raw_text="Tab Concor 5mg OD ac",
                brand_or_salt_guess="Concor",
                strength_mg=5,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=0,
                meal_timing="before_food",
                duration_days=30,
                ocr_confidence=0.95,
                bbox_1000=[420, 60, 620, 940],
            ),
        ),
        cabinet=(
            {
                "brand_name": "Ismo",
                "generic_salts": ["isosorbide mononitrate"],
                "strength_mg": 20,
                "source_label": "Active Cabinet — Heart Clinic",
            },
        ),
    ),
    DemoCase(
        case_id="case-03-leflox-overdose",
        title="Fatima Bibi: 5000mg overdose refusal",
        subtitle="Fail-closed overdose ceiling triggers REFUSED_DOSAGE_ANOMALY",
        patient_id="demo-fatima-03",
        highlights=("REFUSED_DOSAGE_ANOMALY on Leflox 5000mg", "Risek 40mg verified before food"),
        lines=(
            ExtractedLine(
                raw_text="Tab Leflox 5000mg BD",
                brand_or_salt_guess="Leflox",
                strength_mg=5000,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=1,
                meal_timing="after_food",
                duration_days=5,
                ocr_confidence=0.97,
                bbox_1000=[120, 60, 340, 940],
            ),
            ExtractedLine(
                raw_text="Cap Risek 40mg OD ac",
                brand_or_salt_guess="Risek",
                strength_mg=40,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=0,
                meal_timing="before_food",
                duration_days=14,
                ocr_confidence=0.95,
                bbox_1000=[440, 60, 660, 940],
            ),
        ),
        cabinet=(),
    ),
    DemoCase(
        case_id="case-04-unknown-mystery-brand",
        title="Bilal Ahmed: Unlisted brand refusal",
        subtitle="Low formulary match score (<82) refuses unknown brand instead of guessing",
        patient_id="demo-bilal-04",
        highlights=("REFUSED_UNKNOWN_DRUG fails closed", "Panadol 500mg verified"),
        lines=(
            ExtractedLine(
                raw_text="Tab Zyloxitron-X 250mg BD",
                brand_or_salt_guess="Zyloxitron-X",
                strength_mg=250,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=1,
                meal_timing="after_food",
                duration_days=5,
                ocr_confidence=0.91,
                bbox_1000=[120, 60, 340, 940],
            ),
            ExtractedLine(
                raw_text="Tab Panadol 500mg TDS",
                brand_or_salt_guess="Panadol",
                strength_mg=500,
                morning_qty=1,
                afternoon_qty=1,
                night_qty=1,
                meal_timing="after_food",
                duration_days=3,
                ocr_confidence=0.96,
                bbox_1000=[440, 60, 660, 940],
            ),
        ),
        cabinet=(),
    ),
    DemoCase(
        case_id="case-05-augmntin-all-clear",
        title="Ayesha Siddiqui: All-clear prescription",
        subtitle="Resolves handwritten typo 'Augmntin' -> Augmentin with clean schedule",
        patient_id="demo-ayesha-05",
        highlights=("VERIFIED overall status", "Fuzzy typo repair Augmntin -> Augmentin", "Zero interactions"),
        lines=(
            ExtractedLine(
                raw_text="Tab Augmntin 625mg BD pc x5d",
                brand_or_salt_guess="Augmntin",
                strength_mg=625,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=1,
                meal_timing="after_food",
                duration_days=5,
                ocr_confidence=0.93,
                bbox_1000=[120, 60, 340, 940],
            ),
            ExtractedLine(
                raw_text="Tab Panadol 500mg BD x3d",
                brand_or_salt_guess="Panadol",
                strength_mg=500,
                morning_qty=1,
                afternoon_qty=0,
                night_qty=1,
                meal_timing="after_food",
                duration_days=3,
                ocr_confidence=0.96,
                bbox_1000=[440, 60, 660, 940],
            ),
        ),
        cabinet=(),
    ),
)

DEMO_CASES_BY_ID: dict[str, DemoCase] = {case.case_id: case for case in DEMO_CASES}
DEMO_SCAN_ID_BY_CASE: dict[str, str] = {
    case.case_id: f"scan_de{idx:022x}" for idx, case in enumerate(DEMO_CASES, start=1)
}
DEMO_CASE_BY_SCAN_ID: dict[str, str] = {v: k for k, v in DEMO_SCAN_ID_BY_CASE.items()}


def _render_demo_parchi_jpeg(case: DemoCase) -> bytes:
    """Render a crisp synthetic prescription sheet so bbox crops are genuine images."""
    width, height = 960, 640
    image = Image.new("RGB", (width, height), (250, 248, 242))
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()

    draw.rectangle([24, 18, width - 24, height - 18], outline=(205, 214, 210), width=2)
    draw.text((48, 32), f"Rx  |  Patient: {case.patient_id}  |  Offline Demo Mode", fill=(20, 83, 65), font=font)
    draw.line([(40, 56), (width - 40, 56)], fill=(205, 214, 210), width=1)

    for line in case.lines:
        ymin, xmin, ymax, xmax = line.bbox_1000
        left = int((xmin / 1000.0) * width)
        top = int((ymin / 1000.0) * height)
        right = int((xmax / 1000.0) * width)
        bottom = int((ymax / 1000.0) * height)
        is_unclear = line.ocr_confidence < 0.85 or line.raw_text.startswith("Tab Leflox 5000") or "Zyloxitron" in line.raw_text
        border = (217, 119, 6) if is_unclear else (20, 83, 65)
        draw.rectangle([left, top, right, bottom], fill=(255, 255, 255), outline=border, width=2)
        draw.text((left + 16, top + 24), line.raw_text, fill=(24, 34, 48), font=font)

    buf = BytesIO()
    image.save(buf, format="JPEG", quality=88)
    return buf.getvalue()


def list_demo_cases() -> list[dict]:
    return [
        {
            "case_id": case.case_id,
            "title": case.title,
            "subtitle": case.subtitle,
            "patient_id": case.patient_id,
            "highlights": list(case.highlights),
            "cabinet_count": len(case.cabinet),
        }
        for case in DEMO_CASES
    ]


async def run_demo_case(
    case_id: str,
    *,
    resolver: FormularyResolver,
    fda: OpenFdaClient,
) -> ScanResponse:
    case = DEMO_CASES_BY_ID.get(case_id)
    if case is None:
        raise KeyError(case_id)

    offline_fda = OpenFdaClient(fallback=[], allowed_salts=fda.allowed_salts, live=False)
    offline_fda.fallback = fda.fallback

    extraction = VisionExtraction(
        extracted_lines=list(case.lines),
        image_quality_warning=any(line.ocr_confidence < 0.85 for line in case.lines),
    )
    response = await scan_parchi(
        image_bytes=_render_demo_parchi_jpeg(case),
        mime="image/jpeg",
        patient_id=case.patient_id,
        cabinet=[dict(item) for item in case.cabinet],
        extractor=_DemoExtractor(extraction),
        resolver=resolver,
        fda=offline_fda,
    )
    response.scan_id = DEMO_SCAN_ID_BY_CASE[case_id]
    return response

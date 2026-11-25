"""Crop a handwriting box, validate image uploads, and store strip thumbnails."""

from __future__ import annotations

import base64
import math
import re
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

Image.MAX_IMAGE_PIXELS = 25_000_000

_SAFE_SLUG_RE = re.compile(r"[^a-zA-Z0-9_-]+")


def safe_slug(value: str, fallback: str = "item") -> str:
    cleaned = _SAFE_SLUG_RE.sub("_", (value or "").strip()).strip("_")
    return (cleaned[:48] or fallback)


def validate_image_bytes(image_bytes: bytes) -> bool:
    """Verify bytes decode as a supported raster image within pixel limits."""
    if not image_bytes:
        return False
    try:
        with Image.open(BytesIO(image_bytes)) as img:
            img.verify()
        return True
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        return False


def _open_oriented_rgb(image_bytes: bytes) -> Image.Image | None:
    if not image_bytes:
        return None
    try:
        with Image.open(BytesIO(image_bytes)) as raw:
            oriented = ImageOps.exif_transpose(raw)
            return oriented.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        return None


def crop_bbox_jpeg_b64(image_bytes: bytes, bbox: list[float] | None) -> str | None:
    if not image_bytes or not bbox or len(bbox) != 4:
        return None
    if any(not isinstance(v, (int, float)) or not math.isfinite(float(v)) for v in bbox):
        return None
    image = _open_oriented_rgb(image_bytes)
    if image is None:
        return None

    width, height = image.size
    ymin, xmin, ymax, xmax = (float(v) for v in bbox)
    if ymin > ymax:
        ymin, ymax = ymax, ymin
    if xmin > xmax:
        xmin, xmax = xmax, xmin

    left = max(0, min(width, int(round(xmin / 1000 * width))))
    top = max(0, min(height, int(round(ymin / 1000 * height))))
    right = max(0, min(width, int(round(xmax / 1000 * width))))
    bottom = max(0, min(height, int(round(ymax / 1000 * height))))
    if right <= left or bottom <= top:
        return None

    crop = image.crop((left, top, right, bottom))
    buffer = BytesIO()
    crop.save(buffer, format="JPEG", quality=85)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def save_jpeg(image_bytes: bytes, directory: Path, filename: str) -> str | None:
    image = _open_oriented_rgb(image_bytes)
    if image is None:
        return None
    image.thumbnail((960, 960))
    directory.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename).name
    path = directory / safe_name
    image.save(path, format="JPEG", quality=85)
    return safe_name

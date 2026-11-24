"""Crop a handwriting box and store a strip thumbnail."""

from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

from PIL import Image, UnidentifiedImageError


def crop_bbox_jpeg_b64(image_bytes: bytes, bbox: list[float] | None) -> str | None:
    if not image_bytes or not bbox or len(bbox) != 4:
        return None
    try:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        return None
    width, height = image.size
    ymin, xmin, ymax, xmax = bbox
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
    try:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        return None
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / filename
    image.save(path, format="JPEG", quality=85)
    return filename

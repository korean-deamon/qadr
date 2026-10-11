"""Media storage interface (SPEC §5 Media): Cloudinary when configured, local disk otherwise.

Uploads always pass through the API, which validates the file (type, size, real
image, max dimensions) before storing it. With Cloudinary the API performs a
signed upload server-side, so no unsigned upload preset is ever exposed.
"""

import io
import uuid
from dataclasses import dataclass
from typing import Protocol

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings
from app.core.errors import AppError

MAX_BYTES = 8 * 1024 * 1024
ALLOWED = {"JPEG", "PNG", "WEBP"}
VARIANT_WIDTHS = (480, 960, 1600)


@dataclass
class StoredImage:
    key: str  # Cloudinary public_id or local relative path prefix
    url: str  # canonical URL (largest variant / Cloudinary secure_url)
    width: int
    height: int


class Storage(Protocol):
    async def save_image(self, data: bytes, folder: str) -> StoredImage: ...
    async def delete(self, key: str) -> None: ...


def validate_image(data: bytes) -> Image.Image:
    if len(data) > MAX_BYTES:
        raise AppError("IMAGE_TOO_LARGE", 413, max_bytes=MAX_BYTES)
    try:
        probe = Image.open(io.BytesIO(data))
        probe.verify()
        img: Image.Image = Image.open(io.BytesIO(data))
        fmt = img.format
    except (UnidentifiedImageError, OSError) as exc:
        raise AppError("IMAGE_INVALID", 400) from exc
    if fmt not in ALLOWED:
        raise AppError("IMAGE_TYPE_NOT_ALLOWED", 400)
    if img.width * img.height > 40_000_000:
        raise AppError("IMAGE_TOO_LARGE", 413)
    return ImageOps.exif_transpose(img).convert("RGB")  # also strips EXIF (location!)


def new_name() -> str:
    return uuid.uuid4().hex


def get_storage() -> Storage:
    if settings.cloudinary_enabled:
        from app.storage.cloudinary import CloudinaryStorage

        return CloudinaryStorage()
    from app.storage.local import LocalStorage

    return LocalStorage()

import asyncio
import io
import shutil
from pathlib import Path

from PIL import Image

from app.core.config import settings
from app.storage.base import VARIANT_WIDTHS, StoredImage, new_name, validate_image


class LocalStorage:
    """Writes WebP variants `<name>-<width>.webp` under MEDIA_ROOT, served at MEDIA_URL."""

    def __init__(self) -> None:
        self.root = Path(settings.media_root).resolve()

    def _write(self, img: Image.Image, folder: str) -> StoredImage:
        name = new_name()
        target = self.root / folder
        target.mkdir(parents=True, exist_ok=True)
        largest = ""
        for w in VARIANT_WIDTHS:
            copy = img.copy()
            if copy.width > w:
                copy.thumbnail((w, w * 4), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            copy.save(buf, "WEBP", quality=82, method=5)
            (target / f"{name}-{w}.webp").write_bytes(buf.getvalue())
            largest = f"{settings.media_url}/{folder}/{name}-{w}.webp"
        return StoredImage(key=f"{folder}/{name}", url=largest, width=img.width, height=img.height)

    async def save_image(self, data: bytes, folder: str) -> StoredImage:
        img = validate_image(data)
        return await asyncio.to_thread(self._write, img, folder)

    async def delete(self, key: str) -> None:
        base = (self.root / key).resolve()
        if not str(base).startswith(str(self.root)):
            return
        for w in VARIANT_WIDTHS:
            base.with_name(f"{base.name}-{w}.webp").unlink(missing_ok=True)

    def clear(self) -> None:
        shutil.rmtree(self.root, ignore_errors=True)

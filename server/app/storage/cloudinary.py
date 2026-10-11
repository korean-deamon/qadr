import hashlib
import io
import time

import httpx

from app.core.config import settings
from app.core.errors import AppError
from app.storage.base import StoredImage, new_name, validate_image


def _sign(params: dict[str, str]) -> str:
    to_sign = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    return hashlib.sha1((to_sign + settings.cloudinary_api_secret).encode()).hexdigest()  # noqa: S324 (Cloudinary API spec)


class CloudinaryStorage:
    """Server-side signed uploads; delivery URLs get f_auto/q_auto/width transforms on the client."""

    base = "https://api.cloudinary.com/v1_1"

    async def save_image(self, data: bytes, folder: str) -> StoredImage:
        img = validate_image(data)
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=90)
        params = {"folder": f"qadr/{folder}", "public_id": new_name(), "timestamp": str(int(time.time()))}
        form = {**params, "api_key": settings.cloudinary_api_key, "signature": _sign(params)}
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(
                f"{self.base}/{settings.cloudinary_cloud_name}/image/upload",
                data=form,
                files={"file": ("upload.jpg", buf.getvalue(), "image/jpeg")},
            )
        if res.status_code != 200:
            raise AppError("IMAGE_UPLOAD_FAILED", 502)
        body = res.json()
        return StoredImage(key=body["public_id"], url=body["secure_url"], width=body["width"], height=body["height"])

    async def delete(self, key: str) -> None:
        params = {"public_id": key, "timestamp": str(int(time.time()))}
        form = {**params, "api_key": settings.cloudinary_api_key, "signature": _sign(params)}
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(f"{self.base}/{settings.cloudinary_cloud_name}/image/destroy", data=form)

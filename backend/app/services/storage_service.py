"""
Handles uploading instructor video files to Cloudinary and returning a hosted URL.

Setup:
    pip install cloudinary
    Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in .env
"""

import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, HTTPException

from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-matroska", "video/webm"}
MAX_FILE_SIZE_MB = 500


async def upload_video(file: UploadFile) -> dict:
    """
    Uploads a lecture video file to Cloudinary and returns its secure URL plus
    duration in seconds -- Cloudinary already reports duration on every video
    upload, so there's no need to separately probe the file for it.
    """
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported video type: {file.content_type}")

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File too large ({size_mb:.1f}MB). Max {MAX_FILE_SIZE_MB}MB.")

    try:
        result = cloudinary.uploader.upload_large(
            contents,
            resource_type="video",
            folder="lectures",
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Video upload failed: {str(e)}")

    return {
        "url": result["secure_url"],
        "duration_seconds": int(result.get("duration", 0)),
    }
"""
cloudinary_service.py
=====================
Cloudinary upload helper.
Uploads processed images and returns public URLs for download.
"""

import os
import cloudinary
import cloudinary.uploader

from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.getenv("CLOUDINARY_API_KEY", ""),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", ""),
    secure=True,
)


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

def upload_image(file_path: str, folder: str = "processed_images") -> dict:
    """
    Upload a local image file to Cloudinary.

    Args:
        file_path: Absolute path to the image on disk.
        folder:    Cloudinary folder to organise uploads.

    Returns:
        A dict with:
          - url:        The HTTPS URL of the uploaded image.
          - public_id:  The Cloudinary public ID.
          - filename:   The original file name.
    """
    filename = os.path.basename(file_path)
    name_without_ext = os.path.splitext(filename)[0]

    result = cloudinary.uploader.upload(
        file_path,
        folder=folder,
        public_id=name_without_ext,
        overwrite=True,
        resource_type="image",
    )

    return {
        "url": result.get("secure_url", result.get("url", "")),
        "public_id": result.get("public_id", ""),
        "filename": filename,
    }

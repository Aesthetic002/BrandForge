"""
app.py
======
FastAPI backend for the Image Processor application.

Stateless architecture:
  - Users upload images + logo directly via the website
  - Images are cropped to 1:1, overlaid with branding data
  - Processed images are uploaded to Cloudinary
  - Cloudinary URLs are returned for download

Run with:
    python app.py
Server starts on http://localhost:8000
"""

import os
import shutil
import uuid

from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load .env BEFORE importing modules that read env vars
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn

import urllib.request
import urllib.parse

# Local modules
import cloudinary_service
import image_processor

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TEMP_DIR = "temp"
PROCESSED_DIR = "processed"

# Allowed image MIME types
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/bmp"}
ALLOWED_LOGO_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"}


# ---------------------------------------------------------------------------
# App Lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create required local directories on startup, clean up on shutdown."""
    os.makedirs(TEMP_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    os.makedirs("static", exist_ok=True)
    yield
    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR, ignore_errors=True)
    if os.path.exists(PROCESSED_DIR):
        shutil.rmtree(PROCESSED_DIR, ignore_errors=True)


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Image Processor",
    description="Upload images, add branding overlays, download from Cloudinary",
    lifespan=lifespan,
)

# CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:8000,http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static frontend files
app.mount("/static", StaticFiles(directory="static"), name="static")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
async def serve_frontend():
    """Serve the main frontend page."""
    return FileResponse("static/index.html")


@app.get("/health")
@app.head("/health")
async def health_check():
    """Health check endpoint for uptime monitors."""
    return {"status": "ok"}


@app.post("/process-images")
async def process_images(
    images: Optional[list[UploadFile]] = File(None),
    logo: UploadFile = File(...),
    phone: str = Form(""),
    email: str = Form(""),
    location: str = Form(""),
    services: str = Form(""),
    business_name: str = Form(""),
    image_prompt: str = Form(""),
):
    """
    Main processing endpoint.

    Accepts:
      - images[]: Multiple image files (JPG, PNG)
      - logo: Single logo file
      - phone, email, location, services, business_name: Text fields

    Processing:
      1. Save uploaded files to temp directory
      2. For each image: crop to 1:1 → apply overlays → save processed
      3. Upload each processed image to Cloudinary
      4. Return JSON with Cloudinary URLs
      5. Clean up temp files

    Returns:
        JSON with total, processed, failed counts and list of result URLs.
    """
    # ---- Validate inputs ----
    images = images or []
    if not images and not image_prompt:
        raise HTTPException(status_code=400, detail="Either upload images or provide an AI image prompt.")

    if logo.content_type not in ALLOWED_LOGO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid logo type '{logo.content_type}'. Use PNG, JPEG, or WEBP.",
        )

    # ---- Save logo to temp ----
    batch_id = uuid.uuid4().hex[:8]
    batch_temp = os.path.join(TEMP_DIR, batch_id)
    batch_processed = os.path.join(PROCESSED_DIR, batch_id)
    os.makedirs(batch_temp, exist_ok=True)
    os.makedirs(batch_processed, exist_ok=True)

    logo_ext = os.path.splitext(logo.filename)[1] or ".png"
    logo_path = os.path.join(batch_temp, f"logo_{batch_id}{logo_ext}")
    with open(logo_path, "wb") as f:
        f.write(await logo.read())

    results = {
        "total": len(images),
        "processed": 0,
        "failed": 0,
        "errors": [],
        "results": [],
    }

    try:
        # ---- 1. AI Image Generation (if prompt provided) ----
        ai_generated_paths = []
        if image_prompt:
            try:
                print(f"Generating AI image for prompt: {image_prompt}")
                # Use Pollinations.ai (Free, no API key required)
                encoded_prompt = urllib.parse.quote(image_prompt)
                image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true"
                
                req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    image_bytes = response.read()
                    
                ai_image_name = f"ai_gen_{uuid.uuid4().hex[:6]}.jpg"
                ai_image_path = os.path.join(batch_temp, ai_image_name)
                with open(ai_image_path, "wb") as f:
                    f.write(image_bytes)
                ai_generated_paths.append((ai_image_name, ai_image_path))
            except Exception as e:
                print(f"AI Generation Error: {e}")
                results["errors"].append(f"AI Generation failed: {str(e)}")

        # ---- 2. Process Uploaded Images ----
        for img_file in images:
            file_name = img_file.filename or f"image_{uuid.uuid4().hex[:6]}.png"

            # Validate type
            if img_file.content_type not in ALLOWED_IMAGE_TYPES:
                results["failed"] += 1
                results["errors"].append(
                    f"{file_name}: Unsupported type '{img_file.content_type}'"
                )
                continue

            try:
                # Save uploaded image
                input_path = os.path.join(batch_temp, file_name)
                with open(input_path, "wb") as f:
                    f.write(await img_file.read())

                # Process (crop + overlay)
                safe_name = f"processed_{uuid.uuid4().hex[:6]}_{file_name}"
                output_path = os.path.join(batch_processed, safe_name)

                image_processor.process_image(
                    input_path=input_path,
                    output_path=output_path,
                    logo_path=logo_path,
                    email=email.strip(),
                    phone=phone.strip(),
                    location=location.strip(),
                    services=services.strip(),
                    business_name=business_name.strip(),
                )

                # Upload to Cloudinary
                cloud_result = cloudinary_service.upload_image(output_path)
                results["results"].append({
                    "original_name": file_name,
                    "url": cloud_result["url"],
                    "public_id": cloud_result["public_id"],
                })
                results["processed"] += 1

            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"{file_name}: {str(e)}")

        # ---- 3. Process AI Generated Images ----
        for file_name, input_path in ai_generated_paths:
            try:
                safe_name = f"processed_{uuid.uuid4().hex[:6]}_{file_name}"
                output_path = os.path.join(batch_processed, safe_name)

                image_processor.process_image(
                    input_path=input_path,
                    output_path=output_path,
                    logo_path=logo_path,
                    email=email.strip(),
                    phone=phone.strip(),
                    location=location.strip(),
                    services=services.strip(),
                    business_name=business_name.strip(),
                )

                # Upload to Cloudinary
                cloud_result = cloudinary_service.upload_image(output_path)
                results["results"].append({
                    "original_name": file_name,
                    "url": cloud_result["url"],
                    "public_id": cloud_result["public_id"],
                })
                results["processed"] += 1

            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"{file_name}: {str(e)}")

    finally:
        # Clean up temp files
        shutil.rmtree(batch_temp, ignore_errors=True)
        shutil.rmtree(batch_processed, ignore_errors=True)

    return results


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("  Image Processor — Upload, Overlay, Download")
    print("  Server: http://localhost:8000")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)

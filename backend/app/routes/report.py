import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from supabase import create_client
from dotenv import load_dotenv

from app.services.speech_service import transcribe_tamil_audio
from app.services.gemini_service import analyze_report
from app.services.supabase_service import insert_report

load_dotenv()

router = APIRouter()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

@router.post("/analyze-report")
async def analyze_waste_report(
    audio_file: UploadFile = File(...),
    image_url: str = Form(...),
    user_id: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
):
    """
    Full AI pipeline:
    1. Transcribe Tamil audio using Gemini
    2. Translate + extract structured data using Gemini
    3. Upload audio to Supabase Storage
    4. Insert report record into Supabase DB
    """
    try:
        # Step 1: Read audio bytes and transcribe Tamil speech
        audio_bytes = await audio_file.read()
        mime_type = audio_file.content_type or "audio/webm"
        
        tamil_text = await transcribe_tamil_audio(audio_bytes, mime_type)

        # Step 2: Translate + extract structured fields using Gemini
        analysis = await analyze_report(tamil_text)
        description_english = analysis.get("description_english", "")
        priority = analysis.get("priority", "medium")
        area = analysis.get("area", "unknown")
        ward = analysis.get("ward", "unknown")

        # Step 3: Upload audio to Supabase Storage bucket 'report-audio'
        audio_filename = f"{user_id}/{audio_file.filename or 'recording.webm'}"
        upload_response = supabase.storage.from_("report-audio").upload(
            audio_filename,
            audio_bytes,
            {"content-type": mime_type}
        )
        audio_url = supabase.storage.from_("report-audio").get_public_url(audio_filename)

        # Step 4: Insert the complete report into the database
        report = await insert_report(
            user_id=user_id,
            description_tamil=tamil_text,
            description_english=description_english,
            priority=priority,
            area=area,
            ward=ward,
            latitude=latitude,
            longitude=longitude,
            image_url=image_url,
            audio_url=audio_url,
        )

        return JSONResponse(content={
            "success": True,
            "report_id": report.get("id"),
            "tamil_text": tamil_text,
            "english_text": description_english,
            "priority": priority,
            "area": area,
            "ward": ward,
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

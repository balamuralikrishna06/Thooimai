import os
import httpx
import base64
from dotenv import load_dotenv

load_dotenv(override=True)

SARVAM_BASE_URL = "https://api.sarvam.ai"


def _get_api_key():
    """Always read fresh from environment so .env changes don't require restart."""
    load_dotenv(override=True)
    return os.getenv("SARVAM_API_KEY", "")


async def transcribe_tamil_audio(audio_bytes: bytes, filename: str = "recording.webm") -> str:
    """
    Use Sarvam AI Speech-to-Text to transcribe Tamil audio.
    Supports webm/wav/mp3. Returns the Tamil transcript text.
    """
    # Determine MIME type from filename extension
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "webm"
    mime_map = {
        "webm": "audio/webm",
        "wav":  "audio/wav",
        "mp3":  "audio/mpeg",
        "ogg":  "audio/ogg",
        "m4a":  "audio/mp4",
    }
    mime_type = mime_map.get(ext, "audio/webm")

    # Sarvam STT expects the file param with a proper filename + mime type
    upload_filename = f"recording.{ext}"

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{SARVAM_BASE_URL}/speech-to-text",
            headers={"api-subscription-key": _get_api_key()},
            files={"file": (upload_filename, audio_bytes, mime_type)},
            data={
                "language_code": "ta-IN",
                "model": "saarika:v2.5",
                "with_timestamps": "false",
            },
        )

        if not response.is_success:
            # Log the actual Sarvam error for debugging
            try:
                err_body = response.json()
            except Exception:
                err_body = response.text
            raise Exception(
                f"Sarvam STT error {response.status_code}: {err_body}"
            )

        result = response.json()
        return result.get("transcript", "")


async def translate_to_english(tamil_text: str) -> str:
    """
    Use Sarvam AI Translate to convert Tamil text to English.
    """
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{SARVAM_BASE_URL}/translate",
            headers={
                "api-subscription-key": _get_api_key(),
                "Content-Type": "application/json",
            },
            json={
                "input": tamil_text,
                "source_language_code": "ta-IN",
                "target_language_code": "en-IN",
                "speaker_gender": "Female",
                "mode": "formal",
                "model": "mayura:v1",
                "enable_preprocessing": True,
            },
        )

        if not response.is_success:
            try:
                err_body = response.json()
            except Exception:
                err_body = response.text
            raise Exception(
                f"Sarvam Translate error {response.status_code}: {err_body}"
            )

        result = response.json()
        return result.get("translated_text", tamil_text)


async def text_to_speech(english_text: str) -> bytes:
    """
    Use Sarvam AI TTS to convert English text to speech audio (WAV bytes).
    """
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{SARVAM_BASE_URL}/text-to-speech",
            headers={
                "api-subscription-key": _get_api_key(),
                "Content-Type": "application/json",
            },
            json={
                "inputs": [english_text[:500]],   # TTS limit per call
                "target_language_code": "en-IN",
                "speaker": "meera",
                "model": "bulbul:v1",
                "enable_preprocessing": True,
            },
        )

        if not response.is_success:
            try:
                err_body = response.json()
            except Exception:
                err_body = response.text
            # TTS failure is non-fatal — just return empty bytes
            print(f"[WARN] Sarvam TTS error {response.status_code}: {err_body}")
            return b""

        result = response.json()
        audios = result.get("audios", [])
        if audios:
            return base64.b64decode(audios[0])
        return b""

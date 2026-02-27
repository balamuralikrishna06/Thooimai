import os
import httpx

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "sk_1ldym03q_JZDtYoGI3TzbVPLBp2aNburG")
SARVAM_BASE_URL = "https://api.sarvam.ai"


async def transcribe_tamil_audio(audio_bytes: bytes, filename: str = "recording.webm") -> str:
    """
    Use Sarvam AI Speech-to-Text to transcribe Tamil audio.
    Returns the Tamil transcript text.
    """
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{SARVAM_BASE_URL}/speech-to-text",
            headers={"api-subscription-key": SARVAM_API_KEY},
            files={"file": (filename, audio_bytes, "audio/webm")},
            data={"language_code": "ta-IN", "model": "saarika:v2"},
        )
        response.raise_for_status()
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
                "api-subscription-key": SARVAM_API_KEY,
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
        response.raise_for_status()
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
                "api-subscription-key": SARVAM_API_KEY,
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
        response.raise_for_status()
        result = response.json()
        # Sarvam TTS returns base64 encoded audio
        import base64
        audios = result.get("audios", [])
        if audios:
            return base64.b64decode(audios[0])
        return b""

import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


async def extract_report_details(english_text: str) -> dict:
    """
    Use Gemini to extract structured report details from English description.
    Returns dict with: priority, area, ward, latitude_hint, longitude_hint.
    Latitude/longitude are returned as hints (textual) since GPS comes from browser.
    """
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = f"""
You are an AI system for a city cleanliness management platform in Madurai, Tamil Nadu, India.

A citizen has reported a waste issue. Below is their description in English:

"{english_text}"

Extract the following structured information from the text and return ONLY valid JSON (no markdown):

{{
  "priority": "high or medium or low",
  "area": "name of the area or locality mentioned (e.g. 'Arapalayam', 'unknown' if not mentioned)",
  "ward": "ward number or ward name if mentioned (e.g. 'Ward 12', 'unknown' if not mentioned)"
}}

Priority Rules:
- "high"   → large heap, health hazard, near hospital/school, burning waste, stray animals
- "medium" → overflowing bin, moderate plastic waste, blocked drain
- "low"    → small litter, minor complaint
"""

    response = model.generate_content(prompt)
    raw = response.text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:].strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {"priority": "medium", "area": "unknown", "ward": "unknown"}

    # Validate and sanitize
    result["priority"] = result.get("priority", "medium").lower()
    if result["priority"] not in ["low", "medium", "high"]:
        result["priority"] = "medium"
    result.setdefault("area", "unknown")
    result.setdefault("ward", "unknown")

    return result

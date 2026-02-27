import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

async def analyze_report(tamil_text: str) -> dict:
    """
    Takes Tamil description, translates to English, then extracts structured report fields.
    Returns a dict with: description_english, priority, area, ward.
    """
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = f"""
You are an AI assistant for a city waste management system in Madurai, Tamil Nadu.

The following Tamil text is a citizen's description of a garbage or waste issue:

Tamil Text: "{tamil_text}"

Your tasks:
1. Translate this Tamil text to English.
2. Based on the translated description, extract the following structured information.

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{{
  "description_english": "The English translation of the Tamil text",
  "priority": "high or medium or low",
  "area": "The area/locality name mentioned (leave as 'unknown' if not mentioned)",
  "ward": "The ward number or name mentioned (leave as 'unknown' if not mentioned)"
}}

Priority Rules:
- "high" → large garbage pile, health risk, near hospital/school, burning waste
- "medium" → moderate waste accumulation, overflowing bin, plastic waste
- "low" → small waste, minor complaint
"""

    response = model.generate_content(prompt)
    raw = response.text.strip()

    # Strip markdown code blocks if Gemini wraps output
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback in case Gemini returns imperfect JSON
        result = {
            "description_english": tamil_text,
            "priority": "medium",
            "area": "unknown",
            "ward": "unknown"
        }

    # Ensure all keys are present and values are valid
    result.setdefault("description_english", tamil_text)
    result.setdefault("area", "unknown")
    result.setdefault("ward", "unknown")
    result["priority"] = result.get("priority", "medium").lower()
    if result["priority"] not in ["low", "medium", "high"]:
        result["priority"] = "medium"

    return result

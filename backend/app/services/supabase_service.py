import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)


async def insert_report(
    user_id: str,
    description_tamil: str,
    description_english: str,
    priority: str,
    area: str,
    ward: str,
    latitude: float,
    longitude: float,
    image_url: str,
    audio_url: str,
) -> dict:
    """Insert a new report into the issue_reports table (schema from supabase_migration.sql)."""
    location_str = area if area != "unknown" else "Madurai"
    if ward != "unknown":
        location_str = f"{location_str}, {ward}"

    payload = {
        "user_id": user_id,                      # Firebase UID (text)
        "category": "garbage",                    # NOT NULL
        "location": location_str,                 # NOT NULL
        "latitude": latitude,                     # NOT NULL
        "longitude": longitude,                   # NOT NULL
        "image_url": image_url,
        "audio_url": audio_url,
        "status": "Pending",                      # must match check constraint exactly
        "notes": f"Priority: {priority}",
        "description_tamil": description_tamil,
        "description_english": description_english,
        "priority": priority,
        "area": area,
        "ward": ward,
    }

    response = supabase.table("issue_reports").insert(payload).execute()
    return response.data[0] if response.data else {}

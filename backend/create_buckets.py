from supabase import create_client

url = "https://iyqfzosymbsmunieawij.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cWZ6b3N5bWJzbXVuaWVhd2lqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE5OTYyNSwiZXhwIjoyMDg3Nzc1NjI1fQ.4m03ogPQ1o-22abmWECOyxgd0-azqGYAJlgGOBbzCw0"

sb = create_client(url, key)

for bucket in ["report-images", "report-audio"]:
    try:
        sb.storage.create_bucket(bucket, options={"public": True})
        print(f"✅ Created bucket: {bucket}")
    except Exception as e:
        print(f"ℹ️  Bucket '{bucket}': {e}")

import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, status, Header

# Initialize Firebase Admin SDK
# You must download the serviceAccountKey.json from Firebase Console > Project Settings > Service Accounts
CREDENTIALS_PATH = os.getenv("FIREBASE_ADMIN_CREDENTIALS_PATH", "serviceAccountKey.json")

def initialize_firebase():
    if not firebase_admin._apps:
        try:
            cred = credentials.Certificate(CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized successfully.")
        except Exception as e:
            print(f"Warning: Failed to initialize Firebase Admin. Is {CREDENTIALS_PATH} present? Error: {e}")

initialize_firebase()

async def verify_firebase_token(authorization: str = Header(None)):
    """
    Middleware/Dependency to verify Firebase ID Token sent from the frontend.
    Expects header: "Authorization: Bearer <token>"
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header"
        )
    
    token = authorization.split("Bearer ")[1]
    
    try:
        # Verify the token against Firebase
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}"
        )

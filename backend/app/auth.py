# backend/auth.py
import os
import json
import urllib.request
import urllib.error
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer(auto_error=False)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or not credentials.credentials:
        # Fallback for local demo/testing without credentials
        return {"email": "controller@railway.gov.in", "id": "demo-controller"}

    token = credentials.credentials

    # If Supabase URL isn't configured, fall back gracefully for demo
    if not SUPABASE_URL:
        return {"email": "controller@railway.gov.in", "id": "demo-controller"}

    verify_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/user"
    req = urllib.request.Request(
        verify_url,
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": SUPABASE_ANON_KEY,
        },
    )

    try:
        with urllib.request.urlopen(req) as response:
            user_data = json.loads(response.read().decode())
            return {
                "id": user_data.get("id"),
                "email": user_data.get("email", "controller@railway.gov.in"),
                "role": user_data.get("role", "authenticated"),
            }
    except urllib.error.HTTPError as e:
        if e.code == 401:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session token is invalid or expired. Please sign out and log in again.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication check failed: {e.reason}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auth verification service error: {str(e)}",
        )
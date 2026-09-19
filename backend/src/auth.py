# auth.py — pure addition, no imports from your existing code
import os
import threading
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

SECRET = os.environ.get("AUTH_SECRET", "dev-secret-change-me")
ALGO = "HS256"
TOKEN_TTL_HOURS = 12

_bearer = HTTPBearer(auto_error=False)

_users_lock = threading.Lock()
_users: dict[str, dict] = {}


def _new_id() -> str:
    return f"u_{len(_users) + 1:04d}"


def find_user(username: str) -> dict | None:
    return _users.get(username)


def create_user(username: str, password: str, role: str) -> dict:
    if role not in ("admin", "operator"):
        raise HTTPException(400, "Invalid role")
    with _users_lock:
        if username in _users:
            raise HTTPException(409, "Username already taken")
        user = {
            "id": _new_id(),
            "username": username,
            "password_hash": bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
            "role": role,
        }
        _users[username] = user
    return {"id": user["id"], "username": user["username"], "role": user["role"]}


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def authenticate(username: str, password: str) -> dict | None:
    row = find_user(username)
    if not row or not verify_password(password, row["password_hash"]):
        return None
    return {"id": row["id"], "username": row["username"], "role": row["role"]}


def create_token(user: dict) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user["username"],
        "uid": user["id"],
        "role": user["role"],
        "iat": now,
        "exp": now + timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET, algorithms=[ALGO])


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    if creds is None:
        raise HTTPException(401, "Missing token")
    try:
        payload = decode_token(creds.credentials)
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    return {"id": payload["uid"], "username": payload["sub"], "role": payload["role"]}


def require_operator(user: dict = Depends(current_user)) -> dict:
    if user["role"] not in ("operator", "admin"):
        raise HTTPException(403, "Operator role required")
    return user


def require_admin(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(403, "Admin role required")
    return user


# Seed defaults for dev
if not find_user("admin"):
    create_user("admin", "admin", "admin")
if not find_user("operator"):
    create_user("operator", "operator", "operator")

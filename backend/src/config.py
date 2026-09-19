import json
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Regenerated every backend process start - purely a forensic tag on history rows
# ("which run recorded this visit"), not used for any filtering/correctness logic.
SESSION_UID = str(uuid.uuid4())

REPO_ROOT = Path(__file__).resolve().parents[2]
SIMULATOR_SETTINGS_FILE = REPO_ROOT / "ParkingSimulator-win-x64" / "settings" / "settings.json"
LEVEL_LAYOUT_FILE = REPO_ROOT / "ParkingSimulator-win-x64" / "settings" / "lvl1.json"


def _load_simulator_settings() -> dict:
    if SIMULATOR_SETTINGS_FILE.exists():
        return json.loads(SIMULATOR_SETTINGS_FILE.read_text())
    return {}


_simulator_settings = _load_simulator_settings()

SIMULATOR_BASE_URL = os.environ.get(
    "SIMULATOR_BASE_URL",
    _simulator_settings.get("ListenAddress", "http://localhost:9898").replace("0.0.0.0", "localhost"),
)
SIMULATOR_USERNAME = os.environ.get("SIMULATOR_USERNAME", _simulator_settings.get("Name", "admin"))
SIMULATOR_PASSWORD = os.environ.get("SIMULATOR_PASSWORD", _simulator_settings.get("Password", "admin"))
PARKING_RATE_PER_MINUTE = float(os.environ.get("PARKING_RATE_PER_MINUTE", "1"))
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")

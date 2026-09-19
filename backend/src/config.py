import os

from dotenv import load_dotenv

load_dotenv()

SIMULATOR_BASE_URL = os.environ.get("SIMULATOR_BASE_URL", "http://localhost:9898")
SIMULATOR_USERNAME = os.environ.get("SIMULATOR_USERNAME", "admin")
SIMULATOR_PASSWORD = os.environ.get("SIMULATOR_PASSWORD", "admin")
PARKING_RATE_PER_MINUTE = float(os.environ.get("PARKING_RATE_PER_MINUTE", "1"))

import os
import sys
from pathlib import Path

# Tests never call the live voice provider; individual tests opt in with a stub.
os.environ["FREEAPI_TTS_ENABLED"] = "0"

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

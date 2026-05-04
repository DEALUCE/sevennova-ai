"""Ensure orchestrator root is first on sys.path."""
import sys
from pathlib import Path

ORCH_ROOT = str(Path(__file__).parent.parent.parent.parent)
if ORCH_ROOT in sys.path:
    sys.path.remove(ORCH_ROOT)
sys.path.insert(0, ORCH_ROOT)

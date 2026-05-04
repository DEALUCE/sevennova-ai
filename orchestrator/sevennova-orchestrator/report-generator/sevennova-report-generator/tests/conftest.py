"""
Ensure the orchestrator root is on sys.path so that
`from core.models import ...` resolves to the main orchestrator package.
"""
import sys
from pathlib import Path

# orchestrator/sevennova-orchestrator/
ORCH_ROOT = str(Path(__file__).parent.parent.parent.parent)
if ORCH_ROOT in sys.path:
    sys.path.remove(ORCH_ROOT)
sys.path.insert(0, ORCH_ROOT)

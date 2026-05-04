"""
Root conftest — ensures orchestrator root is first on sys.path.
This runs before any test module is imported, so `core.*` resolves
to the orchestrator's core package, not any subdirectory's core/.
"""
import sys
from pathlib import Path

ROOT = str(Path(__file__).parent)
# Always move to front — pytest may insert subdirectory core packages before this
if ROOT in sys.path:
    sys.path.remove(ROOT)
sys.path.insert(0, ROOT)

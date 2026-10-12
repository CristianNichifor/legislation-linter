"""Run the bounded, existing fixture regressions without fetching a dataset.

Run from the repository root after installing development dependencies.
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TESTS = [
    "tests/test_parsare.py",
    "tests/test_referinte.py",
    "tests/test_etalon.py",
    "tests/test_construieste_web.py",
]

if __name__ == "__main__":
    raise SystemExit(subprocess.call([sys.executable, "-m", "pytest", "-q", *TESTS], cwd=ROOT))

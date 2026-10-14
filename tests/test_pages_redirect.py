"""The GitHub Pages redirect stub (redirect/) sends every old link to the same place on the hub."""

import shutil
import subprocess
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent


@pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")
def test_pages_redirect_cases_pass() -> None:
    result = subprocess.run(
        ["node", "--test", str(HERE / "pages_redirect.test.mjs")],
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, result.stdout + result.stderr

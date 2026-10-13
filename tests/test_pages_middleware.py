"""The Cloudflare Pages preview gate (functions/_middleware.js): the dev preview answers only
the CN Webify preview gate, and fails closed while its secret is not configured."""

import shutil
import subprocess
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent


@pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")
def test_pages_middleware_cases_pass() -> None:
    result = subprocess.run(
        ["node", "--test", str(HERE / "pages_middleware.test.mjs")],
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, result.stdout + result.stderr

"""D-4 / design screen 01: the header status badge comes from the build, never from a guess.

The browser renders `datasetStatusHtml(stare_date)` from `/api/rezumat`; this harness runs that
function alone, in node, with the same contract the spec fixes: one status word from
ux-guidelines § 7, or nothing.
"""

import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app" / "index.html"


def _source() -> str:
    html = APP.read_text(encoding="utf-8")
    assert "function datasetStatusHtml" in html, "header badge renderer missing"
    return "function datasetStatusHtml" + html.split("function datasetStatusHtml", 1)[1].split(
        "function datasetFreshnessHtml", 1
    )[0]


@pytest.mark.skipif(not shutil.which("node"), reason="node runs the header renderer")
@pytest.mark.parametrize(
    ("stare", "expected"),
    [
        ("demonstrative", "Date demonstrative"),
        ("reale", "Date reale"),
        ("prototip", ""),
        (None, ""),
    ],
)
def test_header_badge_shows_one_status_word_or_nothing(stare, expected):
    program = (
        "const assert=require('node:assert/strict');"
        "function esc(s){return String(s).replace(/[&<>\"']/g,c=>"
        "({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));}"
        + _source()
        + f"const out=datasetStatusHtml({'null' if stare is None else repr(stare)});"
        + (
            f"assert.ok(out.includes('{expected}'));"
            f"assert.ok(out.includes('data-dataset-status=\"{stare}\"'));"
            "assert.ok(out.includes('role=\"status\"'));"
            if expected
            else "assert.equal(out,'');"
        )
    )
    subprocess.run(["node", "-e", program], check=True, capture_output=True, text=True, timeout=10)

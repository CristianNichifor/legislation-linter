"""The Pages builds follow the newest dataset release instead of a hardcoded data prefix (LL-1)."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

WORKFLOWS = Path(__file__).resolve().parent.parent / ".github" / "workflows"
# pages.yml only publishes the GitHub Pages redirect now, so it is not a build.
BUILDS = ("deploy-pages-cloudflare.yml",)
DATED_PREFIX = re.compile(r"data\.cristian-nichifor\.com/\d{4}-\d{2}-\d{2}")


@pytest.mark.parametrize("name", BUILDS)
def test_build_derives_the_data_prefix_from_the_release(name):
    text = (WORKFLOWS / name).read_text(encoding="utf-8")
    assert not DATED_PREFIX.search(text), "data store prefix is hardcoded"
    assert "steps.date.outputs.depozit" in text
    assert "depozit=https://data.cristian-nichifor.com/${TAG#date-}" in text

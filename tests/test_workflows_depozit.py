"""The Pages builds follow the newest dataset release instead of a hardcoded data prefix (LL-1)."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

WORKFLOWS = Path(__file__).resolve().parent.parent / ".github" / "workflows"
BUILDS = ("pages.yml", "deploy-pages-cloudflare.yml")
DATED_PREFIX = re.compile(r"data\.cristian-nichifor\.com/\d{4}-\d{2}-\d{2}")

# The GitHub App that opens agent pull requests has no `workflows` permission, so the fix ships as a
# diff in the pull request body. Strict: once the maintainer applies it this XPASSes and fails,
# which is the reminder to drop the marker.
pytestmark = pytest.mark.xfail(
    strict=True, reason="workflow diff pending: the maintainer applies it from the PR body"
)


@pytest.mark.parametrize("name", BUILDS)
def test_build_derives_the_data_prefix_from_the_release(name):
    text = (WORKFLOWS / name).read_text(encoding="utf-8")
    assert not DATED_PREFIX.search(text), "data store prefix is hardcoded"
    assert "steps.date.outputs.depozit" in text
    assert "depozit=https://data.cristian-nichifor.com/${TAG#date-}" in text

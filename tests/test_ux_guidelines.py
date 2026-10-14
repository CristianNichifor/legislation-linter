"""docs/ux-guidelines.md maps each rule to the test that enforces it.

A checklist pointing at tests that were renamed or deleted gives false comfort, so every
test file and every quoted browser test title it names must exist.
"""

from __future__ import annotations

import re
from pathlib import Path

GHID = Path("docs/ux-guidelines.md")
ROW = r"`(tests/browser/[\w.-]+\.spec\.js)` ((?:› \"[^\"]+\"(?:, )?)+)"


def _lista() -> str:
    text = GHID.read_text(encoding="utf-8")
    return text.split("## 8. Conformance checklist")[1].split("\n## ")[0]


def test_every_test_file_in_the_checklist_exists() -> None:
    files = set(re.findall(r"`(tests/[\w/.-]+\.(?:py|js))`", _lista()))
    assert files
    assert [f for f in files if not Path(f).is_file()] == []


def test_every_browser_test_title_in_the_checklist_exists() -> None:
    missing = []
    for row in _lista().splitlines():
        for spec, titles in re.findall(ROW, row):
            source = Path(spec).read_text(encoding="utf-8")
            for title in re.findall(r"› \"([^\"]+)\"", titles):
                if f"'{title}'" not in source and f"`{title}`" not in source:
                    missing.append(f"{spec} › {title}")
    assert missing == []


def test_the_guideline_links_the_bibles() -> None:
    text = GHID.read_text(encoding="utf-8")
    for doc in ("UX_UI_BIBLE.md", "PROJECT_FINISH_BIBLE.md", "DESIGN.md", "UX_ACCEPTANCE.md"):
        assert f"({doc})" in text
    assert "(ux-guidelines.md)" in Path("docs/UX_UI_BIBLE.md").read_text(encoding="utf-8")

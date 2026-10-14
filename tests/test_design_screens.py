"""docs/design/README.md indexes self-contained mockups (spec LL-DS)."""

import re
from pathlib import Path

DESIGN = Path("docs/design")
README = DESIGN / "README.md"
SCREENS = sorted(DESIGN.glob("screens/*.html"))


def _linked_screens() -> list[Path]:
    text = README.read_text(encoding="utf-8")
    return [DESIGN / m for m in re.findall(r"\]\((screens/[^)]+\.html)\)", text)]


def test_readme_indexes_every_mockup():
    linked = _linked_screens()
    assert len(linked) >= 5
    assert set(linked) == set(SCREENS)
    for path in linked:
        assert path.is_file(), path


def test_mockups_are_self_contained_romanian():
    assert SCREENS
    for path in SCREENS:
        html = path.read_text(encoding="utf-8")
        assert "<script" not in html, path
        assert not re.search(r"<link[^>]+href=\"http", html), path
        assert not re.search(r"\bsrc=\"http", html), path
        assert not re.search("[şţŞŢ]", html), path
        assert 'lang="ro"' in html, path
        assert "Date demonstrative" in html, path
        assert "Toate proiectele" in html, path
        assert "@media (max-width:900px)" in html, path


def test_spec_names_the_design_item():
    spec = Path("docs/specs/production-readiness.md").read_text(encoding="utf-8")
    assert "### LL-DS" in spec
    assert "tests/test_design_screens.py" in spec

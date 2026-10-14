"""The local server serves every asset the shell links (ux-guidelines D-5, D-6).

The baseline browser suite runs against this server, so a stylesheet missing from the
allowlist is invisible there and the live site diverges from the local-first launch.
"""

import re
from pathlib import Path

from scripts.server import APP, ASSETS

INDEX = Path("app/index.html").read_text(encoding="utf-8")


def _linked_assets() -> set[str]:
    tags = re.findall(r"<(?:link|script)\b[^>]*?(?:href|src)=\"([^\"h][^\"]*)\"", INDEX)
    return {f"/{path}" for path in tags}


def test_every_linked_asset_is_served() -> None:
    missing = sorted(_linked_assets() - set(ASSETS))
    assert missing == []


def test_css_imports_are_served() -> None:
    for route, (name, _tip) in ASSETS.items():
        if not name.endswith(".css"):
            continue
        folder = Path(name).parent
        for imported in re.findall(r"@import\s+\"\./([^\"]+)\"", (APP / name).read_text()):
            assert f"/{folder / imported}" in ASSETS, f"{route} imports {imported}"


def test_served_files_exist_with_a_matching_type() -> None:
    for route, (name, tip) in ASSETS.items():
        assert (APP / name).is_file(), route
        if name.endswith(".css"):
            assert tip.startswith("text/css"), route
        if name.endswith(".js"):
            assert tip.startswith("text/javascript"), route

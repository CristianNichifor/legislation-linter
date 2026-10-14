"""The privacy page states what the page's CSP enforces, and ships with the app (LL-7)."""

from __future__ import annotations

import re
from pathlib import Path

from scripts import construieste_web as cw
from scripts import server

PAGE = Path(__file__).resolve().parent.parent / "app" / "confidentialitate.html"
ISSUES = "https://github.com/CristianNichifor/legislation-linter/issues"


def _text() -> str:
    return PAGE.read_text(encoding="utf-8")


def _connect_src_hosts() -> list[str]:
    directive = next(d for d in cw.CSP.split(";") if d.strip().startswith("connect-src"))
    sources = directive.replace("__DEPOZIT_CSP__", "").split()[1:]
    return [s.removeprefix("https://") for s in sources if s.startswith("https://")]


def test_names_every_endpoint_the_csp_allows():
    text = _text()
    hosts = _connect_src_hosts()
    assert {"api.openai.com", "api.anthropic.com"} <= set(hosts)
    missing = [host for host in hosts if host not in text]
    assert missing == []
    # The channel and data store origin is added to connect-src at build time.
    assert cw._origine(cw.PUBLIC_CHANNEL).removeprefix("https://") in text


def test_states_the_local_first_and_byok_facts():
    text = _text()
    assert '<html lang="ro">' in text
    assert "Cristian Nichifor" in text
    assert ISSUES in text
    for phrase in ("cookie", "analiz", "BYOK", "browser"):
        assert phrase in text
    # Comma-below diacritics only.
    assert not re.search("[şţŞŢ]", text)


def test_ships_with_the_static_build(tmp_path, monkeypatch):
    monkeypatch.setattr(cw, "WEB", tmp_path)
    cw._pagina()
    assert (tmp_path / "confidentialitate.html").read_bytes() == PAGE.read_bytes()
    assert 'href="confidentialitate.html"' in (tmp_path / "index.html").read_text()


def test_served_by_the_local_server():
    assert server.ASSETS["/confidentialitate.html"][0] == "confidentialitate.html"

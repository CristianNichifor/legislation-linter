"""Service messages shown in the app follow the page copy's internal-terms rule (LL-EN)."""

import ast
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Modules whose Romanian messages reach the Sources view.
MODULES = ["scripts/source_registry.py", "scripts/achizitii_proiecte.py"]
ROMANIAN = re.compile(r"[ăâîșțĂÂÎȘȚ]")
INTERNAL = re.compile(r"\btracker\w*|\bMetadata\b|\bworkbench\b|\bcockpit\b", re.IGNORECASE)


def romanian_messages(path):
    tree = ast.parse((ROOT / path).read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        is_text = isinstance(node, ast.Constant) and isinstance(node.value, str)
        if is_text and ROMANIAN.search(node.value):
            yield node.lineno, node.value


def test_service_messages_use_no_internal_terms():
    hits = [
        f"{path}:{line}: {text}"
        for path in MODULES
        for line, text in romanian_messages(path)
        if INTERNAL.search(text)
    ]
    assert hits == []

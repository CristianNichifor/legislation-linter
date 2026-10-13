"""The dev preview of the rewrite Worker shares production's KV but never its keys: a dev prompt
or model change must not be served from the production cache, nor count toward its daily cap."""

import json
import shutil
import subprocess
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent


@pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")
def test_dev_prefix_keeps_cache_and_counter_apart() -> None:
    result = subprocess.run(
        ["node", str(HERE / "rewrite_worker_keys.mjs")], capture_output=True, text=True, timeout=60
    )
    assert result.returncode == 0, result.stderr
    out = json.loads(result.stdout.strip().splitlines()[-1])
    production = [k for k in out["keys"] if not k.startswith("dev/")]
    dev = [k for k in out["keys"] if k.startswith("dev/")]
    # One cache entry and one daily counter each.
    assert len(production) == len(dev) == 2, out["keys"]
    assert sorted("dev/" + k for k in production) == sorted(dev)
    # Production misses, the dev preview misses too (it cannot see production's entry),
    # then production hits its own entry.
    assert out["cached"] == [False, False, True]

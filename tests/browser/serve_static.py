"""Build and serve an isolated static app from tracked public fixtures, never local corpora."""

import functools
import json
import os
import shutil
import signal
import subprocess
import threading
import time
from contextlib import suppress
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[2]

# A BYOK provider stand-in for tests/browser/ai.spec.js. The app sends the user's prompt to the
# endpoint configured in its settings; here that is this server, so no key or text leaves the
# test, and the browser never needs a cross-origin call that Playwright would have to intercept
# (WebKit did not route those requests). The spec picks the answer with GET /byok-mock/mode/<m>
# and reads what the app sent with GET /byok-mock/calls; POST /byok-mock/v1/chat/completions
# records the call and answers in the chosen mode. Nothing here is served to the public app.
BYOK_MOCK = {"mode": "ok", "calls": [], "lock": threading.Lock()}
BYOK_DRAFT = (
    "Conform [1], legea reglementează realizarea achizițiilor publice. "
    "Termenul rămâne de verificat în textul sursă [1]."
)
BYOK_ANSWERS = {
    "ok": (200, {"choices": [{"message": {"content": BYOK_DRAFT}}]}),
    "bad_key": (401, {"error": {"message": "Incorrect API key provided"}}),
    "quota": (429, {"error": {"message": "Rate limit reached"}}),
}


class StaticHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if path.startswith("/nested/"):
            path = path.removeprefix("/nested")
        return super().translate_path(path)

    def _json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/byok-mock/mode/"):
            mode = self.path.rsplit("/", 1)[1]
            with BYOK_MOCK["lock"]:
                BYOK_MOCK["mode"] = mode
                BYOK_MOCK["calls"].clear()
            return self._json(200, {"mode": mode})
        if self.path == "/byok-mock/calls":
            with BYOK_MOCK["lock"]:
                return self._json(200, list(BYOK_MOCK["calls"]))
        return super().do_GET()

    def do_POST(self):
        if not self.path.startswith("/byok-mock/"):
            return self.send_error(501, "Unsupported method ('POST')")
        raw = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        try:
            body = json.loads(raw.decode("utf-8")) if raw else None
        except ValueError:
            body = raw.decode("utf-8", "replace")
        with BYOK_MOCK["lock"]:
            mode = BYOK_MOCK["mode"]
            headers = {k.lower(): v for k, v in self.headers.items()}
            BYOK_MOCK["calls"].append({"path": self.path, "headers": headers, "body": body})
        if mode == "timeout":
            time.sleep(20)  # longer than the 5 s the spec configures; the app gives up first
            return self._json(504, {"error": {"message": "late"}})
        status, payload = BYOK_ANSWERS.get(mode, BYOK_ANSWERS["ok"])
        return self._json(status, payload)

    def log_message(self, format, *args):  # noqa: A002 - signature fixed by the base class
        if "/byok-mock/" not in str(args[0] if args else ""):
            super().log_message(format, *args)


def stop(_signal, _frame):
    raise KeyboardInterrupt


signal.signal(signal.SIGTERM, stop)
with TemporaryDirectory(prefix="legislativ-static-browser-") as directory:
    root = Path(directory)
    tracked = (
        subprocess.check_output(["git", "-c", f"safe.directory={ROOT}", "ls-files", "-z"], cwd=ROOT)
        .decode()
        .split("\0")
    )
    for name in filter(None, tracked):
        source = ROOT / name
        if source.is_file():
            destination = root / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
    (root / "node_modules").symlink_to(ROOT / "node_modules", target_is_directory=True)
    for command in [
        ["python3", "-m", "scripts.construieste_web", "--sursa", "fixturi"],
        [
            "python3",
            "-m",
            "scripts.export_cautare",
            "--db",
            "web/data/corpus.db",
            "--tinta",
            "acte.jsonl",
        ],
        ["node", "infra/pagefind.mjs", "acte.jsonl", "web/pagefind"],
    ]:
        subprocess.run(command, cwd=root, check=True)
    handler = functools.partial(StaticHandler, directory=root / "web")
    port = int(os.environ.get("BROWSER_STATIC_PORT", "5191"))
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as server, suppress(KeyboardInterrupt):
        server.serve_forever()

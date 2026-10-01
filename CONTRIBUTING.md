# Contributing

Install Python 3.12+, uv, and Poppler (`pdftotext`, e.g. the `poppler-utils`
package on Ubuntu). From the repository root:

```sh
uv sync --all-groups
uv run python scripts/check_offline.py
```

The bounded entrypoint runs existing parser, reference, gold-set and web-build
regressions. It uses committed `sources/*.html.gz`, `tests/fixtures/` and temporary
SQLite data. It does not collect legislation, download a corpus, or require secrets.
Dependencies must be installed first; the fixture tests then run offline.

For a local fixture preview, `uv run python -m scripts.construieste_web --sursa fixturi`
builds `web/` using four committed acts. Generated output is not a production corpus;
review `git status` and do not commit rebuilt web/data artifacts with a logic change.
Browser execution itself can require external runtime assets.

Before submitting, run the existing correctness checks:

```sh
uv run ruff check scripts tests
uv run ruff format --check scripts tests
PYTHONHASHSEED=0 uv run pytest -q
uv run python -m scripts.etalon
uv run python -m scripts.etalon_real
uv run python -m scripts.etalon_precizie
```

For UI work, install Node.js/npm, run `npm ci --ignore-scripts`, then
`npx playwright install --with-deps`. Run `npm run test:browser` and
`npm run test:browser:static`; see [browser setup](docs/BROWSER_BASELINE.md).
The CI browser job also runs the dataset-control and local-update Node harnesses.
The runtime job tests and builds the local package on Linux, Windows and macOS.
`CI` calls these existing jobs once; `verify` depends on Python lint/tests/gold sets,
browser checks and the complete runtime matrix. A skipped dependency is a failure.
The offline subset is a quick local path, not a replacement for these checks.

## Changes and review

Start from current `origin/dev`. Maintainers use `wt new <name> origin/dev` in
this repo, placing worktrees at `<repo>/.worktrees/<name>`; remove with `wt rm`
or `wt gc`. Without `wt`, use a separate standard clone and
`git switch -c <name> origin/dev`. Use `feat/`, `fix/`, `chore/`, `docs/`, `sec/`
or `adr/` branch prefixes. Never mix changes from another repository.

An issue or PR should state the observable problem, bounded scope, acceptance
criteria, affected domain invariants, and the commands/results that demonstrate
success. Add a small regression fixture for changed behavior, including provenance
for real source excerpts; disclose untested paths and data coverage limits.
Use Conventional Commits with an imperative lower-case subject, no trailing period,
and at most 72 characters. Link issues with `Refs: #N` or `Closes: #N` trailers.
Open PRs against `dev`; agents never merge or deploy. Keep the existing license.

No private handbook, 1Password, production credentials, or production collection is
needed for contributor verification. Publishing and collection are maintainer tasks,
not setup steps. Do not run deployment, ingest or release workflows for a code PR.

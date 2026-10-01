# Contributor domain map

## Extraction and analysis (`scripts/`, `sources/`, `tests/`)

The deterministic engines use the Python standard library. Preserve article and
provision identity, source locators and evidence with each finding. A candidate
contradiction is not a legal conclusion; absent source coverage is not proof that
there is no conflict. Keep Romanian diacritics and source structure intact.
Gold-set recall and jurist-reviewed precision are different measurements: missing
precision verdicts must remain visibly unmeasured. See [consolidation](CONSOLIDARE.md),
[provision identity](PROVISION_IDENTITY.md) and [source inventory](INVENTAR_SURSE.md).

`sources/*.html.gz` are committed real-source fixtures, not a complete corpus.
`tests/fixtures/` and inline synthetic records support bounded regressions.
`python scripts/check_offline.py` (inside the installed environment) selects parser,
reference, gold-set and web-build tests; temporary SQLite fixtures exercise derived
output without a production database. Extend those tests rather than collecting more
laws just to demonstrate a code change.

## Storage and generated output (`schema/`, `web/`, `app/`)

Edit Python source, schemas and `app/` rather than generated `web/` copies.
Corpus databases, graphs, shards and browser bundles are derived artifacts;
keep schema migration and source/generated boundaries explicit. The four-act
`--sursa fixturi` build cannot establish national coverage. The constitutional
register must not silently lose decisions merely because a browser corpus is sliced.
See [dataset releases](DATASET_RELEASE.md) and [local-first design](LOCAL_FIRST.md).

## Privacy and operations (`infra/`, workflows)

Deterministic drafting stays local. Network AI rewriting is explicit BYOK opt-in;
never introduce draft uploads into ordinary verification. Preserve public/private
dataset separation and checksum/manifest validation; see
[private data boundaries](private-data-boundaries.md). Collection, publication,
Cloudflare and Pages operations are outside contributor fixture checks. Agents must
never merge or deploy, regardless of credential privileges.

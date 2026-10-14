# Production readiness

Status date: 2026-10-14. Scope: the public browser app (`app/index.html`, built into `web/` by
`scripts/construieste_web.py`) and the workflows that publish it. Each item lists its acceptance
criteria and the test that proves it. States: **todo**, **done**, **blocked**, **needs human**.

The product rules in [`UX_UI_BIBLE.md`](../UX_UI_BIBLE.md) and
[`PROJECT_FINISH_BIBLE.md`](../PROJECT_FINISH_BIBLE.md) still apply: no verdict language, local
first, no hidden network calls, no new third-party services.

## Theme A: baseline

### LL-3 Page metadata and skip link — todo

- Given the built page, when a crawler or a link preview reads `<head>`, then it finds a
  `meta name="description"`, `og:title`, `og:description`, `og:type`, `og:url` and a
  `link rel="canonical"` pointing to
  `https://projects.cristian-nichifor.com/legislation-linter/`.
- Given a keyboard user on a fresh load, when they press Tab once, then focus lands on
  `a.skip-link[href="#main"]`, and following it moves focus to the `#main` landmark.

Test: `tests/browser/static.spec.js` › "metadata, canonical and skip link" (all three engines).

### LL-7 Privacy page — todo

- Given the built site, when a visitor opens `confidentialitate.html` (linked from the footer),
  then it states that the app is local first, that drafts and dossiers stay in the browser, that
  BYOK keys stay in the browser session and go only to the provider the user picks, that there are
  no cookies and no analytics, and it names every AI endpoint the page's CSP `connect-src` allows.
- The operator is Cristian Nichifor; the contact is the repository's GitHub issues URL.

Tests: `tests/test_confidentialitate.py` (every AI origin in `connect-src` is named on the page;
the page is copied into `web/`; operator and contact present) and `tests/browser/static.spec.js`
› "privacy page is linked and reachable".

### LL-A11Y Automated accessibility check — todo

- Given the built page in Chromium, when axe-core runs on the default view, then it reports
  0 violations of impact `serious` or `critical`.

Test: `tests/browser/static.spec.js` › "axe: no serious or critical violations" (Chromium; axe is
injected from the `axe-core` dev dependency, not a CDN).

## Theme B: UX cleanup

### LL-5 No internal terms in primary copy — todo

- Given the default view, when a user reads the visible text, then none of the pipeline terms the
  bible glossary bans from primary copy appear (`rebuild`, `reindex`, `pack`, `gate`, `workbench`,
  `pipeline`, `shard`, `law-as-code` in labels, English internal labels), and the duplicate
  "Principii de lucru" and "Flux principal" panels that restate the navigation are gone from the
  normal path.

Test: `tests/browser/static.spec.js` › "primary copy uses no internal terms" (text denylist over
visible text of the header, navigation and default pane).

### LL-4 Matrix as the default workspace — todo

- Given a first load with no saved state, when the page settles, then the matrix pane is the
  selected tab and its rows are grouped by legal domain.
- Given the matrix, when the user sends a cell to a dossier, then a draft note opens in the matrix
  view (the selected tab stays `Matrice`).

Test: `tests/browser/static.spec.js` › "matrix is the default workspace and opens drafts in place".

## Theme C: data freshness

### LL-FRESH Dataset as-of date and corpus size — todo

- Given a built dataset, when the header loads, then it shows the dataset date ("date la zi pe
  YYYY-MM-DD") and the number of acts, both from `data/manifest.json` (`data_set`, `acte`).
- Given a dataset dated more than 30 days before today, then the header shows a visible warning
  that the data may be stale; given a dataset 30 days old or newer, no warning.
- The build stamps `data_set`: the date in the `--depozit` prefix, else the release date in
  `dataset-release.json`, else the fixture capture date for `--sursa fixturi`.

Tests: `tests/test_construieste_web.py` › `test_manifest_poarta_data_setului` (stamping rules),
`tests/browser/static.spec.js` › "dataset date and stale warning" (fixtures are older than 30
days), `tests/browser/baseline.spec.js` › fresh dataset shows no warning.

## Theme D: English locale

### LL-10 English UI chrome — todo

- Given the default load, then the page is Romanian and `<html lang="ro">`.
- Given the language toggle, when the user picks English, then the header, tabs, navigation and
  footer switch to English, `<html lang="en">` follows, and the choice survives a reload.
  Legal text and findings stay in Romanian.

Test: `tests/browser/static.spec.js` › "english chrome toggle syncs html lang". English strings
are marked *needs human review*.

## Workflow-only (maintainer applies the diff)

### LL-1 Data store prefix not hardcoded — needs human

- Given `pages.yml` and `deploy-pages-cloudflare.yml`, then `--depozit` is derived from the newest
  `date-*` release, not a hardcoded `https://data.cristian-nichifor.com/YYYY-MM-DD`.

Test: `tests/test_workflows_depozit.py` (xfail until the maintainer applies the diff in the PR
body; the app has no `workflows` permission).

### LL-2 Collect job on a self-hosted runner — needs human

- `collect.yml` runs on `self-hosted`, because the portal refuses GitHub-hosted runner IPs.
  Needs a registered runner on an accepted IP first. Diff in the PR body.

## Needs human

- Self-hosted runner on an IP legislatie.just.ro accepts (LL-2).
- Data host serving the dated prefix (LL-1: `data.cristian-nichifor.com/2026-09-08` returns 404).
- API worker route for the rewrite endpoint (LL-8).
- Civic UI upgrade waits for the civic-ui 0.8 release.
- Review of the English strings (LL-10) and of the privacy page wording (LL-7).

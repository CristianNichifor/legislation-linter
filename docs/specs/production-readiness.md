# Production readiness

Status date: 2026-10-14. Scope: the public browser app (`app/index.html`, built into `web/` by
`scripts/construieste_web.py`) and the workflows that publish it. Each item lists its acceptance
criteria and the test that proves it. States: **todo**, **done**, **blocked**, **needs human**.

The product rules in [`UX_UI_BIBLE.md`](../UX_UI_BIBLE.md) and
[`PROJECT_FINISH_BIBLE.md`](../PROJECT_FINISH_BIBLE.md) still apply: no verdict language, local
first, no hidden network calls, no new third-party services.

## Theme A: baseline

### LL-3 Page metadata and skip link — done

- Given the built page, when a crawler or a link preview reads `<head>`, then it finds a
  `meta name="description"`, `og:title`, `og:description`, `og:type`, `og:url` and a
  `link rel="canonical"` pointing to
  `https://projects.cristian-nichifor.com/legislation-linter/`.
- Given a keyboard user on a fresh load, when they press Tab once, then focus lands on
  `a.skip-link[href="#main"]`, and following it moves focus to the `#main` landmark.

Test: `tests/browser/static.spec.js` › "metadata, canonical and skip link" (all three engines).

### LL-7 Privacy page — done

- Given the built site, when a visitor opens `confidentialitate.html` (linked from the footer),
  then it states that the app is local first, that drafts and dossiers stay in the browser, that
  BYOK keys stay in the browser session and go only to the provider the user picks, that there are
  no cookies and no analytics, and it names every AI endpoint the page's CSP `connect-src` allows.
- The operator is Cristian Nichifor; the contact is the repository's GitHub issues URL.

Tests: `tests/test_confidentialitate.py` (every AI origin in `connect-src` is named on the page;
the page is copied into `web/`; operator and contact present) and `tests/browser/static.spec.js`
› "privacy page is linked and reachable".

### LL-A11Y Automated accessibility check — done

- Given the built page in Chromium, when axe-core runs on the default view, then it reports
  0 violations of impact `serious` or `critical`.

Test: `tests/browser/static.spec.js` › "axe: no serious or critical violations" (Chromium; axe is
injected from the `axe-core` dev dependency, not a CDN).

## Theme B: UX cleanup

### LL-5 No internal terms in primary copy — done

- Given the default view, when a user reads the visible text, then none of the pipeline terms the
  bible glossary bans from primary copy appear (`rebuild`, `reindex`, `pack`, `gate`, `workbench`,
  `pipeline`, `shard`, `law-as-code` in labels, English internal labels), and the duplicate
  "Principii de lucru" and "Flux principal" panels that restate the navigation are gone from the
  normal path.

Test: `tests/browser/static.spec.js` › "primary copy uses no internal terms" (text denylist over
the visible text of the default view once the matrix workspace has rendered).

Done so far: the principles panel is gone, the daily flow is collapsed, the online data panel has
its diacritics back, and the default view's matrix copy no longer shows contract ids, snake_case
states, "law-as-code", "tracker" or "draft". Deeper panels (cockpit, tracker review, rule drafts)
still use some machine terms; LL-NAV below finishes the navigation part.

### LL-4 Matrix as the default workspace — done

- Given a first load with no saved state, when the page settles, then the matrix pane is the
  selected tab and its rows are grouped by legal domain.
- Given the matrix, when the user sends a cell to a dossier, then a draft note opens in the matrix
  view (the selected tab stays `Matrice`).

Test: `tests/browser/static.spec.js` › "matrix is the default workspace and opens drafts in place".

### LL-NAV One navigation and a thin breadcrumb — done

Coordinator review, 2026-10-14.

- Given the default load, then there is one navigation: Start · Verifică · Caută · Matrice ·
  Dosare · Surse · Redactare · Setări, with the remaining tools (Consolidat, Conexiuni,
  Parlamentari, Cine face legea, Drept UE, Supraveghere) one click away under "Mai multe".
- The "Flux principal" strip, the second "workflow" navigation and the collapsed "Flux zilnic"
  are replaced by a one-line breadcrumb that says where the user is (pane, dossier, step).
- The active tab is in the URL hash (`#matrice`, `#verifica`, ...); loading a URL with a hash
  opens that tab, and the back button returns to the previous tab.

Test: `tests/browser/static.spec.js` › "one navigation, breadcrumb and hash routing".

### LL-ENGINE The check never hangs — done

- Given the in-browser engine has not answered within 20 s, when the user runs a check, then
  the result area says "Motorul nu a pornit — reîncearcă" with a retry, instead of "se
  verifică…" forever; the header stops saying "se încarcă…" and states the failure.
- While a check runs, the result area shows staged progress (pornesc motorul → verific textul)
  and a "Anulează" button that stops waiting.

Test: `tests/browser/static.spec.js` › "engine timeout, progress and cancel" (the CDN runtime is
blocked so the engine never starts).

### LL-FORM Labels, targets and check-first layout — done

- Every visible input, select and textarea has an accessible name (axe `label` rule passes).
- Interactive targets on the default view are at least 24×24 px (WCAG 2.5.8).
- On the Verifică tab the draft textarea and the Verifică button are the first content under the
  navigation, above the fold at 1440×900.

Test: `tests/browser/static.spec.js` › "form labels, target size and check-first layout" (axe
`label`, `select-name`, `button-name`, `link-name`, `target-size` over every pane, plus a check
that no visible text field renders as a raw browser widget). The matrix now leads its pane, and
the source coverage notice is shown once.

## Theme C: data freshness

### LL-FRESH Dataset as-of date and corpus size — done

- Given a built dataset, when the header loads, then it shows the dataset date ("date la zi pe
  YYYY-MM-DD") and the number of acts, both from `data/manifest.json` (`data_set`, `acte`).
- Given a dataset dated more than 30 days before today, then the header shows a visible warning
  that the data may be stale; given a dataset 30 days old or newer, no warning.
- The build stamps `data_set`: the date in the `--depozit` prefix, else the release date in
  `dataset-release.json`, else the fixture capture date for `--sursa fixturi`.

Tests: `tests/test_construieste_web.py` › `test_manifest_poarta_data_setului` (stamping rules),
`tests/test_server.py` › `test_rezumat_carries_the_dataset_date_from_the_manifest`,
`tests/test_dossier_ui.py` › `test_dataset_freshness_warns_after_thirty_days` (30 days: no
warning, 31: warning), `tests/browser/static.spec.js` › "dataset date and stale warning"
(fixtures are older than 30 days).

## Theme D: English locale

### LL-10 English UI chrome — done

- Given the default load, then the page is Romanian and `<html lang="ro">`.
- Given the language toggle, when the user picks English, then the header, tabs, navigation and
  footer switch to English, `<html lang="en">` follows, and the choice survives a reload.
  Legal text and findings stay in Romanian.

Test: `tests/browser/static.spec.js` › "english chrome toggle syncs html lang". The toggle sits
at the end of the navigation and names the other language in that language. The main region and
the data panels keep `lang="ro"`. English strings are marked *needs human review*.

## Theme E: UX guidelines

### LL-UXG UX guidelines with a conformance checklist — done

- Given `docs/ux-guidelines.md`, then it refines `UX_UI_BIBLE.md`, `PROJECT_FINISH_BIBLE.md`,
  `DESIGN.md` and `UX_ACCEPTANCE.md` without contradicting them (the bible wins on conflict),
  links all four, and states users and top tasks, page anatomy, content, data-viz, state,
  mobile and accessibility rules, the status vocabulary, a conformance checklist mapped to
  tests and a deviations backlog (D-1…D-8).
- Given the bible and the README docs index, then both link the guideline.
- Given the checklist, when a test file or a quoted browser test title it names is renamed or
  removed, then `tests/test_ux_guidelines.py` fails.
- Agent-written Romanian in the guideline (status vocabulary, no-verdict phrasing): needs
  human review.

Test: `tests/test_ux_guidelines.py`.

### LL-UXG-2 Footer links and a Romanian dataset date — done

- Given the default view, then the footer links the privacy page, the repository (source code
  and method) and its GitHub issues (contact).
- Given a built dataset, then the header reads „date la zi pe zz.ll.aaaa” (DESIGN.md › Dates);
  the manifest keeps ISO.
- Closes deviations D-2 and D-3 in `docs/ux-guidelines.md`. „Cod sursă și metodă” and its
  English label are agent-written: needs human review.

Test: `tests/browser/static.spec.js` › "footer links source code and contact" and
"dataset date and stale warning".

## Workflow-only (maintainer applies the diff)

### LL-1 Data store prefix not hardcoded — needs human

- Given `pages.yml` and `deploy-pages-cloudflare.yml`, then `--depozit` is derived from the newest
  `date-*` release, not a hardcoded `https://data.cristian-nichifor.com/YYYY-MM-DD`.

Test: `tests/test_workflows_depozit.py` (strict xfail until the maintainer applies the diff in the
PR body; agent pull requests do not change workflows). Without a release the build no longer
points the fixtures demo at the data store.

### LL-2 Collect job on a self-hosted runner — needs human

- `collect.yml` runs on `self-hosted`, because the portal refuses GitHub-hosted runner IPs.
  Needs a registered runner on an accepted IP first. Diff in the PR body.

## Needs human

- Self-hosted runner on an IP legislatie.just.ro accepts (LL-2).
- Data host serving the dated prefix (LL-1: `data.cristian-nichifor.com/2026-09-08` returns 404).
- API worker route for the rewrite endpoint (LL-8).
- Civic UI upgrade waits for the civic-ui 0.8 release.
- Review of the English strings (LL-10) and of the privacy page wording (LL-7).
- Review of the Romanian copy in the design mockups and the mockup screenshots (LL-DS); hub URL and product name (D-1).

## Theme F: design screens

### LL-DS Target-state screen designs — done (docs)

- Given `docs/design/README.md`, then it indexes five mockups in `docs/design/screens/`
  (Start, Verifică, Matrice, Dosar, Redactare asistată) and maps each to the user task, the
  guideline sections, what changes against the live site and implementation notes.
- Given a mockup, then it is self-contained (inline CSS with the DESIGN.md token values, no
  scripts, no external requests), shows a desktop and a 390 px layout, uses Romanian with
  comma-below ș ț, and shows loading staged, empty, error with retry and the status badge.
- Given data in a mockup, then it comes from `data/real_reviewable_finding.json` or
  `data/exemplu.json`, or is shown as „—”.
- Before screenshots of the live Start screen at 1440 and 390 px are committed; mockup
  screenshots are deferred (no local browser during the fleet run): needs human or a later
  session.
- Agent-written Romanian copy in the mockups (consent card, states, filter labels, family bar
  „Toate proiectele”, „Despre și metodă”): needs human review. The hub URL and the product
  name (D-1) are a human decision.

Test: `tests/test_design_screens.py` (to add with the implementation): every file named in the
README exists, has no `ş`/`ţ`, no `<script>` and no `http` request in `src=`/`href` of
stylesheets or scripts. Acceptance criteria 1–7 in the README become browser tests when the
screens are implemented.

### LL-DS-2 Verifică: staged progress and a timeout that keeps the text — done

- Given a running check, then `#lint-out` holds an `aria-live="polite"` section with a
  `role="progressbar"` (0–3) and an ordered list of three named steps — Pornesc motorul,
  Verific textul, Caut actele atinse — the current one marked, a cancel button and the sentence
  „Dacă durează peste 20 s, oprim singuri și îți spunem ce s-a întâmplat.”
- Given the engine has answered, when the check itself takes over 20 s, then the result area says
  „Verificarea a durat peste 20 s și a fost oprită. Textul tău e păstrat.” with a retry; a check
  still waiting on a starting engine keeps LL-ENGINE's message.
- Given the findings have rendered, then a `role="status"` line „Caut actele atinse…” stays above
  them until the reach and EU lookups have both answered.

Test: `tests/browser/static.spec.js` › "engine timeout, progress and cancel" (steps, progress bar,
live region).

# UX and UI guidelines — Legislativ

Short, enforceable rules for `app/` and the published pages. This file refines, and does
not replace:

- [UX_UI_BIBLE.md](UX_UI_BIBLE.md) — the v1 UX contract: target UX, phases UX-1…UX-9,
  no-verdict and privacy rules. Where the two differ, the bible wins and this file is wrong.
- [PROJECT_FINISH_BIBLE.md](PROJECT_FINISH_BIBLE.md) — the product sequence and the
  definition of done.
- [DESIGN.md](DESIGN.md) — tokens, contrast, type, dates, graph palette.
- [UX_ACCEPTANCE.md](UX_ACCEPTANCE.md) — the static copy gate.
- The fleet guideline in civic-ui (`docs/ux-guidelines.md` on civic-ui `dev`), for what
  this file leaves out.

The interface language is Romanian; this document is in English like the other docs.
Romanian strings quoted here that are not already in the app are agent-written and need
human review.

## 1. Users and top tasks

| User | Top task |
|---|---|
| Legislative worker (parliament, ministry, NGO) | Paste a draft, see which acts and articles it touches, and what is missing or conflicting |
| Researcher, journalist | Find what the law says on a topic, with the exact source and version |
| Reviewer of a dossier | Open each warning and see its source, quote, hash, uncertainty and review state |

**The one job of the first screen:** start a check from real text. The H1 („Ce spune legea
despre proiectul tău”) states it; the Verifică textarea and button are the first content
under the navigation, and the matrix is the default workspace for "what is wrong or missing
in this area" (LL-4, LL-FORM).

## 2. Page anatomy

1. Family bar back to the hub. *Missing — D-1.*
2. Skip link (`a.skip-link` → `#main`), then H1 and one line of purpose.
3. Provenance line in the header (`#stat`): dataset date and act count from
   `data/manifest.json`, with a stale warning after 30 days (LL-FRESH).
4. One navigation: Start · Verifică · Caută · Matrice · Dosare · Surse · Redactare · Setări,
   the rest under „Mai multe”; a one-line breadcrumb; the tab in the URL hash (LL-NAV).
5. The pane's primary task first, then evidence, then details behind `<details>`.
6. Footer: privacy, source code and method (the repository README), contact (GitHub issues).

## 3. Content rules

- Romanian with comma-below ș ț (never cedilla ş ţ); legal text and findings stay Romanian
  in the English chrome (LL-10).
- Verbs a researcher uses, not pipeline words (bible glossary): „actualizează datele”, not
  rebuild; „caută”, not index. Banned in primary copy: `rebuild`, `reindex`, `reload`,
  `index`, `cache`, `manifest`, `shard`, `pack`, `gate`, `workbench`, `pipeline`,
  `law-as-code`, `tracker`, `draft`, snake_case states, contract ids. Technical provenance
  terms (`Source hash`, `stale`) only inside details/raw/debug areas.
- No verdicts: never „legal”, „ilegal”, „conform”, „constituțional”, „fără conflict”.
  Say „problemă candidat”, „dovadă lipsă”, „sursa s-a schimbat”, „posibil conflict”,
  „necesită verificare umană”.
- Absence of data is shown as a coverage state, never as absence of a problem.
- Dates: `zz.ll.aaaa` for readers (DESIGN.md › Dates), ISO only on the wire.
- Numbers: `ro-RO` grouping (`toLocaleString("ro")`).
- Assisted or AI text is labelled unreviewed until a human accepts it (UX-6, UX-7).

## 4. Data visualisation

- The link graph uses `PALETA` (DESIGN.md): one lightness, no hue near the brand red,
  because a red ring means *abrogat*. State is never colour alone: a ring plus a label.
- The matrix and every list are the text alternative to the graph.
- One y axis per chart, labels on bars, source and as-of on every chart (fleet rules).
- Demo or fixture data is badged where it appears. *No badge on the fixtures demo — D-4.*

## 5. States

- Loading: staged progress for anything over 2 s (pornesc motorul → verific textul) with
  „Anulează” (LL-ENGINE).
- Error: plain Romanian and a retry („Motorul nu a pornit — reîncearcă”); the header states
  the failure and recovers if the engine starts late.
- Empty: distinguish "nothing found in measured coverage" from "coverage missing or stale"
  (UX-2).
- External actions (AI, MCP): consent before the call, destination, privacy and cost shown;
  a refused or failed call keeps local work (UX-7, UX-8, LL-9).

## 6. Mobile, accessibility, input

- Works at 390 px without horizontal page scroll. *The live review flagged the phone tab
  list — D-5.*
- Targets at least 24 × 24 px (WCAG 2.5.8), 44 px preferred for primary actions.
- WCAG 2.1 AA; axe 0 serious or critical on every pane; every field has an accessible name.
- Keyboard: skip link, tabs, hash routing and back button; visible focus.
- `prefers-reduced-motion` stops the spinner and smooth scroll. Forced-colours mode keeps
  borders, focus rings and graph state rings. *Not tested — D-6.*

## 7. Status vocabulary

Exactly one of: **Date reale** (Live data) · **Date demonstrative** (Demo data) ·
**Prototip** (Prototype) · **Arhivat** (Archived). The public site built from fixtures is
„Date demonstrative”; a build from a dated release is „Date reale” with its date.

## 8. Conformance checklist

| Rule | Test |
|---|---|
| Skip link, metadata, canonical | `tests/browser/static.spec.js` › "metadata, canonical and skip link" |
| Privacy page linked | `tests/browser/static.spec.js` › "privacy page is linked and reachable", `tests/test_confidentialitate.py` |
| axe 0 serious or critical | `tests/browser/static.spec.js` › "axe: no serious or critical violations" |
| No internal terms in primary copy | `tests/browser/static.spec.js` › "primary copy uses no internal terms", `tests/test_ux_acceptance.py` |
| Matrix is the default workspace | `tests/browser/static.spec.js` › "matrix is the default workspace and opens drafts in place" |
| One navigation, hash routing | `tests/browser/static.spec.js` › "one navigation, breadcrumb and hash routing" |
| Engine never hangs; retry and cancel | `tests/browser/static.spec.js` › "engine timeout, progress and cancel" |
| Labels, 24 px targets, check-first layout | `tests/browser/static.spec.js` › "form labels, target size and check-first layout" |
| Dataset date and stale warning | `tests/browser/static.spec.js` › "dataset date and stale warning", `tests/test_dossier_ui.py` |
| Footer links source code and contact | `tests/browser/static.spec.js` › "footer links source code and contact" |
| English chrome syncs `lang` | `tests/browser/static.spec.js` › "english chrome toggle syncs html lang" |
| Phone and desktop baseline | `tests/browser/baseline.spec.js` |
| Reduced motion stops the spinner; forced colours keep the tab rail, focus and borders | `tests/browser/baseline.spec.js` › "reduced motion and forced colours keep state visible" |
| Phone tab list is one scrollable row with „Mai multe” in view | `tests/browser/baseline.spec.js` › "phone tab list is one scrollable row" |

`tests/test_ux_guidelines.py` fails when a test file or a test title named here no longer
exists.

## 9. Known deviations backlog

From the live review (2026-10-14) and a code audit of `app/index.html`; screenshots at 1440
and 390 px were not taken in this pass. Items in files other sessions were editing
(`app/index.html` for the AI flow and the English strings) are listed, not fixed.

- **D-1** No family bar back to the hub; the hub says "Legislation Linter", the H1
  „Ce spune legea despre proiectul tău”, the docs "Legislativ" and the repo
  `legislation-linter`. Needs a naming decision and the hub URL.
- ~~**D-2** The footer links only the privacy page.~~ Fixed by LL-UXG-2.
- ~~**D-3** The header dataset date is ISO.~~ Fixed by LL-UXG-2.
- **D-4** No status badge from §7; the fixtures demo is not marked as demo data.
- ~~**D-5** Mobile tab list (live review): eight tabs plus „Mai multe” at 390 px; check with
  a screenshot and make it one scrollable row with a visible scroll cue if it wraps.~~ Fixed in
  `app/civic-ui-adapter.css` (one row, fade cue, overflow menu pinned) with a baseline test.
- ~~**D-6** No forced-colours or reduced-motion test.~~ Fixed: forced-colours rules in
  `app/civic-ui-adapter.css` and a baseline test (spec item deferred to the readiness spec once
  the open pull requests that edit it merge).
- **D-7** Matrix workspace polish (UX-5): filters by domain, source family, lifecycle,
  quality and issue type; row density on a phone.
- **D-8** Deeper panels (cockpit, tracker review, rule drafts) still show machine terms
  (LL-5 note).

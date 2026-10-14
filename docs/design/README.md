# Design screens — target state

Static mockups of the five screens that matter most, for implementation sessions to build
from. Six mockups; they follow [ux-guidelines.md](../ux-guidelines.md) (which refines
[UX_UI_BIBLE.md](../UX_UI_BIBLE.md); the bible wins on conflict), the tokens in
[DESIGN.md](../DESIGN.md) and the fleet guideline in civic-ui `docs/ux-guidelines.md`.

Each file in `screens/` is self-contained: inline CSS copying the DESIGN.md token values
(light, dark and forced-colours), no scripts, no external requests. The desktop layout is the
default; the 390 px layout comes from one media query at 900 px, so open the file and narrow
the window to see both. Every mockup ends with a "Stări" strip: loading staged, empty, error
with retry, and the demo badge in the header.

Before screenshots of the live site (2026-10-14): `screens/00-live-start-1440.png` and
`screens/00-live-start-390.png`. Screenshots of the mockups were not rendered in this pass
(no local browser allowed during the fleet run); an implementation session renders them with
`npx playwright screenshot --full-page --viewport-size=1440,900 <file> <file>-1440.png` and
`--viewport-size=390,844` once memory allows.

Copy is Romanian with comma-below ș ț. Data comes from the repo: the finding, quote, source
URL and review date are from `data/real_reviewable_finding.json`; the act numbers from
`data/exemplu.json`. Anything not in the repo is shown as „—” with a note of where it comes
from (the manifest). All Romanian strings not already in `app/index.html` are agent-written
and need human review (spec LL-DS).

## Index

| Screen | User task | Guideline sections | What changes vs today | Implementation notes |
|---|---|---|---|---|
| [01 Start](screens/01-start.html) | Paste a draft and start a check | §1 one job, §2 anatomy, §7 status | Family bar back to the hub (D-1); „Date demonstrative” badge and a „Date: sursă · date la zi pe zz.ll.aaaa” provenance line (D-4); the textarea and „Verifică” are the first content; a data-state card replaces the spinner-only `#stat` | Badge text from the build (`fixtures` → demo, dated release → „Date reale”); the hub URL and the product name are a human decision (D-1) |
| [02 Verifică](screens/02-verifica.html) | Watch a check run and read the result | §5 states, §3 no verdicts | Staged progress with three named steps, cancel, a 20 s timeout message that keeps the text, result summary with four shape+colour severities, each finding with source, quote and review state | Progress is `role=progressbar` plus a list; `aria-live=polite` region; result never says legal/ilegal |
| [03 Matrice](screens/03-matrice.html) | See what is missing or conflicting in a domain | §4 viz, §5 empty states, D-7 | Filter rail (domain, source family, lifecycle, issue type, quality); table as the text alternative to the graph; legend with shapes; two distinct empty states (coverage missing vs nothing found) | At 390 px the rail stacks above the table and rows become two-column cards (`table.resp`); the tab row scrolls with a fade cue (D-5) |
| [04 Dosar](screens/04-dosar.html) | Review one finding and record a state | UX-6, §2 details last | Source, quote, uncertainty, reviewer note and hash in that order; hash under `<details>`; review state as radios with a local-save note; „sursa s-a schimbat” error with a reconfirm action | Save is local; export JSON keeps the audit trail |
| [05 Redactare asistată](screens/05-redactare-ai.html) | Ask for a rewrite with consent and keep an audit trail | UX-7, UX-8, LL-9, §5 external actions | Consent card before the call: destination, what leaves the device, cost, privacy links; checkbox gates the button; result badged „Text asistat, neverificat” until accepted; audit log table; refused/failed call keeps local work | No-key state links to Setări; 60 s timeout with cancel |
| [06 Setări](screens/06-setari.html) | Update the data, choose local or own-key assisted text, theme and language | §5 states, §7 status, UX-7, LL-9 | Data card with status badge, date and „Actualizează datele” with staged progress and the public/private separation note; local vs own-key mode as radios with the key kept in session only, endpoint and wait time; connection test; theme and language selects; privacy actions | Key never persisted or exported; „Șterge datele locale” asks for confirmation and leaves public data alone; update failure keeps the old dataset in use |

## Shared rules applied

- Family bar (navy, 32 px, ≥24 px targets) → H1 → one line of purpose → provenance line with
  the status badge → one navigation row with the language toggle at the end → breadcrumb.
- Status vocabulary: exactly one of Date reale · Date demonstrative · Prototip · Arhivat.
- Severity is never colour alone: a shape (●, □, ◆) and a word accompany the hue; the brand
  red appears only on the 3 px rail, text uses `--blocking`.
- Contrast AA on every token pair (DESIGN.md › Contrast); focus rings 3 px `--accent`.
- Targets ≥ 44 px for primary actions, ≥ 24 px for everything else.
- No horizontal page scroll at 390 px; the only horizontally scrolling element is the tab row,
  with a visible fade cue.
- `prefers-reduced-motion` removes animation; `forced-colors` keeps borders and rails.

## Acceptance criteria for implementation

1. Every pane renders the family bar with a link to the hub and the current product name.
2. The header provenance line shows the status badge from §7 and a `zz.ll.aaaa` date.
3. The check shows staged progress after 2 s, a cancel button, and stops itself at 20 s with
   a message that keeps the pasted text.
4. The matrix offers the five filters, a table alternative, and distinguishes "coverage
   missing" from "nothing found".
5. A dossier finding shows source URL, quote, review state and reviewer date; the hash is
   behind `<details>`.
6. The assisted draft flow blocks the call until consent is checked, shows destination and
   what leaves the device, badges the result unreviewed, and logs consent, receipt and
   accept/reject with timestamps.
7. At 390 px no pane has horizontal page scroll; axe reports 0 serious or critical.

"""What to call an act when several acts claim the same name.

A citation key is `tip-numar-an` — `hg-1-2016` — and that is the right shape for a *citation*,
because it is everything a citation says. It is the wrong shape for a *document*, and the corpus
has been paying for the difference: 205 321 documents collapse onto 151 152 keys, and `acte` is
keyed on the citation, so **53 242 documents never got a row at all**. The number is exact and it
is the whole gap: `count(documente) - count(acte) = 53 242`.

They are not duplicates. `hg-1-2016` is claimed by eighteen different acts — a Government decision,
a Senate decision, one of the Chamber, one of the Permanent Electoral Authority, one of the College
of Psychologists, one of the Central Requisitions Commission, and twelve more. Every one is a real
`Hotărâre nr. 1 din 2016`; only the issuer tells them apart. `scrie_act` deletes by id before
inserting, so each collection overwrote the last, and the surviving row was whichever document was
read most recently — with its provisions, since those cascade. Seventeen acts' text went with it.

**The fix keeps the citation key working.** The act whose issuer is the one a citation means keeps
the bare `hg-1-2016`; the others take `hg-1-2016-<emitent>`. Nothing that already points at a bare
key breaks — not the graph's 926 759 edges, not a watchlist, not a shipped shard — because the bare
key still names the act a reader citing `HG nr. 1/2016` meant. What changes is that the other
seventeen stop being deleted.

**Which issuer a bare citation means** is stated per type rather than guessed per act. `Hotărârea
Guvernului` is the Government's; `Legea` is Parliament's; a `decret` is the President's. For the
types many bodies issue under the same word — `ordin`, `decizie` — no issuer is canonical, so the
bare key goes to the earliest published, deterministically, and the reader is told the key is
shared. That is a worse answer than a citation that named its issuer, and it is the honest one:
the citation genuinely does not say.

Measured on the collected corpus: of the 53 552 documents sitting on a numbered key that more than
one document claims, adding the issuer separates 45 236 — 84,5%. The remaining 8 316 share type,
number, year *and* issuer, and they are overwhelmingly `rectificare` and `act-aditional`, whose
number is not their own but that of the act they correct.
"""

from __future__ import annotations

from scripts.identitate_act import EMITENT_CANONIC as EMITENT_CANONIC
from scripts.identitate_act import candidati as candidati
from scripts.identitate_act import id_unic as id_unic
from scripts.identitate_act import rezolva as rezolva


def recupereaza(cale_db, *, limita: int | None = None, log=print) -> dict:
    """Give an act row back to every document that lost one to a namesake.

    The documents are all still there — `documente` is the archive and nothing deletes from it —
    so nothing is refetched. For each document with no act row, one is written from what the
    archive already holds, with the flat text as its single provision. A later enrichment pass
    reads its stored page and replaces that with the article tree, exactly as for any other act.

    Nothing that already exists is touched. An act row is only ever added.
    """
    from scripts import depozit
    from scripts.parsare import Provizie
    from scripts.text import fara_separatoare

    with depozit.deschide(cale_db) as con:
        lipsa = con.execute(
            "SELECT d.id_portal, d.cheie_act, d.tip, d.numar, d.an, d.titlu, d.emitent,"
            "  d.publicat, d.vigoare, d.sursa_url, d.text"
            " FROM documente d LEFT JOIN acte a ON a.id_portal = d.id_portal"
            " WHERE a.id IS NULL" + (f" LIMIT {int(limita)}" if limita else "")
        ).fetchall()
    log(f"{len(lipsa)} documente fără act")

    scrise = 0
    with depozit.deschide(cale_db) as con:
        for i, r in enumerate(lipsa, start=1):
            id_portal, cheie, tip, numar, an, titlu, emitent, publicat, vigoare, url, text = r
            act_id = id_unic(
                con, cheie_citare=cheie, tip=tip, emitent=emitent or "", id_portal=id_portal
            )
            if con.execute("SELECT 1 FROM acte WHERE id = ?", (act_id,)).fetchone():
                # The bare key's holder is this document under another portal id — leave it alone
                # rather than overwrite an act that is not this one.
                continue
            con.execute(
                "INSERT INTO acte (id, cheie_citare, tip, numar, an, titlu, emitent, publicat,"
                " vigoare, republicat_din, id_portal, id_act_portal, sursa_url, citit_la)"
                " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    act_id,
                    cheie,
                    tip,
                    numar,
                    an,
                    titlu,
                    emitent,
                    publicat,
                    vigoare,
                    None,
                    id_portal,
                    "",
                    url,
                    _acum(),
                ),
            )
            # Through the store's own writer, so the search index is maintained the one way it is
            # maintained everywhere: `content='provizii'` keeps no copy of its own.
            depozit.scrie_provizii(con, act_id, [Provizie("text", fara_separatoare(text or ""))])
            scrise += 1
            if i % 2000 == 0:
                con.commit()
                log(f"  {i}/{len(lipsa)} · {scrise} acte recuperate")
        con.commit()
    log(f"gata: {scrise} acte recuperate")
    return {"fara_act": len(lipsa), "recuperate": scrise}


def _acum() -> str:
    from datetime import UTC, datetime

    return datetime.now(UTC).isoformat(timespec="seconds")


def main(argv: list[str] | None = None) -> int:
    import argparse

    p = argparse.ArgumentParser(description="Dă înapoi rândul de act omonimelor care l-au pierdut.")
    p.add_argument("--db", required=True)
    p.add_argument("--limita", type=int)
    a = p.parse_args(argv)
    recupereaza(a.db, limita=a.limita)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

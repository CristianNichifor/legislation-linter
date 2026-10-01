"""Citation identity and resolution, independent of corpus writes and recovery."""

from __future__ import annotations

import sqlite3
from typing import Final

from scripts.text import cheie

# Who a bare citation means, by type. Only the types with one issuer are listed: `Hotărârea
# Guvernului nr. 1/2016` is unambiguous in a way `Hotărârea nr. 1/2016` is not, and the reader
# writing the second one has not said which body they meant.
EMITENT_CANONIC: Final[dict[str, str]] = {
    "lege": "parlamentul",
    "oug": "guvernul",
    "og": "guvernul",
    "hg": "guvernul",
    "decret": "presedintele romaniei",
}


def _canonic(tip: str, emitent: str) -> bool:
    asteptat = EMITENT_CANONIC.get(tip)
    return bool(asteptat) and cheie(emitent or "").startswith(asteptat)


def id_unic(
    con: sqlite3.Connection,
    *,
    cheie_citare: str,
    tip: str,
    emitent: str,
    id_portal: str,
) -> str:
    """The id this document should hold, given what is already in `acte`.

    The bare citation key when this document is entitled to it — because nothing holds it, because
    this document already does, or because its issuer is the canonical one for the type and the
    holder's is not. Otherwise the key with the issuer's slug appended.

    Re-running this for a document already stored returns the same id, so a re-collection replaces
    its own row rather than growing a second one beside it.
    """
    randuri = con.execute(
        "SELECT id, id_portal, emitent FROM acte WHERE id = ? OR cheie_citare = ?",
        (cheie_citare, cheie_citare),
    ).fetchall()
    al_meu = next((r for r in randuri if r[1] and r[1] == id_portal), None)
    if al_meu:
        return al_meu[0]

    detine = next((r for r in randuri if r[0] == cheie_citare), None)
    if detine is None:
        return cheie_citare
    # The bare key is taken. It changes hands only for a canonical issuer displacing one that is
    # not — never between two non-canonical claimants, where the swap would depend on the order the
    # corpus happened to be collected in.
    if _canonic(tip, emitent) and not _canonic(tip, detine[2] or ""):
        return cheie_citare
    # The portal's own document id, not a slug of the issuer's name. A name would read better and
    # would not be stable: the service encodes its responses in a charset without `ș` and `ț` and
    # emits a literal `?` for both, so 113 910 documents — 55% of the corpus, across 344 of the 488
    # distinct issuers — carry `Ministerul Sănătă?ii` where the page says `Sănătății`. A slug of
    # the damaged spelling and a slug of the repaired one are different strings, so every such act
    # would change its id the day the names are cleaned, and every stored reference to it would
    # dangle. `id_portal` is unique at the source, so it also removes the need to break ties
    # between two acts of the same issuer, type, number and year — of which there are 8 316.
    return f"{cheie_citare}-{id_portal}" if id_portal else cheie_citare


def candidati(con: sqlite3.Connection, cheie_citare: str) -> list[sqlite3.Row]:
    """Every act a bare citation could mean, the one it most likely means first.

    Ordered: the canonical issuer for the type, then the earliest published, then the lowest portal
    id. Deterministic all the way down, so the same corpus answers the same way twice.
    """
    randuri = con.execute(
        "SELECT id, tip, numar, an, titlu, emitent, publicat, id_portal FROM acte"
        " WHERE cheie_citare = ? OR id = ?",
        (cheie_citare, cheie_citare),
    ).fetchall()
    return sorted(
        {r[0]: r for r in randuri}.values(),
        key=lambda r: (
            0 if _canonic(r[1], r[5] or "") else 1,
            r[6] or "9999",
            r[7] or "",
        ),
    )


def rezolva(con: sqlite3.Connection, cheie_citare: str) -> str | None:
    """The act id a bare citation resolves to, or None where the corpus holds no such act."""
    lista = candidati(con, cheie_citare)
    return lista[0][0] if lista else None

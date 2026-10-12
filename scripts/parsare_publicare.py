"""Parse publication evidence without opening or migrating a corpus database."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from typing import Final

from scripts.parsare import LUNI
from scripts.text import cheie, normalizeaza

# How much of the document counts as the header. The publication line sits in the first few
# lines of every portal record; the reasoning that cites other monitors starts well after.
FEREASTRA: Final[int] = 700

_MONITOR: Final[re.Pattern[str]] = re.compile(
    r"MONITORUL\s+OFICIAL(?:\s+AL\s+ROM(?:Â|A)NIEI)?"
    r"(?:\s*,?\s*PARTEA\s+(?P<partea>[IVX]+))?"
    r"\s*,?\s*(?:nr\.?|num(?:ă|a)rul)?\s*"
    r"(?P<numar>\d{1,5})\s+din\s+(?P<zi>\d{1,2})\s+(?P<luna>[a-zăâîșț]+)\s+(?P<an>\d{4})",
    re.IGNORECASE,
)


# `republicat în Monitorul Oficial nr. X` is a different event from first publication: the act
# was consolidated and reissued, often decades later, and its articles may have been renumbered.
# Measured at 3.4% of collected documents. The date is still a real publication date and is kept,
# but a caller computing "in force since" or an article-level deadline from a republication is
# computing from the wrong event, so the distinction is carried rather than flattened.
_REPUBLICARE: Final[re.Pattern[str]] = re.compile(r"republicat", re.IGNORECASE)


@dataclass(frozen=True)
class Publicare:
    """One publication, as the act states it."""

    monitor: int | None
    data: date | None
    partea: str | None
    text: str
    republicare: bool = False


def publicare(text: str) -> Publicare | None:
    """The Monitorul Oficial reference from an act's header, or `None` if it does not carry one."""
    cap = normalizeaza(text)[:FEREASTRA]
    m = _MONITOR.search(cap)
    if m is None:
        return None
    luna = LUNI.get(cheie(m.group("luna")))
    if luna is None:
        return None
    try:
        data = date(int(m.group("an")), luna, int(m.group("zi")))
    except ValueError:
        # A scanned or mistyped day like `31 iunie`. A wrong date is worse than no date.
        return None
    partea = m.group("partea")
    # Only the words immediately before the reference decide it: `republicat` elsewhere in a
    # header routinely refers to some *other* act the document mentions.
    inainte = cap[max(0, m.start() - 40) : m.start()]
    return Publicare(
        monitor=int(m.group("numar")),
        data=data,
        partea=partea.upper() if partea else None,
        text=m.group(0),
        republicare=bool(_REPUBLICARE.search(inainte)),
    )

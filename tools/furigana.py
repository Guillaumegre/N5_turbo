"""Furigana helpers: kana conversion and kanji/reading alignment into ruby segments.

A segment is {"t": text} or {"t": text, "r": reading}; "r" is only present over kanji.
"""

from __future__ import annotations

import re

KANJI = r"㐀-䶿一-鿿豈-﫿々〆ヵヶ"
KANJI_RE = re.compile(f"[{KANJI}]")
RUNS_RE = re.compile(f"[{KANJI}]+|[^{KANJI}]+")

Segment = dict[str, str]


def to_hiragana(text: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in text)


def has_kanji(text: str) -> bool:
    return bool(KANJI_RE.search(text))


def align(surface: str, reading: str) -> list[Segment]:
    """Split `surface` into kanji/kana runs and distribute `reading` over the kanji runs.

    赤い/あかい -> [赤(あか), い];  お母さん/おかあさん -> [お, 母(かあ), さん].
    Falls back to one ruby over the whole surface when the kana runs don't line up.
    """
    if not has_kanji(surface):
        return [{"t": surface}]
    reading = to_hiragana(reading)
    runs = RUNS_RE.findall(surface)
    pattern = "".join("(.+?)" if KANJI_RE.match(r) else re.escape(to_hiragana(r)) for r in runs)
    m = re.fullmatch(pattern, reading)
    if not m:
        return [{"t": surface, "r": reading}]
    out: list[Segment] = []
    groups = iter(m.groups())
    for r in runs:
        out.append({"t": r, "r": next(groups)} if KANJI_RE.match(r) else {"t": r})
    return out


def merge(segments: list[Segment]) -> list[Segment]:
    """Join neighbouring plain-text segments so the JSON stays small."""
    out: list[Segment] = []
    for s in segments:
        if not s["t"]:
            continue
        if out and "r" not in s and "r" not in out[-1]:
            out[-1] = {"t": out[-1]["t"] + s["t"]}
        else:
            out.append(dict(s))
    return out


def reading_of(segments: list[Segment]) -> str:
    return "".join(to_hiragana(s.get("r", s["t"])) for s in segments)


def text_of(segments: list[Segment]) -> str:
    return "".join(s["t"] for s in segments)

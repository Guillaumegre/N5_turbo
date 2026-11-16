# Data pipeline

Builds `src/data/n5.json` (bundled in the app) from open datasets. No furigana is computed at runtime.

```bash
py -3.12 -m venv tools/.venv
tools/.venv/Scripts/python.exe -m pip install sudachipy sudachidict_core
tools/.venv/Scripts/python.exe tools/fetch_sources.py          # downloads into tools/cache/ (gitignored)
tools/.venv/Scripts/python.exe -X utf8 tools/build_n5.py        # writes src/data/n5.json + tools/reports/
tools/.venv/Scripts/python.exe -X utf8 tools/sample.py          # tools/reports/sample.md
tools/.venv/Scripts/python.exe -m unittest discover -s tools/tests
```

## Steps

| Step | Source | Notes |
|---|---|---|
| Word list | Jonathan Waller's N5 list (via open-anki-jlpt-decks) + `overrides/extra_words.csv` | 718 rows → 715 study items (有る/在る and 掛ける/かける merged), + 18 words missing from Waller (the 12 months, 送る, 家内, ご主人, スリッパ, たいてい, もちろん) = 733 |
| Entry, meaning, part of speech | JMdict (jmdict-simplified) | sense chosen by overlap with Waller's gloss, max 3 short glosses |
| Display form | JMdict `uk` flag | words usually written in kana are shown in kana (下さい → ください) |
| Word furigana | JmdictFurigana | per-kanji segments `{"t":"赤","r":"あか"}` |
| Examples | Tatoeba `jpn_indices` (+ sentences, English translations) | ranked: short, mostly N5 vocabulary, N5 kanji, "checked" sentences first; up to 3 |
| Sentence furigana | Sudachi (core dict) + JmdictFurigana + kana alignment | known Sudachi misreadings fixed in `READING_FIX` |
| Themes | `overrides/themes.csv` (reviewed) | rule proposal in `themes.py` only for words missing from the CSV |

IDs are `<JMdict seq>-<reading>` (+ `-suffix` for ～ items): stable across rebuilds, used by the app database and sync.

## Manual corrections (`tools/overrides/`)

| File | Purpose |
|---|---|
| `themes.csv` | source of truth for themes (`;`-separated theme ids) |
| `meanings.csv` | replace the English meaning |
| `display.csv` | change the written form on the card (e.g. 綺麗 → きれい) |
| `pos.csv` | fix the part of speech |
| `list_entries.csv` | fix a list row (spelling/reading) or pin its JMdict entry |
| `exclude_sentences.csv` | drop a Tatoeba sentence (bad translation, archaic…) |
| `extra_words.csv` | words added on top of Waller's list, with their themes |

## Reports (`tools/reports/`, regenerated on every build)

- `summary.md`: counts per theme, words without examples, automatic decisions to double-check
- `sample.md`: 20 words in full, for review
- `ambiguous_readings.md`: sentences containing kanji with several common readings
- `themes_proposal.csv`: the final word → theme mapping

## Known limitations

- 27 words have no example sentence (mostly counters like 七つ, and words Tatoeba rarely uses). Months and dates accept the digit spelling (４月, ９日).
- Sound changes after digits are not handled: in `１本` the furigana shows ほん instead of ぽん.
- Sudachi picks one reading per context; rare misreadings may remain (see `ambiguous_readings.md`).

## Licenses

- JMdict, JmdictFurigana: © EDRDG, CC BY-SA 4.0 → `n5.json` is distributed under CC BY-SA 4.0
- Tatoeba sentences: CC BY 2.0 FR (each example keeps its Tatoeba sentence ids for attribution)
- N5 list: Jonathan Waller (tanos.co.uk), CC BY
- Sudachi dictionary: Apache 2.0 (build-time only)

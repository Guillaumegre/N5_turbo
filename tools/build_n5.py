"""Build src/data/n5.json from the cached sources (run fetch_sources.py first).

Run:  tools/.venv/Scripts/python.exe -X utf8 tools/build_n5.py

Pipeline per word:
  Waller N5 list -> JMdict entry -> display form, meaning, part of speech
  -> furigana (JmdictFurigana) -> example sentences (Tatoeba jpn_indices, ranked by simplicity,
  furigana via Sudachi) -> themes (tools/overrides/themes.csv, else rule proposal).
Human-reviewed corrections live in tools/overrides/*.csv; reports go to tools/reports/.
"""

from __future__ import annotations

import bz2
import csv
import json
import re
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from sudachipy import dictionary as sudachi_dictionary
from sudachipy import tokenizer as sudachi_tokenizer

from furigana import Segment, align, has_kanji, merge, reading_of, text_of, to_hiragana
from themes import THEME_IDS, THEMES, propose

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
CACHE = TOOLS / "cache"
OVERRIDES = TOOLS / "overrides"
REPORTS = TOOLS / "reports"
OUT = ROOT / "src" / "data" / "n5.json"

MAX_EXAMPLES = 3
MAX_SENTENCE_CHARS = 24
MAX_EN_CHARS = 70
MAX_GLOSSES = 3
MAX_MEANING_CHARS = 40
TILDES = "～〜~"


# --------------------------------------------------------------------------- overrides


def read_overrides(name: str, key: str = "id") -> dict[str, dict[str, str]]:
    path = OVERRIDES / name
    if not path.exists():
        return {}
    with open(path, encoding="utf-8", newline="") as f:
        return {row[key]: row for row in csv.DictReader(f) if row.get(key) and not row[key].startswith("#")}


# --------------------------------------------------------------------------- JMdict


@dataclass
class Word:
    expression: str  # as written in the N5 list (may carry ～)
    reading: str
    waller_meaning: str
    entry: dict | None = None
    forced_seq: str = ""  # JMdict id pinned in overrides/list_entries.csv
    default_themes: list[str] = field(default_factory=list)  # from overrides/extra_words.csv
    freq: int = 0  # Tatoeba sentences using the word: drives the order new cards are introduced
    rank: int = 0
    id: str = ""
    display: str = ""
    meaning: str = ""
    pos: str = "other"
    pos_detail: str = ""
    furigana: list[Segment] = field(default_factory=list)
    examples: list[dict] = field(default_factory=list)
    themes: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    @property
    def bare(self) -> str:
        return self.expression.strip(TILDES)


def load_jmdict() -> tuple[dict[str, list[dict]], dict[str, list[dict]], dict]:
    data = json.loads((CACHE / "jmdict-eng.json").read_text(encoding="utf-8"))
    by_kanji: dict[str, list[dict]] = defaultdict(list)
    by_kana: dict[str, list[dict]] = defaultdict(list)
    for w in data["words"]:
        for k in w["kanji"]:
            by_kanji[k["text"]].append(w)
        for k in w["kana"]:
            by_kana[k["text"]].append(w)
    return by_kanji, by_kana, data


def entry_score(e: dict, form: str, reading: str) -> tuple:
    common_form = any(k["text"] == form and k["common"] for k in e["kanji"] + e["kana"])
    common_kana = any(k["text"] == reading and k["common"] for k in e["kana"])
    return (common_form, common_kana, -int(e["id"]))


def gloss_overlap(e: dict, meaning: str) -> int:
    target = tokens(meaning)
    return max((len(target & tokens(" ".join(g["text"] for g in s["gloss"]))) for s in e["sense"]), default=0)


def match_entry(word: Word, by_kanji, by_kana) -> dict | None:
    reading = word.reading.strip(TILDES)
    for form in (word.bare, re.sub(r"(する|と)$", "", word.bare)):
        r = reading if form == word.bare else re.sub(r"(する|と)$", "", reading)
        cands = by_kanji.get(form, []) if has_kanji(form) else by_kana.get(form, [])
        cands = [e for e in cands if any(k["text"] == r for k in e["kana"])]
        if cands:
            # Kana homographs (たち: 達 vs 太刀, また: 又 vs 股) are told apart by Waller's English gloss first.
            return max(cands, key=lambda e: (gloss_overlap(e, word.waller_meaning), *entry_score(e, form, r)))
    return None


def senses_for(word: Word) -> list[dict]:
    assert word.entry
    form = word.bare
    out = []
    for s in word.entry["sense"]:
        kanji_ok = "*" in s["appliesToKanji"] or form in s["appliesToKanji"] or not has_kanji(form)
        kana_ok = "*" in s["appliesToKana"] or word.reading in s["appliesToKana"]
        if kanji_ok and kana_ok:
            out.append(s)
    return out or word.entry["sense"]


WORD_RE = re.compile(r"[a-z]+")
STOP = {"to", "a", "an", "the", "of", "be", "e", "g", "etc", "or", "and", "in", "on", "one", "s"}


def tokens(text: str) -> set[str]:
    return {t for t in WORD_RE.findall(text.lower()) if t not in STOP}


def pick_meaning(word: Word, senses: list[dict]) -> tuple[str, dict]:
    """Choose the sense that best matches Waller's gloss (the N5-relevant one) and keep it short."""
    target = tokens(word.waller_meaning)
    scored = []
    for i, s in enumerate(senses):
        gl = " ".join(g["text"] for g in s["gloss"])
        scored.append((len(target & tokens(gl)), -i, s))
    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
    best = scored[0][2]
    glosses: list[str] = []
    for g in best["gloss"]:
        text = g["text"]
        if len(glosses) >= MAX_GLOSSES or len("; ".join(glosses + [text])) > MAX_MEANING_CHARS:
            break
        glosses.append(text)
    # A second, distinct N5 sense (e.g. 起きる: get up; happen) if Waller lists it too.
    for overlap, _, s in scored[1:]:
        if overlap and len(glosses) < MAX_GLOSSES:
            extra = s["gloss"][0]["text"]
            if extra not in glosses and len("; ".join(glosses + [extra])) <= MAX_MEANING_CHARS:
                glosses.append(extra)
            break
    if not glosses:  # a single very long gloss
        glosses = [best["gloss"][0]["text"]]
    return "; ".join(glosses), best


def map_pos(tags: list[str]) -> tuple[str, str]:
    t = set(tags)
    if any(x.startswith("v5") for x in t):
        return "verb", "godan"
    if t & {"v1", "v1-s"}:
        return "verb", "ichidan"
    if t & {"vk", "vs-i", "vs-s", "vz"}:
        return "verb", "irregular"
    if t & {"adj-i", "adj-ix"}:
        return "i-adj", ""
    if "adj-na" in t:
        return "na-adj", ""
    first = tags[0] if tags else ""
    simple = {
        "adv": "adverb", "adv-to": "adverb", "pn": "pronoun", "ctr": "counter", "suf": "suffix",
        "n-suf": "suffix", "pref": "prefix", "n-pref": "prefix", "prt": "particle", "conj": "conjunction",
        "int": "interjection", "exp": "expression", "adj-pn": "pre-noun adj", "num": "number",
    }
    if first in simple:
        return simple[first], ""
    if first.startswith("n"):
        return "noun", "suru" if "vs" in t else ""
    return "other", first


# --------------------------------------------------------------------------- furigana


def load_jmdict_furigana() -> dict[tuple[str, str], list[Segment]]:
    data = json.loads((CACHE / "JmdictFurigana.json").read_text(encoding="utf-8-sig"))
    out = {}
    for e in data:
        out[(e["text"], e["reading"])] = [{"t": f["ruby"], "r": f["rt"]} if "rt" in f else {"t": f["ruby"]} for f in e["furigana"]]
    return out


# Sudachi's default readings that are wrong for everyday sentences.
READING_FIX = {"私": "わたし", "私達": "わたしたち", "明日": "あした", "何時": "なんじ", "一昨日": "おととい", "明後日": "あさって", "彼の": "かれの"}

# Counters/suffixes share a JMdict entry with the plain noun (～本 / 本), so their example
# sentences must show the suffix after a number: 三本, 何時間, 五年前.
NUMERAL_RE = "[0-9０-９一二三四五六七八九十百千万何数]"
NOT_NUMERAL_SUFFIXES = {"1620400-ちゅう-suffix", "1315840-とき-suffix"}


# Words Tatoeba often writes in kanji but everyday Japanese (and N5 textbooks) writes in kana:
# 下さい → ください, 出来る → できる, 事 → こと… Example sentences show them in kana.
# Verbs and adjectives by dictionary form (every inflection), the rest by surface.
KANA_DFORMS = {"下さる", "出来る", "居る", "有る", "在る", "無い", "頂く", "頂ける", "致す", "為る", "宜しい", "有難い", "御座る", "仕舞う"}
KANA_SURFACES = {
    "事", "丁度", "沢山", "色々", "一寸", "何故", "迄", "又", "中々", "殆ど", "余り", "筈",
    "貴方", "此処", "其処", "何処", "彼処", "此の", "其の", "何時も", "未だ", "御", "頃",
    "有難う", "御免", "宜しく", "然し", "矢張り", "是非",
    # Same spelling as the word cards (overrides/display.csv): non-jōyō kanji or usually kana.
    "飴", "椅子", "お腹", "醤油", "茶碗", "一昨日", "明後日", "多分",
}
# Kana only with this reading: 程 ほど (not てい), 位 くらい (not い, rank), 様 よう (お客様 keeps さま).
# 達 たち: the plural suffix (女の子達 → 女の子たち); 友達 is one word and keeps its kanji.
# 昨夜 ゆうべ (kana) but さくや (kanji).
KANA_IF_READ = {"程": {"ほど"}, "位": {"くらい", "ぐらい"}, "様": {"よう"}, "訳": {"わけ"}, "達": {"たち"}, "昨夜": {"ゆうべ"}}
# Old or short okurigana → the spelling learners meet today.
RESPELL = {"買物": "買い物", "入口": "入り口"}
# Formal nouns: kana after a verb, adjective or auxiliary (出かけるところ, 頼んだもの); kanji
# when they mean a place or a thing on their own (好きな所 stays legible either way).
KANA_AFTER_PREDICATE = {"所", "物"}
PREDICATE_POS = {"動詞", "形容詞", "助動詞"}


def kana_spelling(morphs: list[tuple]) -> list[str | None]:
    """For each morpheme, the kana to write instead of its kanji surface, or None to keep it."""
    out: list[str | None] = []
    for i, (surface, reading, dform, _nform, pos) in enumerate(morphs):
        kana = None
        if has_kanji(surface) and reading:
            prev_pos = morphs[i - 1][4][0] if i else ""
            if dform in KANA_DFORMS or surface in KANA_SURFACES or reading in KANA_IF_READ.get(surface, ()):
                kana = reading
            elif surface in KANA_AFTER_PREDICATE and prev_pos in PREDICATE_POS:
                kana = reading
            elif surface == "物" and i and morphs[i - 1][0] == "の":
                kana = reading  # 私のもの: possession is written in kana
            # 頃 after a time is ごろ (3時頃), which Sudachi reads ころ.
            if surface == "頃" and i and (morphs[i - 1][4][1] == "数詞" or morphs[i - 1][0] in ("時", "日", "月", "年")):
                kana = "ごろ"
        out.append(kana)
    return out


class SentenceFurigana:
    def __init__(self, jmfuri):
        self.tok = sudachi_dictionary.Dictionary(dict="core").create()
        self.mode = sudachi_tokenizer.Tokenizer.SplitMode.C
        self.jmfuri = jmfuri
        self.cache: dict[str, list] = {}

    def morphemes(self, text: str):
        if text not in self.cache:
            self.cache[text] = [
                (m.surface(), READING_FIX.get(m.surface(), to_hiragana(m.reading_form())), m.dictionary_form(), m.normalized_form(), m.part_of_speech())
                for m in self.tok.tokenize(text, self.mode)
            ]
        return self.cache[text]

    def segments(self, text: str, force: dict[str, str] | None = None) -> list[Segment]:
        """force: surface -> reading, for when the Tatoeba index states the reading explicitly."""
        segs: list[Segment] = []
        morphs = self.morphemes(text)
        for (surface, reading, *_), kana in zip(morphs, kana_spelling(morphs)):
            if force and surface in force:
                reading = force[surface]
                # The index's reading wins; the kana spelling still applies (and may depend on it).
                kana = reading if kana or reading in KANA_IF_READ.get(surface, ()) else None
            if kana:
                segs.append({"t": kana})
                continue
            if surface in RESPELL:
                surface = RESPELL[surface]
            if surface.endswith("達") and len(surface) > 1 and surface != "友達" and reading.endswith("たち"):
                # 私達 → 私たち: the plural suffix is written in kana.
                stem_text, stem_reading = surface[:-1], reading[:-2]
                segs.extend(self.jmfuri.get((stem_text, stem_reading)) or align(stem_text, stem_reading))
                segs.append({"t": "たち"})
                continue
            if has_kanji(surface) and reading:
                segs.extend(self.jmfuri.get((surface, reading)) or align(surface, reading))
            else:
                segs.append({"t": surface})
        return merge(segs)


def word_furigana(word: Word, jmfuri) -> list[Segment]:
    prefix = "～" if word.display[:1] in TILDES else ""
    suffix = "～" if word.display[-1:] in TILDES and len(word.display) > 1 else ""
    form = word.display.strip(TILDES)
    reading = word.reading.strip(TILDES)
    segs = jmfuri.get((form, reading)) or align(form, reading)
    return merge(([{"t": prefix}] if prefix else []) + segs + ([{"t": suffix}] if suffix else []))


# --------------------------------------------------------------------------- examples

INDEX_TOKEN_RE = re.compile(
    r"^(?P<head>[^(\[{~]+)"
    r"(?:\((?P<read>[^)#]+)\))?"
    r"(?:\(#(?P<seq>\d+)\))?"
    r"(?:\[(?P<sense>\d+)\])?"
    r"(?:\{(?P<surf>[^}]+)\})?"
    r"(?P<good>~)?$"
)


@dataclass
class IndexHit:
    jpn: int
    eng: int
    reading: str | None
    seq: str | None
    good: bool


def load_index() -> dict[str, list[IndexHit]]:
    by_head: dict[str, list[IndexHit]] = defaultdict(list)
    with open(CACHE / "jpn_indices.csv", encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) != 3:
                continue
            jpn, eng, toks = int(parts[0]), int(parts[1]), parts[2]
            for t in toks.split(" "):
                m = INDEX_TOKEN_RE.match(t)
                if m:
                    by_head[m["head"]].append(IndexHit(jpn, eng, m["read"], m["seq"], bool(m["good"])))
    return by_head


def load_sentences(name: str, wanted: set[int] | None = None) -> dict[int, str]:
    out = {}
    with bz2.open(CACHE / name, "rt", encoding="utf-8") as f:
        for line in f:
            p = line.split("\t")
            sid = int(p[0])
            if wanted is None or sid in wanted:
                out[sid] = p[2]
    return out


FREE_POS = {"助詞", "助動詞", "補助記号", "空白", "記号", "接尾辞"}


def stem(word: Word) -> str:
    """Part of the display form that survives conjugation (赤い -> 赤, 食べる -> 食べ)."""
    d = word.display.strip(TILDES)
    if word.pos in ("verb", "i-adj") and len(d) > 1:
        return d[:-1]
    return d


# Same digits, different word: 1日 = いちにち (one day) or ついたち (the 1st); 1月 = いちがつ or ひとつき.
AMBIGUOUS_DATES = {"一日", "一月"}
KANJI_DIGITS = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
DATE_RE = re.compile(r"^([一二三四五六七八九十]+)(月|日)$")


def digit_aliases(word: Word) -> set[str]:
    """四月 -> {"4月", "４月"}: Tatoeba usually writes months and dates with digits."""
    m = DATE_RE.match(word.bare)
    if not m:
        return set()
    num, n = m[1], 0
    if "十" in num:
        tens, _, ones = num.partition("十")
        n = KANJI_DIGITS.get(tens, 1) * 10 + KANJI_DIGITS.get(ones, 0)
    else:
        n = KANJI_DIGITS[num]
    ascii_ = f"{n}{m[2]}"
    return {ascii_, ascii_.translate(str.maketrans("0123456789", "０１２３４５６７８９"))}


def stem_reading(word: Word) -> str:
    """Reading of stem(word), used to check a sentence reads the word the same way (一日: いちにち vs ついたち)."""
    if not has_kanji(word.display):
        return ""
    r = word.reading.strip(TILDES)
    return r[:-1] if word.pos in ("verb", "i-adj") and len(r) > 1 else r


def choose_examples(word: Word, index, jpn, eng, sf: SentenceFurigana, known: set[str], n5_kanji: set[str], excluded: set[str]):
    assert word.entry
    kanji_forms = {k["text"] for k in word.entry["kanji"]}
    kana_forms = {k["text"] for k in word.entry["kana"]}
    # A word shown with kanji (歯, 二, 戸) must not match kana headwords, which are mostly
    # homophones such as the particles は, に, と, unless the index names its JMdict entry.
    kana_ok = not has_kanji(word.display)
    hits: dict[int, IndexHit] = {}
    for form in kanji_forms | kana_forms:
        for h in index.get(form, []):
            if h.seq and h.seq != word.entry["id"]:
                continue
            if form not in kanji_forms and not kana_ok and h.seq != word.entry["id"]:
                continue
            if h.reading and to_hiragana(h.reading) != word.reading.strip(TILDES):
                continue
            if h.jpn in jpn and h.eng in eng and str(h.jpn) not in excluded:
                hits.setdefault(h.jpn, h)
    word.freq = len(hits)

    s = stem(word)
    kr = stem_reading(word)
    needs_numeral = (
        word.expression[:1] in TILDES
        and ({"numbers", "time"} & set(word.themes) or word.pos == "counter")
        and word.id not in NOT_NUMERAL_SUFFIXES
    )
    numeral_re = re.compile(NUMERAL_RE + re.escape(s)) if needs_numeral else None
    aliases = digit_aliases(word)

    def written(ja: str) -> bool:
        return s in ja or any(a in ja and not re.search(f"[0-9０-９]{re.escape(a)}", ja) for a in aliases)
    # Cheap pre-filter before running Sudachi.
    pre = []
    for h in hits.values():
        ja, en = jpn[h.jpn], eng[h.eng]
        if len(ja) > MAX_SENTENCE_CHARS or len(en) > MAX_EN_CHARS:
            continue
        if numeral_re and not numeral_re.search(ja):
            continue
        pre.append((0 if h.good else 1, abs(len(ja) - 12), not written(ja), h))
    pre.sort(key=lambda x: x[:3])

    scored = []
    for _, _, _, h in pre[:80]:
        ja, en = jpn[h.jpn], eng[h.eng]
        morphs = sf.morphemes(ja)
        unknown = 0
        proper = 0
        for surface, reading, dform, nform, pos in morphs:
            if pos[0] in FREE_POS or pos[1] == "数詞":
                continue
            if pos[1] == "固有名詞":
                proper += 1
                continue
            if dform in known or nform in known or surface in known or to_hiragana(dform) in known:
                continue
            unknown += 1
        if unknown > 2:
            continue
        force = {word.bare: word.reading.strip(TILDES)} if h.reading and has_kanji(word.bare) else None
        segs = sf.segments(ja, force)
        uses_digits = s not in ja and written(ja)
        if kr and not uses_digits and kr not in reading_of(segs):
            continue  # Sudachi reads the word differently (一日: いちにち vs ついたち)
        if uses_digits and h.reading is None and word.bare in AMBIGUOUS_DATES:
            continue  # 1日 could be いちにち or ついたち: only trust sentences the index annotates
        rare_kanji = sum(1 for c in ja if has_kanji(c) and c not in n5_kanji)
        digits = 0 if uses_digits else sum(1 for c in ja if c.isdigit())
        score = (
            unknown * 3
            + rare_kanji * 1.5
            + digits * 2
            + proper * 0.5
            + abs(len(ja) - 12) / 4
            + (0 if h.good else 1)
            + (0 if written(ja) else 3)
        )
        scored.append((score, h, segs, en))
    scored.sort(key=lambda x: x[0])

    picked, seen_en, seen_ja = [], set(), set()
    for score, h, segs, en in scored:
        key_en = en.lower().strip(" .!?")
        ja = text_of(segs)
        if key_en in seen_en or ja in seen_ja:
            continue
        seen_en.add(key_en)
        seen_ja.add(ja)
        picked.append({"ja": segs, "en": en, "src": [h.jpn, h.eng]})
        if len(picked) == MAX_EXAMPLES:
            break
    return picked


# --------------------------------------------------------------------------- main


def first_variant(text: str) -> str:
    """'足; 脚' -> '足', 'けっこん (する)' -> 'けっこん', '(〜を) とお' -> 'とお'."""
    text = re.sub(r"[(（][^)）]*[)）]", "", text)
    return re.split(r"[;；,、]", text)[0].strip()


def merge_duplicates(words: list[Word]) -> list[Word]:
    """Rows that are the same JMdict word with the same reading.

    - 有る/在る, 掛ける/かける: one study item (meanings combined), kept under the first kanji row.
    - 早い/速い: different meanings worth separate cards -> kept, id uses the written form.
    IDs are stable: "<jmdict seq>-<reading>", "-suffix" for ～ items, "<seq>-<written form>" for kept homographs.
    """
    groups: dict[tuple, list[Word]] = defaultdict(list)
    for w in words:
        is_suffix = w.expression != w.bare
        key = (w.entry["id"] if w.entry else w.expression, w.reading.strip(TILDES), is_suffix)
        groups[key].append(w)

    out: list[Word] = []
    for (seq, reading, is_suffix), ws in groups.items():
        base = f"{seq if ws[0].entry else 'x'}-{reading}" + ("-suffix" if is_suffix else "")
        meanings = {w.waller_meaning for w in ws}
        mergeable = len(ws) > 1 and (any(not has_kanji(w.bare) for w in ws) or len(meanings) == 1)
        if len(ws) == 1 or mergeable:
            keep = next((w for w in ws if has_kanji(w.bare)), ws[0])
            keep.id = base
            if len(ws) > 1:
                keep.waller_meaning = "; ".join(sorted(meanings))
                keep.notes.append("merged list rows: " + ", ".join(w.expression for w in ws))
            out.append(keep)
        else:
            for w in ws:
                w.id = f"{base}-{w.bare}"
                out.append(w)
    order = {id(w): i for i, w in enumerate(words)}
    return sorted(out, key=lambda w: order[id(w)])


def main() -> None:
    REPORTS.mkdir(exist_ok=True)
    meaning_ov = read_overrides("meanings.csv")
    display_ov = read_overrides("display.csv")
    theme_ov = read_overrides("themes.csv")
    pos_ov = read_overrides("pos.csv")
    excluded = set(read_overrides("exclude_sentences.csv", key="tatoeba_id"))

    print("loading JMdict…")
    by_kanji, by_kana, jm = load_jmdict()
    jmfuri = load_jmdict_furigana()

    list_ov = read_overrides("list_entries.csv", key="list_expression")
    words = []
    with open(CACHE / "n5.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            ov = list_ov.get(r["expression"].strip())
            if ov and ov["list_reading"] and ov["list_reading"] != r["reading"].strip():
                ov = None
            expr = ov["expression"] if ov else first_variant(r["expression"])
            reading = ov["reading"] if ov else first_variant(r["reading"])
            words.append(Word(expr, reading, r["meaning"].strip(), forced_seq=(ov or {}).get("jmdict", "")))
    # Words missing from Waller's list (found by comparing with other public N5 lists).
    for r in read_overrides("extra_words.csv", key="expression").values():
        words.append(Word(r["expression"], r["reading"], r["gloss_hint"], default_themes=[t for t in r["themes"].split(";") if t]))

    by_id = {e["id"]: e for e in jm["words"]}
    for w in words:
        w.entry = by_id[w.forced_seq] if w.forced_seq else match_entry(w, by_kanji, by_kana)
    words = merge_duplicates(words)

    for w in words:
        if w.entry is None:
            w.display, w.meaning = w.expression, w.waller_meaning
            w.notes.append("no JMdict match")
            continue
        senses = senses_for(w)
        w.meaning, best = pick_meaning(w, senses)
        w.pos, w.pos_detail = map_pos(best["partOfSpeech"])
        usually_kana = "uk" in senses[0]["misc"]
        w.display = w.expression
        if has_kanji(w.bare) and usually_kana:
            w.display = w.expression.replace(w.bare, w.reading.strip(TILDES))
            w.notes.append(f"usually kana: shown as {w.display} (list has {w.expression})")

    for w in words:
        if w.id in display_ov:
            w.display = display_ov[w.id]["display"]
        if w.id in meaning_ov:
            w.meaning = meaning_ov[w.id]["meaning_en"]
        if w.id in pos_ov:
            w.pos, w.pos_detail = pos_ov[w.id]["pos"], pos_ov[w.id].get("pos_detail", "")
        w.furigana = word_furigana(w, jmfuri)

    ids = [w.id for w in words]
    dupes = {i for i in ids if ids.count(i) > 1}
    assert not dupes, f"duplicate ids: {dupes}"

    # Vocabulary considered "known" when ranking sentence difficulty.
    known: set[str] = set()
    n5_kanji: set[str] = set()
    for w in words:
        known |= {w.bare, w.reading.strip(TILDES), w.display.strip(TILDES)}
        if w.entry:
            known |= {k["text"] for k in w.entry["kanji"]} | {k["text"] for k in w.entry["kana"]}
        n5_kanji |= {c for c in w.expression if has_kanji(c)}
    known |= {"する", "為る", "ある", "有る", "いる", "居る", "なる", "成る", "です", "ます", "の", "こと", "もの", "物", "事", "よう", "様"}

    print("loading Tatoeba…")
    index = load_index()
    jpn = load_sentences("jpn_sentences_detailed.tsv.bz2")
    wanted_eng = {h.eng for hs in index.values() for h in hs}
    eng = load_sentences("eng_sentences_detailed.tsv.bz2", wanted_eng)
    sf = SentenceFurigana(jmfuri)

    for w in words:
        if w.id in theme_ov:
            w.themes = [t.strip() for t in theme_ov[w.id]["themes"].split(";") if t.strip()]
        elif w.default_themes:
            w.themes = w.default_themes
        else:
            extra = " ".join(g["text"] for s in (senses_for(w) if w.entry else [])[:1] for g in s["gloss"])
            w.themes = propose(w.waller_meaning, w.pos, extra)
            w.notes.append("themes: auto proposal")
        bad = [t for t in w.themes if t not in THEME_IDS]
        assert not bad, f"{w.id}: unknown themes {bad}"

    print("choosing examples…")
    for i, w in enumerate(words):
        if w.entry:
            w.examples = choose_examples(w, index, jpn, eng, sf, known, n5_kanji, excluded)
        if (i + 1) % 100 == 0:
            print(f"  {i + 1}/{len(words)}")

    # 1 = most frequent. Ties keep list order. Suffixes/prefixes share hits with their base word
    # (～本 / 本), so they are pushed after it to be introduced once the base is known.
    for r, w in enumerate(sorted(words, key=lambda w: -w.freq // (4 if w.expression != w.bare else 1)), start=1):
        w.rank = r

    manifest = json.loads((CACHE / "manifest.json").read_text(encoding="utf-8"))
    out = {
        "version": 1,
        "sources": {k: v.get("version", v["url"]) for k, v in manifest.items() if k.endswith((".zip", ".csv", ".bz2"))},
        "themes": [{"id": t, "name": n} for t, n in THEMES],
        "words": [
            {
                "id": w.id,
                "rank": w.rank,
                "kanji": w.display,
                "reading": w.reading,
                "furigana": w.furigana,
                "meaning_en": w.meaning,
                "pos": w.pos,
                **({"pos_detail": w.pos_detail} if w.pos_detail else {}),
                "themes": w.themes,
                "examples": w.examples,
            }
            for w in words
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    write_reports(words)
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB, {len(words)} words)")


AMBIGUOUS = ["何", "今日", "一日", "明日", "昨日", "方", "上手", "下手", "大人", "一人", "二人", "人", "日", "月", "生"]


def ruby_text(segs: list[Segment]) -> str:
    return "".join(f"{s['t']}({s['r']})" if "r" in s else s["t"] for s in segs)


def write_reports(words: list[Word]) -> None:
    with open(REPORTS / "themes_proposal.csv", "w", encoding="utf-8", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["id", "kanji", "reading", "meaning_en", "pos", "themes"])
        for w in words:
            wr.writerow([w.id, w.display, w.reading, w.meaning, w.pos, ";".join(w.themes)])

    counts = defaultdict(int)
    for w in words:
        for t in w.themes:
            counts[t] += 1
    n_ex = defaultdict(int)
    for w in words:
        n_ex[len(w.examples)] += 1

    lines = ["# N5 build report", "", f"Words: {len(words)}", ""]
    lines += ["## Examples per word", ""] + [f"- {k}: {n_ex[k]} words" for k in sorted(n_ex)] + [""]
    lines += ["## Words per theme", ""] + [f"- {n} ({t}): {counts[t]}" for t, n in THEMES] + [""]
    lines += ["## Notes", ""] + [f"- `{w.id}` {w.expression}: {'; '.join(n for n in w.notes if not n.startswith('themes'))}" for w in words if any(not n.startswith("themes") for n in w.notes)]
    lines += ["", "## Words without examples", ""] + [f"- {w.display} ({w.reading}) {w.meaning}" for w in words if not w.examples]
    (REPORTS / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    amb = ["# Sentences with readings worth a manual check", "", "Format: kanji(reading). Fix wrong ones via tools/overrides/exclude_sentences.csv.", ""]
    for w in words:
        for ex in w.examples:
            if any(a in text_of(ex["ja"]) for a in AMBIGUOUS):
                amb.append(f"- [{ex['src'][0]}] {ruby_text(ex['ja'])}  ({w.display})")
    (REPORTS / "ambiguous_readings.md").write_text("\n".join(amb) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

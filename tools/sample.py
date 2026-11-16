"""Write tools/reports/sample.md: a readable sample of words for manual validation.

Run:  tools/.venv/Scripts/python.exe -X utf8 tools/sample.py [kanji ...]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ["赤い", "青い", "食べる", "行く", "私", "今日", "一日", "上手", "先生", "駅",
           "犬", "雨", "毎朝", "きれい", "何", "三つ", "大人", "天気", "すぐに", "～本"]


def ruby(segs: list[dict]) -> str:
    return "".join(f"<ruby>{s['t']}<rt>{s['r']}</rt></ruby>" if "r" in s else s["t"] for s in segs)


def plain(segs: list[dict]) -> str:
    return "".join(f"{s['t']}({s['r']})" if "r" in s else s["t"] for s in segs)


def main() -> None:
    data = json.loads((ROOT / "src/data/n5.json").read_text(encoding="utf-8"))
    themes = {t["id"]: t["name"] for t in data["themes"]}
    wanted = sys.argv[1:] or DEFAULT
    by_kanji: dict[str, list[dict]] = {}
    for w in data["words"]:
        by_kanji.setdefault(w["kanji"], []).append(w)

    out = ["# Sample of 20 words", "", "Furigana shown as kanji(reading). Sentence source: Tatoeba sentence id.", ""]
    for k in wanted:
        for w in by_kanji.get(k, [])[:1]:
            out.append(f"## {w['kanji']}  ·  {w['reading']}")
            out.append("")
            out.append(f"- **Meaning:** {w['meaning_en']}")
            out.append(f"- **Part of speech:** {w['pos']}" + (f" ({w['pos_detail']})" if w.get("pos_detail") else ""))
            out.append(f"- **Themes:** {', '.join(themes[t] for t in w['themes'])}")
            out.append(f"- **Furigana:** {plain(w['furigana'])}")
            out.append(f"- **id:** `{w['id']}`")
            for ex in w["examples"]:
                out.append(f"  - {plain(ex['ja'])}  \n    _{ex['en']}_  (#{ex['src'][0]})")
            if not w["examples"]:
                out.append("  - (no example sentence)")
            out.append("")
    out.append("## Theme: Colors")
    out.append("")
    out.append(", ".join(f"{w['kanji']} ({w['meaning_en']})" for w in data["words"] if "colors" in w["themes"]))
    out.append("")
    out.append("## Words ending in い (reading)")
    out.append("")
    ending = [w["kanji"] for w in data["words"] if w["reading"].rstrip("～").endswith("い")]
    out.append(f"{len(ending)} words, e.g. " + "、".join(ending[:30]))
    (ROOT / "tools/reports/sample.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    print("wrote tools/reports/sample.md")


if __name__ == "__main__":
    main()

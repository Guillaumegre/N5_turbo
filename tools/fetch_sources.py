"""Download the raw datasets used by build_n5.py into tools/cache/ (gitignored).

Run:  tools/.venv/Scripts/python.exe tools/fetch_sources.py
Re-running skips files that already exist; delete tools/cache/ to refresh.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import tarfile
import time
import urllib.request
import zipfile
from pathlib import Path

CACHE = Path(__file__).parent / "cache"
UA = {"User-Agent": "n5turbo-data-pipeline"}

SOURCES = {
    # Jonathan Waller's N5 list as packaged by open-anki-jlpt-decks (CC BY)
    "n5.csv": "https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n5.csv",
    "jpn_indices.tar.bz2": "https://downloads.tatoeba.org/exports/jpn_indices.tar.bz2",
    "jpn_sentences_detailed.tsv.bz2": "https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences_detailed.tsv.bz2",
    "eng_sentences_detailed.tsv.bz2": "https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences_detailed.tsv.bz2",
}

GITHUB_RELEASES = {
    # repo -> (asset name predicate, local file name)
    "scriptin/jmdict-simplified": (lambda n: n.startswith("jmdict-eng-") and n.endswith(".json.zip") and "common" not in n, "jmdict-eng.json.zip"),
    "Doublevil/JmdictFurigana": (lambda n: n == "JmdictFurigana.json.zip", "JmdictFurigana.json.zip"),
}


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def download(url: str, dest: Path) -> None:
    if dest.exists():
        print(f"  cached  {dest.name}")
        return
    tmp = dest.with_suffix(dest.suffix + ".part")
    for attempt in range(1, 6):  # downloads.tatoeba.org drops connections intermittently
        print(f"  fetch   {url} (attempt {attempt})")
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r, open(tmp, "wb") as f:
                shutil.copyfileobj(r, f)
            tmp.rename(dest)
            return
        except OSError as e:
            print(f"    failed: {e}")
            time.sleep(5 * attempt)
    raise RuntimeError(f"could not download {url}")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    CACHE.mkdir(exist_ok=True)
    manifest: dict[str, dict[str, str]] = {}

    for name, url in SOURCES.items():
        download(url, CACHE / name)
        manifest[name] = {"url": url}

    for repo, (pred, local) in GITHUB_RELEASES.items():
        release = json.loads(get(f"https://api.github.com/repos/{repo}/releases/latest"))
        asset = next(a for a in release["assets"] if pred(a["name"]))
        download(asset["browser_download_url"], CACHE / local)
        manifest[local] = {"url": asset["browser_download_url"], "version": release["tag_name"]}

    # Unpack archives (extract only the expected members; never trust archive paths).
    with zipfile.ZipFile(CACHE / "jmdict-eng.json.zip") as z:
        member = next(n for n in z.namelist() if n.endswith(".json") and "/" not in n)
        (CACHE / "jmdict-eng.json").write_bytes(z.read(member))
    with zipfile.ZipFile(CACHE / "JmdictFurigana.json.zip") as z:
        member = next(n for n in z.namelist() if n.endswith(".json") and "/" not in n)
        (CACHE / "JmdictFurigana.json").write_bytes(z.read(member))
    with tarfile.open(CACHE / "jpn_indices.tar.bz2", "r:bz2") as t:
        member = next(m for m in t.getmembers() if m.isfile() and m.name.endswith("jpn_indices.csv"))
        (CACHE / "jpn_indices.csv").write_bytes(t.extractfile(member).read())  # type: ignore[union-attr]

    for name in list(manifest):
        manifest[name]["sha256"] = sha256(CACHE / name)
    (CACHE / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("done; versions recorded in tools/cache/manifest.json")


if __name__ == "__main__":
    main()

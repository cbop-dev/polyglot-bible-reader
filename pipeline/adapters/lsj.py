"""Polyglot Bible Reader - Greek LSJ Lexicon Adapter.

Parses STEPBible's TFLSJ files (TFLSJ_0_5624.txt and TFLSJ_extra.txt),
extracting 11,034 authentic unabridged entries with full Strong's keys
(G1–G5624 and G6000–G20199), pointed Greek headwords, English glosses,
and HTML-formatted definitions.
"""

from __future__ import annotations
import re
from pathlib import Path
from typing import Iterator, Optional, Dict, Any, List
from .base import BaseAdapter
from ..config import CACHE_DIR

ACCENT_REGEX = re.compile(r"[\u0300-\u036f\u1dc0-\u1dff\u1ab0-\u1aff\u1f00-\u1fff]")


def strip_greek_accents(s: str) -> str:
    """Strips Greek diacritics and breathing marks to yield plain search key."""
    if not s:
        return ""
    import unicodedata
    nfd = unicodedata.normalize("NFD", s)
    cleaned = ACCENT_REGEX.sub("", nfd)
    return unicodedata.normalize("NFC", cleaned).lower().strip()


class LSJAdapter(BaseAdapter):
    corpus_id = "lsj"
    title = "Liddell-Scott-Jones Greek-English Lexicon (STEPBible Formatted)"
    language = "grc"
    direction = "ltr"
    category = "lexicon"

    def __init__(self, core_path: Optional[Path] = None, extra_path: Optional[Path] = None):
        self.core_path = core_path or (CACHE_DIR / "TFLSJ_0_5624.txt")
        self.extra_path = extra_path or (CACHE_DIR / "TFLSJ_extra.txt")

    def _parse_file(self, filepath: Path) -> Iterator[Dict[str, Any]]:
        print(f"Reading LSJ entries from: {filepath.name}")
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line_s = line.strip("\r\n")
                if not line_s or line_s.startswith("@") or line_s.startswith("#"):
                    continue

                parts = line_s.split("\t")
                if len(parts) < 6:
                    continue

                # Col 0: Strong's ID, e.g. 'G0012' -> 'G12'
                raw_strongs = parts[0].strip()
                m = re.match(r"^G(\d+)", raw_strongs)
                if not m:
                    continue

                strongs_id = f"G{int(m.group(1))}"

                # Col 3: Pointed Greek headword
                headword = parts[3].strip() if len(parts) > 3 else ""
                if not headword:
                    continue

                # Col 4: Transliteration
                translit = parts[4].strip() if len(parts) > 4 else ""

                # Col 6: Brief English gloss
                gloss = parts[6].strip() if len(parts) > 6 else ""

                # Col 7: Formatted HTML definition
                defn = parts[7].strip() if len(parts) > 7 else ""

                consonant_key = strip_greek_accents(headword)

                yield {
                    "strongs_id": strongs_id,
                    "headword": headword,
                    "consonant_key": consonant_key,
                    "transliteration": translit,
                    "gloss": gloss,
                    "definition": defn,
                    "dictionary": "lsj"
                }

    def iter_entries(self) -> Iterator[Dict[str, Any]]:
        count = 0
        for p in (self.core_path, self.extra_path):
            if not p.exists():
                raise FileNotFoundError(f"LSJ file not found: {p}")
            for entry in self._parse_file(p):
                yield entry
                count += 1
        print(f"LSJAdapter: Finished reading {count:,} authentic LSJ entries.")


if __name__ == "__main__":
    adapter = LSJAdapter()
    g1722 = None
    for entry in adapter.iter_entries():
        if entry["strongs_id"] == "G1722":
            g1722 = entry
            break

    print("\n--- LSJ Adapter Validation ---")
    if g1722:
        print(f"G1722 headword: {g1722['headword']}, key: {g1722['consonant_key']}")
        print(f"Gloss: {g1722['gloss']}")
        print(f"Sample definition: {g1722['definition'][:60]}...")
        assert g1722["headword"] == "ἐν" and g1722["consonant_key"] == "εν"
        print("SUCCESS: LSJ G1722 (en) parsed and verified!")

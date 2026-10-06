"""Polyglot Bible Reader - Unabridged BDB Hebrew Lexicon Adapter.

Parses public DictBDB.json, extracting 8,090 authentic BDB records
keyed from H1 to H9009 with pointed Hebrew headwords, consonant roots,
and complete definitions.
"""

from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Iterator, Optional, Dict, Any
from .base import BaseAdapter
from ..config import CACHE_DIR, PIPELINE_DIR

HEBREW_DIAC_REGEX = re.compile(r"[\u0591-\u05C7]")
PUNCT_REGEX = re.compile(r"[\(\)\[\]⟦⟧⟨⟩\.,;׃׀־\s]+")
BDB_POS_REGEX = re.compile(
    r"<b>(?:noun|verb|adjective|proper name|adverb|preposition|pronoun|conjunction|particle|interjection)[^<]*</b>",
    re.IGNORECASE,
)


def strip_hebrew(s: str) -> str:
    """Removes Hebrew vowels (niqqud) and cantillation marks to yield consonant key."""
    if not s:
        return ""
    import unicodedata
    norm = unicodedata.normalize("NFKC", s)
    cleaned = HEBREW_DIAC_REGEX.sub("", norm)
    cleaned = PUNCT_REGEX.sub("", cleaned).strip()
    return cleaned


def extract_headword_and_key(defn: str) -> tuple[Optional[str], str]:
    """
    Extracts the pointed Hebrew headword and unpointed consonant key from definition HTML.
    1. Looks for <ref0 ... entry="..."> tag (99.6% of entries)
    2. Falls back to <font class='c3'> Hebrew content
    """
    headword = None
    m_ref = re.search(r'<ref0[^>]*entry=[\"\']([^\"\']+)[\"\']', defn)
    if m_ref:
        raw = m_ref.group(1).strip()
        parts = [p.strip() for p in raw.split(",") if p.strip()]
        if parts:
            first_part = parts[0].split()[0].strip()
            headword = first_part.strip("[]⟦⟧()")

    if not headword:
        m_font = re.search(r"<font class=[\"\']c3[\"\']>([^<]+)</font>", defn)
        if m_font:
            headword = m_font.group(1).strip().strip("[]⟦⟧()")

    key = strip_hebrew(headword) if headword else ""
    return headword, key


def extract_bdb_gloss(defn: str) -> str:
    """Extracts lead bold gloss following part-of-speech tag in BDB definition HTML."""
    m_pos = BDB_POS_REGEX.search(defn)
    if m_pos:
        after_pos = defn[m_pos.end():]
        m_bold = re.search(r"<b>([^<]+)</b>", after_pos[:200])
        if m_bold:
            cand = m_bold.group(1).strip()
            if cand and not cand.isdigit() and len(cand) > 1:
                return cand
    return ""


class BDBAdapter(BaseAdapter):
    corpus_id = "bdb"
    title = "Brown-Driver-Briggs Hebrew Lexicon (Unabridged)"
    language = "hbo"
    direction = "rtl"
    category = "lexicon"

    def __init__(self, json_path: Optional[Path] = None, lexemes_path: Optional[Path] = None):
        self.json_path = json_path or (CACHE_DIR / "DictBDB.json")
        self.lexemes_path = lexemes_path or (PIPELINE_DIR / "data" / "bhs" / "lexemes.json")
        self.strongs_to_gloss: Dict[str, str] = {}
        self._load_bhs_glosses()

    def _load_bhs_glosses(self):
        if not self.lexemes_path.exists():
            archive = PIPELINE_DIR / "data" / "bhs.tar.gz"
            if archive.exists():
                import tarfile
                with tarfile.open(archive, "r:gz") as tar:
                    tar.extractall(path=PIPELINE_DIR / "data")

        if self.lexemes_path.exists():
            try:
                with open(self.lexemes_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for item in data.values():
                    s = item.get("strongs")
                    g = item.get("gloss")
                    if s and g:
                        s_norm = s.strip().upper()
                        if not s_norm.startswith("H") and s_norm.isdigit():
                            s_norm = f"H{s_norm}"
                        if s_norm not in self.strongs_to_gloss:
                            self.strongs_to_gloss[s_norm] = g.strip()
            except Exception as e:
                print(f"BDBAdapter: Warning reading lexemes.json: {e}")

    def iter_entries(self) -> Iterator[Dict[str, Any]]:
        if not self.json_path.exists():
            raise FileNotFoundError(f"BDB JSON not found at {self.json_path}")

        print(f"Reading BDB lexicon from: {self.json_path}")
        with open(self.json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        total = 0
        for entry in data:
            raw_top = entry.get("top", "").strip()
            defn = entry.get("def", "")

            # DictInfo is introductory metadata, not a lexicon entry
            if raw_top.lower() == "dictinfo" or not raw_top:
                continue

            # raw_top is like 'H7225' or 'H2' or '7225'
            if raw_top.upper().startswith("H"):
                s_digits = raw_top[1:].strip()
                if s_digits.isdigit():
                    strongs_id = f"H{int(s_digits)}"
                else:
                    strongs_id = raw_top.upper()
            elif raw_top.isdigit():
                strongs_id = f"H{int(raw_top)}"
            else:
                strongs_id = raw_top.upper()
                continue

            headword, key = extract_headword_and_key(defn)

            # Manual corrections for prefixes
            if strongs_id == "H9003" and not headword:
                headword, key = "בְּ", "ב"
            elif strongs_id == "H9000" and not headword:
                headword, key = "וְ", "ו"

            # Determine gloss
            gloss = self.strongs_to_gloss.get(strongs_id, "")
            if not gloss:
                gloss = extract_bdb_gloss(defn)

            yield {
                "strongs_id": strongs_id,
                "headword": headword or key or strongs_id,
                "consonant_key": key,
                "gloss": gloss,
                "definition": defn,
                "dictionary": "bdb"
            }
            total += 1

        print(f"BDBAdapter: Finished reading {total:,} authentic BDB entries.")


if __name__ == "__main__":
    from ..fetcher import fetch_source
    fetch_source("bdb")
    adapter = BDBAdapter()
    h7225 = None
    for entry in adapter.iter_entries():
        if entry["strongs_id"] == "H7225":
            h7225 = entry
            break

    print("\n--- BDB Adapter Validation ---")
    if h7225:
        print(f"H7225 headword: {h7225['headword']}, key: {h7225['consonant_key']}")
        print(f"Sample definition: {h7225['definition'][:60]}...")
        assert h7225["consonant_key"] == "ראשׁית" or "ראשית" in h7225["consonant_key"]
        print("SUCCESS: BDB H7225 (reshit) parsed and verified!")

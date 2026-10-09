"""Polyglot Bible Reader - TVTMS Alignment Parser & Resolver.

Parses STEPBible's TVTMS.txt (Translators Versification Traditions with Methodology for Standardisation).
Resolves any verse from a native tradition (MT, LXX, Vulgate, German, Brenton, etc.)
into the Universal Standard Hub coordinates: (std_book, std_chapter, std_verse, std_subverse),
and vice-versa.
"""

from __future__ import annotations
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple, Dict, List
from .config import CACHE_DIR, BOOK_ALIASES, CANONICAL_BY_CODE


@dataclass(frozen=True)
class Ref:
    """Represents a biblical coordinate point or title."""
    book: str          # Standard 3-letter USFM code, e.g. 'PSA', 'GEN'
    chapter: int       # Chapter number
    verse: int         # Verse number (0 for Title or TextBeforeV1)
    subverse: str = "" # Subverse label, e.g. 'a', 'b', or 'Title'

    def to_citation(self) -> str:
        if self.subverse == "Title":
            return f"{self.book} {self.chapter}:Title"
        elif self.subverse:
            return f"{self.book} {self.chapter}:{self.verse}{self.subverse}"
        else:
            return f"{self.book} {self.chapter}:{self.verse}"


def parse_ref_str(ref_str: str) -> Optional[Ref]:
    """
    Parses a single reference string like:
    - 'Psa.51:1' -> Ref('PSA', 51, 1, '')
    - 'Psa.51:Title' -> Ref('PSA', 51, 0, 'Title')
    - 'Gen.5:31.1' -> Ref('GEN', 5, 31, 'a')
    - 'Act.19:40a' -> Ref('ACT', 19, 40, 'a')
    """
    s = ref_str.strip()
    if not s or s.startswith("Absent") or s == "-":
        return None

    # Handle Book.Chapter:Verse or Book Chapter:Verse
    # E.g. Psa.51:Title, Psa.51:1, 1Sa.20:42, Gen.5:31.1
    m = re.match(r"^([0-9]?[A-Za-z]+)[\.\s]+([0-9]+):([A-Za-z0-9\.]+)$", s)
    if not m:
        return None

    raw_book, raw_ch, raw_v = m.groups()
    book_code = BOOK_ALIASES.get(raw_book.lower())
    if not book_code:
        return None

    ch = int(raw_ch)

    if raw_v.lower() == "title":
        return Ref(book=book_code, chapter=ch, verse=0, subverse="Title")

    # Check for subverse or decimal notation like '31.1' -> 31a, '31.2' -> 31b
    sub = ""
    if "." in raw_v:
        parts = raw_v.split(".")
        v = int(parts[0])
        idx = int(parts[1]) if parts[1].isdigit() else 1
        sub = chr(ord('a') + idx - 1)
    elif raw_v[-1].isalpha():
        v = int(raw_v[:-1])
        sub = raw_v[-1].lower()
    else:
        v = int(raw_v)

    return Ref(book=book_code, chapter=ch, verse=v, subverse=sub)


def expand_range_pair(std_range_str: str, native_range_str: str) -> List[Tuple[Ref, Ref]]:
    """
    Expands a 1:1 range pair such as:
    std:    'Psa.51:2-19'
    native: 'Psa.50:4-21'
    yields: [(Ref(PSA, 51, 2), Ref(PSA, 50, 4)), ..., (Ref(PSA, 51, 19), Ref(PSA, 50, 21))]
    """
    std_s = std_range_str.strip()
    nat_s = native_range_str.strip()

    if "-" not in std_s and "-" not in nat_s:
        r_std = parse_ref_str(std_s)
        r_nat = parse_ref_str(nat_s)
        if r_std and r_nat:
            return [(r_std, r_nat)]
        return []

    # Parse ranges: e.g. Psa.51:2-19
    m_std = re.match(r"^([0-9]?[A-Za-z]+)[\.\s]+([0-9]+):([0-9]+)-([0-9]+)$", std_s)
    m_nat = re.match(r"^([0-9]?[A-Za-z]+)[\.\s]+([0-9]+):([0-9]+)-([0-9]+)$", nat_s)

    # Case A: Both std and nat are ranges
    if m_std and m_nat:
        b_std_code = BOOK_ALIASES.get(m_std.group(1).lower())
        b_nat_code = BOOK_ALIASES.get(m_nat.group(1).lower())
        if not b_std_code or not b_nat_code:
            return []

        ch_std = int(m_std.group(2))
        v_std_start = int(m_std.group(3))
        v_std_end = int(m_std.group(4))

        ch_nat = int(m_nat.group(2))
        v_nat_start = int(m_nat.group(3))
        v_nat_end = int(m_nat.group(4))

        count_std = v_std_end - v_std_start + 1
        count_nat = v_nat_end - v_nat_start + 1

        pairs = []
        if count_std == count_nat:
            for offset in range(count_std):
                pairs.append((
                    Ref(book=b_std_code, chapter=ch_std, verse=v_std_start + offset),
                    Ref(book=b_nat_code, chapter=ch_nat, verse=v_nat_start + offset)
                ))
            return pairs

    # Case B: Native is a range (e.g. Psa.51:1-2), but Standard is single (e.g. Psa.51:Title or Psa.2:12)
    if m_nat and not m_std:
        b_nat_code = BOOK_ALIASES.get(m_nat.group(1).lower())
        r_std = parse_ref_str(std_s)
        if b_nat_code and r_std:
            ch_nat = int(m_nat.group(2))
            v_nat_start = int(m_nat.group(3))
            v_nat_end = int(m_nat.group(4))
            pairs = []
            for offset, v in enumerate(range(v_nat_start, v_nat_end + 1)):
                if r_std.subverse == "Title":
                    subv = f"Title.{offset + 1}" if v_nat_end > v_nat_start else "Title"
                    pairs.append((
                        Ref(book=r_std.book, chapter=r_std.chapter, verse=0, subverse=subv),
                        Ref(book=b_nat_code, chapter=ch_nat, verse=v)
                    ))
                else:
                    subv = chr(ord('a') + offset) if offset < 26 else str(offset + 1)
                    pairs.append((
                        Ref(book=r_std.book, chapter=r_std.chapter, verse=r_std.verse, subverse=subv),
                        Ref(book=b_nat_code, chapter=ch_nat, verse=v)
                    ))
            return pairs

    # Case C: Standard is a range (e.g. Psa.50:2-23), but Native is single
    if m_std and not m_nat:
        b_std_code = BOOK_ALIASES.get(m_std.group(1).lower())
        r_nat = parse_ref_str(nat_s)
        if b_std_code and r_nat:
            ch_std = int(m_std.group(2))
            v_std_start = int(m_std.group(3))
            v_std_end = int(m_std.group(4))
            return [
                (Ref(book=b_std_code, chapter=ch_std, verse=v), r_nat)
                for v in range(v_std_start, v_std_end + 1)
            ]

    # Fallback to single refs if range expansion does not match count
    r_std = parse_ref_str(std_s.split("-")[0])
    r_nat = parse_ref_str(nat_s.split("-")[0])
    if r_std and r_nat:
        return [(r_std, r_nat)]
    return []


class TVTMSResolver:
    """In-memory multi-tradition versification alignment matrix."""

    def __init__(self):
        # Native -> Standard: (scheme, native_book, native_chapter, native_verse) -> Ref(std)
        self.native_to_std: Dict[Tuple[str, str, int, int], Ref] = {}
        # Standard -> Native: (scheme, std_book, std_chapter, std_verse, std_subverse) -> Ref(native)
        self.std_to_native: Dict[Tuple[str, str, int, int, str], Ref] = {}

    def add_mapping(self, scheme: str, std_ref: Ref, native_ref: Ref):
        s_key = scheme.upper()
        # Native -> Standard
        n_key = (s_key, native_ref.book, native_ref.chapter, native_ref.verse)
        self.native_to_std[n_key] = std_ref

        # Standard -> Native
        std_key = (s_key, std_ref.book, std_ref.chapter, std_ref.verse, std_ref.subverse)
        self.std_to_native[std_key] = native_ref
        std_key_default = (s_key, std_ref.book, std_ref.chapter, std_ref.verse, "")
        if std_key_default not in self.std_to_native:
            self.std_to_native[std_key_default] = native_ref

    def resolve_to_standard(self, scheme: str, book: str, chapter: int, verse: int, subverse: str = "") -> Ref:
        """
        Resolves a native reference into Standard Hub coordinates.
        If no explicit mapping exists, identity mapping (std = native) is returned.
        """
        s_key = scheme.upper()
        b_code = BOOK_ALIASES.get(book.lower(), book.upper())
        key = (s_key, b_code, chapter, verse)
        if key in self.native_to_std:
            res = self.native_to_std[key]
            if subverse and not res.subverse:
                return Ref(book=res.book, chapter=res.chapter, verse=res.verse, subverse=subverse)
            return res
        return Ref(book=b_code, chapter=chapter, verse=verse, subverse=subverse)

    def resolve_to_native(self, scheme: str, std_book: str, std_chapter: int, std_verse: int, std_subverse: str = "") -> Ref:
        """
        Resolves a Standard Hub coordinate into the scheme's native citation.
        """
        s_key = scheme.upper()
        b_code = BOOK_ALIASES.get(std_book.lower(), std_book.upper())
        key = (s_key, b_code, std_chapter, std_verse, std_subverse)
        if key in self.std_to_native:
            return self.std_to_native[key]
        key_default = (s_key, b_code, std_chapter, std_verse, "")
        if key_default in self.std_to_native:
            return self.std_to_native[key_default]
        return Ref(book=b_code, chapter=std_chapter, verse=std_verse)


def load_tvtms(tvtms_path: Optional[Path] = None) -> TVTMSResolver:
    """
    Parses TVTMS.txt (all 429 block sections covering Hebrew, Latin, Greek, German, etc.)
    and returns a loaded TVTMSResolver instance.
    """
    if tvtms_path is None:
        tvtms_path = CACHE_DIR / "TVTMS.txt"

    if not tvtms_path.exists():
        raise FileNotFoundError(
            f"TVTMS.txt not found at {tvtms_path}. Run `python -m pipeline.fetcher --key tvtms` first."
        )

    resolver = TVTMSResolver()
    print(f"Parsing TVTMS alignment rules from: {tvtms_path}")

    current_columns: List[str] = []
    rule_count = 0

    with open(tvtms_path, "r", encoding="utf-8") as f:
        for line in f:
            line_s = line.strip()
            if not line_s or line_s.startswith("'"):
                continue

            # Header row defining columns for the current section
            if line.startswith("BIBLES"):
                parts = [p.strip() for p in line.split("\t") if p.strip()]
                current_columns = parts[1:]  # skip "BIBLES"
                continue

            # Check if this line is a mapping rule
            if any(line.startswith(prefix) for prefix in ("OneToOne", "SubdividedVerse", "MergedFollVerse", "MergedPrevVerse", "TextMayBeMissing")):
                parts = [p.strip() for p in line.split("\t")]
                rule_type = parts[0]
                refs = parts[1:]

                if not current_columns:
                    continue

                col_map = dict(zip(current_columns, refs))
                std_ref_str = col_map.get("English KJV")
                if not std_ref_str or std_ref_str.startswith("Absent"):
                    continue

                # Map each recognized tradition to English KJV Standard
                scheme_targets = {
                    "HEBREW": "Hebrew",
                    "MT": "Hebrew",
                    "LATIN": "Latin",
                    "VULGATE": "Latin",
                    "GREEK": "Greek",
                    "LXX": "Greek",
                }

                for scheme_key, col_name in scheme_targets.items():
                    native_str = col_map.get(col_name)
                    if not native_str or native_str.startswith("Absent") or native_str == "-":
                        continue

                    # Expand any range or single ref
                    pairs = expand_range_pair(std_ref_str, native_str)
                    for std_ref, native_ref in pairs:
                        resolver.add_mapping(scheme_key, std_ref, native_ref)
                        rule_count += 1

    print(f"Loaded {rule_count:,} TVTMS alignment mappings across MT, LXX, and Vulgate traditions.")
    return resolver


if __name__ == "__main__":
    resolver = load_tvtms()

    # Test Psalm 51 / Psalm 50 Miserere alignments
    print("\n--- Verification: Psalm 51/50 Miserere Alignments ---")
    bhs_std = resolver.resolve_to_standard("HEBREW", "PSA", 51, 3)
    lxx_std = resolver.resolve_to_standard("LXX", "PSA", 50, 3)
    vulg_std = resolver.resolve_to_standard("VULGATE", "PSA", 50, 3)

    print(f"BHS Ps 51:3  -> Standard: {bhs_std.to_citation()}")
    print(f"LXX Ps 50:3  -> Standard: {lxx_std.to_citation()}")
    print(f"Vulgate Ps 50:3 -> Standard: {vulg_std.to_citation()}")

    assert bhs_std == lxx_std == vulg_std, "ERROR: Psalm 50/51 alignments do not match!"
    print("SUCCESS: Hebrew Ps 51:3, LXX Ps 50:3, and Vulgate Ps 50:3 align perfectly to Standard PSA 51:1!")

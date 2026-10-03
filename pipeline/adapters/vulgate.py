"""Polyglot Bible Reader - Clementine Vulgate Adapter.

Parses public VulgClementine.json, resolving verses through TVTMS
into the Universal Standard Hub coordinates while preserving authentic
Latin manuscript citations (including all 78 books and all 176 verses of Ps 118).
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Iterator, Optional
from .base import BaseAdapter, VerseUnit
from ..config import CACHE_DIR, BOOK_ALIASES
from ..tvtms import TVTMSResolver, load_tvtms

# Scrollmapper book names to standard USFM 3-letter codes
VULGATE_BOOK_MAP = {
    "Genesis": "GEN",
    "Exodus": "EXO",
    "Leviticus": "LEV",
    "Numbers": "NUM",
    "Deuteronomy": "DEU",
    "Joshua": "JOS",
    "Judges": "JDG",
    "Ruth": "RUT",
    "1 Samuel": "1SA", "I Samuel": "1SA",
    "2 Samuel": "2SA", "II Samuel": "2SA",
    "1 Kings": "1KI", "I Kings": "1KI",
    "2 Kings": "2KI", "II Kings": "2KI",
    "1 Chronicles": "1CH", "I Chronicles": "1CH",
    "2 Chronicles": "2CH", "II Chronicles": "2CH",
    "Ezra": "EZR",                # Vulgate 1 Esdras
    "Nehemiah": "NEH",            # Vulgate 2 Esdras
    "Tobit": "TOB",
    "Judith": "JDT",
    "Esther": "EST",
    "Job": "JOB",
    "Psalms": "PSA",
    "Proverbs": "PRO",
    "Ecclesiastes": "ECC",
    "Song of Solomon": "SNG",
    "Wisdom": "WIS",
    "Sirach": "SIR",
    "Isaiah": "ISA",
    "Jeremiah": "JER",
    "Lamentations": "LAM",
    "Baruch": "BAR",
    "Ezekiel": "EZK",
    "Daniel": "DAN",
    "Hosea": "HOS",
    "Joel": "JOL",
    "Amos": "AMO",
    "Obadiah": "OBA",
    "Jonah": "JON",
    "Micah": "MIC",
    "Nahum": "NAM",
    "Habakkuk": "HAB",
    "Zephaniah": "ZEP",
    "Haggai": "HAG",
    "Zechariah": "ZEC",
    "Malachi": "MAL",
    "1 Maccabees": "1MA", "I Maccabees": "1MA",
    "2 Maccabees": "2MA", "II Maccabees": "2MA",
    "Matthew": "MAT",
    "Mark": "MRK",
    "Luke": "LUK",
    "John": "JHN",
    "Acts": "ACT",
    "Romans": "ROM",
    "1 Corinthians": "1CO", "I Corinthians": "1CO",
    "2 Corinthians": "2CO", "II Corinthians": "2CO",
    "Galatians": "GAL",
    "Ephesians": "EPH",
    "Philippians": "PHP",
    "Colossians": "COL",
    "1 Thessalonians": "1TH", "I Thessalonians": "1TH",
    "2 Thessalonians": "2TH", "II Thessalonians": "2TH",
    "1 Timothy": "1TI", "I Timothy": "1TI",
    "2 Timothy": "2TI", "II Timothy": "2TI",
    "Titus": "TIT",
    "Philemon": "PHM",
    "Hebrews": "HEB",
    "James": "JAS",
    "1 Peter": "1PE", "I Peter": "1PE",
    "2 Peter": "2PE", "II Peter": "2PE",
    "1 John": "1JN", "I John": "1JN",
    "2 John": "2JN", "II John": "2JN",
    "3 John": "3JN", "III John": "3JN",
    "Jude": "JUD",
    "Revelation": "REV", "Revelation of John": "REV",
    # Additional Latin books in Clementine Vulgate
    "Prayer of Manasseh": "MAN", "Prayer of Manasses": "MAN",
    "1 Esdras": "1ES", "I Esdras": "1ES",            # Vulgate 3 Esdras
    "2 Esdras": "2ES", "II Esdras": "2ES",            # Vulgate 4 Esdras
    "Additional Psalm": "PS2",
    "Laodiceans": "LAO",
}


class VulgateAdapter(BaseAdapter):
    corpus_id = "vulgate"
    title = "Clementine Vulgate"
    language = "lat"
    direction = "ltr"
    category = "bible"
    default_scheme = "Vulgate"

    def __init__(self, json_path: Optional[Path] = None, tvtms: Optional[TVTMSResolver] = None):
        self.json_path = json_path or (CACHE_DIR / "VulgClementine.json")
        self.tvtms = tvtms or load_tvtms()

    def iter_verses(self) -> Iterator[VerseUnit]:
        if not self.json_path.exists():
            raise FileNotFoundError(f"Vulgate JSON not found at {self.json_path}")

        print(f"Reading Vulgate text from: {self.json_path}")
        with open(self.json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        books = data.get("books", [])
        total_verses = 0

        for b_entry in books:
            raw_bname = b_entry.get("name", "").strip()
            std_book = VULGATE_BOOK_MAP.get(raw_bname)
            if not std_book:
                std_book = BOOK_ALIASES.get(raw_bname.lower())
            if not std_book:
                print(f"[VulgateAdapter] WARNING: Unrecognized book name '{raw_bname}' - skipping.")
                continue

            chapters = b_entry.get("chapters", [])
            for c_entry in chapters:
                native_ch = int(c_entry.get("chapter", 0))
                verses = c_entry.get("verses", [])

                for v_entry in verses:
                    native_v = int(v_entry.get("verse", 0))
                    text_content = v_entry.get("text", "").strip()

                    # Resolve via TVTMS to Standard Hub coordinates
                    std_ref = self.tvtms.resolve_to_standard("VULGATE", std_book, native_ch, native_v)

                    # Build authentic citation label, e.g. 'Ps 50:3' or 'Gen 1:1'
                    short_name = "Ps" if std_book == "PSA" else raw_bname
                    native_citation = f"{short_name} {native_ch}:{native_v}"

                    yield VerseUnit(
                        corpus_id=self.corpus_id,
                        std_book=std_ref.book,
                        std_chapter=std_ref.chapter,
                        std_verse=std_ref.verse,
                        std_subverse=std_ref.subverse,
                        native_book=raw_bname,
                        native_chapter=native_ch,
                        native_verse=native_v,
                        native_citation=native_citation,
                        text=text_content
                    )
                    total_verses += 1

        print(f"VulgateAdapter: Finished reading {total_verses:,} verses across {len(books)} books.")


if __name__ == "__main__":
    adapter = VulgateAdapter()
    ps118_count = 0
    ps50_sample = []

    for v in adapter.iter_verses():
        # Check native Psalm 118 verses
        if v.native_book == "Psalms" and v.native_chapter == 118:
            ps118_count += 1
        # Check Psalm 50:3 alignment
        if v.native_book == "Psalms" and v.native_chapter == 50 and v.native_verse == 3:
            ps50_sample.append(v)

    print(f"\n--- Vulgate Adapter Validation ---")
    print(f"Total Psalm 118 verses found: {ps118_count} (Expected: 176)")
    assert ps118_count == 176, f"ERROR: Ps 118 has {ps118_count} verses, expected 176!"
    print("SUCCESS: All 176 verses of Vulgate Psalm 118 preserved!")

    if ps50_sample:
        v50 = ps50_sample[0]
        print(f"Vulgate {v50.native_citation} ('{v50.text[:25]}...')")
        print(f"  -> Aligned to Standard: {v50.std_book} {v50.std_chapter}:{v50.std_verse}")
        assert v50.std_book == "PSA" and v50.std_chapter == 51 and v50.std_verse == 1
        print("SUCCESS: Vulgate Ps 50:3 correctly aligned to Standard PSA 51:1!")

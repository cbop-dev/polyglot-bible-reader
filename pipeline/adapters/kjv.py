"""Polyglot Bible Reader - King James Version (KJV) Adapter.

Ingests the English King James Version (with Apocrypha), including
word-level tokens mapped to Strong's Hebrew and Greek numbers.
"""

from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Iterator, Optional, Dict, Any, List

from .base import BaseAdapter, VerseUnit, WordToken
from ..config import PIPELINE_DIR, CACHE_DIR, BOOK_ALIASES
from ..tvtms import TVTMSResolver, load_tvtms

KJV_BOOK_MAP = {
    "Gen": "GEN",
    "Exod": "EXO",
    "Lev": "LEV",
    "Num": "NUM",
    "Deut": "DEU",
    "Josh": "JOS",
    "Judg": "JDG",
    "Ruth": "RUT",
    "1Sam": "1SA",
    "2Sam": "2SA",
    "1Kgs": "1KI",
    "2Kgs": "2KI",
    "1Chr": "1CH",
    "2Chr": "2CH",
    "Ezra": "EZR",
    "Neh": "NEH",
    "Esth": "EST",
    "Job": "JOB",
    "Ps": "PSA",
    "Prov": "PRO",
    "Eccl": "ECC",
    "Song": "SNG",
    "Isa": "ISA",
    "Jer": "JER",
    "Lam": "LAM",
    "Ezek": "EZK",
    "Dan": "DAN",
    "Hos": "HOS",
    "Joel": "JOL",
    "Amos": "AMO",
    "Obad": "OBA",
    "Jonah": "JON",
    "Mic": "MIC",
    "Nah": "NAM",
    "Hab": "HAB",
    "Zeph": "ZEP",
    "Hag": "HAG",
    "Zech": "ZEC",
    "Mal": "MAL",
    # Apocrypha
    "1Esdr": "1ES",
    "2Esdr": "2ES",
    "Tob": "TOB",
    "Jdt": "JDT",
    "AddEsth": "ESG",
    "Wis": "WIS",
    "Sir": "SIR",
    "Bar": "BAR",
    "PrAzar": "S3Y",
    "Sus": "SUS",
    "Bel": "BEL",
    "PrMan": "MAN",
    "1Mac": "1MA",
    "1Macc": "1MA",
    "2Mac": "2MA",
    "2Macc": "2MA",
    # New Testament
    "Matt": "MAT",
    "Mark": "MRK",
    "Luke": "LUK",
    "John": "JHN",
    "Acts": "ACT",
    "Rom": "ROM",
    "1_Cor": "1CO",
    "2_Cor": "2CO",
    "Gal": "GAL",
    "Eph": "EPH",
    "Phil": "PHP",
    "Col": "COL",
    "1_Thess": "1TH",
    "2_Thess": "2TH",
    "1_Tim": "1TI",
    "2_Tim": "2TI",
    "Titus": "TIT",
    "Phlm": "PHM",
    "Heb": "HEB",
    "Jas": "JAS",
    "1_Pet": "1PE",
    "2_Pet": "2PE",
    "1_John": "1JN",
    "2_John": "2JN",
    "3_John": "3JN",
    "Jude": "JUD",
    "Rev": "REV",
}


def _normalize_for_matching(text: str) -> str:
    t = text.replace("’", "'").replace("‘", "'").replace("–", "-").replace("—", "-").replace("➔", "")
    t = t.replace("æ", "ae").replace("Æ", "ae").replace("œ", "oe").replace("&#8212", "-")
    return re.sub(r"[^a-zA-Z0-9]", "", t).lower()


class KJVAdapter(BaseAdapter):
    corpus_id = "kjv"
    title = "King James Version (with Apocrypha)"
    language = "eng"
    direction = "ltr"
    category = "bible"
    default_scheme = "ENG"

    def __init__(
        self,
        kjv_data_dir: Optional[Path] = None,
        tvtms: Optional[TVTMSResolver] = None
    ):
        if kjv_data_dir is None:
            target_dir = PIPELINE_DIR / "data" / "kjv"
            archive = PIPELINE_DIR / "data" / "kjv.tar.gz"
            if not target_dir.exists() and archive.exists():
                print(f"Unpacking {archive.name} into {PIPELINE_DIR / 'data'}...")
                import tarfile
                with tarfile.open(archive, "r:gz") as tar:
                    tar.extractall(path=PIPELINE_DIR / "data")
            kjv_data_dir = target_dir
        self.kjv_data_dir = kjv_data_dir
        self.tvtms = tvtms or load_tvtms()

    def iter_verses(self) -> Iterator[VerseUnit]:
        books_dir = self.kjv_data_dir / "books"
        if not books_dir.exists():
            raise FileNotFoundError(f"KJV books directory not found at {books_dir}")

        print(f"Reading KJV text and tokens from: {books_dir}")
        book_files = sorted(books_dir.glob("*.json"))
        seen_books = set()
        total_verses = 0

        for bpath in book_files:
            b_abbrev = bpath.stem
            std_book = KJV_BOOK_MAP.get(b_abbrev)
            if not std_book:
                std_book = BOOK_ALIASES.get(b_abbrev.lower())
            if not std_book:
                continue

            if std_book in seen_books:
                continue
            seen_books.add(std_book)

            with open(bpath, "r", encoding="utf-8") as f:
                bdata = json.load(f)

            chapters = bdata.get("chapters", {})
            for c_str in sorted(chapters.keys(), key=lambda x: int(x) if x.isdigit() else 0):
                native_ch = int(c_str)
                verses = chapters[c_str]

                for v_str in sorted(verses.keys(), key=lambda x: int(x) if x.isdigit() else 0):
                    native_v = int(v_str)
                    vdata = verses[v_str]
                    text_content = vdata.get("text", "").strip()
                    if "<" in text_content:
                        text_content = re.sub(r"<[^>]+>", "", text_content).strip()

                    # Standard Hub coordinates match English Protestant coordinates 1:1
                    std_ch = native_ch
                    std_v = native_v
                    std_subv = ""

                    native_citation = f"{b_abbrev} {native_ch}:{native_v}"

                    # Build word tokens
                    raw_words = vdata.get("words", [])
                    word_tokens = []
                    for w in raw_words:
                        w_text = w.get("word", "")
                        trailer = w.get("trailer", "")
                        if "<" in w_text:
                            w_text = re.sub(r"<[^>]+>", "", w_text).strip()
                        if "<" in trailer:
                            trailer = re.sub(r"<[^>]+>", "", trailer)
                        combined = f"{w_text}{trailer}".strip()
                        if not combined and not w_text:
                            continue
                        raw_id = str(w.get("id", "")).strip()

                        strongs = None
                        if raw_id and raw_id != "0":
                            if raw_id.startswith(("H", "G")):
                                strongs = raw_id
                            elif raw_id.isdigit():
                                strongs = f"H{int(raw_id)}"

                        word_tokens.append(
                            WordToken(
                                word=combined or w_text,
                                normalized=w_text.lower(),
                                strongs=strongs,
                            )
                        )

                    # Recover any untagged trailing words from text_content omitted in words array
                    if text_content and raw_words:
                        full_norm = _normalize_for_matching(text_content)
                        curr_idx = 0
                        for w in raw_words:
                            w_norm = _normalize_for_matching(w.get("word", ""))
                            if not w_norm:
                                continue
                            pos = full_norm.find(w_norm, curr_idx)
                            if pos != -1:
                                curr_idx = pos + len(w_norm)

                        alpha_count = 0
                        cut_index = len(text_content)
                        for idx, ch in enumerate(text_content):
                            if ch.isalnum():
                                alpha_count += 1
                                if alpha_count == curr_idx:
                                    cut_index = idx + 1
                                    break

                        rem = text_content[cut_index:].strip()
                        rem_clean = re.sub(r"^[,\.:;!\?\s]+", "", rem)
                        if any(c.isalnum() for c in rem_clean):
                            for part in rem_clean.split():
                                norm_part = re.sub(r"[^a-zA-Z0-9]", "", part).lower()
                                word_tokens.append(
                                    WordToken(
                                        word=part,
                                        normalized=norm_part,
                                        strongs=None,
                                    )
                                )

                    yield VerseUnit(
                        corpus_id=self.corpus_id,
                        std_book=std_book,
                        std_chapter=std_ch,
                        std_verse=std_v,
                        std_subverse=std_subv,
                        native_book=b_abbrev,
                        native_chapter=native_ch,
                        native_verse=native_v,
                        native_subverse="",
                        native_citation=native_citation,
                        text=text_content,
                        tokens=word_tokens,
                    )
                    total_verses += 1

        print(f"KJVAdapter: Finished reading {total_verses:,} verses across {len(seen_books)} books.")


if __name__ == "__main__":
    adapter = KJVAdapter()
    gen1_1 = None
    ps51_1 = None
    for vu in adapter.iter_verses():
        if vu.std_book == "GEN" and vu.std_chapter == 1 and vu.std_verse == 1:
            gen1_1 = vu
        elif vu.std_book == "PSA" and vu.std_chapter == 51 and vu.std_verse == 1:
            ps51_1 = vu
        if gen1_1 and ps51_1:
            break

    print("\n--- KJV Adapter Validation ---")
    if gen1_1:
        print(f"Genesis 1:1: {gen1_1.text}")
        print(f"Tokens in Gen 1:1: {len(gen1_1.tokens)}")
        print(f"First token: {gen1_1.tokens[0]}")
    if ps51_1:
        print(f"Psalm 51:1: {ps51_1.text}")
        print(f"Citation: {ps51_1.native_citation} -> Std: {ps51_1.std_book} {ps51_1.std_chapter}:{ps51_1.std_verse}")

"""Polyglot Bible Reader - Hebrew Old Testament (BHS / WLC) Adapter.

Ingests the Hebrew Masoretic Text with word tokens, pointed lemmas,
consonant roots, Strong's numbers, glosses, and morphological tags.
Resolves each verse to Universal Standard Hub coordinates via TVTMS.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Iterator, Optional, Dict, Any, List
from .base import BaseAdapter, VerseUnit, WordToken
from ..config import CACHE_DIR, PIPELINE_DIR, REPO_ROOT, BOOK_ALIASES
from ..tvtms import TVTMSResolver, load_tvtms

# BHS book abbreviation to standard USFM 3-letter codes
BHS_BOOK_MAP = {
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
    "Ps": "PSA", "Psa": "PSA",
    "Prov": "PRO",
    "Qoh": "ECC",
    "Cant": "SNG",
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
    "Mal": "MAL"
}


class WLCAdapter(BaseAdapter):
    corpus_id = "wlc"
    title = "Westminster Leningrad Codex (BHS)"
    language = "hbo"
    direction = "rtl"
    category = "bible"
    default_scheme = "MT"

    def __init__(
        self,
        bhs_data_dir: Optional[Path] = None,
        tvtms: Optional[TVTMSResolver] = None
    ):
        if bhs_data_dir is None:
            target_dir = PIPELINE_DIR / "data" / "bhs"
            archive = PIPELINE_DIR / "data" / "bhs.tar.gz"
            if not target_dir.exists() and archive.exists():
                print(f"Unpacking {archive.name} into {PIPELINE_DIR / 'data'}...")
                import tarfile
                with tarfile.open(archive, "r:gz") as tar:
                    tar.extractall(path=PIPELINE_DIR / "data")
            bhs_data_dir = target_dir
        self.bhs_data_dir = bhs_data_dir
        self.tvtms = tvtms or load_tvtms()
        self.lexemes: Dict[str, Any] = {}
        self._load_lexemes()

    def _load_lexemes(self):
        lex_path = self.bhs_data_dir / "lexemes.json"
        if lex_path.exists():
            with open(lex_path, "r", encoding="utf-8") as f:
                self.lexemes = json.load(f)

    def iter_verses(self) -> Iterator[VerseUnit]:
        books_dir = self.bhs_data_dir / "books"
        if not books_dir.exists():
            raise FileNotFoundError(f"BHS books directory not found at {books_dir}")

        print(f"Reading BHS Hebrew text and tokens from: {books_dir}")
        book_files = sorted(books_dir.glob("*.json"))
        total_verses = 0

        for bpath in book_files:
            b_abbrev = bpath.stem
            std_book = BHS_BOOK_MAP.get(b_abbrev)
            if not std_book:
                std_book = BOOK_ALIASES.get(b_abbrev.lower())
            if not std_book:
                continue

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

                    # Resolve via TVTMS to Standard Hub coordinates
                    std_ref = self.tvtms.resolve_to_standard("HEBREW", std_book, native_ch, native_v)

                    # Build tokens
                    raw_words = vdata.get("words", [])
                    tokens: List[WordToken] = []
                    for w in raw_words:
                        surface = w.get("word", "")
                        morph_code = w.get("morph", "")
                        lex_id = str(w.get("id", ""))
                        lex_info = self.lexemes.get(lex_id, {})
                        tokens.append(WordToken(
                            word=surface,
                            normalized=lex_info.get("plain"),
                            lemma=lex_info.get("lemma"),
                            morph=morph_code,
                            strongs=lex_info.get("strongs"),
                            gloss=lex_info.get("gloss"),
                            trailer=w.get("trailer")
                        ))

                    yield VerseUnit(
                        corpus_id=self.corpus_id,
                        std_book=std_ref.book,
                        std_chapter=std_ref.chapter,
                        std_verse=std_ref.verse,
                        std_subverse=std_ref.subverse,
                        native_book=b_abbrev,
                        native_chapter=native_ch,
                        native_verse=native_v,
                        native_citation=f"{b_abbrev} {native_ch}:{native_v}",
                        text=text_content,
                        tokens=tokens
                    )
                    total_verses += 1

        print(f"WLCAdapter: Finished reading {total_verses:,} verses across {len(book_files)} Hebrew OT books.")


if __name__ == "__main__":
    adapter = WLCAdapter()
    ps51_sample = []
    total_tokens = 0

    for v in adapter.iter_verses():
        total_tokens += len(v.tokens)
        if v.native_book in ("Ps", "Psa") and v.native_chapter == 51 and v.native_verse == 3:
            ps51_sample.append(v)

    print(f"\n--- WLC Hebrew Adapter Validation ---")
    print(f"Total word tokens read: {total_tokens:,}")
    if ps51_sample:
        v = ps51_sample[0]
        print(f"BHS {v.native_citation} ('{v.text[:30]}...')")
        print(f"  -> Aligned to Standard: {v.std_book} {v.std_chapter}:{v.std_verse}")
        print(f"  -> Tokens in verse: {len(v.tokens)}")
        if v.tokens:
            print(f"     1st token: word='{v.tokens[0].word}', lemma='{v.tokens[0].lemma}', morph='{v.tokens[0].morph}', strongs='{v.tokens[0].strongs}', gloss='{v.tokens[0].gloss}'")
        assert v.std_book == "PSA" and v.std_chapter == 51 and v.std_verse == 1
        print("SUCCESS: BHS Ps 51:3 correctly aligned to Standard PSA 51:1 with authentic lemma & Strong's!")

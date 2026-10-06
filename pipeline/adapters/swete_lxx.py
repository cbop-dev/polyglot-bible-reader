"""Polyglot Bible Reader - Swete Septuagint (LXX) Adapter.

Ingests Swete's Septuagint (1930) with rich morphological tokens, lemmas,
Strong's numbers, and glosses (resolved via our 8-stage lemmatization engine),
and maps each verse to Universal Standard Hub coordinates via TVTMS.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Iterator, Optional, Dict, Any, List
from .base import BaseAdapter, VerseUnit, WordToken
from ..config import CACHE_DIR, PIPELINE_DIR, REPO_ROOT, BOOK_ALIASES
from ..tvtms import TVTMSResolver, load_tvtms

# Swete book names/file basenames to standard USFM 3-letter codes
SWETE_BOOK_MAP = {
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
    "1Esdr": "1ES",
    "2Esdr": "EZR",       # 2Esdr 1-10 is Ezra; 11-23 is Nehemiah in TVTMS
    "Esth": "EST",        # Esther (OT)
    "Jdt": "JDT",
    "TobBA": "TOB", "TobS": "TOB", "Tob": "TOB",
    "1Mac": "1MA",
    "2Mac": "2MA",
    "3Mac": "3MA",
    "4Mac": "4MA",
    "Ps": "PSA", "Psa": "PSA",
    "Od": "ODA",          # Odes
    "Prov": "PRO",
    "Qoh": "ECC",
    "Cant": "SNG",
    "Job": "JOB",
    "Wis": "WIS",
    "Sir": "SIR",
    "Hos": "HOS",
    "Amos": "AMO",
    "Mic": "MIC",
    "Joel": "JOL",
    "Obad": "OBA",
    "Jonah": "JON",
    "Nah": "NAM",
    "Hab": "HAB",
    "Zeph": "ZEP",
    "Hag": "HAG",
    "Zech": "ZEC",
    "Mal": "MAL",
    "Isa": "ISA",
    "Jer": "JER",
    "Bar": "BAR",
    "Lam": "LAM",
    "EpJer": "LJE",
    "Sus": "SUG",         # Old Greek Susanna (36 verses)
    "SusTh": "SUS",       # Theodotion Susanna (64 verses, aligns with KJV & Vulgate)
    "Dan": "DAG",         # Old Greek Daniel
    "DanTh": "DAN",       # Theodotion Daniel (aligns with MT, KJV, Vulgate)
    "Bel": "BLG",         # Old Greek Bel and the Dragon
    "BelTh": "BEL",       # Theodotion Bel and the Dragon (aligns with KJV, Vulgate)
    "Ps151": "PS2",
    "PsSol": "PSS", "PssSol": "PSS"
}


class SweteLXXAdapter(BaseAdapter):
    corpus_id = "swete_lxx"
    title = "Swete Septuagint (1930)"
    language = "grc"
    direction = "ltr"
    category = "bible"
    default_scheme = "LXX"

    def __init__(
        self,
        lxx_data_dir: Optional[Path] = None,
        tvtms: Optional[TVTMSResolver] = None
    ):
        if lxx_data_dir is None:
            target_dir = PIPELINE_DIR / "data" / "lxx"
            archive = PIPELINE_DIR / "data" / "lxx.tar.gz"
            if not target_dir.exists() and archive.exists():
                print(f"Unpacking {archive.name} into {PIPELINE_DIR / 'data'}...")
                import tarfile
                with tarfile.open(archive, "r:gz") as tar:
                    tar.extractall(path=PIPELINE_DIR / "data")
            lxx_data_dir = target_dir
        self.lxx_data_dir = lxx_data_dir
        self.tvtms = tvtms or load_tvtms()
        self.lexemes: Dict[str, Any] = {}
        self._load_lexemes()

    def _load_lexemes(self):
        lex_path = self.lxx_data_dir / "lexemes.json"
        if lex_path.exists():
            with open(lex_path, "r", encoding="utf-8") as f:
                self.lexemes = json.load(f)

    def iter_verses(self) -> Iterator[VerseUnit]:
        books_dir = self.lxx_data_dir / "books"
        if not books_dir.exists():
            raise FileNotFoundError(f"LXX books directory not found at {books_dir}")

        print(f"Reading Swete LXX text and tokens from: {books_dir}")
        book_files = sorted(books_dir.glob("*.json"))
        total_verses = 0

        for bpath in book_files:
            b_abbrev = bpath.stem
            # Skip unlemmatized duplicate files for Samuel, Kings, and Sirach Prologue (Sirach 0 is inside Sir.json)
            if b_abbrev in ("1Kgdms", "2Kgdms", "3Kgdms", "4Kgdms", "SirProl"):
                continue

            std_book = SWETE_BOOK_MAP.get(b_abbrev)
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

                    # Handle 2 Esdras special splitting: Ch 1-10 -> Ezra, Ch 11-23 -> Nehemiah
                    target_std_book = std_book
                    lookup_native_ch = native_ch
                    if b_abbrev == "2Esdr":
                        if native_ch <= 10:
                            target_std_book = "EZR"
                        else:
                            target_std_book = "NEH"
                            lookup_native_ch = native_ch - 10

                    # Resolve via TVTMS to Standard Hub coordinates
                    std_ref = self.tvtms.resolve_to_standard("LXX", target_std_book, lookup_native_ch, native_v)

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

        print(f"SweteLXXAdapter: Finished reading {total_verses:,} verses across {len(book_files)} books.")


if __name__ == "__main__":
    adapter = SweteLXXAdapter()
    ps50_sample = []
    total_tokens = 0

    for v in adapter.iter_verses():
        total_tokens += len(v.tokens)
        if v.native_book in ("Ps", "Psa") and v.native_chapter == 50 and v.native_verse == 3:
            ps50_sample.append(v)

    print(f"\n--- Swete LXX Adapter Validation ---")
    print(f"Total word tokens read: {total_tokens:,}")
    if ps50_sample:
        v = ps50_sample[0]
        print(f"LXX {v.native_citation} ('{v.text[:30]}...')")
        print(f"  -> Aligned to Standard: {v.std_book} {v.std_chapter}:{v.std_verse}")
        print(f"  -> Tokens in verse: {len(v.tokens)}")
        if v.tokens:
            print(f"     1st token: word='{v.tokens[0].word}', lemma='{v.tokens[0].lemma}', morph='{v.tokens[0].morph}', strongs='{v.tokens[0].strongs}', gloss='{v.tokens[0].gloss}'")
        assert v.std_book == "PSA" and v.std_chapter == 51 and v.std_verse == 1
        print("SUCCESS: LXX Ps 50:3 correctly aligned to Standard PSA 51:1 with authentic lemma & Strong's!")

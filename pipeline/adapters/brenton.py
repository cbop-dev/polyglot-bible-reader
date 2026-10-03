"""Polyglot Bible Reader - Brenton English Septuagint Adapter.

Ingests Sir Lancelot C. L. Brenton's 1851 English Translation of the Greek Septuagint
from upstream eBible USFM distribution.
Pre-aligns all verses to the Universal Hub coordinates using TVTMS (LXX scheme).
"""

from __future__ import annotations
import json
import zipfile
from pathlib import Path
from typing import Iterator, Optional, List

from .base import BaseAdapter, VerseUnit
from .usfm import parse_usfm_file
from ..config import PIPELINE_DIR, CACHE_DIR, REPO_ROOT, BOOK_ALIASES, resolve_canonical_book
from ..tvtms import TVTMSResolver, load_tvtms


class BrentonAdapter(BaseAdapter):
    corpus_id = "brenton-lxx"
    title = "The Septuagint with an English Translation (Sir L.C.L. Brenton, 1851)"
    language = "eng"
    direction = "ltr"
    category = "bible"
    default_scheme = "LXX"

    def __init__(
        self,
        source_dir: Optional[Path] = None,
        tvtms: Optional[TVTMSResolver] = None
    ):
        if source_dir is None:
            usfm_target = CACHE_DIR / "sources" / "brenton_usfm"
            zip_target = CACHE_DIR / "eng-Brenton_usfm.zip"

            if not usfm_target.exists() and zip_target.exists():
                print(f"Unpacking {zip_target.name} into {usfm_target}...")
                usfm_target.mkdir(parents=True, exist_ok=True)
                with zipfile.ZipFile(zip_target, "r") as zf:
                    for member in zf.infolist():
                        fname = Path(member.filename).name
                        if fname.endswith(".usfm"):
                            with zf.open(member) as src, open(usfm_target / fname, "wb") as dst:
                                dst.write(src.read())

            source_dir = usfm_target

        self.source_dir = source_dir
        self.tvtms = tvtms or load_tvtms()

    def iter_verses(self) -> Iterator[VerseUnit]:
        # 1. Primary path: Parse upstream USFM files
        if self.source_dir.exists() and list(self.source_dir.glob("*.usfm")):
            print(f"Reading Brenton text from USFM source: {self.source_dir}")
            usfm_files = sorted(self.source_dir.glob("*.usfm"))
            seen_books = set()

            for u_path in usfm_files:
                records = parse_usfm_file(u_path)
                if not records:
                    continue

                for raw_book_code, ch_num, v_num, subverse, nat_cit, clean_text in records:
                    book_code = resolve_canonical_book(raw_book_code)
                    if not book_code:
                        continue
                    # Align via TVTMS using the Septuagint (LXX) scheme
                    ref = self.tvtms.resolve_to_standard("LXX", book_code, ch_num, v_num, subverse)

                    yield VerseUnit(
                        corpus_id=self.corpus_id,
                        std_book=ref.book,
                        std_chapter=ref.chapter,
                        std_verse=ref.verse,
                        std_subverse=ref.subverse,
                        native_book=book_code,
                        native_chapter=ch_num,
                        native_verse=v_num,
                        native_subverse=subverse,
                        native_citation=nat_cit,
                        text=clean_text,
                        tokens=None,
                    )
            return

        # 2. Fallback path: Check pipeline/data/brenton or .archive/data/brenton
        data_brenton = PIPELINE_DIR / "data" / "brenton"
        data_brenton_tar = PIPELINE_DIR / "data" / "brenton.tar.gz"
        archive_dir = REPO_ROOT / ".archive" / "data" / "brenton"

        if not data_brenton.exists() and data_brenton_tar.exists():
            print(f"Unpacking {data_brenton_tar.name} into {PIPELINE_DIR / 'data'}...")
            import tarfile
            with tarfile.open(data_brenton_tar, "r:gz") as tar:
                tar.extractall(path=PIPELINE_DIR / "data")

        fallback_books_dir = None
        if (data_brenton / "books").exists():
            fallback_books_dir = data_brenton / "books"
        elif (archive_dir / "books").exists():
            fallback_books_dir = archive_dir / "books"

        if fallback_books_dir and fallback_books_dir.exists():
            print(f"Reading Brenton text from offline archive fallback: {fallback_books_dir}")
            book_files = sorted(fallback_books_dir.glob("*.json"))
            seen_books = set()

            for bpath in book_files:
                b_abbrev = bpath.stem
                book_code = resolve_canonical_book(b_abbrev)
                if not book_code or book_code in seen_books:
                    continue
                seen_books.add(book_code)

                with open(bpath, "r", encoding="utf-8") as f:
                    bdata = json.load(f)

                chapters = bdata.get("chapters", {})
                for c_str in sorted(chapters.keys(), key=lambda x: int(x) if x.isdigit() else 0):
                    ch_num = int(c_str)
                    verses = chapters[c_str]

                    for v_str in sorted(verses.keys(), key=lambda x: int(x) if x.isdigit() else 0):
                        v_num = int(v_str)
                        vdata = verses[v_str]
                        clean_text = vdata.get("text", "").strip()
                        if not clean_text:
                            continue

                        ref = self.tvtms.resolve_to_standard("LXX", book_code, ch_num, v_num)
                        yield VerseUnit(
                            corpus_id=self.corpus_id,
                            std_book=ref.book,
                            std_chapter=ref.chapter,
                            std_verse=ref.verse,
                            std_subverse=ref.subverse,
                            native_book=book_code,
                            native_chapter=ch_num,
                            native_verse=v_num,
                            native_subverse="",
                            native_citation=f"{ch_num}:{v_num}",
                            text=clean_text,
                            tokens=None,
                        )
            return

        raise FileNotFoundError(f"Brenton source not found at {self.source_dir}, {data_brenton}, or {archive_dir}")

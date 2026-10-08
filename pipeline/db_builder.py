"""Polyglot Bible Reader - Database Builder.

Builds the clean, pre-aligned SQLite database (polyglot-working.sqlite3).
Populates:
  - canonical_books (86 standard USFM book definitions)
  - corpora (metadata for texts, translations, lexicons)
  - text_units (pre-aligned verses with tokens, lemmas, Strong's, and morphology)
  - lexicon_entries (BDB Hebrew and LSJ Greek unabridged lexicons)
"""

from __future__ import annotations
import sqlite3
import time
from pathlib import Path
from typing import Optional, List, Dict, Any

from .config import BUILD_DIR, CANONICAL_BOOKS
from .tvtms import load_tvtms, TVTMSResolver
from .adapters import (
    BaseAdapter,
    VulgateAdapter,
    WLCAdapter,
    SweteLXXAdapter,
    OGNTAdapter,
    KJVAdapter,
    WEBBEAdapter,
    BrentonAdapter,
    BDBAdapter,
    LSJAdapter,
)
from .lemma_indexer import index_lemmas_and_concordance

SCHEMA_SQL = """
-- 1. Metadata for Textual Corpora
CREATE TABLE IF NOT EXISTS corpora (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    language TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'ltr',
    category TEXT NOT NULL,
    default_scheme TEXT NOT NULL,
    has_tokens BOOLEAN NOT NULL DEFAULT 0,
    has_audio BOOLEAN NOT NULL DEFAULT 0,
    license TEXT,
    attribution TEXT
);

-- 2. Books Reference Table (Exhaustive Standard Canon)
CREATE TABLE IF NOT EXISTS canonical_books (
    code TEXT PRIMARY KEY,
    order_index INTEGER NOT NULL,
    testament TEXT NOT NULL,
    name_english TEXT NOT NULL,
    name_hebrew TEXT,
    name_greek TEXT,
    name_latin TEXT,
    total_chapters INTEGER NOT NULL
);

-- 3. Core Text Units (Bibles and Verse-by-Verse Commentaries)
CREATE TABLE IF NOT EXISTS text_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    corpus_id TEXT NOT NULL REFERENCES corpora(id),
    
    -- Universal Hub Coordinates (Used for side-by-side alignment range scans)
    std_book TEXT NOT NULL REFERENCES canonical_books(code),
    std_chapter INTEGER NOT NULL,
    std_verse INTEGER NOT NULL,
    std_subverse TEXT DEFAULT '',
    
    -- Native Historical Coordinates (Preserving true scheme citation)
    native_book TEXT NOT NULL,
    native_chapter INTEGER NOT NULL,
    native_verse INTEGER NOT NULL,
    native_subverse TEXT DEFAULT '',
    native_citation TEXT NOT NULL,
    
    -- Content
    text_content TEXT NOT NULL,
    tokens_json TEXT
);

-- 4. Lexicon Entries (Strong's, Morphology, Glosses)
CREATE TABLE IF NOT EXISTS lexicon_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strongs_id TEXT NOT NULL,
    dictionary TEXT NOT NULL,
    lemma TEXT NOT NULL,
    consonant_key TEXT,
    transliteration TEXT,
    gloss TEXT NOT NULL,
    definition TEXT
);

-- 5. Pre-computed Lemma Statistics (O(1) Book Frequency Distributions)
CREATE TABLE IF NOT EXISTS lemma_stats (
    corpus_id TEXT NOT NULL,
    strongs TEXT NOT NULL,
    lemma TEXT NOT NULL,
    total_count INTEGER NOT NULL,
    book_counts_json TEXT NOT NULL,
    PRIMARY KEY (corpus_id, strongs)
);

-- 6. Pre-indexed Concordance References (O(1) Occurrence Range Scans)
CREATE TABLE IF NOT EXISTS concordance_refs (
    corpus_id TEXT NOT NULL,
    strongs TEXT NOT NULL,
    lemma TEXT NOT NULL,
    ref_label TEXT NOT NULL,
    work_unit_id INTEGER NOT NULL,
    PRIMARY KEY (corpus_id, strongs, work_unit_id)
) WITHOUT ROWID;

-- 7. Pre-computed Corpus Book Statistics (Word & Verse totals per book)
CREATE TABLE IF NOT EXISTS corpus_book_stats (
    corpus_id TEXT NOT NULL,
    book_code TEXT NOT NULL,
    total_words INTEGER NOT NULL,
    total_verses INTEGER NOT NULL,
    PRIMARY KEY (corpus_id, book_code)
);
"""

INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_text_units_hub 
ON text_units(std_book, std_chapter, std_verse, corpus_id);

CREATE INDEX IF NOT EXISTS idx_text_units_native 
ON text_units(corpus_id, native_book, native_chapter, native_verse);

CREATE INDEX IF NOT EXISTS idx_lexicon_strongs 
ON lexicon_entries(strongs_id);

CREATE INDEX IF NOT EXISTS idx_lexicon_dict_strongs 
ON lexicon_entries(dictionary, strongs_id);

CREATE INDEX IF NOT EXISTS idx_lexicon_consonant 
ON lexicon_entries(consonant_key);

CREATE INDEX IF NOT EXISTS idx_lemma_stats_lemma 
ON lemma_stats(corpus_id, lemma);

CREATE INDEX IF NOT EXISTS idx_concordance_refs_lemma 
ON concordance_refs(corpus_id, lemma, work_unit_id);
"""


class DatabaseBuilder:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or (BUILD_DIR / "polyglot-working.sqlite3")
        self.tvtms: Optional[TVTMSResolver] = None

    def init_schema(self, conn: sqlite3.Connection):
        print(f"Creating database schema at {self.db_path}...")
        conn.executescript(SCHEMA_SQL)
        conn.commit()

    def create_indexes(self, conn: sqlite3.Connection):
        print("Building high-efficiency indexes...")
        t0 = time.time()
        conn.executescript(INDEX_SQL)
        conn.commit()
        print(f"Indexes created in {time.time() - t0:.2f}s")

    def populate_canonical_books(self, conn: sqlite3.Connection):
        print(f"Populating canonical_books with {len(CANONICAL_BOOKS)} books...")
        rows = [
            (
                b["code"],
                b["order"],
                b["testament"],
                b["name_en"],
                b.get("name_he"),
                b.get("name_el"),
                b.get("name_la"),
                b["chapters"],
            )
            for b in CANONICAL_BOOKS
        ]
        conn.executemany(
            """
            INSERT OR REPLACE INTO canonical_books 
            (code, order_index, testament, name_english, name_hebrew, name_greek, name_latin, total_chapters)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        conn.commit()

    def populate_corpora(self, conn: sqlite3.Connection):
        print("Populating corpora metadata...")
        corpora_records = [
            (
                "vulgate",
                "Biblia Sacra Vulgata (Clementine Vulgate 1592/1598)",
                "lat",
                "ltr",
                "bible",
                "Vulgate",
                0,
                0,
                "Public Domain",
                "Clementine Vulgate Project",
            ),
            (
                "wlc",
                "Westminster Leningrad Codex (Hebrew Old Testament)",
                "hbo",
                "rtl",
                "bible",
                "MT",
                1,
                0,
                "Public Domain / CC BY 4.0",
                "OpenScriptures MorphHB / J. Alan Groves Center",
            ),
            (
                "swete_lxx",
                "The Old Testament in Greek according to the Septuagint (H.B. Swete, 1930)",
                "grc",
                "ltr",
                "bible",
                "LXX",
                1,
                0,
                "Public Domain / CC BY-NC-SA 4.0",
                "Swete Septuagint & Biblical Data Pipeline Lemmatization",
            ),
            (
                "ognt",
                "Open Greek New Testament (NA28-aligned)",
                "grc",
                "ltr",
                "bible",
                "ENG",
                1,
                0,
                "CC BY-SA 4.0",
                "OpenGNT Project (Eliran Wong)",
            ),
            (
                "kjv",
                "King James Version (with Apocrypha)",
                "eng",
                "ltr",
                "bible",
                "ENG",
                1,
                0,
                "Public Domain",
                "King James Bible 1611/1769 with Apocrypha",
            ),
            (
                "webbe",
                "World English Bible (British Edition with Apocrypha)",
                "eng",
                "ltr",
                "bible",
                "ENG",
                0,
                0,
                "Public Domain",
                "eBible.org / Rainbow Missions",
            ),
            (
                "brenton-lxx",
                "The Septuagint with an English Translation (Sir L.C.L. Brenton, 1851)",
                "eng",
                "ltr",
                "bible",
                "LXX",
                0,
                0,
                "Public Domain",
                "Samuel Bagster & Sons / eBible.org",
            ),
            (
                "bdb",
                "Brown-Driver-Briggs Hebrew and English Lexicon",
                "hbo",
                "ltr",
                "lexicon",
                "MT",
                0,
                0,
                "Public Domain",
                "Unabridged BDB (Eliran Wong / STEPBible)",
            ),
            (
                "lsj",
                "Liddell-Scott-Jones Greek-English Lexicon (STEPBible Formatted)",
                "grc",
                "ltr",
                "lexicon",
                "LXX",
                0,
                0,
                "CC BY",
                "STEPBible.org / LSJ Lexicon",
            ),
        ]
        conn.executemany(
            """
            INSERT OR REPLACE INTO corpora 
            (id, title, language, direction, category, default_scheme, has_tokens, has_audio, license, attribution)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            corpora_records,
        )
        conn.commit()

    def populate_lexicons(self, conn: sqlite3.Connection):
        print("\n=== Ingesting Lexicons ===")
        t0 = time.time()
        lex_rows = []

        # 1. BDB (Hebrew)
        print("Ingesting BDB Hebrew Lexicon...")
        bdb_adapter = BDBAdapter()
        for entry in bdb_adapter.iter_entries():
            lex_rows.append((
                entry["strongs_id"],
                entry["dictionary"],
                entry["headword"],
                entry.get("consonant_key", ""),
                entry.get("transliteration", ""),
                entry.get("gloss", ""),
                entry["definition"],
            ))

        # 2. LSJ (Greek)
        print("Ingesting STEPBible LSJ Greek Lexicon...")
        lsj_adapter = LSJAdapter()
        for entry in lsj_adapter.iter_entries():
            lex_rows.append((
                entry["strongs_id"],
                entry["dictionary"],
                entry["headword"],
                entry.get("consonant_key", ""),
                entry.get("transliteration", ""),
                entry["gloss"],
                entry["definition"],
            ))

        print(f"Inserting {len(lex_rows):,} lexicon entries into SQLite...")
        conn.executemany(
            """
            INSERT OR REPLACE INTO lexicon_entries
            (strongs_id, dictionary, lemma, consonant_key, transliteration, gloss, definition)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            lex_rows,
        )
        conn.commit()
        print(f"Lexicons ingested in {time.time() - t0:.2f}s")

    def populate_text_corpus(self, conn: sqlite3.Connection, adapter: BaseAdapter):
        print(f"\nIngesting text corpus: {adapter.title} ({adapter.corpus_id})...")
        t0 = time.time()
        batch = []
        count = 0
        batch_size = 5000

        for vu in adapter.iter_verses():
            batch.append((
                vu.corpus_id,
                vu.std_book,
                vu.std_chapter,
                vu.std_verse,
                vu.std_subverse,
                vu.native_book,
                vu.native_chapter,
                vu.native_verse,
                vu.native_subverse,
                vu.native_citation,
                vu.text,
                vu.tokens_to_json(),
            ))
            count += 1

            if len(batch) >= batch_size:
                conn.executemany(
                    """
                    INSERT INTO text_units
                    (corpus_id, std_book, std_chapter, std_verse, std_subverse,
                     native_book, native_chapter, native_verse, native_subverse,
                     native_citation, text_content, tokens_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    batch,
                )
                conn.commit()
                batch.clear()
                print(f"  ... inserted {count:,} verses")

        if batch:
            conn.executemany(
                """
                INSERT INTO text_units
                (corpus_id, std_book, std_chapter, std_verse, std_subverse,
                 native_book, native_chapter, native_verse, native_subverse,
                 native_citation, text_content, tokens_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                batch,
            )
            conn.commit()

        elapsed = time.time() - t0
        print(f"Finished {adapter.corpus_id}: {count:,} verses inserted in {elapsed:.2f}s")

    def build_all(self):
        start_time = time.time()
        print(f"==================================================")
        print(f"Building Polyglot Bible SQLite Database")
        print(f"Target: {self.db_path}")
        print(f"==================================================")

        if self.db_path.exists():
            print(f"Removing previous build artifact: {self.db_path}")
            self.db_path.unlink()

        conn = sqlite3.connect(self.db_path)
        # SQLite speed optimizations for bulk building
        conn.execute("PRAGMA journal_mode = MEMORY")
        conn.execute("PRAGMA synchronous = OFF")
        conn.execute("PRAGMA cache_size = 100000")

        try:
            # 1. Schema
            self.init_schema(conn)

            # 2. Canonical Books
            self.populate_canonical_books(conn)

            # 3. Corpora Metadata
            self.populate_corpora(conn)

            # 4. TVTMS Resolver Initialization
            if self.tvtms is None:
                self.tvtms = load_tvtms()

            # 5. Lexicons
            self.populate_lexicons(conn)

            # 6. Biblical Text Units
            print("\n=== Ingesting Biblical Text Corpora ===")
            adapters = [
                VulgateAdapter(tvtms=self.tvtms),
                WLCAdapter(tvtms=self.tvtms),
                SweteLXXAdapter(tvtms=self.tvtms),
                OGNTAdapter(tvtms=self.tvtms),
                KJVAdapter(tvtms=self.tvtms),
                WEBBEAdapter(tvtms=self.tvtms),
                BrentonAdapter(tvtms=self.tvtms),
            ]

            for adapter in adapters:
                self.populate_text_corpus(conn, adapter)

            # 7. Lemma Statistics and Concordance References
            index_lemmas_and_concordance(conn)

            # Auto-export compact lemma search indexes for single-request client search
            try:
                import sys
                from pathlib import Path
                scripts_dir = Path(__file__).resolve().parent.parent / "scripts"
                if str(scripts_dir) not in sys.path:
                    sys.path.insert(0, str(scripts_dir))
                from export_lemma_search_json import export_lemma_indexes
                export_lemma_indexes(conn)
            except Exception as e:
                print(f"Warning: Failed to auto-export lemma search JSON: {e}")

            # 8. Indexes
            self.create_indexes(conn)

            # Run integrity check and vacuum/analyze
            print("\nOptimizing and analyzing database...")
            conn.execute("PRAGMA foreign_key_check")
            conn.execute("ANALYZE")
            conn.commit()

        finally:
            conn.close()

        total_elapsed = time.time() - start_time
        size_mb = self.db_path.stat().st_size / (1024 * 1024)
        print(f"\n==================================================")
        print(f"BUILD COMPLETE!")
        print(f"Database: {self.db_path}")
        print(f"Size: {size_mb:.2f} MB")
        print(f"Elapsed: {total_elapsed:.1f}s")
        print(f"==================================================")


if __name__ == "__main__":
    builder = DatabaseBuilder()
    builder.build_all()

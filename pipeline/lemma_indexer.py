"""Polyglot Bible Reader - Lemma Statistics and Concordance Indexer.

Pre-computes:
  1. lemma_stats:
     - Aggregated book frequency distributions per lemma / Strong's number
     - Format: [{"title": "Genesis", "sbl_abbreviation": "GEN", "count": 165}, ...]
     - Allows instant O(1) single-row lookup for distribution charts in LemmaInfo
  2. concordance_refs:
     - Distinct verse occurrences per lemma / Strong's number
     - Stores (corpus_id, work_id, strongs, lemma, ref_label, work_unit_id)
     - Allows instant O(1) range scan of occurrence badges without reading verse bodies

Self-contained: derives 100% of data from text_units and canonical_books in SQLite.
"""

from __future__ import annotations
import json
import re
import sqlite3
import time
from collections import defaultdict
from typing import Dict, Any, List, Set, Tuple

# Mapping of corpus_id to legacy work_id for backward compatibility
CORPUS_WORK_IDS = {
    "vulgate": 1,
    "wlc": 2,
    "bhs": 2,
    "swete_lxx": 24,
    "lxx": 24,
    "ognt": 40,
    "sblgnt": 40,
    "kjv": 5,
    "webbe": 6,
    "brenton-lxx": 7,
}


def normalize_strongs(s: str) -> str:
    if not s:
        return ""
    s = s.strip()
    m = re.match(r"^([A-Za-z]+)0*(\d+.*)$", s)
    if m:
        return m.group(1).upper() + m.group(2)
    if s.isdigit():
        return f"H{s}"
    return s.upper()


def index_lemmas_and_concordance(conn: sqlite3.Connection):
    """Generates lemma_stats and concordance_refs from populated text_units."""
    cur = conn.cursor()
    start_time = time.time()
    print("\n=== Indexing Lemma Statistics & Concordance References ===")

    # 1. Load canonical books for titles and abbreviations
    cur.execute("SELECT code, order_index, name_english FROM canonical_books")
    books_meta: Dict[str, Tuple[int, str]] = {}
    for code, order_idx, name_en in cur.fetchall():
        books_meta[code] = (order_idx, name_en)
    print(f"Loaded {len(books_meta)} canonical book definitions.")

    # 2. Iterate through all text_units with tokens
    cur.execute(
        """
        SELECT id, corpus_id, std_book, native_citation, tokens_json
        FROM text_units
        WHERE tokens_json IS NOT NULL
        ORDER BY id
        """
    )

    # Book and corpus word & verse aggregations
    corpus_word_counts: Dict[str, int] = defaultdict(int)
    book_word_counts: Dict[Tuple[str, str], int] = defaultdict(int)
    book_verse_counts: Dict[Tuple[str, str], int] = defaultdict(int)

    # In-memory aggregations:
    # key: (corpus_id, work_id, strongs_key)
    # val: dict of book_code -> count
    lemma_book_counts: Dict[Tuple[str, int, str], Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    # best lemma string for this key
    lemma_labels: Dict[Tuple[str, int, str], str] = {}
    # concordance set: (corpus_id, work_id, strongs_key, lemma, native_citation, text_unit_id)
    concordance_set: Set[Tuple[str, int, str, str, str, int]] = set()

    verse_count = 0
    token_count = 0

    print("Aggregating tokens from text_units...")
    for tu_id, corpus_id, std_book, citation, tokens_json in cur:
        verse_count += 1
        work_id = CORPUS_WORK_IDS.get(corpus_id, 1)

        try:
            tokens = json.loads(tokens_json)
        except Exception:
            continue

        n_tok = len(tokens)
        token_count += n_tok
        corpus_word_counts[corpus_id] += n_tok
        book_word_counts[(corpus_id, std_book)] += n_tok
        book_verse_counts[(corpus_id, std_book)] += 1

        # Track keys already encountered in this verse to avoid duplicate count in concordance
        verse_keys_seen: Set[str] = set()

        for tok in tokens:
            raw_strongs = tok.get("strongs")
            lemma = tok.get("lemma") or tok.get("normalized") or tok.get("word") or ""
            norm = tok.get("normalized") or ""

            # Extract distinct Strong's / key representations
            strongs_keys: List[str] = []
            if raw_strongs:
                for s in str(raw_strongs).split(","):
                    ns = normalize_strongs(s)
                    if ns:
                        strongs_keys.append(ns)

            # If no Strong's number, index by normalized word
            if not strongs_keys and norm:
                strongs_keys.append(f"WORD:{norm}")

            for sk in strongs_keys:
                stat_key = (corpus_id, work_id, sk)
                lemma_book_counts[stat_key][std_book] += 1
                if stat_key not in lemma_labels or not lemma_labels[stat_key]:
                    lemma_labels[stat_key] = lemma

                if sk not in verse_keys_seen:
                    verse_keys_seen.add(sk)
                    concordance_set.add((corpus_id, work_id, sk, lemma, citation, tu_id))

    print(
        f"Processed {verse_count:,} verses ({token_count:,} tokens) in {time.time() - start_time:.2f}s."
    )
    print(
        f"Identified {len(lemma_book_counts):,} unique lemmas and {len(concordance_set):,} verse occurrences."
    )

    # 3. Create and populate corpus_book_stats table
    print("Populating corpus_book_stats table...")
    t_cbs = time.time()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS corpus_book_stats (
            corpus_id TEXT NOT NULL,
            book_code TEXT NOT NULL,
            total_words INTEGER NOT NULL,
            total_verses INTEGER NOT NULL,
            PRIMARY KEY (corpus_id, book_code)
        )
    """)
    cur.execute("DELETE FROM corpus_book_stats")
    cbs_rows = [
        (c_id, b_code, w_cnt, book_verse_counts.get((c_id, b_code), 0))
        for (c_id, b_code), w_cnt in book_word_counts.items()
    ]
    cur.executemany(
        "INSERT INTO corpus_book_stats (corpus_id, book_code, total_words, total_verses) VALUES (?, ?, ?, ?)",
        cbs_rows
    )
    conn.commit()
    print(f"Inserted {len(cbs_rows):,} rows into corpus_book_stats in {time.time() - t_cbs:.2f}s.")

    # 4. Populate lemma_stats table
    print("Populating lemma_stats table...")
    t_stats = time.time()
    cur.execute("DELETE FROM lemma_stats")

    lemma_rows = []
    for (corpus_id, work_id, sk), book_counts in lemma_book_counts.items():
        best_lemma = lemma_labels.get((corpus_id, work_id, sk), sk)

        # Build list of books sorted by occurrence count descending, then canonical order
        book_list = []
        for b_code, count in book_counts.items():
            order_idx, name_en = books_meta.get(b_code, (999, b_code))
            book_words = book_word_counts.get((corpus_id, b_code), 0)
            book_list.append({
                "title": name_en,
                "sbl_abbreviation": b_code,
                "count": count,
                "book_words": book_words,
                "_order": order_idx,
            })

        # Sort: highest count first; tie-break on canonical book order
        book_list.sort(key=lambda x: (-x["count"], x["_order"]))

        # Remove internal sort key
        for b in book_list:
            del b["_order"]

        total_count = sum(b["count"] for b in book_list)

        lemma_rows.append((
            corpus_id,
            work_id,
            sk,
            best_lemma,
            total_count,
            json.dumps(book_list, ensure_ascii=False),
        ))

    cur.executemany(
        """
        INSERT INTO lemma_stats
        (corpus_id, work_id, strongs, lemma, total_count, book_counts_json)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        lemma_rows,
    )
    conn.commit()
    print(f"Inserted {len(lemma_rows):,} rows into lemma_stats in {time.time() - t_stats:.2f}s.")

    # 4. Populate concordance_refs table
    print("Populating concordance_refs table...")
    t_conc = time.time()
    cur.execute("DELETE FROM concordance_refs")

    batch_size = 50000
    batch = []
    inserted_conc = 0

    for record in concordance_set:
        batch.append(record)
        if len(batch) >= batch_size:
            cur.executemany(
                """
                INSERT OR IGNORE INTO concordance_refs
                (corpus_id, work_id, strongs, lemma, ref_label, work_unit_id)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                batch,
            )
            inserted_conc += len(batch)
            conn.commit()
            batch.clear()

    if batch:
        cur.executemany(
            """
            INSERT OR IGNORE INTO concordance_refs
            (corpus_id, work_id, strongs, lemma, ref_label, work_unit_id)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            batch,
        )
        inserted_conc += len(batch)
        conn.commit()

    print(
        f"Inserted {inserted_conc:,} rows into concordance_refs in {time.time() - t_conc:.2f}s."
    )
    total_elapsed = time.time() - start_time
    print(f"=== Lemma Indexing Complete in {total_elapsed:.2f}s ===\n")


if __name__ == "__main__":
    import sys
    from pathlib import Path

    db_path = Path("pipeline/build/polyglot-working.sqlite3")
    if not db_path.exists():
        db_path = Path("build/polyglot-working.sqlite3")
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        sys.exit(1)

    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    index_lemmas_and_concordance(conn)
    conn.close()

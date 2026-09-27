#!/usr/bin/env python3
"""
Pre-compute Lemma Statistics & Book Distributions into SQLite database.

Target Table: lemma_stats
Database: /home/cbrannan/dev/2-tmp/biblical-data-pipeline/db-workspace/openscriptorium-working.sqlite3

Pre-calculates book frequencies and total counts for:
  - BHS (Hebrew OT, work_id = 2): stems (H1-H8674) + prefix morphemes (H9000, H9003, H9005, etc.)
  - Swete LXX (Greek OT, work_id = 24): G1-G5624 + LXX extras
  - SBLGNT (Greek NT, work_id = 25): G1-G5624

Stores book_counts_json as a JSON array of:
  [{"title": "Genesis", "sbl_abbreviation": "Gen", "count": 165}, ...]
"""

import json
import os
import re
import sqlite3
import time
from collections import defaultdict

DB_PATH = '/home/cbrannan/dev/2-tmp/biblical-data-pipeline/db-workspace/openscriptorium-working.sqlite3'

HEBREW_PREFIX_MAP = {
    'Prep-b': ('H9003', 'בְּ'),
    'Conj-w': ('H9000', 'וְ'),
    'Art':    ('H9009', 'הַ'),
    'Prep-l': ('H9005', 'לְ'),
    'Prep-k': ('H9004', 'כְּ'),
    'Prep-m': ('H9006', 'מִ'),
}


def normalize_strongs(s: str) -> str:
    if not s:
        return ''
    s = s.strip()
    m = re.match(r'^([A-Za-z]+)0*(\d+.*)$', s)
    if m:
        return m.group(1).upper() + m.group(2)
    # Digits only (Hebrew Strongs in BHS table)
    if s.isdigit():
        return f'H{s}'
    return s.upper()


def build_stats():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database not found: {DB_PATH}")

    print(f"Connecting to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    start_time = time.time()

    # 1. Create table and indexes
    cur.execute('''
        CREATE TABLE IF NOT EXISTS lemma_stats (
            work_id INTEGER NOT NULL,
            corpus TEXT NOT NULL,
            strongs TEXT NOT NULL,
            lemma TEXT NOT NULL,
            total_count INTEGER NOT NULL,
            book_counts_json TEXT NOT NULL,
            PRIMARY KEY (work_id, strongs)
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_lemma_stats_lemma ON lemma_stats(work_id, lemma)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_lemma_stats_corpus ON lemma_stats(corpus, strongs)')

    # Load BDB headwords
    cur.execute("SELECT strongs, headword FROM lexicon_entries WHERE dictionary = 'bdb'")
    bdb_map = dict(cur.fetchall())
    print(f"Loaded {len(bdb_map)} BDB headwords.")

    # Load LSJ headwords
    cur.execute("SELECT strongs, headword FROM lexicon_entries WHERE dictionary = 'lsj'")
    lsj_map = dict(cur.fetchall())
    print(f"Loaded {len(lsj_map)} LSJ headwords.")

    # Structure: (work_id, strongs) -> { 'corpus': str, 'lemma': str, 'books': { (title, sbl_abbrev): count } }
    stats = defaultdict(lambda: {'corpus': '', 'lemma': '', 'books': defaultdict(int)})

    # =========================================================================
    # 2. Process BHS (work_id = 2)
    # =========================================================================
    print("Aggregating BHS (work_id = 2)...")
    cur.execute('''
        SELECT 
            wd.strongs_number,
            wd.morph_code,
            wd.normalized,
            COALESCE(cw.title, 'Unknown') AS title,
            COALESCE(cw.sbl_abbreviation, cw.title, 'Unknown') AS sbl_abbreviation
        FROM words wd
        JOIN work_units wu ON wd.work_unit_id = wu.id
        JOIN canonical_refs cr ON wu.canonical_ref_id = cr.id
        JOIN canonical_works cw ON cr.canonical_work_id = cw.id
        WHERE wd.work_id = 2
    ''')

    bhs_count = 0
    for strongs_num, morph, norm_word, title, sbl_abbrev in cur.fetchall():
        bhs_count += 1
        book_key = (title, sbl_abbrev)

        # A. Main stem strongs
        if strongs_num:
            for s in strongs_num.split(','):
                norm_s = normalize_strongs(s)
                if norm_s:
                    rec = stats[(2, norm_s)]
                    rec['corpus'] = 'bhs'
                    if not rec['lemma']:
                        rec['lemma'] = bdb_map.get(norm_s) or norm_word or norm_s
                    rec['books'][book_key] += 1
        elif norm_word:
            pseudo_strongs = f'WORD:{norm_word}'
            rec = stats[(2, pseudo_strongs)]
            rec['corpus'] = 'bhs'
            if not rec['lemma']:
                rec['lemma'] = norm_word
            rec['books'][book_key] += 1

        # B. Prefix morphemes
        if morph:
            for p_code, (p_strongs, p_headword) in HEBREW_PREFIX_MAP.items():
                if p_code in morph:
                    rec = stats[(2, p_strongs)]
                    rec['corpus'] = 'bhs'
                    if not rec['lemma']:
                        rec['lemma'] = p_headword
                    rec['books'][book_key] += 1

    print(f"Processed {bhs_count} BHS words.")

    # =========================================================================
    # 3. Process Greek Works: Swete LXX (work_id = 24) & SBLGNT (work_id = 25)
    # =========================================================================
    for work_id, corpus_name in [(24, 'lxx'), (25, 'sblgnt')]:
        print(f"Aggregating {corpus_name.upper()} (work_id = {work_id})...")
        cur.execute('''
            SELECT 
                wd.strongs_number,
                wd.normalized,
                COALESCE(cw_parent.title, cw.title, 'Unknown') AS title,
                COALESCE(cw_parent.sbl_abbreviation, cw.sbl_abbreviation, cw.title, 'Unknown') AS sbl_abbreviation,
                count(*) as cnt
            FROM words wd
            JOIN work_units wu ON wd.work_unit_id = wu.id
            JOIN canonical_refs cr ON wu.canonical_ref_id = cr.id
            JOIN canonical_works cw ON cr.canonical_work_id = cw.id
            LEFT JOIN canonical_works cw_parent ON (
                cw.slug = cw_parent.slug || '-lxx' OR cw_parent.slug = cw.slug || '-lxx'
            )
            WHERE wd.work_id = ?
            GROUP BY wd.strongs_number, wd.normalized, COALESCE(cw_parent.id, cw.id)
        ''', (work_id,))

        greek_rows = cur.fetchall()
        for strongs_num, norm_word, title, sbl_abbrev, cnt in greek_rows:
            book_key = (title, sbl_abbrev)
            if strongs_num:
                for s in strongs_num.split(','):
                    norm_s = normalize_strongs(s)
                    if norm_s:
                        rec = stats[(work_id, norm_s)]
                        rec['corpus'] = corpus_name
                        if not rec['lemma']:
                            rec['lemma'] = lsj_map.get(norm_s) or norm_word or norm_s
                        rec['books'][book_key] += cnt
            elif norm_word:
                pseudo_strongs = f'WORD:{norm_word}'
                rec = stats[(work_id, pseudo_strongs)]
                rec['corpus'] = corpus_name
                if not rec['lemma']:
                    rec['lemma'] = norm_word
                rec['books'][book_key] += cnt

        print(f"Processed {len(greek_rows)} aggregated groups for {corpus_name.upper()}.")

    # =========================================================================
    # 4. Insert into lemma_stats
    # =========================================================================
    print(f"Total distinct lemma entries to insert: {len(stats)}...")
    cur.execute("DELETE FROM lemma_stats")

    insert_rows = []
    for (work_id, strongs), data in stats.items():
        # Sort books canonically or by count? Let's sort list of dicts
        # Order by book occurrence
        book_list = [
            {"title": b[0], "sbl_abbreviation": b[1], "count": c}
            for b, c in sorted(data['books'].items(), key=lambda x: -x[1])
        ]
        total_count = sum(b['count'] for b in book_list)

        insert_rows.append((
            work_id,
            data['corpus'],
            strongs,
            data['lemma'],
            total_count,
            json.dumps(book_list, ensure_ascii=False)
        ))

    cur.executemany('''
        INSERT INTO lemma_stats (work_id, corpus, strongs, lemma, total_count, book_counts_json)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', insert_rows)

    conn.commit()
    elapsed = time.time() - start_time
    print(f"[SUCCESS] Ingested {len(insert_rows)} rows into lemma_stats in {elapsed:.2f} seconds.")

    # =========================================================================
    # 5. Verification Spot Checks
    # =========================================================================
    spot_checks = [
        (2, 'H7225', 'BHS Reshith'),
        (2, 'H9003', 'BHS Preposition Beth'),
        (2, 'H1254', 'BHS Bara'),
        (24, 'G4160', 'LXX Poieo'),
        (24, 'G2316', 'LXX Theos'),
        (25, 'G2424', 'SBLGNT Jesus')
    ]

    print("\n--- Spot Check Verification ---")
    for wid, s, desc in spot_checks:
        cur.execute(
            "SELECT work_id, corpus, strongs, lemma, total_count, book_counts_json "
            "FROM lemma_stats WHERE work_id = ? AND strongs = ?",
            (wid, s)
        )
        row = cur.fetchone()
        if row:
            books_sample = json.loads(row[5])[:3]
            print(f"  {desc} ({s}): total={row[4]}, lemma='{row[3]}', top_books={books_sample}")
        else:
            print(f"  {desc} ({s}): NOT FOUND")

    conn.close()


if __name__ == '__main__':
    build_stats()

#!/usr/bin/env python3
"""
Pre-index Concordance References into SQLite database.

Target Table: concordance_refs
Database: /home/cbrannan/dev/2-tmp/biblical-data-pipeline/db-workspace/openscriptorium-working.sqlite3

Pre-indexes distinct verse references for:
  - BHS (Hebrew OT, work_id = 2): stems (H1-H8674) + prefix particles (H9000, H9003, H9005, etc.)
  - Swete LXX (Greek OT, work_id = 24): G1-G5624 + LXX extras
  - SBLGNT (Greek NT, work_id = 25): G1-G5624

Allows O(1) single-page retrieval of concordance references (Gen 1:1, Exod 3:14)
without reading full verse bodies or performing multi-table scans over HTTP-VFS.
"""

import os
import re
import sqlite3
import time

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
    if s.isdigit():
        return f'H{s}'
    return s.upper()


def build_concordance_refs():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database not found: {DB_PATH}")

    print(f"Connecting to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    start_time = time.time()

    # 1. Create table and index
    print("Creating concordance_refs table and index...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS concordance_refs (
            work_id INTEGER NOT NULL,
            strongs TEXT NOT NULL,
            lemma TEXT NOT NULL,
            ref_label TEXT NOT NULL,
            work_unit_id INTEGER NOT NULL,
            PRIMARY KEY (work_id, strongs, work_unit_id)
        ) WITHOUT ROWID
    ''')
    cur.execute('''
        CREATE INDEX IF NOT EXISTS idx_concordance_refs_lemma 
        ON concordance_refs(work_id, lemma, work_unit_id)
    ''')

    # Load BDB headwords
    cur.execute("SELECT strongs, headword FROM lexicon_entries WHERE dictionary = 'bdb'")
    bdb_map = dict(cur.fetchall())
    print(f"Loaded {len(bdb_map)} BDB headwords.")

    # Load LSJ headwords
    cur.execute("SELECT strongs, headword FROM lexicon_entries WHERE dictionary = 'lsj'")
    lsj_map = dict(cur.fetchall())
    print(f"Loaded {len(lsj_map)} LSJ headwords.")

    # Clear existing entries in concordance_refs
    cur.execute("DELETE FROM concordance_refs")
    conn.commit()

    # =========================================================================
    # 2. Process BHS (work_id = 2)
    # =========================================================================
    print("Extracting BHS occurrences (work_id = 2)...")
    cur.execute('''
        SELECT 
            wd.strongs_number,
            wd.morph_code,
            wd.normalized,
            cr.sbl_citation,
            wd.work_unit_id
        FROM words wd
        JOIN work_units wu ON wd.work_unit_id = wu.id
        JOIN canonical_refs cr ON wu.canonical_ref_id = cr.id
        WHERE wd.work_id = 2
        ORDER BY wd.work_unit_id
    ''')

    bhs_records = set()
    bhs_word_count = 0
    for strongs_num, morph, norm_word, ref_label, wu_id in cur.fetchall():
        bhs_word_count += 1
        # A. Prefixes from morph_code
        if morph:
            for p_code, (p_strongs, p_headword) in HEBREW_PREFIX_MAP.items():
                if p_code in morph:
                    bhs_records.add((2, p_strongs, p_headword, ref_label, wu_id))
            # Standalone prepositions with suffixes (e.g., 'בו', 'להם', 'לי')
            if 'Prep' in morph:
                if norm_word:
                    first_char = norm_word[0]
                    if first_char == 'ב':
                        bhs_records.add((2, 'H9003', 'בְּ', ref_label, wu_id))
                    elif first_char == 'ל':
                        bhs_records.add((2, 'H9005', 'לְ', ref_label, wu_id))
                    elif first_char == 'מ':
                        bhs_records.add((2, 'H9006', 'מִ', ref_label, wu_id))
                    elif first_char == 'כ':
                        bhs_records.add((2, 'H9004', 'כְּ', ref_label, wu_id))

        # B. Stem Strong's
        if strongs_num:
            for s in strongs_num.split(','):
                norm_s = normalize_strongs(s)
                if norm_s:
                    lemma = bdb_map.get(norm_s) or norm_word or norm_s
                    bhs_records.add((2, norm_s, lemma, ref_label, wu_id))
        elif norm_word:
            bhs_records.add((2, f'WORD:{norm_word}', norm_word, ref_label, wu_id))

    print(f"Processed {bhs_word_count} BHS words -> {len(bhs_records)} distinct verse occurrences.")
    print("Inserting BHS records into concordance_refs...")
    cur.executemany('''
        INSERT OR IGNORE INTO concordance_refs (work_id, strongs, lemma, ref_label, work_unit_id)
        VALUES (?, ?, ?, ?, ?)
    ''', list(bhs_records))
    conn.commit()
    del bhs_records

    # =========================================================================
    # 3. Process Greek Works: Swete LXX (work_id = 24) & SBLGNT (work_id = 25)
    # =========================================================================
    for work_id, corpus_name in [(24, 'LXX'), (25, 'SBLGNT')]:
        print(f"Extracting {corpus_name} occurrences (work_id = {work_id})...")
        cur.execute('''
            SELECT 
                wd.strongs_number,
                wd.normalized,
                cr.sbl_citation,
                wd.work_unit_id
            FROM words wd
            JOIN work_units wu ON wd.work_unit_id = wu.id
            JOIN canonical_refs cr ON wu.canonical_ref_id = cr.id
            WHERE wd.work_id = ?
            ORDER BY wd.work_unit_id
        ''', (work_id,))

        greek_records = set()
        greek_count = 0
        for strongs_num, norm_word, ref_label, wu_id in cur.fetchall():
            greek_count += 1
            if strongs_num:
                for s in strongs_num.split(','):
                    norm_s = normalize_strongs(s)
                    if norm_s:
                        lemma = lsj_map.get(norm_s) or norm_word or norm_s
                        greek_records.add((work_id, norm_s, lemma, ref_label, wu_id))
            elif norm_word:
                greek_records.add((work_id, f'WORD:{norm_word}', norm_word, ref_label, wu_id))

        print(f"Processed {greek_count} {corpus_name} words -> {len(greek_records)} distinct verse occurrences.")
        print(f"Inserting {corpus_name} records into concordance_refs...")
        cur.executemany('''
            INSERT OR IGNORE INTO concordance_refs (work_id, strongs, lemma, ref_label, work_unit_id)
            VALUES (?, ?, ?, ?, ?)
        ''', list(greek_records))
        conn.commit()
        del greek_records

    elapsed = time.time() - start_time
    cur.execute("SELECT count(*) FROM concordance_refs")
    total_refs = cur.fetchone()[0]
    print(f"\n[SUCCESS] Populated concordance_refs with {total_refs} rows in {elapsed:.2f} seconds.")

    # =========================================================================
    # 4. Spot Checks
    # =========================================================================
    print("\n--- Spot Check Verification ---")
    test_cases = [
        (2, 'H7225', 'BHS Reshith (H7225)'),
        (2, 'H9003', 'BHS Beth preposition (H9003)'),
        (2, 'H1254', 'BHS Bara (H1254)'),
        (24, 'G4160', 'LXX Poieo (G4160)'),
        (24, 'G2316', 'LXX Theos (G2316)'),
        (25, 'G2424', 'SBLGNT Jesus (G2424)'),
    ]

    for wid, s_code, label in test_cases:
        cur.execute('''
            SELECT ref_label, work_unit_id 
            FROM concordance_refs 
            WHERE work_id = ? AND strongs = ? 
            ORDER BY work_unit_id 
            LIMIT 5
        ''', (wid, s_code))
        results = cur.fetchall()
        refs = [r[0] for r in results]
        cur.execute('SELECT count(*) FROM concordance_refs WHERE work_id = ? AND strongs = ?', (wid, s_code))
        cnt = cur.fetchone()[0]
        print(f"  {label}: total distinct verses={cnt}, first 5={refs}")

    conn.close()


if __name__ == '__main__':
    build_concordance_refs()

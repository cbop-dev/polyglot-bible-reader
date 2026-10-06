#!/usr/bin/env python3
"""
Ingest Unabridged BDB Hebrew Lexicon from DictBDB.json into SQLite3 database.

Source: /home/cbrannan/dev/2-tmp/biblical-data-pipeline/downloads/unabridged-BDB-Hebrew-lexicon/DictBDB.json
Target: /home/cbrannan/dev/2-tmp/biblical-data-pipeline/db-workspace/openscriptorium-working.sqlite3
Table:  lexicon_entries

Notes:
- Replaces corrupted letter-split BDB data with authentic Strong's-keyed BDB entries.
- Preserves distinct homonyms (e.g. H1 vs H3 for 'אב', H56 vs H57 for 'אבל').
- Preserves existing LSJ Greek entries intact.
"""

import json
import os
import re
import sqlite3
import unicodedata

DB_PATH = '/home/cbrannan/dev/2-tmp/biblical-data-pipeline/db-workspace/openscriptorium-working.sqlite3'
SRC_JSON_PATH = '/home/cbrannan/dev/2-tmp/biblical-data-pipeline/downloads/unabridged-BDB-Hebrew-lexicon/DictBDB.json'

HEBREW_DIAC_REGEX = re.compile(r'[\u0591-\u05C7]')
PUNCT_REGEX = re.compile(r'[\(\)\[\]⟦⟧⟨⟩\.,;׃׀־\s]+')


def strip_hebrew(s: str) -> str:
    """Removes Hebrew vowels (niqqud) and cantillation marks to yield consonant key."""
    if not s:
        return ''
    cleaned = HEBREW_DIAC_REGEX.sub('', s)
    cleaned = PUNCT_REGEX.sub('', cleaned).strip()
    return cleaned


def extract_headword_and_key(top: str, defn: str):
    """
    Extracts the pointed Hebrew headword and unpointed consonant key from definition HTML.
    
    1. Looks for <ref0 ... entry="..."> tag (99.6% of entries)
    2. Falls back to <font class='c3'> Hebrew content
    3. Falls back to transliteration title in <b> tag for compound proper names
    """
    headword = None

    # Primary: ref0 entry attribute
    m_ref = re.search(r'<ref0[^>]*entry=[\"\']([^\"\']+)[\"\']', defn)
    if m_ref:
        raw = m_ref.group(1).strip()
        # Some entries have multiple comma-separated variants, e.g. "אֲבַדּוֺ אֲבַדֹּה,"
        parts = [p.strip() for p in raw.split(',') if p.strip()]
        if parts:
            first_part = parts[0].split()[0].strip()
            headword = first_part.strip('[]⟦⟧()')

    # Fallback 1: font class c3
    if not headword:
        m_font = re.search(r'<font class=[\"\']c3[\"\']>([^<]+)</font>', defn)
        if m_font:
            raw = m_font.group(1).strip()
            parts = [p.strip() for p in raw.split(',') if p.strip()]
            if parts:
                headword = parts[0].split()[0].strip().strip('[]⟦⟧()')

    # Fallback 2: bold title for cross-references / English transliteration (e.g. H62 Abel Beth-maakah)
    if not headword:
        m_title = re.search(r'<b>H\d+\.?\s*([^<]+)</b>', defn)
        if m_title:
            headword = m_title.group(1).strip()
        else:
            headword = top

    key = strip_hebrew(headword) or headword
    return headword, key


def ingest_bdb():
    if not os.path.exists(SRC_JSON_PATH):
        raise FileNotFoundError(f"Source JSON not found: {SRC_JSON_PATH}")
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Target DB not found: {DB_PATH}")

    print(f"Reading {SRC_JSON_PATH}...")
    with open(SRC_JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Loaded {len(data)} items from JSON.")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Ensure table exists
    cur.execute('''
        CREATE TABLE IF NOT EXISTS lexicon_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dictionary TEXT NOT NULL,
            key TEXT NOT NULL,
            headword TEXT,
            strongs TEXT,
            lsj_index TEXT,
            match_type TEXT,
            definition TEXT NOT NULL
        )
    ''')

    # Drop old unique index on (dictionary, key) because homonyms share identical consonant keys
    cur.execute("DROP INDEX IF EXISTS idx_lexicon_dict_key")
    cur.execute("DROP INDEX IF EXISTS idx_lexicon_dict_strongs")

    # Create proper indexes:
    # 1. Unique on (dictionary, strongs) for non-null strongs (each Strong's entry in BDB is unique)
    cur.execute('''
        CREATE UNIQUE INDEX IF NOT EXISTS idx_lexicon_dict_strongs 
        ON lexicon_entries(dictionary, strongs) 
        WHERE strongs IS NOT NULL
    ''')
    # 2. Non-unique index on (dictionary, key) to support looking up by consonant root/lemma
    cur.execute('CREATE INDEX IF NOT EXISTS idx_lexicon_dict_key ON lexicon_entries(dictionary, key)')
    # 3. Non-unique index on (dictionary, headword)
    cur.execute('CREATE INDEX IF NOT EXISTS idx_lexicon_dict_headword ON lexicon_entries(dictionary, headword)')

    # Clear only existing BDB entries (preserving LSJ Greek entries)
    cur.execute("DELETE FROM lexicon_entries WHERE dictionary = 'bdb'")
    print(f"Cleared existing BDB records from lexicon_entries. Deleted {cur.rowcount} rows.")

    rows_to_insert = []
    skipped = 0

    for item in data:
        top = item.get('top', '').strip()
        if not top or top == 'DictInfo':
            skipped += 1
            continue

        defn = item.get('def', '').strip()
        headword, key = extract_headword_and_key(top, defn)
        strongs = top.upper()

        rows_to_insert.append((
            'bdb',
            key,
            headword,
            strongs,
            None,           # lsj_index
            'strongs',      # match_type
            defn
        ))

    print(f"Prepared {len(rows_to_insert)} BDB rows (skipped {skipped} metadata items).")

    cur.executemany('''
        INSERT INTO lexicon_entries (dictionary, key, headword, strongs, lsj_index, match_type, definition)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', rows_to_insert)

    conn.commit()

    # Verification query
    cur.execute("SELECT count(*) FROM lexicon_entries WHERE dictionary = 'bdb'")
    total_bdb = cur.fetchone()[0]
    print(f"[SUCCESS] Ingested {total_bdb} BDB entries into lexicon_entries.")

    # Spot checks
    checks = ['H7225', 'H1254', 'H9003', 'H9000', 'H1', 'H3']
    print("\n--- Spot check verification ---")
    for s in checks:
        cur.execute(
            "SELECT id, dictionary, key, headword, strongs, substr(definition, 1, 80) "
            "FROM lexicon_entries WHERE dictionary = 'bdb' AND strongs = ?",
            (s,)
        )
        row = cur.fetchone()
        if row:
            print(f"  {s}: id={row[0]} | key='{row[2]}' | headword='{row[3]}' | snippet={row[5]}...")
        else:
            print(f"  {s}: NOT FOUND")

    conn.close()
    print("\nDone. Please run chunk_database.py to update static/db chunks if this was executed.")


if __name__ == '__main__':
    ingest_bdb()

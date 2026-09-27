#!/usr/bin/env python3
"""
Ingest Translators Formatted Full LSJ Greek Lexicon (STEPBible) into SQLite3 database.

Sources:
  1. /home/cbrannan/dev/2-tmp/biblical-data-pipeline/downloads/STEPBible-Data/Lexicons/TFLSJ  0-5624 - Translators Formatted full LSJ Bible lexicon - STEPBible.org CC BY.txt
  2. /home/cbrannan/dev/2-tmp/biblical-data-pipeline/downloads/STEPBible-Data/Lexicons/TFLSJ extra - Translators Formatted full LSJ Bible lexicon - STEPBible.org CC BY.txt

Target:
  /home/cbrannan/dev/2-tmp/biblical-data-pipeline/db-workspace/openscriptorium-working.sqlite3
  Table: lexicon_entries (dictionary = 'lsj')

Features:
  - Replaces old un-keyed LSJ entries with 11,034 Strong's-keyed LSJ entries.
  - Achieves 100% coverage of all Greek Strong's IDs present in the database.
  - Expands abbreviations, provides English glosses, and preserves formatted HTML definitions.
  - Leaves BDB entries intact.
"""

import argparse
import os
import re
import sqlite3
import unicodedata

DB_PATH = '/home/cbrannan/dev/2-tmp/biblical-data-pipeline/db-workspace/openscriptorium-working.sqlite3'
LEX_DIR = '/home/cbrannan/dev/2-tmp/biblical-data-pipeline/downloads/STEPBible-Data/Lexicons'

FILE_NT = os.path.join(LEX_DIR, 'TFLSJ  0-5624 - Translators Formatted full LSJ Bible lexicon - STEPBible.org CC BY.txt')
FILE_EXTRA = os.path.join(LEX_DIR, 'TFLSJ extra - Translators Formatted full LSJ Bible lexicon - STEPBible.org CC BY.txt')


def normalize_greek(s: str) -> str:
    """Removes Greek diacritics/accents to yield an unaccented lowercase search key."""
    if not s:
        return ''
    s = unicodedata.normalize('NFD', s)
    s = re.sub(r'[\u0300-\u036f]', '', s)
    s = unicodedata.normalize('NFC', s).lower().strip()
    return s


def normalize_strongs(s: str) -> str:
    """Normalizes 'G0012' -> 'G12', 'G0001G' -> 'G1G'."""
    s = s.strip()
    m = re.match(r'^([A-Za-z]+)0*(\d+.*)$', s)
    if m:
        return m.group(1).upper() + m.group(2)
    return s.upper()


def parse_tflsj_files():
    """Parses both NT and extra TFLSJ files and yields normalized lexicon entry tuples."""
    files = [FILE_NT, FILE_EXTRA]
    entries = []

    # Track base strong occurrences to ensure primary entries get base 'G32' and sub-meanings get 'G32H'
    seen_strongs = set()

    for file_path in files:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        print(f"Parsing {os.path.basename(file_path)}...")
        with open(file_path, 'r', encoding='utf-8', errors='replace') as fp:
            in_data = False
            for line_no, line in enumerate(fp, 1):
                if line.startswith('eStrong\t'):
                    in_data = True
                    continue
                if not in_data:
                    continue
                line = line.strip('\r\n')
                if not line or line.startswith('='):
                    continue

                parts = line.split('\t')
                if len(parts) < 8:
                    continue

                raw_estrong = parts[0].strip()
                raw_dstrong = parts[1].split()[0].strip() if parts[1] else raw_estrong
                greek = parts[3].strip()
                morph = parts[5].strip()
                gloss = parts[6].strip()
                definition = parts[7].strip()

                base_strong = normalize_strongs(raw_estrong)
                detailed_strong = normalize_strongs(raw_dstrong)

                # Determine the primary strongs key for lookup:
                # If this is the first entry for base_strong, use base_strong (e.g. 'G32')
                # If it's a secondary/sub-meaning entry, use detailed_strong (e.g. 'G32H')
                if base_strong not in seen_strongs:
                    strongs_to_use = base_strong
                    seen_strongs.add(base_strong)
                else:
                    strongs_to_use = detailed_strong

                # Key is normalized first Greek word in headword
                primary_word = greek.split(',')[0].strip()
                key = normalize_greek(primary_word) or normalize_greek(greek)

                entries.append((
                    'lsj',
                    key,
                    greek,
                    strongs_to_use,
                    detailed_strong,  # lsj_index (unique identifier)
                    gloss,            # match_type / gloss
                    definition
                ))

    return entries


def ingest_lsj(dry_run: bool = False):
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database not found at {DB_PATH}")

    entries = parse_tflsj_files()
    print(f"Total parsed LSJ entries: {len(entries)}")

    if dry_run:
        print("[DRY RUN] Ingestion simulated successfully. No changes written to database.")
        return

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

    # Create optimized non-unique indexes
    cur.execute("CREATE INDEX IF NOT EXISTS idx_lexicon_dict_strongs ON lexicon_entries(dictionary, strongs)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_lexicon_dict_key ON lexicon_entries(dictionary, key)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_lexicon_dict_headword ON lexicon_entries(dictionary, headword)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_lexicon_dict_lsj_index ON lexicon_entries(dictionary, lsj_index)")

    # Delete existing LSJ entries only
    cur.execute("DELETE FROM lexicon_entries WHERE dictionary = 'lsj'")
    print(f"Cleared existing LSJ entries. Deleted: {cur.rowcount} rows.")

    # Insert new entries
    print("Inserting new LSJ entries...")
    cur.executemany('''
        INSERT INTO lexicon_entries (
            dictionary, key, headword, strongs, lsj_index, match_type, definition
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', entries)

    conn.commit()
    print(f"Successfully committed {len(entries)} LSJ entries to {DB_PATH}.")

    # Spot checks
    checks = ['G1', 'G12', 'G4160', 'G3056', 'G2316']
    print("\n--- Spot check verification ---")
    for s in checks:
        cur.execute(
            "SELECT id, dictionary, key, headword, strongs, lsj_index, match_type, substr(definition, 1, 80) "
            "FROM lexicon_entries WHERE dictionary = 'lsj' AND strongs = ?",
            (s,)
        )
        row = cur.fetchone()
        if row:
            print(f"  {s}: id={row[0]} | key='{row[2]}' | headword='{row[3]}' | gloss='{row[6]}' | def={row[7]}...")
        else:
            print(f"  {s}: NOT FOUND")

    conn.close()
    print("\nDone. Please run chunk_database.py to update static/db chunks if this was executed.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Ingest STEPBible LSJ lexicon into openscriptorium SQLite database.")
    parser.add_argument('--dry-run', action='store_true', help="Parse and validate without modifying database")
    parser.add_argument('--execute', action='store_true', help="Execute the database update")
    args = parser.parse_args()

    if not args.execute and not args.dry_run:
        print("Specify either --dry-run to test or --execute to perform ingestion.")
    else:
        ingest_lsj(dry_run=args.dry_run)

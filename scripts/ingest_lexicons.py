import sqlite3
import json
import glob
import os
import re
import unicodedata
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DEFAULT_DB_PATH = os.path.join(REPO_ROOT, 'pipeline', 'build', 'polyglot-working.sqlite3')
DB_PATH = os.environ.get('POLYGLOT_DB_PATH', DEFAULT_DB_PATH)
STATIC_DIR = os.path.join(REPO_ROOT, 'static', 'data', 'lexicons')

HEBREW_DIAC_REGEX = re.compile(r'[\u0591-\u05C7]')
GREEK_DIAC_REGEX = re.compile(r'[\u0300-\u036f\u0313\u0314\u0342\u0345\u0308\u0304\u0305\u0306\'⸂⸃⸆⸇⸀⸁⸄⸅⸈⸉⸊⸋\[\]⟦⟧⟨⟩\(\)†‡*0-9\s.,;·:!?\-—]+')

def strip_hebrew(s):
    if not s: return ''
    return HEBREW_DIAC_REGEX.sub('', s).strip()

def normalize_greek(s):
    if not s: return ''
    norm = unicodedata.normalize('NFD', s)
    return GREEK_DIAC_REGEX.sub('', norm).lower().replace('ς', 'σ').strip()

def ingest():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

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
    cur.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_lexicon_dict_key ON lexicon_entries(dictionary, key)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_lexicon_dict_headword ON lexicon_entries(dictionary, headword)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_lexicon_dict_strongs ON lexicon_entries(dictionary, strongs)')

    # Clear existing entries in lexicon_entries if any
    cur.execute('DELETE FROM lexicon_entries')

    # 1. Ingest BDB
    bdb_dir = os.path.join(STATIC_DIR, 'bdb')
    bdb_files = glob.glob(os.path.join(bdb_dir, '*.json'))
    bdb_rows = []
    for f in bdb_files:
        with open(f, 'r', encoding='utf-8') as fp:
            data = json.load(fp)
            for key, val in data.items():
                plain_key = strip_hebrew(key)
                headword = val.get('headword', key)
                strongs = val.get('strongs')
                # Protect particle strongs from corrupt cross-references in legacy JSON files
                if strongs == 'H9003' and plain_key != 'ב':
                    strongs = None
                elif strongs == 'H9000' and plain_key != 'ו':
                    strongs = None
                elif strongs == 'H9005' and plain_key != 'ל':
                    strongs = None
                elif strongs == 'H9004' and plain_key != 'כ':
                    strongs = None
                match_type = val.get('matchType')
                definition = val.get('def', '')
                bdb_rows.append(('bdb', plain_key, headword, strongs, None, match_type, definition))

    cur.executemany('''
        INSERT OR REPLACE INTO lexicon_entries (dictionary, key, headword, strongs, lsj_index, match_type, definition)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', bdb_rows)
    print(f'Ingested {len(bdb_rows)} BDB entries.')

    # 2. Ingest LSJ
    lsj_dir = os.path.join(STATIC_DIR, 'lsj')
    lsj_files = glob.glob(os.path.join(lsj_dir, '*.json'))
    lsj_rows = []
    for f in lsj_files:
        with open(f, 'r', encoding='utf-8') as fp:
            data = json.load(fp)
            for key, val in data.items():
                plain_key = normalize_greek(key)
                headword = val.get('headword', key)
                lsj_index = str(val.get('lsjIndex', '')) if val.get('lsjIndex') is not None else None
                match_type = val.get('matchType')
                definition = val.get('def', '')
                lsj_rows.append(('lsj', plain_key, headword, None, lsj_index, match_type, definition))

    cur.executemany('''
        INSERT OR REPLACE INTO lexicon_entries (dictionary, key, headword, strongs, lsj_index, match_type, definition)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', lsj_rows)
    print(f'Ingested {len(lsj_rows)} LSJ entries.')

    conn.commit()
    conn.close()

if __name__ == '__main__':
    ingest()

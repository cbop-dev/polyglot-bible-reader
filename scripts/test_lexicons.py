import sqlite3
import re
import unicodedata

DB_PATH = '/home/cbrannan/dev/2-tmp/biblical-data-pipeline/db-workspace/openscriptorium-working.sqlite3'

HEBREW_DIAC_REGEX = re.compile(r'[\u0591-\u05C7]')
GREEK_DIAC_REGEX = re.compile(r'[\u0300-\u036f\u0313\u0314\u0342\u0345\u0308\u0304\u0305\u0306\'⸂⸃⸆⸇⸀⸁⸄⸅⸈⸉⸊⸋\[\]⟦⟧⟨⟩\(\)†‡*0-9\s.,;·:!?\-—]+')

def strip_hebrew(s):
    if not s: return ''
    return HEBREW_DIAC_REGEX.sub('', s).strip()

def normalize_greek(s):
    if not s: return ''
    norm = unicodedata.normalize('NFD', s)
    return GREEK_DIAC_REGEX.sub('', norm).lower().replace('ς', 'σ').strip()

def test_lexicons():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print('=== TEST 2(a): Basic entry lookup in each lexicon ===')
    # BDB: "ברא"
    bdb_key = strip_hebrew('ברא')
    cur.execute('SELECT dictionary, key, headword, strongs, definition FROM lexicon_entries WHERE dictionary = ? AND key = ?', ('bdb', bdb_key))
    bdb_row = cur.fetchone()
    assert bdb_row is not None, f'BDB lookup failed for key: {bdb_key}'
    print(f'[PASS] BDB basic lookup for "{bdb_key}":')
    print(f'       Headword: {bdb_row[2]}')
    print(f'       Strong\'s: {bdb_row[3]}')
    print(f'       Definition preview: {bdb_row[4][:120]}...')
    assert 'H1254' in bdb_row[3] or 'bara' in bdb_row[4], 'Unexpected BDB entry content'

    # LSJ: "ποιέω"
    lsj_key = normalize_greek('ποιέω')
    cur.execute('SELECT dictionary, key, headword, lsj_index, definition FROM lexicon_entries WHERE dictionary = ? AND key = ?', ('lsj', lsj_key))
    lsj_row = cur.fetchone()
    assert lsj_row is not None, f'LSJ lookup failed for key: {lsj_key}'
    print(f'[PASS] LSJ basic lookup for "ποιέω" (normalized: "{lsj_key}"):')
    print(f'       Headword: {lsj_row[2]}')
    print(f'       LSJ Index: {lsj_row[3]}')
    print(f'       Definition preview: {lsj_row[4][:120]}...')
    assert 'ποιέω' in lsj_row[2] or 'make' in lsj_row[4] or 'Dor.' in lsj_row[4], 'Unexpected LSJ entry content'

    print('\n=== TEST 2(b): Biblical text -> Word token -> Lexicon entry lookup ===')
    # 1. BHS (wlc) Gen 1:1, 2nd word בָּרָא
    cur.execute('''
        SELECT wd.position, wd.surface, wd.normalized, wd.strongs_number
        FROM words wd
        JOIN work_units wu ON wd.work_unit_id = wu.id
        JOIN works w ON wu.work_id = w.id
        JOIN canonical_refs cr ON wu.canonical_ref_id = cr.id
        JOIN canonical_works cw ON cr.canonical_work_id = cw.id
        WHERE cw.slug = 'genesis' AND cr.hierarchy = '1,1' AND w.slug = 'wlc'
        ORDER BY wd.position
    ''')
    bhs_words = cur.fetchall()
    print(f'Found {len(bhs_words)} words in BHS Gen 1:1.')
    word2 = bhs_words[1]  # 2nd word (1-indexed: position 2)
    print(f'Word 2: position={word2[0]}, surface={word2[1]}, normalized={word2[2]}, strongs={word2[3]}')
    
    # Lookup in BDB using normalized form
    bhs_lookup_key = strip_hebrew(word2[2] or word2[1])
    cur.execute('SELECT headword, strongs, definition FROM lexicon_entries WHERE dictionary = ? AND key = ?', ('bdb', bhs_lookup_key))
    bhs_lex = cur.fetchone()
    assert bhs_lex is not None, f'Could not find BDB entry for BHS word: {bhs_lookup_key}'
    print(f'[PASS] Successfully mapped BHS Gen 1:1 word 2 ({word2[1]}) -> key "{bhs_lookup_key}" -> BDB:')
    print(f'       Headword: {bhs_lex[0]}, Strong\'s: {bhs_lex[1]}')
    print(f'       Definition preview: {bhs_lex[2][:120]}...')

    # 2. LXX (swete-lxx) Gen 1:1, 3rd word ἐποίησεν
    cur.execute('''
        SELECT wd.position, wd.surface, wd.normalized, wd.strongs_number
        FROM words wd
        JOIN work_units wu ON wd.work_unit_id = wu.id
        JOIN works w ON wu.work_id = w.id
        JOIN canonical_refs cr ON wu.canonical_ref_id = cr.id
        JOIN canonical_works cw ON cr.canonical_work_id = cw.id
        WHERE cw.slug = 'genesis' AND cr.hierarchy = '1,1' AND w.slug = 'swete-lxx'
        ORDER BY wd.position
    ''')
    lxx_words = cur.fetchall()
    print(f'\nFound {len(lxx_words)} words in LXX Gen 1:1.')
    word3 = lxx_words[2]  # 3rd word (1-indexed: position 3)
    print(f'Word 3: position={word3[0]}, surface={word3[1]}, normalized={word3[2]}, strongs={word3[3]}')

    # Lookup in LSJ using normalized form
    lxx_lookup_key = normalize_greek(word3[2] or word3[1])
    cur.execute('SELECT headword, lsj_index, definition FROM lexicon_entries WHERE dictionary = ? AND key = ?', ('lsj', lxx_lookup_key))
    lxx_lex = cur.fetchone()
    assert lxx_lex is not None, f'Could not find LSJ entry for LXX word: {lxx_lookup_key}'
    print(f'[PASS] Successfully mapped LXX Gen 1:1 word 3 ({word3[1]}) -> key "{lxx_lookup_key}" -> LSJ:')
    print(f'       Headword: {lxx_lex[0]}, LSJ Index: {lxx_lex[1]}')
    print(f'       Definition preview: {lxx_lex[2][:120]}...')

    print('\nALL TESTS PASSED SUCCESSFULLY!')
    conn.close()

if __name__ == '__main__':
    test_lexicons()

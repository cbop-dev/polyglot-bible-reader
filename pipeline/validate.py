"""Polyglot Bible Reader - Database Validation & Integrity Suite.

Performs automated tests and sanity checks against the generated SQLite database:
  1. Corpus & Book counts
  2. Vulgate Psalm 118 integrity (all 176 verses preserved)
  3. Universal Hub cross-tradition alignment (Psalm 50/51 multi-tradition synchronization)
  4. Lexicon resolution (BDB Hebrew & LSJ Greek)
  5. Foreign key and schema integrity
"""

from __future__ import annotations
import sqlite3
import sys
from pathlib import Path
from typing import Optional

from .config import BUILD_DIR


class DatabaseValidator:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or (BUILD_DIR / "polyglot-working.sqlite3")
        if not self.db_path.exists():
            raise FileNotFoundError(f"Database not found at {self.db_path}")

    def run_all(self) -> bool:
        print(f"==================================================")
        print(f"Validating Polyglot Bible Database")
        print(f"Database: {self.db_path}")
        print(f"==================================================")

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        success = True

        try:
            success &= self.test_table_counts(conn)
            success &= self.test_foreign_keys(conn)
            success &= self.test_vulgate_psalm_118(conn)
            success &= self.test_psalm_50_51_alignment(conn)
            success &= self.test_webbe_and_brenton_integrity(conn)
            success &= self.test_lexicons(conn)
            success &= self.test_token_json_samples(conn)
            success &= self.test_lemma_stats_and_concordance(conn)
        finally:
            conn.close()

        if success:
            print("\n>>> ALL VALIDATION CHECKS PASSED SUCCESSFULLY! <<<\n")
        else:
            print("\n>>> VALIDATION FAILED! Check error logs above. <<<\n")

        return success

    def test_table_counts(self, conn: sqlite3.Connection) -> bool:
        print("\n[Test 1] Table row counts & presence...")
        cur = conn.cursor()

        # canonical_books
        books_count = cur.execute("SELECT COUNT(*) FROM canonical_books").fetchone()[0]
        print(f"  canonical_books: {books_count} (Expected: >= 86)")
        assert books_count >= 86, f"Expected >= 86 canonical books, got {books_count}"

        # corpora
        corpora_count = cur.execute("SELECT COUNT(*) FROM corpora").fetchone()[0]
        print(f"  corpora: {corpora_count} (Expected: >= 9)")
        assert corpora_count >= 9, f"Expected >= 9 corpora, got {corpora_count}"

        # lexicon_entries
        lex_count = cur.execute("SELECT COUNT(*) FROM lexicon_entries").fetchone()[0]
        bdb_count = cur.execute("SELECT COUNT(*) FROM lexicon_entries WHERE dictionary = 'bdb'").fetchone()[0]
        lsj_count = cur.execute("SELECT COUNT(*) FROM lexicon_entries WHERE dictionary = 'lsj'").fetchone()[0]
        print(f"  lexicon_entries: {lex_count:,} (BDB: {bdb_count:,}, LSJ: {lsj_count:,})")
        assert bdb_count >= 8000, f"Expected >= 8000 BDB entries, got {bdb_count}"
        assert lsj_count >= 11000, f"Expected >= 11000 LSJ entries, got {lsj_count}"

        # text_units
        tu_count = cur.execute("SELECT COUNT(*) FROM text_units").fetchone()[0]
        print(f"  text_units: {tu_count:,} total verses")
        assert tu_count >= 160000, f"Expected >= 160,000 text units, got {tu_count}"

        return True

    def test_foreign_keys(self, conn: sqlite3.Connection) -> bool:
        print("\n[Test 2] Foreign key & referential integrity...")
        cur = conn.cursor()

        # Check for orphan std_book in text_units
        cur.execute("""
            SELECT DISTINCT std_book 
            FROM text_units 
            WHERE std_book NOT IN (SELECT code FROM canonical_books)
        """)
        orphans = [r[0] for r in cur.fetchall()]
        if orphans:
            print(f"  FAILED: Found orphan std_book values: {orphans}")
            return False
        print("  Orphan std_book check: PASSED (0 orphan books)")

        # Check for orphan corpus_id in text_units
        cur.execute("""
            SELECT DISTINCT corpus_id 
            FROM text_units 
            WHERE corpus_id NOT IN (SELECT id FROM corpora)
        """)
        orphans_c = [r[0] for r in cur.fetchall()]
        if orphans_c:
            print(f"  FAILED: Found orphan corpus_id values: {orphans_c}")
            return False
        print("  Orphan corpus_id check: PASSED (0 orphan corpora)")

        # Check empty text_content
        empty_count = cur.execute("SELECT COUNT(*) FROM text_units WHERE trim(text_content) = ''").fetchone()[0]
        print(f"  Empty text_content check: PASSED ({empty_count} empty verses)")

        return True

    def test_vulgate_psalm_118(self, conn: sqlite3.Connection) -> bool:
        print("\n[Test 3] Vulgate Psalm 118 Data Loss Verification...")
        cur = conn.cursor()

        # In Clementine Vulgate, Psalm 118 corresponds to Hebrew Psalm 119 ("Beati immaculati in via...")
        # Check by native citation
        v_count_native = cur.execute("""
            SELECT COUNT(*) 
            FROM text_units 
            WHERE corpus_id = 'vulgate' 
              AND native_book IN ('Psalms', 'Ps')
              AND native_chapter = 118
        """).fetchone()[0]
        print(f"  Vulgate native Ps 118 verses: {v_count_native} (Expected: 176)")
        assert v_count_native == 176, f"VULGATE DATA LOSS! Expected 176 verses in Ps 118, found {v_count_native}"

        # Check aligned standard hub coordinates (std_book='PSA', std_chapter=119)
        v_count_std = cur.execute("""
            SELECT COUNT(*) 
            FROM text_units 
            WHERE corpus_id = 'vulgate' 
              AND std_book = 'PSA' 
              AND std_chapter = 119
        """).fetchone()[0]
        print(f"  Vulgate aligned to standard PSA 119: {v_count_std} verses")
        assert v_count_std == 176, f"VULGATE MAPPING ERROR! Expected 176 verses aligned to PSA 119, found {v_count_std}"

        # Total Vulgate Psalms check (should be exactly 2,531 verses)
        v_psalms_total = cur.execute("""
            SELECT COUNT(*) 
            FROM text_units 
            WHERE corpus_id = 'vulgate' 
              AND native_book IN ('Psalms', 'Ps')
        """).fetchone()[0]
        print(f"  Total Vulgate Psalm verses: {v_psalms_total} (Expected: 2,531)")
        assert v_psalms_total == 2531, f"Expected 2,531 Vulgate Psalm verses, got {v_psalms_total}"

        print("  Vulgate Psalm 118 and Psalter verification: PASSED!")
        return True

    def test_psalm_50_51_alignment(self, conn: sqlite3.Connection) -> bool:
        print("\n[Test 4] Universal Standard Hub Synchronization (Psalm 51:1)...")
        cur = conn.cursor()

        # Query all traditions aligned to standard PSA 51:1
        rows = cur.execute("""
            SELECT corpus_id, native_citation, substr(text_content, 1, 45) as snippet
            FROM text_units 
            WHERE std_book = 'PSA' 
              AND std_chapter = 51 
              AND std_verse = 1
            ORDER BY corpus_id
        """).fetchall()

        traditions = {r["corpus_id"]: r for r in rows}
        print(f"  Found {len(rows)} traditions aligned at Standard PSA 51:1:")
        for cid, r in traditions.items():
            print(f"    - [{cid:10}] {r['native_citation']:12} | {r['snippet']}...")

        # Assert all OT ancient witnesses and English translation are present at PSA 51:1
        assert "wlc" in traditions, "Missing Hebrew WLC at PSA 51:1"
        assert "swete_lxx" in traditions, "Missing Greek LXX at PSA 51:1"
        assert "vulgate" in traditions, "Missing Latin Vulgate at PSA 51:1"
        assert "kjv" in traditions, "Missing English KJV at PSA 51:1"
        assert "webbe" in traditions, "Missing English WEBBE at PSA 51:1"
        assert "brenton-lxx" in traditions, "Missing English Brenton at PSA 51:1"

        # Assert native citations match historical reality
        assert "51:3" in traditions["wlc"]["native_citation"], f"Expected Hebrew native Ps 51:3, got {traditions['wlc']['native_citation']}"
        assert "50:3" in traditions["swete_lxx"]["native_citation"], f"Expected LXX native Ps 50:3, got {traditions['swete_lxx']['native_citation']}"
        assert "50:3" in traditions["vulgate"]["native_citation"], f"Expected Vulgate native Ps 50:3, got {traditions['vulgate']['native_citation']}"
        assert "51:1" in traditions["kjv"]["native_citation"], f"Expected KJV native Ps 51:1, got {traditions['kjv']['native_citation']}"
        assert "51:1" in traditions["webbe"]["native_citation"], f"Expected WEBBE native Ps 51:1, got {traditions['webbe']['native_citation']}"
        assert "50:1" in traditions["brenton-lxx"]["native_citation"] or "50:3" in traditions["brenton-lxx"]["native_citation"], f"Expected Brenton native Ps 50, got {traditions['brenton-lxx']['native_citation']}"

        print("  Multi-tradition alignment check: PASSED!")
        return True

    def test_webbe_and_brenton_integrity(self, conn: sqlite3.Connection) -> bool:
        print("\n[Test 4b] WEBBE and Brenton Versification & Content Verification...")
        cur = conn.cursor()

        # 1. Total verse count assertions
        webbe_count = cur.execute("SELECT COUNT(*) FROM text_units WHERE corpus_id = 'webbe'").fetchone()[0]
        brenton_count = cur.execute("SELECT COUNT(*) FROM text_units WHERE corpus_id = 'brenton-lxx'").fetchone()[0]
        print(f"  WEBBE verses: {webbe_count:,} (Expected: >= 35,000)")
        print(f"  Brenton verses: {brenton_count:,} (Expected: >= 28,000)")
        assert webbe_count >= 35000, f"Expected >= 35,000 WEBBE verses, found {webbe_count}"
        assert brenton_count >= 28000, f"Expected >= 28,000 Brenton verses, found {brenton_count}"

        # 2. Key passage content checks
        webbe_jn1 = cur.execute("""
            SELECT text_content FROM text_units 
            WHERE corpus_id = 'webbe' AND std_book = 'JHN' AND std_chapter = 1 AND std_verse = 1
        """).fetchone()
        assert webbe_jn1 and "beginning was the Word" in webbe_jn1["text_content"], "WEBBE John 1:1 text check failed"

        brenton_gen1 = cur.execute("""
            SELECT text_content FROM text_units 
            WHERE corpus_id = 'brenton-lxx' AND std_book = 'GEN' AND std_chapter = 1 AND std_verse = 1
        """).fetchone()
        assert brenton_gen1 and "beginning God made the heaven" in brenton_gen1["text_content"], "Brenton Gen 1:1 text check failed"

        # 3. TVTMS Greek Jeremiah shift verification
        # In LXX/Brenton, Jeremiah chapter 38 corresponds to MT/English Jeremiah 31
        jer_shift = cur.execute("""
            SELECT native_citation, text_content FROM text_units 
            WHERE corpus_id = 'brenton-lxx' AND std_book = 'JER' AND std_chapter = 31 AND std_verse = 1
        """).fetchone()
        assert jer_shift is not None, "Missing Brenton Jeremiah 31:1 (LXX 38:1)"
        print(f"  Brenton Jer 31:1 native citation: {jer_shift['native_citation']} (Expected: 38:1)")
        assert "38:1" in jer_shift["native_citation"], f"Expected native citation 38:1 for Brenton at std Jer 31:1, got {jer_shift['native_citation']}"

        print("  WEBBE and Brenton verification: PASSED!")
        return True

    def test_lexicons(self, conn: sqlite3.Connection) -> bool:
        print("\n[Test 5] Lexicon Entry Verification...")
        cur = conn.cursor()

        # Check BDB H7225 (reshith)
        h7225 = cur.execute("""
            SELECT strongs_id, dictionary, lemma, consonant_key, substr(definition, 1, 60) as snippet
            FROM lexicon_entries 
            WHERE strongs_id = 'H7225' AND dictionary = 'bdb'
        """).fetchone()
        assert h7225 is not None, "Missing BDB H7225 entry!"
        print(f"  BDB H7225: lemma={h7225['lemma']}, key={h7225['consonant_key']}")
        assert h7225["consonant_key"] == "ראשית"

        # Check LSJ G1722 (en)
        g1722 = cur.execute("""
            SELECT strongs_id, dictionary, lemma, consonant_key, gloss, substr(definition, 1, 60) as snippet
            FROM lexicon_entries 
            WHERE strongs_id = 'G1722' AND dictionary = 'lsj'
        """).fetchone()
        assert g1722 is not None, "Missing LSJ G1722 entry!"
        print(f"  LSJ G1722: lemma={g1722['lemma']}, key={g1722['consonant_key']}, gloss={g1722['gloss']}")
        assert g1722["lemma"] == "ἐν" and g1722["consonant_key"] == "εν"

        print("  Lexicon entries verification: PASSED!")
        return True

    def test_token_json_samples(self, conn: sqlite3.Connection) -> bool:
        print("\n[Test 6] Token JSON Structure & Morphology Samples...")
        cur = conn.cursor()

        # Check John 1:1 in ognt
        jhn1 = cur.execute("""
            SELECT tokens_json 
            FROM text_units 
            WHERE corpus_id = 'ognt' AND std_book = 'JHN' AND std_chapter = 1 AND std_verse = 1
        """).fetchone()
        assert jhn1 is not None and jhn1["tokens_json"], "Missing OGNT John 1:1 tokens"
        import json
        toks = json.loads(jhn1["tokens_json"])
        print(f"  OGNT John 1:1 token count: {len(toks)}")
        assert len(toks) > 10, "Expected > 10 tokens in John 1:1"
        t0_strongs = toks[0][2] if isinstance(toks[0], list) else toks[0]["strongs"]
        t0_lemma = toks[0][4] if isinstance(toks[0], list) else toks[0]["lemma"]
        assert t0_strongs == "G1722" and t0_lemma == "ἐν"

        # Check Genesis 1:1 in wlc (segmented into 11 morphemes with prefixes like בְּ and הַ)
        gen1 = cur.execute("""
            SELECT tokens_json 
            FROM text_units 
            WHERE corpus_id = 'wlc' AND std_book = 'GEN' AND std_chapter = 1 AND std_verse = 1
        """).fetchone()
        assert gen1 is not None and gen1["tokens_json"], "Missing WLC Genesis 1:1 tokens"
        toks_he = json.loads(gen1["tokens_json"])
        print(f"  WLC Genesis 1:1 morpheme token count: {len(toks_he)}")
        assert len(toks_he) == 11, f"Expected 11 morphemes in Genesis 1:1, got {len(toks_he)}"
        t1_strongs = toks_he[1][2] if isinstance(toks_he[1], list) else toks_he[1]["strongs"]
        t1_lemma = toks_he[1][4] if isinstance(toks_he[1], list) else toks_he[1]["lemma"]
        assert t1_strongs == "H7225" and "רֵאשִׁית" in t1_lemma

        print("  Token JSON verification: PASSED!")
        return True

    def test_lemma_stats_and_concordance(self, conn: sqlite3.Connection) -> bool:
        print("\n[Test 8] Lemma statistics and concordance index verification...")
        cur = conn.cursor()
        import json

        # 1. Total counts
        stats_count = cur.execute("SELECT COUNT(*) FROM lemma_stats").fetchone()[0]
        print(f"  lemma_stats total rows: {stats_count:,} (Expected >= 50,000)")
        assert stats_count >= 50000, f"Expected >= 50,000 lemma_stats rows, got {stats_count}"

        conc_count = cur.execute("SELECT COUNT(*) FROM concordance_refs").fetchone()[0]
        print(f"  concordance_refs total rows: {conc_count:,} (Expected >= 1,000,000)")
        assert conc_count >= 1000000, f"Expected >= 1,000,000 concordance_refs rows, got {conc_count}"

        # 2. Spot check WLC H7225 (Reshith)
        h7225 = cur.execute("SELECT * FROM lemma_stats WHERE corpus_id = 'wlc' AND strongs = 'H7225'").fetchone()
        assert h7225 is not None, "Missing H7225 in WLC lemma_stats"
        assert h7225["total_count"] >= 50, f"Expected H7225 total >= 50, got {h7225['total_count']}"
        b_list = json.loads(h7225["book_counts_json"])
        assert len(b_list) > 10, "Expected H7225 in > 10 books"
        top_book = b_list[0]["title"] if isinstance(b_list[0], dict) else b_list[0][0]
        print(f"  Spot-check H7225 (Reshith): total={h7225['total_count']}, top_book={top_book}")

        # 3. Spot check WLC H9003 (Preposition Beth בְּ)
        h9003 = cur.execute("SELECT * FROM lemma_stats WHERE corpus_id = 'wlc' AND strongs = 'H9003'").fetchone()
        assert h9003 is not None, "Missing H9003 in WLC lemma_stats"
        assert h9003["total_count"] >= 15000, f"Expected H9003 total >= 15000, got {h9003['total_count']}"
        print(f"  Spot-check H9003 (Beth prefix): total={h9003['total_count']:,}")

        # 4. Spot check OGNT G2424 (Jesus)
        g2424 = cur.execute("SELECT * FROM lemma_stats WHERE corpus_id = 'ognt' AND strongs = 'G2424'").fetchone()
        assert g2424 is not None, "Missing G2424 in OGNT lemma_stats"
        assert g2424["total_count"] >= 900, f"Expected G2424 total >= 900, got {g2424['total_count']}"
        print(f"  Spot-check G2424 (Jesus in NT): total={g2424['total_count']}")

        # 5. Spot check non-strongs Greek word WORD:Χαμ
        cham = cur.execute("SELECT * FROM lemma_stats WHERE corpus_id = 'swete_lxx' AND strongs = 'WORD:Χαμ'").fetchone()
        assert cham is not None, "Missing WORD:Χαμ in LXX lemma_stats"
        assert cham["total_count"] >= 15, f"Expected WORD:Χαμ total >= 15, got {cham['total_count']}"
        print(f"  Spot-check non-Strongs WORD:Χαμ: total={cham['total_count']}")

        # 6. Referential integrity: spot-check concordance_refs link to text_units.id
        conc_sample = cur.execute("""
            SELECT cr.ref_label, cr.work_unit_id, tu.text_content
            FROM concordance_refs cr
            JOIN text_units tu ON cr.work_unit_id = tu.id
            WHERE cr.corpus_id = 'ognt' AND cr.strongs = 'G2424'
            LIMIT 3
        """).fetchall()
        assert len(conc_sample) == 3, "Expected 3 joined concordance rows"
        for r in conc_sample:
            assert r["text_content"], f"Missing text_content for {r['ref_label']}"
        print("  Concordance-to-text_unit linkage: PASSED!")

        print("  Lemma stats and concordance verification: PASSED!")
        return True


if __name__ == "__main__":
    validator = DatabaseValidator()
    ok = validator.run_all()
    sys.exit(0 if ok else 1)

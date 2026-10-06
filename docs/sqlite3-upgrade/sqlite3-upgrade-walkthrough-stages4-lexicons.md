# Walkthrough: BDB & LSJ Lexicon Re-ingestion

This walkthrough summarizes the problems diagnosed with the BDB and LSJ lexicon datasets, the authoritative sources used to replace them, and the implementation process.

---

## 1. Problems Identified

1. **BDB Data Corruption**:
   - The legacy BDB JSON dataset (`static/data/lexicons/heb/*.json`) had stray cross-references assigning prefix Strong's numbers (such as `H9003`) to non-particle entries (e.g. `חֶרֶשׂ`), causing incorrect headword headers to display in the UI.
2. **Missing LSJ Strong's Numbers**:
   - The previous LSJ dataset lacked Strong's numbers completely (`strongs = NULL` across all 10,652 entries).
   - This blocked exact Strong's lookups from Greek biblical words and prevented establishing uniform Strong's indexing across dictionaries.
3. **Rigid Unique Constraint**:
   - A legacy index `UNIQUE(dictionary, key)` broke on homonyms (e.g., Hebrew `H1` vs `H3` sharing consonant key `אב`, or Greek `G1` Alpha vs `ἆ`).

---

## 2. Authoritative Sources Used

| Lexicon | Source File(s) | Description |
| :--- | :--- | :--- |
| **BDB (Hebrew)** | `DictBDB.json`<br>*(Unabridged BDB Hebrew Lexicon)* | **8,090 entries** natively keyed from `H1` to `H9009`. Contains complete unabridged definitions, pointed Hebrew lemmas, and consonant roots. |
| **LSJ (Greek)** | `TFLSJ 0-5624 - Translators Formatted full LSJ Bible lexicon.txt`<br>`TFLSJ extra - Translators Formatted full LSJ Bible lexicon.txt`<br>*(STEPBible / Tyndale House Cambridge, CC BY 4.0)* | **11,034 entries** covering NT (`G1`–`G5624`) and LXX/variants (`G6000`–`G20199`). Features expanded abbreviations, dates for ancient citations, English glosses, and formatted HTML. |

---

## 3. How We Ingested & Used Them

### A. Hebrew BDB Ingestion ([`scripts/ingest_dict_bdb.py`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/scripts/ingest_dict_bdb.py))
- Extracted pointed headwords (e.g. `רֵאשִׁית`), consonant search keys (`ראשׁית`), and Strong's IDs (`H7225`).
- Ingested 8,090 authentic BDB records into `lexicon_entries` (`dictionary = 'bdb'`).
- Corrected prefix `H9003` to `בְּ` and conjunction `H9000` to `וְ`.

### B. Greek LSJ Ingestion ([`scripts/ingest_tflsj.py`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/scripts/ingest_tflsj.py))
- Parsed 11,034 TSV entries across both files, normalizing Greek diacritics and Strong's IDs (`G0012` $\to$ `G12`).
- Achieved **100% coverage (5,489 / 5,489)** of all Greek Strong's IDs in our database.
- Stored unique detailed identifiers in `lsj_index` and English glosses in `match_type`.

### C. Database Indexing & Optimization
- Dropped the legacy `UNIQUE(dictionary, key)` index.
- Created a unique index on Strong's numbers:
  ```sql
  CREATE UNIQUE INDEX idx_lexicon_dict_strongs 
  ON lexicon_entries(dictionary, strongs) 
  WHERE strongs IS NOT NULL;
  ```
- Created non-unique search indexes: `idx_lexicon_dict_key`, `idx_lexicon_dict_headword`, and `idx_lexicon_dict_lsj_index`.
- Defragmented and optimized the SQLite database with `VACUUM` and `ANALYZE`.

### D. UI Rendering ([`LSJEntry.svelte`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/src/lib/lemma-ui/components/LSJEntry.svelte))
- Updated `formatLsjMarkdown` to detect pre-formatted HTML from STEPBible TFLSJ.
- Preserved native tags (`<b>`, `<i>`, `<br />`) and transformed `<Level1>`–`<Level4>` tags into styled sense badges rather than escaping them.

### E. Database Re-chunking ([`scripts/chunk_database.py`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/scripts/chunk_database.py))
- Split the updated 288.87 MB SQLite database into 58 chunks (`polyglot.db.00`–`57`).
- Verified reassembled file checksum matches `openscriptorium-working.sqlite3` (`SHA256: 9d2c3095...`).

---

## 4. Verification

- **Spot Checks**:
  - `H9003`: `ב` / `בְּ` (preposition Beth) $\to$ Correct definition & headword.
  - `H7225`: `רֵאשִׁית` $\to$ Reshith entry.
  - `G12`: `ἄβυσσος` $\to$ Bottomless/unfathomed definition.
  - `G4160`: `ποιέω` $\to$ To do/make definition.
- **Automated Tests**: All 38/38 Vitest unit tests passed.
- **Build**: Production build succeeded with zero errors.

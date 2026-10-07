# Walkthrough: Database Performance Optimizations & Lemma Concordance Integration

This document outlines the SQLite query and storage optimizations implemented for `sql.js-httpvfs`, the pre-computed frequency and concordance tables, the restoration and modernization of the verse occurrences UI (`TextsDisplay.svelte`), the fix for the `database disk image is malformed` error, and the completion of Stage 5 asset purging.

---

## 1. Summary of Optimizations

| Component | Before | After | Benefit |
| :--- | :--- | :--- | :--- |
| **SQLite Page Size** | 4,096 bytes | **16,384 bytes (16 KB)** | 4x fewer HTTP Range requests per random seek; aligns with `requestChunkSize: 16384`. |
| **Book Frequencies** | 100+ ms dynamic multi-table scan over `words` | **$O(1)$ single-row lookup** in `lemma_stats` | Instant frequency breakdown charts across all books for all 27,541 words. |
| **Concordance Lookups** | Dynamic multi-table join (`words` + `work_units` + `canonical_refs`) | **Indexed lookups** in `concordance_refs` | Instant reference lookups (e.g. 2,856 verses for `G4160` loaded in 2 ms). |
| **Concordance Limit** | Hardcoded limit (25–200) | **Unlimited (`limit = 0`)** | Loads all occurrences without truncation. |
| **Verse Body Loading** | Joined all text into memory up front | **On-demand** via `getVerseText(workUnitId)` | Zero memory waste; fetches verse body text only when clicked. |
| **Chapter Word Seeks** | Fragmented `IN (?, ?, ...)` point probes | **Contiguous range scans** (`BETWEEN ? AND ?`) | 2.16 ms sequential range scan instead of dozens of scattered point probes. |
| **Verse UI** | Basic vertical text list | **Restored [`TextsDisplay.svelte`](../../src/lib/lemma-ui/components/TextsDisplay.svelte)** | Book pills, jump navigation, copy buttons, verse badges, and on-demand modal preview. |
| **Static Data Footprint** | ~350 MB of loose JSON files in `static/data/` | **Moved to `.archive/` (gitignored)** | Clean repository footprint powered entirely by SQLite chunks in `static/db/`. |

---

## 2. Key Changes Implemented

### A. Pre-Computed Lemma Stats ([`scripts/build_lemma_stats.py`](../../scripts/build_lemma_stats.py))
- Populated `lemma_stats (work_id, strongs, lemma, total_count, book_counts_json)` for all **27,541 unique lemmas** across BHS, LXX, and SBLGNT (including all 9,836 LXX words without Strong's numbers keyed as `WORD:<normalized>`).
- Updated `getWordFrequencyByBook()` in [`dbClient.ts`](../../src/lib/services/dbClient.ts) to read the pre-computed JSON distribution directly.

### B. Pre-Indexed Concordance References ([`scripts/build_concordance_refs.py`](../../scripts/build_concordance_refs.py))
- Created table:
  ```sql
  CREATE TABLE concordance_refs (
      work_id INTEGER NOT NULL,
      strongs TEXT NOT NULL,
      lemma TEXT NOT NULL,
      ref_label TEXT NOT NULL,
      work_unit_id INTEGER NOT NULL,
      PRIMARY KEY (work_id, strongs, work_unit_id)
  ) WITHOUT ROWID;
  CREATE INDEX idx_concordance_refs_lemma ON concordance_refs(work_id, lemma);
  ```
- Ingested **886,840 distinct verse occurrences** across all works (BHS: 332,854; LXX: 445,299; SBLGNT: 109,613).
- Re-chunked the database into 73 parts (`polyglot.db.00`–`72`) matching the 16 KB page size.

### C. Unlimited Concordance Lookups (`limit = 0`)
- Updated `getConcordance(workId, lemma, limit = 0, strongs)` in `dbClient.ts` to support omitting `LIMIT` when `limit <= 0`.
- In [`LemmaInfo.svelte`](../../src/lib/lemma-ui/components/LemmaInfo.svelte), changed the call to `getConcordance(workId, lookupKey, 0, currentLemmaData?.strongs)` to fetch all occurrences.

### D. Restored & Modernized Verse References UI
- Restored [`TextsDisplay.svelte`](../../src/lib/lemma-ui/components/TextsDisplay.svelte) and [`TextDisplay.svelte`](../../src/lib/lemma-ui/components/TextDisplay.svelte).
- Integrated with `concordance_refs` output (`ref_label`, `display_label`, `work_unit_id`).
- When a verse badge is clicked, `getVerseText(workUnitId)` retrieves the verse body text on demand from SQLite and displays it with proper RTL / LTR typography.

---

## 3. Diagnosis & Fix: "SQLite: database disk image is malformed"

### Root Cause
1. **Missing non-Strong's words in `lemma_stats`**:
   `ἀκατασκεύαστος` in LXX Gen 1:2 has no Strong's number (`strongs_number = ''`). In the previous build script, words with empty Strong's numbers were excluded.
2. **Heavy Fallback Table Scan**:
   When `lemma_stats` had no record, `getWordFrequencyByBook()` fell back to a dynamic query on `words`:
   `WHERE wd.work_id = ? AND (wd.normalized = ? OR wd.surface = ?)`
   Because of `OR wd.surface = ?`, SQLite could not use the `(work_id, normalized)` index and initiated a full sequential scan across all 600,000 LXX rows.
3. **HTTP Chunk Boundary Overrun in `sql.js-httpvfs`**:
   During long sequential scans, `sql.js-httpvfs` virtual read heads accelerate to prefetch multiple pages. In `static/sqlite/sqlite.worker.js`, the `rangeMapper` function calculated:
   `toByte: o + (r - t)`
   When the prefetch window crossed the 5 MB chunk file boundary, `toByte` exceeded `serverChunkSize - 1`. The HTTP server returned a range error/truncation, corrupting the in-memory page buffer in WebAssembly. SQLite encountered the broken page and reported `database disk image is malformed` (the file on disk was completely valid).

### Resolution
1. **Comprehensive `lemma_stats` Population**:
   Updated `scripts/build_lemma_stats.py` to index words without Strong's numbers using `WORD:<normalized>`. Total indexed lemmas grew from 17,614 to **27,541**. `ἀκατασκεύαστος` is now directly in `lemma_stats` (`total: 1`, `Genesis: 1`) and resolves in 0.1 ms without any fallback.
2. **Chunk Boundary Clamping**:
   Patched `static/sqlite/sqlite.worker.js` so that `toByte` is strictly clamped:
   `i = Math.min(o + (r - t), e.serverChunkSize - 1);`
   HTTP Range requests can never exceed the boundaries of a chunk file.
3. **Smart Multi-Tier Fallback in `dbClient.ts`**:
   If a word is ever absent from `lemma_stats`, `getWordFrequencyByBook()` falls back to aggregating book counts from `concordance_refs` (which only touches the few matching verse rows in milliseconds), avoiding full table scans on `words`.

---

## 4. Stage 5: Asset Purge & GitHub Pages Deployment Verification

1. **Legacy JSON Archival**:
   - The ~350 MB of obsolete static JSON directories from `static/data/` were moved into `.archive/` safely outside Git tracking.
   - Added `.archive/` to [`.gitignore`](../../.gitignore).
2. **Pre-build Health Check Updated**:
   - Updated [`scripts/download_data.js`](../../scripts/download_data.js) to verify `static/db/config.json` instead of the legacy `static/data/`.
3. **Unit Tests Modernized**:
   - Updated [`src/lib/bookMapping.test.ts`](../../src/lib/bookMapping.test.ts) to verify `getBookFile()` mappings directly without requiring static JSON files on disk.
4. **Build & CI/CD Verification**:
   - Ran `npx vitest run`: all 42 unit tests passed.
   - Ran `npm run build:github`: built cleanly in 6.91s, generating `build/github` with only the active SQLite chunks in `build/github/db/`.

---

## 5. BHS Jer 36 / LXX Jer 43 Versification Alignment Fix

### Root Cause
1. **Duplicate Mappings in Master Database**:
   - In `versification_mappings`, 31 erroneous rows mapped `jeremiah (canonical_work_id 24)` to `jeremiah (24)` (e.g. mapping `jer 43:1 -> jer 36:1`). This occurred in an earlier pipeline import where TVTMS Greek mappings were imported without scoping the source work to `jeremiah-lxx (88)`.
   - As a consequence, selecting BHS Jer 36 caused `dbClient.getChapterVerses` to return two rows for BHS under verse 1: row 1 with `label: '36:1'`, and row 2 with `label: '43:1'`, which caused BHS Jer 43 to overwrite BHS Jer 36.
2. **Missing Priority Weighting in SQL Query**:
   - Even when multiple mappings exist, a translation's native verse on the selected chapter reference should always take precedence over an aligned verse mapped from another chapter.

### Resolution
1. **Query Priority Weighting ([`src/lib/services/dbClient.ts`](../../src/lib/services/dbClient.ts))**:
   - Added priority ranking in `aligned_refs`:
     - `priority = 0`: Direct/identity target references (`tr.id = ar.aligned_cref_id`)
     - `priority = 1`: Mapped references (`mapped_refs`)
     - `priority = 2`: Variant identity references (`variant_identity_refs`)
   - Added a `candidate_verses` CTE utilizing `ROW_NUMBER() OVER (PARTITION BY tr.id, w.id ORDER BY ar.priority, wu.id) AS rn` and filtered on `WHERE rn = 1`.
   - This ensures that native verses always win over mapped verses, and each version produces exactly one verse per target reference.
2. **Master Database Cleanup**:
   - Removed the 31 bogus `notes LIKE '%Greek%'` intra-work mappings where both source and target were canonical work 24.
   - Preserved all valid cross-tradition mappings (`jeremiah-lxx (88) -> jeremiah (24)`).
   - Ran `VACUUM; ANALYZE;` on the master database, reducing chunks to 72 parts (`polyglot.db.00`–`71`).
   - Re-chunked and verified SHA256 integrity and `config.json` cache bust.

---

## 6. Ezra, Nehemiah & 2 Esdras Alignment and `bookMapping.ts` Revision

### Root Cause
1. **Absence of Versification Mappings**:
   - The Septuagint preserves Ezra and Nehemiah as a single 23-chapter book called **2 Esdras** (`2Esdr`, `canonical_work_id = 82`), whereas the Hebrew Masoretic Text (BHS, WLC), Vulgate, and Brenton separate them into **Ezra** (ch 1–10, `canonical_work_id = 15`) and **Nehemiah** (ch 1–13, `canonical_work_id = 16`).
   - `versification_mappings` contained **zero** rows connecting Ezra to 2 Esdras, and had only broken partial mappings for Nehemiah chapters 4 and 7.
2. **Fragmented Book Normalization**:
   - Book names, abbreviations, and synonyms were scattered between `bible-utils.js` (`bookAbbrevMap`), `dbClient.ts` (`BOOK_ALIASES`), and hardcoded strings in `bookMapping.ts`.

### Resolution
1. **Rewrote [`src/lib/bookMapping.ts`](../../src/lib/bookMapping.ts)**:
   - **`CANONICAL_BOOK_DEFINITIONS`**: Anchors every book to its database `canonical_works.slug`, standard abbreviation, title, and version-specific preferred abbreviations (e.g. `Qoh`/`Cant`/`1Mac`/`TobBA`).
   - **Automated Synonym Indexing**: Combines database slugs with rich synonyms from `bookAbbrevMap` in `bible-utils.js` (supporting spaces, underscores, Roman numerals, and Greek names like *1 Kingdoms* for *1 Samuel*).
   - **`CROSS_TRADITION_RULES`**: Declaratively defines tradition shifts:
     - `Ezra` $\longleftrightarrow$ `2Esdr` chapters 1–10 (1:1 match).
     - `Neh` $\longleftrightarrow$ `2Esdr` chapters 11–23 (offset $+10$).
     - `1Esdr` $\rightarrow$ omitted in BHS.
   - Exported `normalizeBookName()`, `getCanonicalSlug()`, `getBookForVersion()`, `getMappedReference()`, and `getBookFile()`.
2. **Master Database Cleanup & Mapping Ingestion ([`scripts/build_ezra_nehemiah_mappings.py`](../../scripts/build_ezra_nehemiah_mappings.py))**:
   - Cleaned out stale 2 Esdras rows.
   - Ingested **673 clean versification mappings** connecting all 280 verses of Ezra and all 393 verses of Nehemiah (including the chapter 3/4 and 9/10 versification shifts) to 2 Esdras.
   - Ran `VACUUM; ANALYZE;` and re-chunked into 72 parts (`polyglot.db.00`–`71`) with cache-bust hash updated.
3. **Application Integration**:
   - [`dbClient.ts`](../../src/lib/services/dbClient.ts): `resolveCanonicalWorkId()` uses `normalizeBookName()` and maps Ezra/Neh to `2-esdras` when querying Greek LXX. `translateReference()` uses `getMappedReference()` for instant cross-tradition navigation.
   - [`readerState.svelte.ts`](../../src/lib/stores/readerState.svelte.ts): `selectVersion()` translates book and chapter numbers accurately (e.g. BHS Neh 1 $\rightarrow$ LXX 2Esdr 11, and LXX 2Esdr 11 $\rightarrow$ BHS Neh 1).

### Validation
- Tested Ezra 1: BHS shows Ezra 1:1–11, aligned LXX shows 2Esdr 1:1–11.
- Tested Neh 1: BHS shows Neh 1:1–11, aligned LXX shows 2Esdr 11:1–11.
- Tested 2Esdr 1: LXX shows 2Esdr 1:1–11, aligned BHS shows Ezra 1:1–11.
- Tested 2Esdr 11: LXX shows 2Esdr 11:1–11, aligned BHS shows Neh 1:1–11.
- Tested Neh 4: BHS Neh 4:1 aligns with LXX 13:33; BHS Neh 4:7 aligns with LXX 14:1.
- All 48 Vitest unit tests pass.
- `npm run build:github` builds cleanly.

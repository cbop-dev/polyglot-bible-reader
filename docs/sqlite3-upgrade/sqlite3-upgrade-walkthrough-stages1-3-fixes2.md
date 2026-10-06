# Walkthrough: Stage 1, Stage 2 & Stage 3 Completed

## Stage 1 Overview: Database Finalization & Chunking (Completed)

* **SBLGNT Ingestion**: Ingested all 7,927 verses, 137,554 word tokens, and 5,461 lexemes into `openscriptorium-working.sqlite3`.
* **Database Pruning**: Purged 1.63M word tokens and 434K verse units (including all Talmudic tractates/commentaries and non-polyglot translations).
* **Compaction**: Database file size reduced from **374 MB** down to **225.7 MB** via `VACUUM;` and `ANALYZE;` with `page_size = 4096`.
* **Chunking**: Split into **46 chunks** of 5 MB each (`static/db/polyglot.db.00` to `polyglot.db.45`) with `config.json`.
* **Checksum Verification**: SHA256 checksum matched byte-for-byte.

---

## Stage 2 Overview: `sql.js-httpvfs` Worker & Client Service (Completed)

### 1. Dependencies & Asset Configuration
* Installed `sql.js-httpvfs` (0.8.12) and `comlink`.
* Installed `sqlite.worker.js` and `sql-wasm.wasm` directly into `static/sqlite/` for reliable, unbundled static serving.
* Configured Vite in `vite.config.ts` with an `acceptRangesPlugin` to ensure `Accept-Ranges: bytes` headers are provided during development and preview.

### 2. Worker Service (`src/lib/services/dbWorker.ts`)
* Implemented lazy singleton initialization of `createDbWorker`.
* Uses SvelteKit's `${base}` from `$app/paths` to automatically resolve URLs for local development (`""`) and GitHub Pages (`"/polyglot-bible-reader"`).
* Passes configuration to worker:
  * `configUrl`: `${base}/db/config.json`
  * `workerUrl`: `${base}/sqlite/sqlite.worker.js`
  * `wasmUrl`: `${base}/sqlite/sql-wasm.wasm`

### 3. Database Client Service (`src/lib/services/dbClient.ts`)
* **Parameterized Query Helper**: `query<T>(sql, params)`
* **Metadata Queries**:
  * `getWorks()`: Fetches core polyglot editions (`wlc`, `swete-lxx`, `brenton-lxx`, `sblgnt`, `vulgate-clementine`, `kjv`, `webbe`).
  * `getCanonicalWorks()`: Fetches book catalog.
  * `resolveCanonicalWorkId(identifier)`: Normalizes book names (e.g., `'1 Cor'`, `'1_Cor'`, `'1-corinthians'`, `'Genesis'`, `'Gen'`) to canonical work IDs.
  * `getBookChapters(book)`: Fetches all available chapter numbers for a book in sub-millisecond query time.
* **Parallel Chapter Query**:
  * `getChapterVerses(book, chapter, versions, includeWords)`: Uses a CTE join with `versification_mappings` to automatically align divergent verses (e.g. MT Jer 30:1 $\leftrightarrow$ LXX Jer 37:1, MT Ps 10:1 $\leftrightarrow$ LXX Ps 9:22) across parallel columns.
  * Includes morphology, lemma, and Strong's IDs for words on demand.
* **Lexicon & Concordance Queries**:
  * `getLemma(corpus, identifier)`: Looks up lemma, gloss, part of speech, Strong's ID, and beta/plain forms.
  * `getWordFrequencyByBook(workId, lemma)`: Aggregates occurrences by book for chart visualization.
  * `getConcordance(workId, lemma, limit)`: Returns context verses containing the lemma.

---

## Stage 3 Overview: Core Reader & Parallel Verse Loading (Completed)

### 1. Refactored `bibleDataLoader.ts`
* Replaced monolithic upfront fetching of multi-megabyte JSON files (`fetchBook`, `loadBooksForVersions`, `loadLexemeDictionaries`) with on-demand SQLite queries via `dbClient`:
  * `loadChapterFromDb(book, chapter, activeVersions)`: Loads the current chapter in parallel across all active versions in a single round-trip.
  * `loadChaptersForBook(book)`: Queries available chapter numbers dynamically.
  * Preserved diacritic formatting (`formatVerseText`) for Hebrew and Greek text.

### 2. Modernized `readerState.svelte.ts`
* Added `loadCurrentChapter()`: Queries only the active chapter from SQLite via `loadChapterFromDb`, populating `chapterVerseKeys` and `chapterDataByVerse`.
* Added `getVerseData(verseKey, colVersion)`: Fast O(1) lookup returning pre-aligned verse text, labels, divergence flags, and word tokens.
* Preserved `loadedBooks` backward compatibility so any dependent components continue functioning without refactoring.
* Streamlined column, row, and layout manipulation functions to dynamically trigger `loadCurrentChapter()`.

### 3. Simplified `VerseCard.svelte`
* Removed hardcoded `getMappedReference` lookups and fragile manual offset calculations.
* Directly consumes `readerState.getVerseData(verseKey, colVersion)` where TVTMS alignments (such as Jer 30:1 $\leftrightarrow$ LXX Jer 37:1 and Ps 10:1 $\leftrightarrow$ LXX Ps 9:22) are pre-aligned by the database CTE.

### 4. Verification & Testing
* Created unit tests in [`src/lib/services/bibleDataLoader.test.ts`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/src/lib/services/bibleDataLoader.test.ts).
* Full test suite: **28/28 tests passing** (`npx vitest run`).
* Full static build (`npm run build:gh` with `ADAPTER=github`) builds cleanly in ~8 seconds, producing ~1.6 MB smaller bundle with all legacy book JSON loaders removed.
* Range-request verification on preview server confirmed HTTP `206 Partial Content` on chunked database pages.

---

## Stage 3 Follow-up Fix 1: Psalms, Jeremiah & Job LXX Verse Alignment (Completed)

* **Problem**: In `psalms`, `jeremiah`, and `job`, opening chapters where verse numbering is identical across traditions (e.g. Ps 1:1, Jer 1:1, Job 1:1) showed `[Not found in this version.]` for the LXX.
* **Root Cause**: OpenScriptorium stored Greek LXX work units under variant canonical works (`psalms-lxx`, `jeremiah-lxx`, `job-lxx`). TVTMS only recorded *divergent* versification mappings (e.g. Ps 3:1 $\leftrightarrow$ 3:2, Ps 50:1 $\leftrightarrow$ 49:1, Jer 37:1 $\leftrightarrow$ 44:1) without 1:1 identity mappings for identical verses.
* **Fix**: In [`src/lib/services/dbClient.ts`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/src/lib/services/dbClient.ts), augmented the `getChapterVerses` CTE with `variant_identity_refs` to automatically link matching chapter:verse hierarchies from `-lxx` variant works whenever an explicit TVTMS mapping is not present. Also updated `getWordFrequencyByBook` to group `-lxx` works under their base book.
* **Verification**: Added automated tests in [`src/lib/services/dbClient.test.ts`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/src/lib/services/dbClient.test.ts). Tested all 6 versions against key verses (Ps 1:1, Ps 3:1, Ps 50:1, Jer 1:1, Jer 37:1, Job 1:1). Verified full static build (`npm run build:gh`).

---

## Stage 3 Follow-up Fix 2: Restored Missing Jeremiah Versification Mappings (Completed)

* **Problem**: BHS/WLC Jer 31:1 failed to parallel LXX Jer 38:1, erroneously falling back to LXX Jer 31:1 (Moab oracle).
* **Root Cause**: `import_tvtms_sqlite.py` strictly checked a rule condition `Jer.29:23=Last` that only held for Rahlfs LXX, whereas Swete's LXX has 7 verses in Jer 29. Consequently, TVTMS mappings for Jer 38 $\leftrightarrow$ 31 (all 40 verses), Jer 36 $\leftrightarrow$ 29 (27 verses), Jer 32 $\leftrightarrow$ 25 (25 verses), Jer 30 $\leftrightarrow$ 49 (32 verses), etc. were silently skipped during DB import.
* **Fix**: Created [`patch_missing_jeremiah_mappings.py`](file:///home/cbrannan/dev/2-tmp/biblical-data-pipeline/db-workspace/patch_missing_jeremiah_mappings.py) to import the 148 missing Jeremiah versification mappings from TVTMS into `openscriptorium-working.sqlite3` (bringing total Jeremiah mappings to 737). Compacted and re-chunked database via `split_database_httpvfs.py` into `static/db/`.
* **Verification**: Added automated test in [`src/lib/services/dbClient.test.ts`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/src/lib/services/dbClient.test.ts) (28/28 tests pass). Verified that BHS Jer 31:1 aligns with Swete LXX 38:1, Brenton 38:1, KJV 31:1, WEB 31:1, and Vulgate 31:1.

---

## Stage 3 Follow-up Feature: Version-Aware Navigation & Reference Translation (Option B Completed)

* **Feature**: Book, chapter, and verse selections in the header now reflect the *currently selected version*:
  - Choosing `LXX` $\rightarrow$ `Jer` $\rightarrow$ `38` loads **LXX Jeremiah 38**, correctly aligning with **BHS Jeremiah 31**, **KJV Jeremiah 31**, etc.
  - Choosing `BHS` $\rightarrow$ `Jer` $\rightarrow$ `31` loads **BHS Jeremiah 31**, aligning with **LXX Jeremiah 38**.
* **Reference Translation on Version Switch (Option B)**:
  - When the user switches the header Version dropdown (e.g. from `BHS` to `LXX`), `translateReference` translates the active chapter so the user stays on the same biblical passage (e.g. BHS Jer 31 automatically translates to LXX Jer 38, BHS Ps 50 translates to LXX Ps 49).
* **Book Aliases & Variant Resolution**:
  - Expanded `resolveCanonicalWorkId` with an alias map covering variant spellings and abbreviations (`Qoh`, `Cant`, `PsSol`, `EpJer`, `TobBA`, `TobS`, `1Mac`..`4Mac`, `1Esdr`, `2Esdr`, `DanTh`, `Sus`, `Bel`, etc.).
  - Version-specific resolution maps `'Ps'`, `'Jer'`, `'Job'` to `psalms-lxx`, `jeremiah-lxx`, `job-lxx` when `version === 'LXX'` or `'Brenton'`.
* **Verification**:
  - Added unit tests in [`src/lib/services/dbClient.test.ts`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/src/lib/services/dbClient.test.ts) covering version-aware resolution and reference translation.
  - All **30/30 vitest tests pass**. Full static build (`npm run build:gh`) successful. Commit `3bff3bc`.

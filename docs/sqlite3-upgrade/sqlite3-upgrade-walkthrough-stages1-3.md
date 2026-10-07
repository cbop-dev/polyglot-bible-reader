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
* Created unit tests in [`src/lib/services/bibleDataLoader.test.ts`](../../src/lib/services/bibleDataLoader.test.ts).
* Full test suite: **26/26 tests passing** (`npx vitest run`).
* Full static build (`npm run build:gh` with `ADAPTER=github`) builds cleanly in ~8 seconds, producing ~1.6 MB smaller bundle with all legacy book JSON loaders removed.
* Range-request verification on preview server confirmed HTTP `206 Partial Content` on chunked database pages.

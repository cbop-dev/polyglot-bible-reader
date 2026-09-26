# Walkthrough: Stage 1 & Stage 2 Completed

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
* **Parallel Chapter Query**:
  * `getChapterVerses(book, chapter, versions, includeWords)`: Uses a CTE join with `versification_mappings` to automatically align divergent verses (e.g. MT Jer 30:1 $\leftrightarrow$ LXX Jer 37:1, MT Ps 10:1 $\leftrightarrow$ LXX Ps 9:22) across parallel columns.
  * Includes morphology, lemma, and Strong's IDs for words on demand.
* **Lexicon & Concordance Queries**:
  * `getLemma(corpus, identifier)`: Looks up lemma, gloss, part of speech, Strong's ID, and beta/plain forms.
  * `getWordFrequencyByBook(workId, lemma)`: Aggregates occurrences by book for chart visualization.
  * `getConcordance(workId, lemma, limit)`: Returns context verses containing the lemma.

### 4. Verification & Testing
* **Unit Tests (`src/lib/services/dbClient.test.ts`)**:
  * 7 tests covering version mapping, canonical work resolution, parallel chapter queries, lemma lookup, book frequency, and concordance.
  * Full Vitest test suite: **23/23 tests passing**.
* **Production Static Build**:
  * `npm run build:gh` (`ADAPTER=github vite build`) completed successfully, writing the complete static site to `build/github` including `static/db/` and `static/sqlite/`.

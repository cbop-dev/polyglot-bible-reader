# Walkthrough: Database Performance Optimizations & Lemma Concordance Integration

This document outlines the SQLite query and storage optimizations implemented for `sql.js-httpvfs`, the pre-computed frequency and concordance tables, the restoration and modernization of the verse occurrences UI (`TextsDisplay.svelte`), and the fix for the `database disk image is malformed` error.

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
| **Verse UI** | Basic vertical text list | **Restored [`TextsDisplay.svelte`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/src/lib/lemma-ui/components/TextsDisplay.svelte)** | Book pills, jump navigation, copy buttons, verse badges, and on-demand modal preview. |

---

## 2. Key Changes Implemented

### A. Pre-Computed Lemma Stats ([`scripts/build_lemma_stats.py`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/scripts/build_lemma_stats.py))
- Populated `lemma_stats (work_id, strongs, lemma, total_count, book_counts_json)` for all **27,541 unique lemmas** across BHS, LXX, and SBLGNT (including all 9,836 LXX words without Strong's numbers keyed as `WORD:<normalized>`).
- Updated `getWordFrequencyByBook()` in [`dbClient.ts`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/src/lib/services/dbClient.ts) to read the pre-computed JSON distribution directly.

### B. Pre-Indexed Concordance References ([`scripts/build_concordance_refs.py`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/scripts/build_concordance_refs.py))
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
- In [`LemmaInfo.svelte`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/src/lib/lemma-ui/components/LemmaInfo.svelte), changed the call to `getConcordance(workId, lookupKey, 0, currentLemmaData?.strongs)` to fetch all occurrences.

### D. Restored & Modernized Verse References UI
- Restored [`TextsDisplay.svelte`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/src/lib/lemma-ui/components/TextsDisplay.svelte) and [`TextDisplay.svelte`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/src/lib/lemma-ui/components/TextDisplay.svelte).
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

## 4. Verification & Results

- **Automated Tests**: 42/42 unit tests pass (`npx vitest run`).
- **Production Build**: Clean build with SvelteKit static adapter (`npm run build`).
- **Query Performance**:
  - `lemma_stats` lookup for `ἀκατασκεύαστος`: **~0.12 ms** (instant).
  - `concordance_refs` 2,856 verses query (`G4160`): **2.04 ms**.
  - `getVerseText()` single verse point lookup: **~0.18 ms**.

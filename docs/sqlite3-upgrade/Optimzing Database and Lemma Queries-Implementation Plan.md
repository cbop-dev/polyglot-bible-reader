## Optimzing Database and Lemma Queries: Implementation Plan
---

### Step 1: Optimize Database Page Size (to 16 KB or 32 KB)
1. **Increase SQLite Page Size**:
   * Set `PRAGMA page_size = 16384;` (16 KB) or `32768;` (32 KB) and run `VACUUM;`.
   * This reduces B-tree height and packs ~700–800 index entries per page instead of ~150.
2. **Update HTTP-VFS Config**:
   * Set `"requestChunkSize": 16384` in `static/db/config.json`.
3. **Outcome**: Sequential verse and word reading will drop from ~100+ requests down to ~4–8 requests per chapter.

---

### Step 2: Pre-compute Lemma Stats Table (`lemma_stats`)
1. **Create Table**:
   ```sql
   CREATE TABLE lemma_stats (
       work_id INTEGER NOT NULL,
       corpus TEXT NOT NULL,
       strongs TEXT NOT NULL,
       lemma TEXT NOT NULL,
       total_count INTEGER NOT NULL,
       book_counts_json TEXT NOT NULL, -- e.g. {"Gen": 165, "Exod": 284, ...}
       PRIMARY KEY (work_id, strongs)
   );
   CREATE INDEX idx_lemma_stats_lemma ON lemma_stats(corpus, lemma);
   ```
2. **Build Pre-computation Script** (`scripts/build_lemma_stats.py`):
   * Aggregates book frequencies across BHS, LXX, and SBLGNT at build time.
   * Handles Hebrew prefixes correctly (grouping by Strong's `7225` rather than surface `בראשית`).
   * Adds less than **1.5 MB** to the entire database.
3. **Outcome**: Opening the Lemma modal fetches the full book distribution and total count in **1 single point query** ($O(1)$) with zero whole-Bible joins.

---

### Step 3: Pre-indexed Concordance References (`concordance_refs`)
1. **Create Table (Option B)**:
   ```sql
   CREATE TABLE concordance_refs (
       work_id INTEGER NOT NULL,
       strongs TEXT NOT NULL,
       lemma TEXT NOT NULL,
       ref_label TEXT NOT NULL,       -- e.g. "Gen 1:1"
       work_unit_id INTEGER NOT NULL, -- allows on-demand text fetch on click
       PRIMARY KEY (work_id, strongs, work_unit_id)
   );
   CREATE INDEX idx_concordance_refs_lemma ON concordance_refs(work_id, lemma);
   ```
2. **Populate at Build Time**:
   * Stores the reference labels (`Gen 1:1`, `Exod 3:14`) contiguously in the index.
3. **Outcome**:
   * Clicking "Occurrences" fetches 50 reference labels in **1–2 HTTP requests** with zero table-hopping.
   * Clicking a specific reference fetches that single verse's text on demand.

---

### Step 4: Consolidate Chapter Verse & Word Loading
* In `dbClient.ts`, streamline `getChapterVerses` so that verse containers and their tokens are queried in a single operation rather than running 60+ individual point lookups in the 1.35-million-row `words` table.

---

### Step 5: Update the UI Components
* Update `LemmaInfo.svelte`:
  * Bind distribution charts directly to the instant `lemma_stats` data.
  * Render occurrence references as compact clickable badges (e.g. `Gen 1:1`, `Gen 1:26`), fetching the verse text only when clicked.

---

### Step 6: Re-chunking & Verification
* Run `VACUUM; ANALYZE;` on the updated database.
* Re-chunk using `scripts/chunk_database.py` and verify SHA256 checksums.
* Verify network requests in browser DevTools and run the full Vitest suite.

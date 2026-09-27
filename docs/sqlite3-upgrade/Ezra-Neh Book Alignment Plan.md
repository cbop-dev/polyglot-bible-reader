# Alignment of Ezra, Nehemiah, and 2 Esdras across BHS and LXX (with Revised bookMapping.ts)

## Background & Context

The Greek Septuagint (LXX, Swete) and Hebrew Masoretic Text (BHS, WLC) organize the Ezra–Nehemiah literature differently:
- **LXX (Swete) 1 Esdras (`1Esdr`, canonical work 81)**: The Greek 1 Esdras / 3 Ezra. Matches Brenton 1 Esdras. Does not exist in the Hebrew Bible (BHS).
- **LXX (Swete) 2 Esdras (`2Esdr`, canonical work 82)**: Contains both Ezra and Nehemiah in a single 23-chapter book:
  - **Chapters 1–10**: Exact 1:1 match with **BHS Ezra 1–10**, **Brenton Ezra 1–10**, and **Vulgate Ezra 1–10** (280 verses).
  - **Chapters 11–23**: Corresponds to **BHS Nehemiah 1–13**, **Brenton Nehemiah 1–13**, and **Vulgate Nehemiah 1–13** (where 2 Esdras chapter $c$ corresponds to Nehemiah chapter $c - 10$).

---

## Proposed Changes

### 1. Revision of `src/lib/bookMapping.ts`

- Consolidate book identity, synonyms, and cross-tradition alignments into two data structures:
  1. `CANONICAL_BOOK_DEFINITIONS`: Complete list of canonical books matching DB `canonical_works` slugs, standard abbreviations, titles, version-specific abbreviations (e.g. `Qoh`/`Cant`/`1Mac`/`TobBA`), and synonym expansions using `bookAbbrevMap` from `bible-utils.js`.
  2. `CROSS_TRADITION_RULES`: Declarative rules for cross-tradition book and chapter mappings:
     - `Ezra` $\longleftrightarrow$ `2Esdr` chapters 1–10
     - `Neh` $\longleftrightarrow$ `2Esdr` chapters 11–23 (offset +10)
     - `1Esdr` $\rightarrow$ omitted in BHS
     - Psalms & Jeremiah LXX chapter shifts
- Export utility functions:
  - `normalizeBookName(name: string): BookDefinition | null`
  - `getBookForVersion(bookIdentifier: string, version: string, chapter?: number): string`
  - `getMappedReference(targetVersion: string, book: string, chapter: number | string, verse: number | string)`
  - `getBookFile(...)` (retained for backward compatibility)

### 2. Master SQLite Database (`openscriptorium-working.sqlite3`)

- Clean and populate `versification_mappings`:
  - Delete any old, partial, or erroneous mappings for `2-esdras` (cw 82).
  - Insert complete, bidirectional mappings:
    - `ezra` (cw 15) $\longleftrightarrow$ `2-esdras` (cw 82) chapters 1–10 (280 verses).
    - `nehemiah` (cw 16) $\longleftrightarrow$ `2-esdras` (cw 82) chapters 11–23 (all verses).
- Run `VACUUM; ANALYZE;` on master DB.
- Re-chunk the database into `static/db/polyglot.db.xx` and update `static/db/config.json`.

### 3. Polyglot Bible Reader Integration

- Update [`src/lib/services/dbClient.ts`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/src/lib/services/dbClient.ts):
  - Integrate `normalizeBookName` from `bookMapping.ts` into `resolveCanonicalWorkId`.
  - Ensure cross-book queries (Ezra/Neh $\leftrightarrow$ 2Esdr) return aligned verses smoothly.
- Update [`src/lib/stores/readerState.svelte.ts`](file:///home/cbrannan/dev/2-tmp/polyglot-bible-reader/src/lib/stores/readerState.svelte.ts):
  - Ensure `handleVersionSelect` uses `getMappedReference` and `getBookForVersion` to translate book and chapter seamlessly.

---

## Verification Plan

### Automated Verification
1. Run Python verification script testing the SQL query directly on the updated SQLite database:
   - Query `Ezra 1` with versions `['BHS', 'LXX']`: BHS column displays Ezra 1:1–11, LXX column displays 2 Esdras 1:1–11.
   - Query `Neh 1` with versions `['BHS', 'LXX']`: BHS column displays Neh 1:1–11, LXX column displays 2 Esdras 11:1–11.
   - Query `2Esdr 1` with versions `['LXX', 'BHS']`: LXX column displays 2 Esdras 1:1–11, BHS column displays Ezra 1:1–11.
   - Query `2Esdr 11` with versions `['LXX', 'BHS']`: LXX column displays 2 Esdras 11:1–11, BHS column displays Neh 1:1–11.
   - Query `1Esdr 1` with versions `['LXX', 'Brenton']`: both display 1 Esdras 1, BHS shows no text (not in canon).
2. Run Vitest test suite (`npx vitest run`).
3. Run `npm run build:github` to verify static build.

### Manual Verification
- Test in browser:
  1. Select Hebrew (BHS), choose Ezra 1 $\rightarrow$ verify LXX column loads Greek 2Esdr 1:1–11.
  2. Select Hebrew (BHS), choose Neh 1 $\rightarrow$ verify LXX column loads Greek 2Esdr 11:1–11.
  3. Select Greek (LXX), choose 2Esdr 1 $\rightarrow$ verify BHS column loads Hebrew Ezra 1:1–11.
  4. Select Greek (LXX), choose 2Esdr 11 $\rightarrow$ verify BHS column loads Hebrew Neh 1:1–11.
  5. Select Greek (LXX), choose 1Esdr 1 $\rightarrow$ verify LXX displays 1Esdr, BHS displays omitted/no verses.

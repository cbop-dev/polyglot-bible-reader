# Polyglot Bible Reader

An interactive, high-performance web application--deployable as a static HTML/Javascript site--for side-by-side reading, comparative analysis, and morphological study across various publicly available ancient and modern versions of the Bible, including **Hebrew Bible (BHS/WLC)**, **Septuagint (Swete's LXX)**, and **Greek New Testament (OpenGNT)**, the **Vulgate** and a few English translations, complete with versification mapping, instant lexical and morphological lookups, and customizable reading themes.

*This is still a work in progress. Some of the following features, especially the lemma and morphology information, may be inaccurate.* **Always check with a reliable scholarly source when doing academic/scholarly work!**

---

## Features

- **Multilingual Side-by-Side Reading**: Synchronized parallel display of OT or NT books, aligning correctly difference chapter/verse schemes (e.g., BHS Ps 51 = LXX/Vulgate Ps 50, etc.)
- **Versification Alignment (TVTMS)**: Cross-tradition verse synchronization powered by the STEPBible Tyndale Versification Mapping System.
- **Deep Lexical & Morphological Inspection**: Interactive word clicking with modal display of lemmas, glosses, part-of-speech, and grammatical analysis.
- **Adaptive Reading Themes**: Smooth, contrast-invariant piecewise color stop interpolation theme slider adapted from OpenScriptorium.
- **Fast Static Performance**: Pre-rendered static data pipeline optimized for instant client-side navigation.

---

## Inspiration

This project was inspired by other parallel Bible readers online, such as (Parabible)[https://parabible.com] and (OpenScriptorium)[https://openscriptorium.org/]. (Special thanks to the developer of OpenScriptorium for his ideas and correspondence.)

## Data Provenance & Licensing

All data assets in this repository are derived from datasets with various types of open licenses which allow (minimally) for non-commercial use. For complete details, see the [LICENSES.md page](LICENSES.md).

> [!IMPORTANT]
> **Non-Commercial Data Notice (BHS & TVTMS)**:
> The Hebrew Bible text, lemma, and morphological dataset is derived from the **ETCBC / Text-Fabric BHSA** dataset and **Eliran Wong's BHS-morphology** package, and is licensed under **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)**, which explicitly restricts usage to **Non-Commercial** purposes. Likewise, the **TVTMS versification alignment** data from STEPBible is licensed under **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)**. Commercial use of these data assets is strictly prohibited.

### Upstream Sources & Credits

- **Latin Vulgate (Biblia Sacra Vulgata)**:
  - St. Jerome's Latin translation (c. 405 A.D.) and Clementine Vulgate (1592); sourced from [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) (Public Domain worldwide).
- **King James Version (KJV)**:
  - Authorized King James Version (1611) with Apocrypha; sourced from [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) (Public Domain worldwide).
- **World English Bible (WEB)**:
  - Produced by Rainbow Missions, Inc. / Michael Paul Johnson; sourced via [eBible.org](https://ebible.org) (Public Domain worldwide).
- **Hebrew Bible (BHS)**:
  - Developed by the [Eep Talstra Centre for Bible and Computer](https://etcbc.nl) (Vrije Universiteit Amsterdam); source: [ETCBC/bhsa on GitHub](https://github.com/ETCBC/bhsa).
  - Morphology package curated by Eliran Wong: [eliranwong/BHS-morphology on GitHub](https://github.com/eliranwong/BHS-morphology).
  - License: [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/) (Commercial use prohibited).
- **Septuagint (LXX)**:
  - Base text: Henry Barclay Swete, *The Old Testament in Greek according to the Septuagint* (Cambridge: Cambridge University Press, 3 vols., 1887–1912, reprint 1930; Public Domain worldwide).
  - Digital transcription curated by Eliran Wong and collaborators ([eliranwong/LXX-Swete-1930](https://github.com/eliranwong/LXX-Swete-1930), Public Domain).
- **Greek New Testament (SBLGNT)**:
  - Edited by Michael W. Holmes, Copyright 2010 Society of Biblical Literature and Logos Bible Software ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
  - Morphological parsing: MorphGNT by James Tauber ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
- **Versification Alignment (TVTMS)**:
  - Tyndale Versification Mapping System provided by STEPBible.org and Tyndale House, Cambridge ([STEPBible-Data](https://github.com/STEPBible/STEPBible-Data)).
  - License: [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).
- **Lexica & Dictionaries**:
  - Liddell-Scott-Jones (LSJ) & Middle Liddell: Public Domain.
  - Brown-Driver-Briggs (BDB): Public Domain.
- **UI Architecture**:
  - OpenScriptorium reading theme selector and contrast-invariant color stop interpolation pattern (ISC License).
- **AI Engineering & Development**:
  - The application developer used Google DeepMind's Antigravity 2.0 with Google's Gemini and Anthropic's Sonnet models in the development of this project.

---

## Licensing Terms

This project utilizes a dual-licensing structure to clearly separate application software from data assets:

- **Application Software**: Licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE). Covers all source code, SvelteKit components, user interface logic, build scripts, and test suites.
- **Data Assets & Transformations**: 
  - General static datasets and transformations are licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0)](LICENSE-DATA).
  - BHS Hebrew Bible data (text, lemma, morphology) and TVTMS versification alignment data are licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/) (**Commercial use prohibited**).

For full details, see [LICENSES.md](LICENSES.md).

---

## Development & Building

There are two build phases: 

1. [Phase 1: Data build (python pipeline)](#data-pipeline)
2. [Phrase 2: Web application build (sveltekit)](#web-build)

By default, stage (1) need not be run, because its results are pre-packaged in the chunked database files commited to the repository (and thus all releases). One need only run stage 1 if there have been changes to the underlying datasets or pipeline, and/or the the sqlite3 database needs to be re-built. This can be done as follows. Otherwise, skip to [stage 2 below](#web-build).

### <a id="data-pipeline">1. Data Pipeline & Database Production (`pipeline/`)</a>

The data pipeline is an offline Python build system that fetches upstream ancient and modern texts, resolves cross-tradition versification alignments (TVTMS), indexes lemmas and concordances, validates data integrity, and produces the 5MB SQLite chunks in `static/db/`.

#### Prerequisites

- Python 3.10+
- (Optional, only needed if re-running neural Greek NLP lemmatization): `pip install -r pipeline/requirements-morphology.txt`

#### Running the Pipeline

```bash
# Run the complete pipeline end-to-end (fetch -> build DB -> validate -> chunk -> generate TS config):
python3 -m pipeline.build --all

# Or run individual pipeline stages:
python3 -m pipeline.build --fetch      # Download upstream texts & lexicons to pipeline/cache/
python3 -m pipeline.build --build      # Compile pipeline/build/polyglot-working.sqlite3
python3 -m pipeline.build --validate   # Run integrity and cross-tradition alignment test suite
python3 -m pipeline.build --chunk      # Split SQLite database into 5MB chunks in static/db/
python3 pipeline/generate_canonical_books.py  # Synchronize TypeScript book definitions

# (Optional) Re-run the 8-stage Swete Septuagint NLP morphology resolution engine:
python3 -m pipeline.build --rebuild-lxx-morphology
```

#### Pipeline Stages & Architecture

1. **Stage 1: Upstream Source Fetching (`pipeline/fetcher.py`)**:
   - Downloads public datasets into `pipeline/cache/` (STEPBible TVTMS crosswalk, Clementine Vulgate, OpenGNT with NA28 morphology, MorphHB Hebrew OT, BDB Hebrew Lexicon, STEPBible LSJ Greek Lexicons, Swete 1930 Septuagint, KJV, WEB-BE, and Brenton LXX). Existing cached files are reused automatically unless `--force` is specified.
2. **Sub-Pipeline: Swete LXX Morphology & Lemmatization (`pipeline/swete_morphology/`)**:
   - 8-stage NLP pipeline using Stanza (`grc_proiel`), a proper-name gazetteer, and constraint resolution to resolve lemmas and morphological codes. Pre-resolved token archives are bundled in `pipeline/data/lxx.tar.gz`.
3. **Stage 2: Database Construction (`pipeline/db_builder.py`)**:
   - Builds `pipeline/build/polyglot-working.sqlite3`.
   - Ingests BDB and LSJ unabridged lexicons into `lexicon_entries`.
   - Ingests all 7 biblical corpora (`vulgate`, `wlc`, `swete_lxx`, `ognt`, `kjv`, `webbe`, `brenton-lxx`).
   - Aligns distinct chapter/verse schemes across traditions to the Universal Standard Hub using the Tyndale Versification Mapping System (`pipeline/tvtms.py`).
   - Pre-computes $O(1)$ lemma distributions and concordance indexes (`lemma_stats`, `concordance_refs`, `corpus_book_stats`) via `pipeline/lemma_indexer.py`.
4. **Stage 3: Validation Suite (`pipeline/validate.py`)**:
   - Automated test suite verifying table counts, zero data loss (e.g., all 176 verses of Vulgate Psalm 118 preserved), multi-tradition verse synchronization (Psalm 50/51 alignment), and lexical referential integrity.
5. **Stage 4: HTTP-VFS Chunking (`pipeline/chunker.py`)**:
   - Slices the SQLite database into 5MB chunk files in `static/db/` (`polyglot.db.00`, `polyglot.db.01`, ...) and generates `static/db/config.json` with cache-busting tokens for `sql.js-httpvfs`.
6. **Stage 5: TypeScript Definition Generation (`pipeline/generate_canonical_books.py`)**:
   - Queries `canonical_books` from SQLite and emits `src/lib/config/canonicalBooks.generated.ts` to ensure 100% parity with the frontend.

---


### <a id="web-build">2. Web Application (SvelteKit)</a>

The web frontend is built as a static client application that loads the pre-chunked SQLite database from `static/db/` via client-side WebAssembly (`sql.js-httpvfs`). Web builds (`npm run build`, `npm run build:gh`) do **not** run the Python pipeline or require Python on deployment servers (e.g., GitHub Pages).

```bash
# Install frontend dependencies
npm install

# Run development server
npm run dev

# Build production bundle (Node adapter)
npm run build

# Build static bundle for GitHub Pages
npm run build:gh

# Preview production build locally
npm run preview
```
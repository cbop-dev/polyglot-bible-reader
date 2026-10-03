# Project Licenses & Data Attribution

This repository follows a dual-licensing model to distinguish between the **application source code** and the **underlying biblical datasets, lexica, and static data transformations**.

---

## 1. Summary of Licenses

| Component | License | License File | Description |
|---|---|---|---|
| **Application Software** | **GNU AGPL v3.0** | [LICENSE](LICENSE) | Covers all frontend UI code, reader components, navigation logic, scripts, and build tools. |
| **Data & Static Assets** |
| Public Domain Bible Texts & Lexica | **Public Domain** | | Latin Vulgate, King James Version (KJV), World English Bible (WEB), Swete LXX, LSJ & BDB Lexicons. |
| Everything except BHS & TVTMS | **CC BY-SA 4.0** | [LICENSE-DATA](LICENSE-DATA) | Covers static Bible text data, lexicon entries, and search indexes (except BHS and TVTMS). |
| BHS text, lemma and morphology data | **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)** | | Derived from ETCBC/BHSA and Eliran Wong's BHS-morphology package. **Commercial use prohibited.** |
| TVTMS versification mappings | **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)** | | STEPBible Tyndale Versification Mapping System. **Commercial use prohibited.** |

---

## 2. Scope of Application

### Software Code ([GNU AGPL v3.0](LICENSE))
The GNU Affero General Public License v3.0 governs all executable source code, scripts, build configurations, and styling in this project, including:
- `src/` — SvelteKit application routes, components, reading interfaces, and stores.
- `scripts/` — Dataset download, extraction, and preprocessing scripts.
- Root configuration files (`package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`).

Several Bible translations and lexical resources are in the **Public Domain**:
- `static/data/vulgate/` — Latin Vulgate text and concordances (Public Domain).
- `static/data/kjv/` — King James Version text and concordances (Public Domain).
- `static/data/web/` — World English Bible text and concordances (Public Domain).

The Creative Commons Attribution-ShareAlike 4.0 International License ([CC BY-SA 4.0](LICENSE-DATA)) governs processed static data assets and indexes generated for runtime search and visualization (except BHS and TVTMS):
- `static/data/lxx/` — Septuagint static datasets (`lexemes.json`, `books/*.json`).
- `static/data/sblgnt/` — Greek New Testament static datasets (`lexemes.json`, `books/*.json`).
- `static/data/lexicons/` — Sharded LSJ Greek and BDB Hebrew dictionary files.

The Creative Commons Attribution-NonCommercial 4.0 International License ([CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)) governs:
- `static/data/bhs/` — Hebrew Bible dataset files, morphology, and lemma data derived from ETCBC/BHSA and Eliran Wong's BHS-morphology package. Commercial use is strictly prohibited.
- `static/data/tvtms_alignment.json` — Versification mapping tables derived from STEPBible TVTMS. Commercial use is strictly prohibited.

---

## 3. Upstream Data Provenance & Attribution

The developer(s) is(are) grateful to the digital humanities projects whose open-licensed datasets make this work possible:

### Latin Vulgate (Biblia Sacra Vulgata)
1. **Latin Vulgate Edition**:
   - **License**: **Public Domain worldwide**.
   - **Source**: Saint Jerome's Latin translation (completed c. 405 A.D.) and the Clementine Vulgate (1592). The text is in the public domain worldwide. Sourced from the [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) digital Clementine Vulgate edition.

### King James Version (KJV)
1. **King James Version (Authorized Version, 1611)**:
   - **License**: **Public Domain worldwide**.
   - **Source**: Translated under King James I of England and published in 1611. The biblical text is unencumbered and in the public domain worldwide. Sourced from the [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) digital KJV edition (with Apocrypha).

### World English Bible (WEB)
1. **World English Bible**:
   - **License**: **Public Domain worldwide**.
   - **Source**: Modern English translation of the Holy Bible produced by Rainbow Missions, Inc. and Michael Paul Johnson ([World English Bible](https://worldenglish.bible)). The editors and translators dedicated the entire work to the public domain worldwide without copyright restrictions. Sourced via [eBible.org](https://ebible.org).

### Hebrew Bible (BHS)
1. **ETCBC / Text-Fabric**: Hebrew morphological dataset developed by the Eep Talstra Centre for Bible and Computer (Vrije Universiteit Amsterdam).
   - **Source**: The Eep Talstra Centre for Bible and Computer's [Biblia Hebraica Stuttgartensia (Amstelodamensis) project on GitHub](https://github.com/ETCBC/bhsa).
   - **License**: [Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).
   - **Commercial Restriction**: The ETCBC BHSA dataset is explicitly licensed for non-commercial use only. Any commercial reproduction, redistribution, or derivation is prohibited without express permission from the rights holders.

2. **Eliran Wong's BHS-morphology**:
   - **Source**: Curated and maintained by Eliran Wong at [eliranwong/BHS-morphology on GitHub](https://github.com/eliranwong/BHS-morphology).
   - **License**: [Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).
   - **Commercial Restriction**: Licensed for non-commercial use only. Any commercial usage or derivation is strictly prohibited.

### Septuagint (LXX)
1. **Henry Barclay Swete Septuagint Edition (1887–1912, reprint 1930)**
   - **License**: **Public Domain worldwide** (published 1887–1912, reprint 1930, author Henry Barclay Swete died 1917; fully unencumbered public domain under US, EU, and international copyright).
   - **Source**: Henry Barclay Swete, *The Old Testament in Greek according to the Septuagint* (Cambridge University Press, 3 vols., 1887–1912, reprint 1930).
   - **Digital Transcription**: Digitized by Eliran Wong and collaborators ([eliranwong/LXX-Swete-1930](https://github.com/eliranwong/LXX-Swete-1930)), dedicated to the public domain.

### Greek New Testament (SBLGNT)
1. **SBL Greek New Testament**: Edited by Michael W. Holmes, Copyright 2010 Society of Biblical Literature and Logos Bible Software ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
2. **MorphGNT**: Morphological parsing by James Tauber ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).

### Versification Alignment (TVTMS)
1. **STEPBible Tyndale Versification Mapping System (TVTMS)**:
   - **Source**: Provided by STEPBible.org and Tyndale House, Cambridge ([STEPBible-Data](https://github.com/STEPBible/STEPBible-Data)).
   - **License**: [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).

### Lexica & Dictionaries
1. **Liddell-Scott-Jones (LSJ) & Middle Liddell**:
   - **License**: **Public Domain**/ **CC 3.0 BY-NC-SA** ([CEX source](https://github.com/Eumaeus/cite_lsj_cex/))
   - **Source**: H.G. Liddell, R. Scott, H.S. Jones, *A Greek-English Lexicon* (Oxford: Clarendon Press, 1940). Digital edition curated by Perseus Digital Library (Tufts University) and Logeion (University of Chicago).
   
      NB: Although the version used by the Chicago CEX edition is that of 1940, [the University of Chicago *Logeion* treats this source data as public domain](https://logeion.uchicago.edu/about), likely because it is so treated in the UK::
      
      > For full-text searches of the dictionaries (where in LSJ do we find reference to Xenophon's Anabasis, where is λόγος used in any entry, not just in the entry for λόγος), use the links in the list of sources below. Full-text search is only possible for the reference works that are fully in the public domain. 
2. **Brown-Driver-Briggs (BDB) Hebrew and English Lexicon**:
   - **License**: **Public Domain** (Francis Brown, S.R. Driver, Charles A. Briggs, 1906).

### UI & Ergonomic Tools
1. **OpenScriptorium Reading Theme Architecture**:
   - **License**: [ISC License](https://opensource.org/licenses/ISC)
   - **Source**: [https://openscriptorium.org](https://openscriptorium.org)
   - **Description**: Contrast-invariant piecewise color stop interpolation algorithm and sliding scale reading theme selector concept.

### AI Engineering & Development Tools
1. **Google DeepMind Antigravity 2.0 & Gemini**:
   - The application developer used Google DeepMind's Antigravity 2.0, and Google's Gemini and Anthropic's Sonnet models in the development of this project.

---

## 4. Third-Party Code & Dependencies

Third-party software libraries consumed via `package.json` (such as Svelte, SvelteKit, Vite, and Tailwind CSS) remain subject to their respective open-source licenses (typically MIT, Apache-2.0, or BSD). Consult `package.json` and the corresponding node package documentation for individual dependency licenses.

# Polyglot Bible Reader

An interactive, high-performance web application for side-by-side reading, comparative analysis, and morphological study across the **Hebrew Bible (BHS)**, **Septuagint (LXX)**, and **Greek New Testament (SBLGNT)**, complete with versification mapping, instant lexical and morphological lookups, and customizable reading themes.

---

## Features

- **Multilingual Side-by-Side Reading**: Synchronized parallel display of Hebrew (BHS) and Greek (LXX) for Old Testament books, and Greek New Testament (SBLGNT).
- **Versification Alignment (TVTMS)**: Cross-tradition verse synchronization powered by the STEPBible Tyndale Versification Mapping System.
- **Deep Lexical & Morphological Inspection**: Interactive word clicking with modal display of lemmas, glosses, part-of-speech, and grammatical analysis.
- **Adaptive Reading Themes**: Smooth, contrast-invariant piecewise color stop interpolation theme slider adapted from OpenScriptorium.
- **Fast Static Performance**: Pre-rendered static data pipeline optimized for instant client-side navigation.

---

## Data Provenance & Licensing

All data assets in this repository are derived from datasets with various types of open licenses which allow (minimally) for non-commercial use. For complete details, see the [LICENSES.md page](LICENSES.md).

> [!IMPORTANT]
> **Non-Commercial Data Notice (BHS & TVTMS)**:
> The Hebrew Bible text, lemma, and morphological dataset is derived from the **ETCBC / Text-Fabric BHSA** dataset and **Eliran Wong's BHS-morphology** package, and is licensed under **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)**, which explicitly restricts usage to **Non-Commercial** purposes. Likewise, the **TVTMS versification alignment** data from STEPBible is licensed under **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)**. Commercial use of these data assets is strictly prohibited.

### Upstream Sources & Credits

- **OpenScriptorium Project Database**:
  - Source: [Openscriptorium.org](https://openscriptorium.org) / [OpenScriptorium on GitHub](https://github.com/OpenScriptorium).
  - License: [ISC License](https://opensource.org/licenses/ISC).
  - Some Biblical text datasets (KJV, WEB, Vulgate), chapter data, and alignments, and concordance databases were obtained from the Openscriptorium.org project database.
- **Latin Vulgate (Biblia Sacra Vulgata)**:
  - St. Jerome's Latin translation (c. 405 A.D.) and Clementine Vulgate (1592); Public Domain worldwide.
- **King James Version (KJV)**:
  - Authorized King James Version (1611); Public Domain worldwide.
- **World English Bible (WEB)**:
  - Produced by Rainbow Missions, Inc. / Michael Paul Johnson; Public Domain worldwide.
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
  - The application developer used Google DeepMind's Antigravity 2.0 and Gemini models in the development of this project.

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

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

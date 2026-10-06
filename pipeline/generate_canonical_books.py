#!/usr/bin/env python3
"""Polyglot Bible Reader - Canonical Book Definitions Generator.

Auto-generates `src/lib/config/canonicalBooks.generated.ts` directly from
the SQLite `canonical_books` table and `pipeline/config.py` metadata.
Guarantees 100% parity between the SQLite database and the TypeScript client.
"""

from __future__ import annotations
import json
import sqlite3
import sys
from pathlib import Path

# Paths
REPO_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = REPO_ROOT / "pipeline" / "build" / "polyglot-working.sqlite3"
TARGET_TS = REPO_ROOT / "src" / "lib" / "config" / "canonicalBooks.generated.ts"

# Standard UI Abbreviations for all 90 canonical books
STANDARD_ABBREVS = {
    "GEN": "Gen", "EXO": "Exod", "LEV": "Lev", "NUM": "Num", "DEU": "Deut",
    "JOS": "Josh", "JDG": "Judg", "RUT": "Ruth",
    "1SA": "1Sam", "2SA": "2Sam", "1KI": "1Kgs", "2KI": "2Kgs",
    "1CH": "1Chr", "2CH": "2Chr", "EZR": "Ezra", "NEH": "Neh",
    "EST": "Esth", "JOB": "Job", "PSA": "Ps", "PRO": "Prov",
    "ECC": "Eccl", "SNG": "Song", "ISA": "Isa", "JER": "Jer",
    "LAM": "Lam", "EZK": "Ezek", "DAN": "Dan", "HOS": "Hos",
    "JOL": "Joel", "AMO": "Amos", "OBA": "Obad", "JON": "Jonah",
    "MIC": "Mic", "NAM": "Nah", "HAB": "Hab", "ZEP": "Zeph",
    "HAG": "Hag", "ZEC": "Zech", "MAL": "Mal",
    # Apocrypha / Deuterocanon
    "TOB": "Tob", "JDT": "Jdt", "ESG": "AddEsth", "WIS": "Wis",
    "SIR": "Sir", "BAR": "Bar", "LJE": "EpJer", "S3Y": "PrAzar",
    "SUS": "Sus", "BEL": "Bel", "1MA": "1Mac", "2MA": "2Mac",
    "3MA": "3Mac", "4MA": "4Mac", "1ES": "1Esdr", "2ES": "2Esdr",
    "MAN": "PrMan", "PS2": "Ps151", "ODA": "Od", "PSS": "PsSol",
    "DAG": "Dan", "SUG": "Sus", "BLG": "Bel", "LAO": "Lao",
    # NT
    "MAT": "Matt", "MRK": "Mark", "LUK": "Luke", "JHN": "John",
    "ACT": "Acts", "ROM": "Rom", "1CO": "1_Cor", "2CO": "2_Cor",
    "GAL": "Gal", "EPH": "Eph", "PHP": "Phil", "COL": "Col",
    "1TH": "1_Thess", "2TH": "2_Thess", "1TI": "1_Tim", "2TI": "2_Tim",
    "TIT": "Titus", "PHM": "Phlm", "HEB": "Heb", "JAS": "Jas",
    "1PE": "1_Pet", "2PE": "2_Pet", "1JN": "1_John", "2JN": "2_John",
    "3JN": "3_John", "JUD": "Jude", "REV": "Rev"
}

# Version-specific preferred display abbreviations
VERSION_BOOKS = {
    "ECC": {
        "BHS": "Qoh", "LXX": "Qoh", "KJV": "Eccl", "WEB": "Eccl", "Vulgate": "Eccl", "Brenton": "Eccl"
    },
    "SNG": {
        "BHS": "Cant", "LXX": "Cant", "KJV": "Song", "WEB": "Song", "Vulgate": "Song", "Brenton": "Song"
    },
    "TOB": {
        "LXX": "TobBA", "KJV": "Tob", "WEB": "Tob", "Vulgate": "Tob", "Brenton": "Tob"
    },
    "ESG": {
        "LXX": "Esth", "KJV": "AddEsth", "WEB": "AddEsth", "Brenton": "AddEsth"
    },
    "SUS": {
        "LXX": "SusTh", "KJV": "Sus", "WEB": "Sus", "Brenton": "Sus"
    },
    "SUG": {
        "LXX": "Sus", "Brenton": "Sus"
    },
    "BEL": {
        "LXX": "BelTh", "KJV": "Bel", "WEB": "Bel", "Brenton": "Bel"
    },
    "BLG": {
        "LXX": "Bel", "Brenton": "Bel"
    },
    "DAN": {
        "LXX": "DanTh", "KJV": "Dan", "WEB": "Dan", "Brenton": "Dan"
    },
    "DAG": {
        "LXX": "Dan", "Brenton": "Dan"
    },
    "1MA": {
        "LXX": "1Mac", "KJV": "1Mac", "WEB": "1Mac", "Vulgate": "1Mac", "Brenton": "1Mac"
    },
    "2MA": {
        "LXX": "2Mac", "KJV": "2Mac", "WEB": "2Mac", "Vulgate": "2Mac", "Brenton": "2Mac"
    },
    "3MA": {
        "LXX": "3Mac", "Brenton": "3Mac"
    },
    "4MA": {
        "LXX": "4Mac", "Brenton": "4Mac"
    },
    "EZR": {
        "LXX": "2Esdr",
    },
    "NEH": {
        "LXX": "2Esdr",
    },
}

# Slugs mapping
SLUG_OVERRIDES = {
    "SNG": "song-of-solomon",
    "ESG": "esther-greek",
    "DAG": "daniel-old-greek",
    "SUG": "susanna-old-greek",
    "BLG": "bel-and-the-dragon-old-greek",
    "LAO": "laodiceans",
    "PS2": "psalm-151",
    "PSS": "psalms-of-solomon",
    "1ES": "1-esdras",
    "2ES": "2-esdras",
    "1MA": "1-maccabees",
    "2MA": "2-maccabees",
    "3MA": "3-maccabees",
    "4MA": "4-maccabees",
    "1SA": "1-samuel",
    "2SA": "2-samuel",
    "1KI": "1-kings",
    "2KI": "2-kings",
    "1CH": "1-chronicles",
    "2CH": "2-chronicles",
    "1CO": "1-corinthians",
    "2CO": "2-corinthians",
    "1TH": "1-thessalonians",
    "2TH": "2-thessalonians",
    "1TI": "1-timothy",
    "2TI": "2-timothy",
    "1PE": "1-peter",
    "2PE": "2-peter",
    "1JN": "1-john",
    "2JN": "2-john",
    "3JN": "3-john",
}


def get_extra_aliases(code: str, name_en: str) -> list[str]:
    """Generates rich academic and typing aliases for a canonical book."""
    aliases: set[str] = set()

    # Import BOOK_ALIASES from pipeline.config if available
    try:
        from pipeline.config import BOOK_ALIASES
        for alias, target in BOOK_ALIASES.items():
            if target == code:
                aliases.add(alias)
    except Exception:
        pass

    # Add common variants
    if code == "1SA":
        aliases.update(["1Kgdms", "1 Kingdoms", "I Kingdoms", "1_Sam", "1Sam"])
    elif code == "2SA":
        aliases.update(["2Kgdms", "2 Kingdoms", "II Kingdoms", "2_Sam", "2Sam"])
    elif code == "1KI":
        aliases.update(["3Kgdms", "3 Kingdoms", "III Kingdoms", "1_Kgs", "1Kgs"])
    elif code == "2KI":
        aliases.update(["4Kgdms", "4 Kingdoms", "IV Kingdoms", "2_Kgs", "2Kgs"])
    elif code == "1CH":
        aliases.update(["1_Chr", "1 Chron", "I Chronicles", "I Chron"])
    elif code == "2CH":
        aliases.update(["2_Chr", "2 Chron", "II Chronicles", "II Chron"])
    elif code == "EZR":
        aliases.update(["1 Ezra", "1Esdr (Vulgate)", "I Esdras"])
    elif code == "NEH":
        aliases.update(["2 Ezra", "2Esdr (Vulgate)", "II Esdras"])
    elif code == "PSA":
        aliases.update(["Psa", "Psalmi", "Psalm"])
    elif code == "ECC":
        aliases.update(["Qoh", "Qoheleth", "Ecclesiastes"])
    elif code == "SNG":
        aliases.update(["Cant", "Canticles", "Song of Songs", "Song of Solomon"])
    elif code == "DAN":
        aliases.update(["DanTh", "Daniel (Theodotion)"])
    elif code == "DAG":
        aliases.update(["DanOG", "Daniel (Old Greek)", "Greek Daniel"])
    elif code == "SUS":
        aliases.update(["SusTh", "Susanna (Theodotion)"])
    elif code == "SUG":
        aliases.update(["SusOG", "Susanna (Old Greek)"])
    elif code == "BEL":
        aliases.update(["BelTh", "Bel and the Dragon (Theodotion)"])
    elif code == "BLG":
        aliases.update(["BelOG", "Bel and the Dragon (Old Greek)"])
    elif code == "TOB":
        aliases.update(["TobBA", "TobS", "Tobit (BA)", "Tobit (Sinaiticus)"])
    elif code == "SIR":
        aliases.update(["Ecclesiasticus", "Sir"])
    elif code == "1ES":
        aliases.update(["1 Esdras", "1Esd", "1 Esdr", "Greek Ezra", "3 Ezra", "EsdrA"])
    elif code == "2ES":
        aliases.update(["2 Esdras", "2Esd", "2 Esdr", "4 Ezra", "EsdrB", "Ezra-Nehemiah (Greek)"])
    elif code == "1MA":
        aliases.update(["1Mac", "1Macc", "1 Macc", "1 Maccabees", "I Maccabees"])
    elif code == "2MA":
        aliases.update(["2Mac", "2Macc", "2 Macc", "2 Maccabees", "II Maccabees"])
    elif code == "3MA":
        aliases.update(["3Mac", "3Macc", "3 Macc", "3 Maccabees", "III Maccabees"])
    elif code == "4MA":
        aliases.update(["4Mac", "4Macc", "4 Macc", "4 Maccabees", "IV Maccabees"])
    elif code == "PSS":
        aliases.update(["PssSol", "Pss. Sol.", "Psalms of Solomon"])
    elif code == "LAO":
        aliases.update(["Laodiceans", "Epistle to Laodiceans"])

    return sorted(aliases)


def generate_typescript():
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}. Run pipeline build first.")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        SELECT code, order_index, testament, name_english, name_hebrew, name_greek, name_latin, total_chapters
        FROM canonical_books
        ORDER BY order_index, code
    """)
    rows = cur.fetchall()

    corpus_to_version = {
        "wlc": "BHS",
        "swete_lxx": "LXX",
        "ognt": "OpenGNT",
        "kjv": "KJV",
        "vulgate": "Vulgate",
        "webbe": "WEB",
        "brenton-lxx": "Brenton",
    }

    version_available_books = {}
    for cid, ver in corpus_to_version.items():
        cur.execute("""
            SELECT tu.std_book, cb.order_index
            FROM text_units tu
            JOIN canonical_books cb ON tu.std_book = cb.code
            WHERE tu.corpus_id = ?
            GROUP BY tu.std_book, cb.order_index
            ORDER BY cb.order_index
        """, (cid,))
        rows_ver = cur.fetchall()

        books_for_ver = []
        for std_code, order_idx in rows_ver:
            if ver == "LXX" and std_code == "TOB":
                if "TobBA" not in books_for_ver:
                    books_for_ver.append("TobBA")
                if "TobS" not in books_for_ver:
                    books_for_ver.append("TobS")
                continue
            if ver == "LXX" and std_code in ("EZR", "NEH"):
                if "2Esdr" not in books_for_ver:
                    books_for_ver.append("2Esdr")
                continue

            abbrev = VERSION_BOOKS.get(std_code, {}).get(ver, STANDARD_ABBREVS.get(std_code, std_code))
            if abbrev not in books_for_ver:
                books_for_ver.append(abbrev)

        version_available_books[ver] = books_for_ver

    # 3. Detect version-specific chapter deviations from text_units
    canonical_chapters = {r[0]: r[7] for r in rows}
    cur.execute("""
        SELECT corpus_id, std_book, std_chapter
        FROM text_units
        GROUP BY corpus_id, std_book, std_chapter
        ORDER BY corpus_id, std_book, std_chapter
    """)
    tu_ch_rows = cur.fetchall()

    version_book_chapters = {}
    for cid, std_book, ch in tu_ch_rows:
        ver = corpus_to_version.get(cid)
        if not ver:
            continue
        if ver not in version_book_chapters:
            version_book_chapters[ver] = {}
        if std_book not in version_book_chapters[ver]:
            version_book_chapters[ver][std_book] = []
        version_book_chapters[ver][std_book].append(ch)

    version_chapter_overrides = {}
    for ver, b_map in version_book_chapters.items():
        for std_code, ch_list in b_map.items():
            tot = canonical_chapters.get(std_code, 0)
            default_ch_list = list(range(1, tot + 1))
            if ch_list != default_ch_list:
                if ver not in version_chapter_overrides:
                    version_chapter_overrides[ver] = {}
                version_chapter_overrides[ver][std_code] = ch_list

    conn.close()

    if len(rows) == 0:
        print("Error: No books found in canonical_books table!")
        sys.exit(1)

    print(f"Generating TypeScript canonical book definitions for {len(rows)} books...")

    books_data = []
    for code, order_index, testament, name_en, name_he, name_el, name_la, total_chapters in rows:
        slug = SLUG_OVERRIDES.get(code, name_en.lower().replace(" ", "-").replace("(", "").replace(")", ""))
        std_abbrev = STANDARD_ABBREVS.get(code, code)
        testament_clean = testament.lower()
        if testament_clean == "ap":
            testament_clean = "apocrypha"

        default_chapters = list(range(1, total_chapters + 1))
        item = {
            "code": code,
            "slug": slug,
            "order": order_index,
            "standardAbbrev": std_abbrev,
            "title": name_en,
            "testament": testament_clean,
            "totalChapters": total_chapters,
            "chapters": default_chapters,
        }

        if name_he:
            item["nameHebrew"] = name_he
        if name_el:
            item["nameGreek"] = name_el
        if name_la:
            item["nameLatin"] = name_la

        if code in VERSION_BOOKS:
            item["versionBooks"] = VERSION_BOOKS[code]

        extra = get_extra_aliases(code, name_en)
        if extra:
            item["extraAliases"] = extra

        books_data.append(item)

    # Render TS file
    ts_lines = [
        "/**",
        " * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.",
        " * Generated from SQLite canonical_books table via pipeline/generate_canonical_books.py.",
        f" * Total Canonical Books: {len(books_data)}",
        " */",
        "",
        "export interface CanonicalBook {",
        "	code: string; // Standard 3-letter USFM code (Primary Key)",
        "	slug: string; // Kebab-case URL and slug identifier",
        "	order: number; // Canonical sort order",
        "	standardAbbrev: string; // Preferred UI abbreviation",
        "	title: string; // Full English title",
        "	testament: 'ot' | 'nt' | 'apocrypha';",
        "	totalChapters: number;",
        "	chapters: number[];",
        "	nameHebrew?: string;",
        "	nameGreek?: string;",
        "	nameLatin?: string;",
        "	versionBooks?: Partial<Record<string, string>>;",
        "	extraAliases?: string[];",
        "}",
        "",
        "export const CANONICAL_BOOK_DEFINITIONS: CanonicalBook[] = " + json.dumps(books_data, indent=2) + ";",
        "",
        "export const VERSION_AVAILABLE_BOOKS: Record<string, string[]> = " + json.dumps(version_available_books, indent=2) + ";",
        "",
        "export const VERSION_CHAPTER_OVERRIDES: Record<string, Partial<Record<string, number[]>>> = " + json.dumps(version_chapter_overrides, indent=2) + ";",
        "",
        "/**",
        " * Normalizes any string to a clean alphanumeric key for fast lookup.",
        " */",
        "export function cleanKey(str?: string | null): string {",
        "	if (!str) return '';",
        "	return str.trim().toLowerCase().replace(/[\\s\\-_.]+/g, '');",
        "}",
        "",
        "const CODE_TO_CANONICAL = new Map<string, CanonicalBook>();",
        "const NORM_TO_CANONICAL = new Map<string, CanonicalBook>();",
        "",
        "function initIndices() {",
        "	for (const book of CANONICAL_BOOK_DEFINITIONS) {",
        "		CODE_TO_CANONICAL.set(book.code, book);",
        "		NORM_TO_CANONICAL.set(cleanKey(book.code), book);",
        "		NORM_TO_CANONICAL.set(cleanKey(book.slug), book);",
        "		NORM_TO_CANONICAL.set(cleanKey(book.standardAbbrev), book);",
        "		NORM_TO_CANONICAL.set(cleanKey(book.title), book);",
        "",
        "		if (book.extraAliases) {",
        "			for (const alias of book.extraAliases) {",
        "				const c = cleanKey(alias);",
        "				if (!NORM_TO_CANONICAL.has(c)) {",
        "					NORM_TO_CANONICAL.set(c, book);",
        "				}",
        "			}",
        "		}",
        "",
        "		if (book.versionBooks) {",
        "			for (const vb of Object.values(book.versionBooks)) {",
        "				if (vb) {",
        "					const c = cleanKey(vb);",
        "					if (!NORM_TO_CANONICAL.has(c)) {",
        "						NORM_TO_CANONICAL.set(c, book);",
        "					}",
        "				}",
        "			}",
        "		}",
        "	}",
        "}",
        "",
        "initIndices();",
        "",
        "/**",
        " * Resolves any book identifier, title, synonym, or abbreviation to its Canonical Book Definition.",
        " */",
        "export function normalizeBookName(input?: string | null): CanonicalBook | null {",
        "	if (!input) return null;",
        "	const c = cleanKey(input);",
        "	return NORM_TO_CANONICAL.get(c) || null;",
        "}",
        "",
        "/**",
        " * Resolves any book identifier to its 3-letter USFM code.",
        " */",
        "export function resolveBookCode(input?: string | null, version?: string): string {",
        "	if (!input) return '';",
        "	const clean = cleanKey(input);",
        "",
        "	// Dual recensions in LXX",
        "	if (version === 'LXX') {",
        "		if (clean === 'sus') return 'SUG';",
        "		if (clean === 'susth') return 'SUS';",
        "		if (clean === 'dan') return 'DAG';",
        "		if (clean === 'danth') return 'DAN';",
        "		if (clean === 'bel') return 'BLG';",
        "		if (clean === 'belth') return 'BEL';",
        "	}",
        "",
        "	const book = NORM_TO_CANONICAL.get(clean);",
        "	if (book) return book.code;",
        "	const upper = input.trim().toUpperCase();",
        "	if (upper.length === 3) return upper;",
        "	return '';",
        "}",
        "",
        "/**",
        " * Resolves any book identifier to its canonical DB slug.",
        " */",
        "export function getCanonicalSlug(input?: string | null): string | null {",
        "	return normalizeBookName(input)?.slug || null;",
        "}",
        "",
        "/**",
        " * Get canonical book by exact 3-letter USFM code.",
        " */",
        "export function getCanonicalBook(code?: string | null): CanonicalBook | null {",
        "	if (!code) return null;",
        "	return CODE_TO_CANONICAL.get(code.trim().toUpperCase()) || null;",
        "}",
        "",
        "/**",
        " * Resolves the available chapter numbers for a given book and version.",
        " * Checks version-specific overrides first (e.g. Sirach 0..51 in LXX, 2Esdr 1..23),",
        " * then falls back to canonical book definition chapters (1..N).",
        " */",
        "export function getCanonicalBookChapters(version?: string, bookIdentifier?: string): number[] {",
        "	if (!bookIdentifier) return [1];",
        "	const code = resolveBookCode(bookIdentifier, version) || cleanKey(bookIdentifier).toUpperCase();",
        "	if (version && VERSION_CHAPTER_OVERRIDES[version]?.[code]) {",
        "		return VERSION_CHAPTER_OVERRIDES[version]![code]!;",
        "	}",
        "	const canon = getCanonicalBook(code) || normalizeBookName(bookIdentifier);",
        "	if (canon?.chapters && canon.chapters.length > 0) {",
        "		return canon.chapters;",
        "	}",
        "	if (canon?.totalChapters) {",
        "		return Array.from({ length: canon.totalChapters }, (_, i) => i + 1);",
        "	}",
        "	return [1];",
        "}",
        ""
    ]

    TARGET_TS.parent.mkdir(parents=True, exist_ok=True)
    TARGET_TS.write_text("\n".join(ts_lines), encoding="utf-8")
    print(f"Successfully generated: {TARGET_TS}")


if __name__ == "__main__":
    generate_typescript()

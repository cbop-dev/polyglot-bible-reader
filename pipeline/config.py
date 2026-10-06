"""Polyglot Bible Reader - Pipeline Configuration.

Defines:
- Upstream source URLs and expected file formats
- Canonical 3-letter USFM / STEP book definitions with Deuterocanon/Apocrypha
- Directory paths for pipeline cache, build artifacts, and output databases
"""

from __future__ import annotations
import os
from pathlib import Path

# Paths
PIPELINE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PIPELINE_DIR.parent
CACHE_DIR = PIPELINE_DIR / "cache"
BUILD_DIR = PIPELINE_DIR / "build"
STATIC_DB_DIR = REPO_ROOT / "static" / "db"

# Ensure runtime directories exist
CACHE_DIR.mkdir(parents=True, exist_ok=True)
BUILD_DIR.mkdir(parents=True, exist_ok=True)
STATIC_DB_DIR.mkdir(parents=True, exist_ok=True)

# Upstream Public Source URLs
UPSTREAM_SOURCES = {
    # 1. Versification Crosswalk (STEPBible / Tyndale House)
    "tvtms": {
        "url": "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/TVTMS.txt",
        "filename": "TVTMS.txt",
        "description": "STEPBible Tyndale Versification System (28,000+ line crosswalk)",
    },
    # 2. Latin Vulgate (Clementine, verified 78 books, complete 176 verses in Ps 118)
    "vulgate": {
        "url": "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/VulgClementine.json",
        "filename": "VulgClementine.json",
        "description": "Clementine Vulgate JSON with complete Latin Psalter (2,531 verses)",
    },
    # 3. Greek NT (Open Greek New Testament, NA28-close, accented words, lemmas, RMAC, Strong's)
    "ognt": {
        "url": "https://raw.githubusercontent.com/eliranwong/OpenGNT/master/OpenGNT_BASE_TEXT.zip",
        "filename": "OpenGNT_BASE_TEXT.zip",
        "description": "OpenGNT Base Text (OpenGNT_version3_3.csv with morphology & Strong's)",
    },
    # 4. Hebrew OT (MorphHB / MAPM XML)
    "wlc_morph": {
        "url": "https://raw.githubusercontent.com/openscriptures/morphhb/master/MAPM/MAPM.xml",
        "filename": "MAPM.xml",
        "description": "OpenScriptures MorphHB WLC tagged Hebrew OT with Strong's and morphology",
    },
    # 5. Hebrew BDB Lexicon (Unabridged, 8,090 entries H1-H9009)
    "bdb": {
        "url": "https://raw.githubusercontent.com/eliranwong/unabridged-BDB-Hebrew-lexicon/master/DictBDB.json",
        "filename": "DictBDB.json",
        "description": "Unabridged BDB Hebrew Lexicon keyed from H1 to H9009",
    },
    # 6. Greek LSJ Lexicon (STEPBible TFLSJ with full Strong's keys)
    "lsj_core": {
        "url": "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TFLSJ%20%200-5624%20-%20Translators%20Formatted%20full%20LSJ%20Bible%20lexicon%20-%20STEPBible.org%20CC%20BY.txt",
        "filename": "TFLSJ_0_5624.txt",
        "description": "STEPBible TFLSJ Greek Lexicon for G1-G5624",
    },
    "lsj_extra": {
        "url": "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TFLSJ%20extra%20-%20Translators%20Formatted%20full%20LSJ%20Bible%20lexicon%20-%20STEPBible.org%20CC%20BY.txt",
        "filename": "TFLSJ_extra.txt",
        "description": "STEPBible TFLSJ Greek Lexicon for LXX & Variant numbers (G6000-G20199)",
    },
    # 7. Swete LXX 1930 Raw Text Source
    "swete_source": {
        "url": "https://github.com/eliranwong/LXX-Swete-1930/archive/refs/heads/master.zip",
        "filename": "LXX-Swete-1930.zip",
        "description": "Digitized Swete 1930 Cambridge Septuagint CSVs",
    },
    # 8. BHS Hebrew Morphology Source
    "bhs_morph": {
        "url": "https://raw.githubusercontent.com/eliranwong/BHS-morphology/master/BHS_morphology_with_prs.csv",
        "filename": "BHS_morphology_with_prs.csv",
        "description": "Open BHS Hebrew morphology with pronominal suffixes",
    },
    # 9. English Texts
    "kjv": {
        "url": "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/KJV.json",
        "filename": "KJV.json",
        "description": "King James Version with Apocrypha JSON",
    },
    "webbe": {
        "url": "https://ebible.org/Scriptures/eng-webbe_usfm.zip",
        "filename": "eng-webbe_usfm.zip",
        "description": "World English Bible British Edition (USFM)",
    },
    "brenton": {
        "url": "https://ebible.org/Scriptures/eng-Brenton_usfm.zip",
        "filename": "eng-Brenton_usfm.zip",
        "description": "The Septuagint Version of the OT, with an English Translation (Brenton 1851, USFM)",
    },
}

# Exhaustive Canonical Books Specification (USFM 3-letter codes)
# Covers Protestant, Catholic, and Orthodox Canons (including 1-4 Maccabees, 1-2 Esdras, Ps 151)
CANONICAL_BOOKS = [
    # Old Testament (Prot / MT)
    {"code": "GEN", "order": 1, "testament": "OT", "name_en": "Genesis", "chapters": 50},
    {"code": "EXO", "order": 2, "testament": "OT", "name_en": "Exodus", "chapters": 40},
    {"code": "LEV", "order": 3, "testament": "OT", "name_en": "Leviticus", "chapters": 27},
    {"code": "NUM", "order": 4, "testament": "OT", "name_en": "Numbers", "chapters": 36},
    {"code": "DEU", "order": 5, "testament": "OT", "name_en": "Deuteronomy", "chapters": 34},
    {"code": "JOS", "order": 6, "testament": "OT", "name_en": "Joshua", "chapters": 24},
    {"code": "JDG", "order": 7, "testament": "OT", "name_en": "Judges", "chapters": 21},
    {"code": "RUT", "order": 8, "testament": "OT", "name_en": "Ruth", "chapters": 4},
    {"code": "1SA", "order": 9, "testament": "OT", "name_en": "1 Samuel", "chapters": 31},
    {"code": "2SA", "order": 10, "testament": "OT", "name_en": "2 Samuel", "chapters": 24},
    {"code": "1KI", "order": 11, "testament": "OT", "name_en": "1 Kings", "chapters": 22},
    {"code": "2KI", "order": 12, "testament": "OT", "name_en": "2 Kings", "chapters": 25},
    {"code": "1CH", "order": 13, "testament": "OT", "name_en": "1 Chronicles", "chapters": 29},
    {"code": "2CH", "order": 14, "testament": "OT", "name_en": "2 Chronicles", "chapters": 36},
    {"code": "EZR", "order": 15, "testament": "OT", "name_en": "Ezra", "chapters": 10},
    {"code": "NEH", "order": 16, "testament": "OT", "name_en": "Nehemiah", "chapters": 13},
    {"code": "EST", "order": 17, "testament": "OT", "name_en": "Esther", "chapters": 10},
    {"code": "JOB", "order": 18, "testament": "OT", "name_en": "Job", "chapters": 42},
    {"code": "PSA", "order": 19, "testament": "OT", "name_en": "Psalms", "chapters": 150},
    {"code": "PRO", "order": 20, "testament": "OT", "name_en": "Proverbs", "chapters": 31},
    {"code": "ECC", "order": 21, "testament": "OT", "name_en": "Ecclesiastes", "chapters": 12},
    {"code": "SNG", "order": 22, "testament": "OT", "name_en": "Song of Songs", "chapters": 8},
    {"code": "ISA", "order": 23, "testament": "OT", "name_en": "Isaiah", "chapters": 66},
    {"code": "JER", "order": 24, "testament": "OT", "name_en": "Jeremiah", "chapters": 52},
    {"code": "LAM", "order": 25, "testament": "OT", "name_en": "Lamentations", "chapters": 5},
    {"code": "EZK", "order": 26, "testament": "OT", "name_en": "Ezekiel", "chapters": 48},
    {"code": "DAN", "order": 27, "testament": "OT", "name_en": "Daniel", "chapters": 12},
    {"code": "HOS", "order": 28, "testament": "OT", "name_en": "Hosea", "chapters": 14},
    {"code": "JOL", "order": 29, "testament": "OT", "name_en": "Joel", "chapters": 3},
    {"code": "AMO", "order": 30, "testament": "OT", "name_en": "Amos", "chapters": 9},
    {"code": "OBA", "order": 31, "testament": "OT", "name_en": "Obadiah", "chapters": 1},
    {"code": "JON", "order": 32, "testament": "OT", "name_en": "Jonah", "chapters": 4},
    {"code": "MIC", "order": 33, "testament": "OT", "name_en": "Micah", "chapters": 7},
    {"code": "NAM", "order": 34, "testament": "OT", "name_en": "Nahum", "chapters": 3},
    {"code": "HAB", "order": 35, "testament": "OT", "name_en": "Habakkuk", "chapters": 3},
    {"code": "ZEP", "order": 36, "testament": "OT", "name_en": "Zephaniah", "chapters": 3},
    {"code": "HAG", "order": 37, "testament": "OT", "name_en": "Haggai", "chapters": 2},
    {"code": "ZEC", "order": 38, "testament": "OT", "name_en": "Zechariah", "chapters": 14},
    {"code": "MAL", "order": 39, "testament": "OT", "name_en": "Malachi", "chapters": 4},

    # Apocrypha & Deuterocanon (Catholic & Orthodox)
    {"code": "TOB", "order": 40, "testament": "AP", "name_en": "Tobit", "chapters": 14},
    {"code": "JDT", "order": 41, "testament": "AP", "name_en": "Judith", "chapters": 16},
    {"code": "ESG", "order": 42, "testament": "AP", "name_en": "Greek Esther", "chapters": 10},
    {"code": "WIS", "order": 43, "testament": "AP", "name_en": "Wisdom of Solomon", "chapters": 19},
    {"code": "SIR", "order": 44, "testament": "AP", "name_en": "Sirach", "chapters": 51},
    {"code": "BAR", "order": 45, "testament": "AP", "name_en": "Baruch", "chapters": 5},
    {"code": "LJE", "order": 46, "testament": "AP", "name_en": "Letter of Jeremiah", "chapters": 1},
    {"code": "S3Y", "order": 47, "testament": "AP", "name_en": "Prayer of Azariah", "chapters": 1},
    {"code": "SUS", "order": 48, "testament": "AP", "name_en": "Susanna", "chapters": 1},
    {"code": "BEL", "order": 49, "testament": "AP", "name_en": "Bel and the Dragon", "chapters": 1},
    {"code": "1MA", "order": 50, "testament": "AP", "name_en": "1 Maccabees", "chapters": 16},
    {"code": "2MA", "order": 51, "testament": "AP", "name_en": "2 Maccabees", "chapters": 15},
    {"code": "3MA", "order": 52, "testament": "AP", "name_en": "3 Maccabees", "chapters": 7},
    {"code": "4MA", "order": 53, "testament": "AP", "name_en": "4 Maccabees", "chapters": 18},
    {"code": "1ES", "order": 54, "testament": "AP", "name_en": "1 Esdras", "chapters": 9},
    {"code": "2ES", "order": 55, "testament": "AP", "name_en": "2 Esdras", "chapters": 16},
    {"code": "MAN", "order": 56, "testament": "AP", "name_en": "Prayer of Manasseh", "chapters": 1},
    {"code": "PS2", "order": 57, "testament": "AP", "name_en": "Psalm 151", "chapters": 1},
    {"code": "ODA", "order": 58, "testament": "AP", "name_en": "Odes", "chapters": 14},
    {"code": "PSS", "order": 59, "testament": "AP", "name_en": "Psalms of Solomon", "chapters": 18},
    {"code": "DAG", "order": 60, "testament": "AP", "name_en": "Daniel (Old Greek)", "chapters": 12},
    {"code": "SUG", "order": 61, "testament": "AP", "name_en": "Susanna (Old Greek)", "chapters": 1},
    {"code": "BLG", "order": 62, "testament": "AP", "name_en": "Bel and the Dragon (Old Greek)", "chapters": 1},
    {"code": "LAO", "order": 63, "testament": "AP", "name_en": "Laodiceans", "chapters": 1},

    # New Testament
    {"code": "MAT", "order": 60, "testament": "NT", "name_en": "Matthew", "chapters": 28},
    {"code": "MRK", "order": 61, "testament": "NT", "name_en": "Mark", "chapters": 16},
    {"code": "LUK", "order": 62, "testament": "NT", "name_en": "Luke", "chapters": 24},
    {"code": "JHN", "order": 63, "testament": "NT", "name_en": "John", "chapters": 21},
    {"code": "ACT", "order": 64, "testament": "NT", "name_en": "Acts", "chapters": 28},
    {"code": "ROM", "order": 65, "testament": "NT", "name_en": "Romans", "chapters": 16},
    {"code": "1CO", "order": 66, "testament": "NT", "name_en": "1 Corinthians", "chapters": 16},
    {"code": "2CO", "order": 67, "testament": "NT", "name_en": "2 Corinthians", "chapters": 13},
    {"code": "GAL", "order": 68, "testament": "NT", "name_en": "Galatians", "chapters": 6},
    {"code": "EPH", "order": 69, "testament": "NT", "name_en": "Ephesians", "chapters": 6},
    {"code": "PHP", "order": 70, "testament": "NT", "name_en": "Philippians", "chapters": 4},
    {"code": "COL", "order": 71, "testament": "NT", "name_en": "Colossians", "chapters": 4},
    {"code": "1TH", "order": 72, "testament": "NT", "name_en": "1 Thessalonians", "chapters": 5},
    {"code": "2TH", "order": 73, "testament": "NT", "name_en": "2 Thessalonians", "chapters": 3},
    {"code": "1TI", "order": 74, "testament": "NT", "name_en": "1 Timothy", "chapters": 6},
    {"code": "2TI", "order": 75, "testament": "NT", "name_en": "2 Timothy", "chapters": 4},
    {"code": "TIT", "order": 76, "testament": "NT", "name_en": "Titus", "chapters": 3},
    {"code": "PHM", "order": 77, "testament": "NT", "name_en": "Philemon", "chapters": 1},
    {"code": "HEB", "order": 78, "testament": "NT", "name_en": "Hebrews", "chapters": 13},
    {"code": "JAS", "order": 79, "testament": "NT", "name_en": "James", "chapters": 5},
    {"code": "1PE", "order": 80, "testament": "NT", "name_en": "1 Peter", "chapters": 5},
    {"code": "2PE", "order": 81, "testament": "NT", "name_en": "2 Peter", "chapters": 3},
    {"code": "1JN", "order": 82, "testament": "NT", "name_en": "1 John", "chapters": 5},
    {"code": "2JN", "order": 83, "testament": "NT", "name_en": "2 John", "chapters": 1},
    {"code": "3JN", "order": 84, "testament": "NT", "name_en": "3 John", "chapters": 1},
    {"code": "JUD", "order": 85, "testament": "NT", "name_en": "Jude", "chapters": 1},
    {"code": "REV", "order": 86, "testament": "NT", "name_en": "Revelation", "chapters": 22},
]

# Quick code-to-metadata lookup dict
CANONICAL_BY_CODE = {b["code"]: b for b in CANONICAL_BOOKS}

# Common Book Name Aliases to Standard USFM Code
BOOK_ALIASES = {
    # OT
    "genesis": "GEN", "gen": "GEN",
    "exodus": "EXO", "exod": "EXO", "exo": "EXO",
    "leviticus": "LEV", "lev": "LEV",
    "numbers": "NUM", "num": "NUM",
    "deuteronomy": "DEU", "deut": "DEU", "deu": "DEU",
    "joshua": "JOS", "josh": "JOS", "jos": "JOS",
    "judges": "JDG", "judg": "JDG", "jdg": "JDG",
    "ruth": "RUT", "rut": "RUT",
    "1 samuel": "1SA", "1samuel": "1SA", "1sam": "1SA", "1sa": "1SA", "1 kingdoms": "1SA", "1kgdms": "1SA", "i samuel": "1SA", "i sam": "1SA",
    "2 samuel": "2SA", "2samuel": "2SA", "2sam": "2SA", "2sa": "2SA", "2 kingdoms": "2SA", "2kgdms": "2SA", "ii samuel": "2SA", "ii sam": "2SA",
    "1 kings": "1KI", "1kings": "1KI", "1kgs": "1KI", "1ki": "1KI", "3 kingdoms": "1KI", "3kgdms": "1KI", "i kings": "1KI", "i kgs": "1KI",
    "2 kings": "2KI", "2kings": "2KI", "2kgs": "2KI", "2ki": "2KI", "4 kingdoms": "2KI", "4kgdms": "2KI", "ii kings": "2KI", "ii kgs": "2KI",
    "1 chronicles": "1CH", "1chronicles": "1CH", "1chr": "1CH", "1ch": "1CH", "i chronicles": "1CH", "i chr": "1CH",
    "2 chronicles": "2CH", "2chronicles": "2CH", "2chr": "2CH", "2ch": "2CH", "ii chronicles": "2CH", "ii chr": "2CH",
    "ezra": "EZR", "ezr": "EZR", "1 esdras (vulgate)": "EZR",
    "nehemiah": "NEH", "neh": "NEH", "2 esdras (vulgate)": "NEH",
    "esther": "EST", "esth": "EST", "est": "EST",
    "job": "JOB",
    "psalms": "PSA", "psalm": "PSA", "ps": "PSA", "psa": "PSA",
    "proverbs": "PRO", "prov": "PRO", "pro": "PRO",
    "ecclesiastes": "ECC", "eccl": "ECC", "ecc": "ECC", "qoh": "ECC",
    "song of solomon": "SNG", "song": "SNG", "cant": "SNG", "canticles": "SNG", "sng": "SNG",
    "isaiah": "ISA", "isa": "ISA",
    "jeremiah": "JER", "jer": "JER",
    "lamentations": "LAM", "lam": "LAM",
    "ezekiel": "EZK", "ezek": "EZK", "ezk": "EZK",
    "daniel": "DAN", "dan": "DAN",
    "hosea": "HOS", "hos": "HOS",
    "joel": "JOL", "joe": "JOL", "jol": "JOL",
    "amos": "AMO", "amo": "AMO",
    "obadiah": "OBA", "obad": "OBA", "oba": "OBA",
    "jonah": "JON", "jon": "JON",
    "micah": "MIC", "mic": "MIC",
    "nahum": "NAM", "nah": "NAM", "nam": "NAM",
    "habakkuk": "HAB", "hab": "HAB",
    "zephaniah": "ZEP", "zeph": "ZEP", "zep": "ZEP",
    "haggai": "HAG", "hag": "HAG",
    "zechariah": "ZEC", "zech": "ZEC", "zec": "ZEC",
    "malachi": "MAL", "mal": "MAL",

    # Apocrypha
    "tobit": "TOB", "tob": "TOB", "tobba": "TOB", "tobs": "TOB",
    "judith": "JDT", "jdt": "JDT",
    "esther (greek)": "ESG", "esther greek": "ESG", "esg": "ESG", "addesth": "ESG", "addest": "ESG",
    "wisdom of solomon": "WIS", "wisdom": "WIS", "wis": "WIS",
    "sirach": "SIR", "sir": "SIR", "ecclesiasticus": "SIR",
    "baruch": "BAR", "bar": "BAR",
    "letter of jeremiah": "LJE", "lje": "LJE", "epjer": "LJE",
    "prayer of azariah": "S3Y", "s3y": "S3Y",
    "susanna": "SUS", "sus": "SUS", "susth": "SUS", "sug": "SUG",
    "bel and the dragon": "BEL", "bel": "BEL", "belth": "BEL", "blg": "BLG",
    "daniel (old greek)": "DAG", "dag": "DAG", "danth": "DAN",
    "1 maccabees": "1MA", "1maccabees": "1MA", "1mac": "1MA", "1macc": "1MA", "1ma": "1MA", "i maccabees": "1MA", "i macc": "1MA",
    "2 maccabees": "2MA", "2maccabees": "2MA", "2mac": "2MA", "2macc": "2MA", "2ma": "2MA", "ii maccabees": "2MA", "ii macc": "2MA",
    "3 maccabees": "3MA", "3maccabees": "3MA", "3mac": "3MA", "3macc": "3MA", "3ma": "3MA", "iii maccabees": "3MA",
    "4 maccabees": "4MA", "4maccabees": "4MA", "4mac": "4MA", "4macc": "4MA", "4ma": "4MA", "iv maccabees": "4MA",
    "1 esdras": "1ES", "1esdr": "1ES", "1es": "1ES", "3 esdras": "1ES", "i esdras": "1ES",
    "2 esdras": "2ES", "2esdr": "2ES", "2es": "2ES", "4 esdras": "2ES", "ii esdras": "2ES",
    "prayer of manasseh": "MAN", "man": "MAN", "prman": "MAN", "prayer of manasses": "MAN",
    "psalm 151": "PS2", "ps151": "PS2", "ps2": "PS2", "additional psalm": "PS2",
    "odes": "ODA", "od": "ODA", "oda": "ODA",
    "psalms of solomon": "PSS", "pss": "PSS", "pssol": "PSS", "psssol": "PSS",
    "laodiceans": "LAO", "lao": "LAO",

    # NT
    "matthew": "MAT", "matt": "MAT", "mat": "MAT",
    "mark": "MRK", "mrk": "MRK",
    "luke": "LUK", "luk": "LUK",
    "john": "JHN", "jhn": "JHN",
    "acts": "ACT", "act": "ACT",
    "romans": "ROM", "rom": "ROM",
    "1 corinthians": "1CO", "1corinthians": "1CO", "1cor": "1CO", "1_cor": "1CO", "1co": "1CO", "i corinthians": "1CO", "i cor": "1CO",
    "2 corinthians": "2CO", "2corinthians": "2CO", "2cor": "2CO", "2_cor": "2CO", "2co": "2CO", "ii corinthians": "2CO", "ii cor": "2CO",
    "galatians": "GAL", "gal": "GAL",
    "ephesians": "EPH", "eph": "EPH",
    "philippians": "PHP", "phil": "PHP", "php": "PHP",
    "colossians": "COL", "col": "COL",
    "1 thessalonians": "1TH", "1thess": "1TH", "1_thess": "1TH", "1th": "1TH", "i thessalonians": "1TH", "i thess": "1TH",
    "2 thessalonians": "2TH", "2thess": "2TH", "2_thess": "2TH", "2th": "2TH", "ii thessalonians": "2TH", "ii thess": "2TH",
    "1 timothy": "1TI", "1tim": "1TI", "1_tim": "1TI", "1ti": "1TI", "i timothy": "1TI", "i tim": "1TI",
    "2 timothy": "2TI", "2tim": "2TI", "2_tim": "2TI", "2ti": "2TI", "ii timothy": "2TI", "ii tim": "2TI",
    "titus": "TIT", "tit": "TIT",
    "philemon": "PHM", "phm": "PHM", "phlm": "PHM",
    "hebrews": "HEB", "heb": "HEB",
    "james": "JAS", "jas": "JAS",
    "1 peter": "1PE", "1pet": "1PE", "1_pet": "1PE", "1pe": "1PE", "i peter": "1PE", "i pet": "1PE",
    "2 peter": "2PE", "2pet": "2PE", "2_pet": "2PE", "2pe": "2PE", "ii peter": "2PE", "ii pet": "2PE",
    "1 john": "1JN", "1john": "1JN", "1_john": "1JN", "1jn": "1JN", "i john": "1JN",
    "2 john": "2JN", "2john": "2JN", "2_john": "2JN", "2jn": "2JN", "ii john": "2JN",
    "3 john": "3JN", "3john": "3JN", "3_john": "3JN", "3jn": "3JN", "iii john": "3JN",
    "jude": "JUD", "jud": "JUD",
    "revelation": "REV", "rev": "REV", "revelation of john": "REV",
}

CANONICAL_BOOK_CODES = {b["code"] for b in CANONICAL_BOOKS}


def resolve_canonical_book(name: str) -> Optional[str]:
    """Resolves a raw book name, abbreviation, or USFM code to a standard canonical USFM code."""
    if not name:
        return None
    raw = str(name).strip()
    s = raw.lower()
    if s in BOOK_ALIASES:
        return BOOK_ALIASES[s]
    s_clean = s.replace("_", "").replace(" ", "")
    if s_clean in BOOK_ALIASES:
        return BOOK_ALIASES[s_clean]
    up = raw.upper()
    if up in CANONICAL_BOOK_CODES:
        return up
    return None


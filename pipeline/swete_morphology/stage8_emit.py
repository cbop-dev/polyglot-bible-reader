"""Stage 8: Emit Production Datasets for biblical-lexeme-explorer.

Transforms pipeline/build/swete_resolved_tokens.json and swete_verses.json into:
  - static/data/lxx/books.json
  - static/data/lxx/verses.json
  - static/data/lxx/sections.json
  - static/data/lxx/lexemes.json
  - static/data/lxx/concordance.json
  - static/data/lxx/books/{abbrev}.json
  - src/lib/lxx/lxxLexes6.json
  - src/lib/lxx/lxxDataset.js
  - src/lib/lxx/tfLXX.js
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

from .config import (
    APP_LXX_DATA_DIR,
    APP_LXX_LIB_DIR,
    BUILD_DIR,
    RESOLVED_TOKENS_FILE,
    VERSES_FILE,
)
from .lemma_consolidator import (
    build_dynamic_consolidations,
    canonicalize_token_lemma,
)
from .gloss_resolver import GlossResolver


GREEK_LETTERS = "αβγδεζηθικλμνξοπρστυφχψω"
BETA_LETTERS = "abgdezhqiklmnjoprstufxyw"

BOOK_CANONICAL_ORDER = [
    ("Gen", "Gen", "Genesis", ["Genesis", "Gen", "Ge"]),
    ("Exod", "Exod", "Exodus", ["Exodus", "Exod"]),
    ("Lev", "Lev", "Leviticus", ["Leviticus", "Lev"]),
    ("Num", "Num", "Numbers", ["Numbers", "Num"]),
    ("Deut", "Deut", "Deuteronomy", ["Deuteronomy", "Deut", "Deu", "Dt"]),
    ("Josh", "Josh", "Joshua", ["Joshua", "Josh"]),
    ("Judg", "Judg", "Judges", ["Judges", "Judgs", "Judg", "Jdgs", "Jdg"]),
    ("Ruth", "Ruth", "Ruth", ["Ruth"]),
    ("1Kgdms", "1Kgdms", "I Kingdoms", ["I Kingdoms", "1 Kingdoms", "1 Samuel", "I Samuel", "I Kgdms", "1 Kgdms", "1 Sam", "I Sam", "1 Sa", "I Sa"]),
    ("2Kgdms", "2Kgdms", "II Kingdoms", ["II Kingdoms", "2 Kingdoms", "II Samuel", "2 Samuel", "II Sam", "2 Sam", "II Sa", "2 Sa", "II Kgdms", "2 Kgdms"]),
    ("3Kgdms", "3Kgdms", "III Kingdoms", ["III Kingdoms", "3 Kingdoms", "III Kgdms", "1 Kings", "I Kings", "3 Kgdms", "1 Kgs", "1 Kg", "I Kg"]),
    ("4Kgdms", "4Kgdms", "IV Kingdoms", ["IV Kingdoms", "4 Kingdoms", "II Kings", "IV Kgdms", "2 Kings", "4 Kgdms", "2 Kgs", "II Kg", "2 Kg"]),
    ("1Chr", "1Chr", "I Chronicles", ["I Chronicles", "1 Chronicles", "1 Chron", "I Chron", "1 Chr", "I Chr", "1 Ch", "I Ch"]),
    ("2Chr", "2Chr", "II Chronicles", ["II Chronicles", "2 Chronicles", "II Chron", "2 Chron", "II Chr", "2 Chr", "II Ch", "2 Ch"]),
    ("1Esdr", "1Esdr", "1 Esdras", ["1 Esdras", "I Esdras", "1 Esdr", "I Esdr"]),
    ("2Esdr", "2Esdr", "II Esdras", ["II Esdras", "2 Esdras", "II Esdr", "2 Esdr", "Ezra", "Nehemiah", "Neh", "Ezr"]),
    ("Esth", "Esth", "Esther", ["Esther", "Esth", "Est"]),
    ("Jdt", "Jdt", "Judith", ["Judith", "Jdt"]),
    ("TobBA", "TobBA", "Tobit BA", ["Tobit BA", "Tob BA", "Tobit", "Tob"]),
    ("TobS", "TobS", "Tobit S", ["Tobit S", "Tobit", "Tob S", "Tob"]),
    ("1Mac", "1Mac", "1 Maccabees", ["1 Maccabees", "1 Maccab", "I Maccab", "1 Macc", "I Macc", "1 Mac", "I Mac"]),
    ("2Mac", "2Mac", "2 Maccabees", ["2 Maccabees", "II Maccab", "2 Maccab", "II Macc", "2 Macc", "II Mac", "2 Mac"]),
    ("3Mac", "3Mac", "3 Maccabees", ["3 Maccabees", "III Maccab", "3 Maccab", "III Macc", "III Mac", "3 Mac"]),
    ("4Mac", "4Mac", "4 Maccabees", ["4 Maccabees", "IV Maccab", "4 Maccab", "IV Macc", "IV Mac", "4 Mac"]),
    ("Ps", "Ps", "Psalms", ["Psalms", "Ps(s)", "Psa", "Ps"]),
    ("Od", "Od", "Odes", ["Odes", "Odes of Solomon", "OdesSol", "OdSol", "Od"]),
    ("Prov", "Prov", "Proverbs", ["Proverbs", "Prov", "Pr"]),
    ("Qoh", "Qoh", "Ecclesiastes", ["Ecclesiastes", "Qoheleth", "Eccl", "Qoh"]),
    ("Cant", "Cant", "Song of Solomon", ["Song of Solomon", "Song of Songs", "Canticles", "Song", "Cant"]),
    ("Job", "Job", "Job", ["Job", "Jb"]),
    ("Wis", "Wis", "Wisdom of Solomon", ["Wisdom of Solomon", "Wisdom", "Wisd", "Wis"]),
    ("Sir", "Sir", "Sirach", ["Sirach", "Ecclesiasticus", "Ben Sira", "Sir"]),
    ("PsSol", "PsSol", "Psalms of Solomon", ["Psalms of Solomon", "Psa Sol", "Ps Sol", "PsaSol"]),
    ("Hos", "Hos", "Hosea", ["Hosea", "Hos"]),
    ("Mic", "Mic", "Micah", ["Micah", "Mic"]),
    ("Amos", "Amos", "Amos", ["Amos"]),
    ("Joel", "Joel", "Joel", ["Joel"]),
    ("Jonah", "Jonah", "Jonah", ["Jonah", "Jonah LXX", "JonahLXX", "Jon LXX", "JonLXX", "Jon"]),
    ("Obad", "Obad", "Obadiah", ["Obadiah", "Obad", "Ob"]),
    ("Nah", "Nah", "Nahum", ["Nahum", "Nah"]),
    ("Hab", "Hab", "Habakkuk", ["Habakkuk", "Hab"]),
    ("Zeph", "Zeph", "Zephaniah", ["Zephaniah", "Zeph"]),
    ("Hag", "Hag", "Haggai", ["Haggai", "Hag"]),
    ("Zech", "Zech", "Zechariah", ["Zechariah", "Zech"]),
    ("Mal", "Mal", "Malachi", ["Malachi", "Mal"]),
    ("Isa", "Isa", "Isaiah", ["Isaiah", "Isa", "Is"]),
    ("Jer", "Jer", "Jeremiah", ["Jeremiah", "Jer"]),
    ("Bar", "Bar", "Baruch", ["Baruch", "Bar"]),
    ("EpJer", "EpJer", "Epistle of Jeremiah", ["Epistle of Jeremiah", "Ep Jer", "EpJer"]),
    ("Lam", "Lam", "Lamentations", ["Lamentations", "Lam"]),
    ("Ezek", "Ezek", "Ezekiel", ["Ezekiel", "Ezek"]),
    ("Bel", "Bel", "Bel and the Dragon", ["Bel and the Dragon", "BelDrag", "Bel"]),
    ("BelTh", "BelTh", "Bel and the Dragon Th", ["Bel and the Dragon Th", "BelDragTh", "BelTh"]),
    ("Dan", "Dan", "Daniel LXX", ["Daniel LXX", "DanielLXX", "Daniel OG", "DanielOG", "Dan LXX", "Daniel", "DanLXX", "Dan OG", "DanOG", "Dan"]),
    ("DanTh", "DanTh", "Daniel Th", ["Daniel Th", "DanielTh", "Daniel", "Dan Th", "DanTh"]),
    ("Sus", "Sus", "Susanna OG", ["Susanna OG", "SusannaOG", "Susanna", "Sus OG", "SusOG", "Sus"]),
    ("SusTh", "SusTh", "Susanna Th", ["Susanna Th", "SusannaTh", "SusTh"]),
    # Additional Swete books
    ("SirProl", "SirProl", "Sirach Prologue", ["Sirach Prologue", "SirProl", "Sip"]),
    ("1En", "1En", "1 Enoch", ["1 Enoch", "1En", "Enoch"]),
]

BOOK_NORM_MAP = {
    "1Sam": "1Kgdms",
    "2Sam": "2Kgdms",
    "1Kgs": "3Kgdms",
    "2Kgs": "4Kgdms",
    "Ezra": "2Esdr",
    "Neh": "2Esdr",
}


def strip_accents(s: str) -> str:
    if not s:
        return ""
    norm = unicodedata.normalize("NFKD", s)
    clean = "".join(c for c in norm if not unicodedata.combining(c) and c != "ͅ" and c != "\u0345")
    return unicodedata.normalize("NFC", clean).lower().replace("ς", "σ")


def make_plain_greek(s: str) -> str:
    """Case-preserving diacritic stripping matching SBLGNT and GreekLexeme.makePlain()."""
    if not s:
        return ""
    norm = unicodedata.normalize("NFKD", s)
    clean = "".join(c for c in norm if not unicodedata.combining(c) and c != "ͅ" and c != "\u0345")
    return unicodedata.normalize("NFC", clean)


def greek_to_beta(s: str) -> str:
    if not s:
        return ""
    cleaned = unicodedata.normalize("NFD", s)
    res = []
    for c in cleaned:
        if c in GREEK_LETTERS:
            idx = GREEK_LETTERS.index(c)
            res.append(BETA_LETTERS[idx])
        elif c.isalnum():
            res.append(c)
    return "".join(res)


def emit():
    APP_LXX_DATA_DIR.mkdir(parents=True, exist_ok=True)
    out_books_dir = APP_LXX_DATA_DIR / "books"
    out_books_dir.mkdir(parents=True, exist_ok=True)
    APP_LXX_LIB_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Loading resolved tokens from {RESOLVED_TOKENS_FILE}...")
    with open(RESOLVED_TOKENS_FILE, "r", encoding="utf-8") as f:
        tokens = json.load(f)

    print("Building and applying canonical lemma consolidations...")
    consolidation_map = build_dynamic_consolidations(tokens)
    consolidated_tokens_count = 0
    for t in tokens:
        orig = t.get("lemma", "")
        canon = canonicalize_token_lemma(t, consolidation_map)
        if canon != orig:
            t["lemma"] = canon
            consolidated_tokens_count += 1
    print(f"Consolidated {consolidated_tokens_count:,} tokens across {len(consolidation_map)} lemma rules.")

    print(f"Loading verses from {VERSES_FILE}...")
    with open(VERSES_FILE, "r", encoding="utf-8") as f:
        raw_verses = json.load(f)

    # Normalize book names in verses: e.g. "1Sam 1:1" -> "1Kgdms 1:1"
    verses_text = {}
    for ref, txt in raw_verses.items():
        parts = ref.split(" ")
        b = parts[0]
        canon_b = BOOK_NORM_MAP.get(b, b)
        new_ref = f"{canon_b} {' '.join(parts[1:])}"
        verses_text[new_ref] = txt

    print(f"Assigning nodes and organizing corpus across {len(tokens):,} tokens...")
    BOOK_NODE_START = 623694
    CHAP_NODE_START = 623751
    VERSE_NODE_START = 655362

    # Map book abbrev to node ID
    book_node_map = {}
    book_meta_template = {}
    for idx, (b_abbrev, b_canon, b_long, b_syns) in enumerate(BOOK_CANONICAL_ORDER):
        node = BOOK_NODE_START + idx
        book_node_map[b_abbrev] = node
        book_meta_template[b_abbrev] = {
            "node": node,
            "name": b_abbrev,
            "abbrev": b_abbrev,
            "long": b_long,
            "syn": b_syns,
        }

    # Group tokens by book, chapter, verse
    book_tokens = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    for t in tokens:
        raw_b = t["book"]
        b = BOOK_NORM_MAP.get(raw_b, raw_b)
        c = str(t["chapter"])
        v = str(t["verse"])
        # Update token's ref and book to canonical
        t["book"] = b
        t["ref"] = f"{b} {c}:{v}"
        book_tokens[b][c][v].append(t)

    current_chap_node = CHAP_NODE_START
    current_verse_node = VERSE_NODE_START

    books_meta = {}
    sections_data = {}
    verses_data = {}
    concordance = defaultdict(lambda: {"total": 0, "bookcounts": defaultdict(int), "refs": [], "nodes": []})

    lemma_store = {}
    lemma_to_id = {}
    plain_to_id = {}
    next_lex_id = 1

    # First pass: establish frequency order for lemma IDs
    print("Aggregating lemma frequencies...")
    lemma_frequencies = Counter()
    lemma_pos_counter = defaultdict(Counter)
    for t in tokens:
        lem = t["lemma"]
        lemma_frequencies[lem] += 1
        lemma_pos_counter[lem][t["pos"]] += 1

    sorted_lemmas = [lem for lem, _ in lemma_frequencies.most_common()]
    gloss_resolver = GlossResolver()
    print(f"Resolving English glosses and Strong's IDs for {len(sorted_lemmas):,} unique lemmata...")

    for idx, lem in enumerate(sorted_lemmas, start=1):
        lemma_to_id[lem] = idx
        plain = make_plain_greek(lem)
        if plain not in plain_to_id:
            plain_to_id[plain] = idx
        most_common_pos = lemma_pos_counter[lem].most_common(1)[0][0]
        gloss, strongs = gloss_resolver.resolve(lem, most_common_pos, lemma_frequencies[lem])
        lemma_store[idx] = {
            "id": idx,
            "lemma": lem,
            "gloss": gloss,
            "pos": most_common_pos,
            "total": 0,
            "beta": greek_to_beta(lem),
            "plain": plain,
            "strongs": strongs
        }

    total_words_corpus = 0
    client_books_dict = {}
    client_chapters_dict = {}

    for b_abbrev, b_canon, b_long, b_syns in BOOK_CANONICAL_ORDER:
        if b_abbrev not in book_tokens:
            continue

        b_node = book_node_map[b_abbrev]
        b_chapters_data = book_tokens[b_abbrev]
        b_words_count = 0
        b_lex_counts = Counter()
        b_chap_nodes = {}
        book_file_chapters = {}

        # Natural sort chapters numerically
        chap_keys = sorted(b_chapters_data.keys(), key=lambda x: int(re.sub(r'\D', '', x) or '0'))

        for c_str in chap_keys:
            c_node = current_chap_node
            current_chap_node += 1
            b_chap_nodes[str(c_node)] = c_str

            c_verses_data = b_chapters_data[c_str]
            c_words_count = 0
            c_lex_counts = Counter()
            book_file_chapters[c_str] = {}

            v_keys = sorted(c_verses_data.keys(), key=lambda x: int(re.sub(r'\D', '', x) or '0'))
            for v_str in v_keys:
                v_node = current_verse_node
                current_verse_node += 1

                toks = c_verses_data[v_str]
                ref_str = f"{b_abbrev} {c_str}:{v_str}"
                verse_text = verses_text.get(ref_str, " ".join(t["surface"] + t.get("punct", "") for t in toks).strip())

                for t in toks:
                    lem = t["lemma"]
                    lid = lemma_to_id[lem]
                    lemma_store[lid]["total"] += 1
                    b_lex_counts[lid] += 1
                    c_lex_counts[lid] += 1
                    b_words_count += 1
                    c_words_count += 1
                    total_words_corpus += 1

                    conc = concordance[str(lid)]
                    conc["total"] += 1
                    conc["bookcounts"][str(b_node)] += 1
                    if not conc["refs"] or conc["refs"][-1] != ref_str:
                        conc["refs"].append(ref_str)
                        conc["nodes"].append(v_node)

                book_file_chapters[c_str][v_str] = {
                    "id": v_node,
                    "section": ref_str,
                    "text": verse_text
                }
                verses_data[str(v_node)] = {
                    "id": v_node,
                    "section": ref_str,
                    "text": verse_text
                }

            sections_data[str(c_node)] = {
                "words": c_words_count,
                "lex": {str(lid): cnt for lid, cnt in c_lex_counts.items()}
            }

        sections_data[str(b_node)] = {
            "words": b_words_count,
            "lex": {str(lid): cnt for lid, cnt in b_lex_counts.items()}
        }

        books_meta[str(b_node)] = {
            "name": b_abbrev,
            "abbrev": b_abbrev,
            "node": b_node,
            "words": b_words_count,
            "chapters": b_chap_nodes
        }

        client_books_dict[b_node] = {
            "abbrev": b_abbrev,
            "syn": b_syns,
            "long": b_long,
            "words": b_words_count
        }
        client_chapters_dict[b_node] = {
            int(c_node): int(c_str) if c_str.isdigit() else c_str
            for c_node, c_str in b_chap_nodes.items()
        }

        # Write static/data/lxx/books/{abbrev}.json
        book_obj = {
            "book": b_abbrev,
            "abbrev": b_abbrev,
            "chapters": book_file_chapters
        }
        with open(out_books_dir / f"{b_abbrev}.json", "w", encoding="utf-8") as fp:
            json.dump(book_obj, fp, ensure_ascii=False)

    print("\nProcessed Books Summary:")
    for b_node, b_meta in books_meta.items():
        print(f"  {b_meta['abbrev']:7s}: {b_meta['words']:6d} words, {len(b_meta['chapters']):3d} chapters")

    # 1. lexemes.json
    print(f"\nWriting lexemes.json ({len(lemma_store):,} entries)...")
    lexemes_output = {str(lid): data for lid, data in lemma_store.items()}
    with open(APP_LXX_DATA_DIR / "lexemes.json", "w", encoding="utf-8") as fp:
        json.dump(lexemes_output, fp, ensure_ascii=False)

    # 2. books.json
    print(f"Writing books.json ({len(books_meta)} books)...")
    with open(APP_LXX_DATA_DIR / "books.json", "w", encoding="utf-8") as fp:
        json.dump(books_meta, fp, ensure_ascii=False, indent=2)

    # 3. sections.json
    print(f"Writing sections.json ({len(sections_data):,} sections)...")
    with open(APP_LXX_DATA_DIR / "sections.json", "w", encoding="utf-8") as fp:
        json.dump(sections_data, fp, ensure_ascii=False)

    # 4. verses.json
    print(f"Writing verses.json ({len(verses_data):,} verses)...")
    with open(APP_LXX_DATA_DIR / "verses.json", "w", encoding="utf-8") as fp:
        json.dump(verses_data, fp, ensure_ascii=False)

    # 5. concordance.json
    print(f"Writing concordance.json ({len(concordance):,} concordances)...")
    with open(APP_LXX_DATA_DIR / "concordance.json", "w", encoding="utf-8") as fp:
        json.dump(concordance, fp, ensure_ascii=False)

    # 6. src/lib/lxx/lxxLexes6.json
    print(f"Writing client search index lxxLexes6.json...")
    sorted_lexemes = sorted(lemma_store.values(), key=lambda x: (x["plain"].lower(), x["lemma"]))
    client_search_index = {
        "greek": [x["lemma"] for x in sorted_lexemes],
        "plain": [x["plain"] for x in sorted_lexemes],
        "id": [x["id"] for x in sorted_lexemes]
    }
    with open(APP_LXX_LIB_DIR / "lxxLexes6.json", "w", encoding="utf-8") as fp:
        json.dump(client_search_index, fp, ensure_ascii=False)

    # 7. src/lib/lxx/lxxDataset.js and tfLXX.js
    print(f"Writing client wrappers lxxDataset.js and tfLXX.js...")
    write_client_wrappers(client_books_dict, client_chapters_dict, total_words_corpus, len(lemma_store))

    print(f"\nStage 8 completed! Total corpus words: {total_words_corpus:,}, Total lexemes: {len(lemma_store):,}")


def write_client_wrappers(books_dict: dict, chapters_dict: dict, total_words: int, total_lexemes: int):
    dataset_js_code = f"""import {{ VocabDataset, BookDict }} from "$lib/data/VocabDataset.js";
import {{ GreekLexeme }} from "$lib/Lexeme.js";
import lxxLexemes from '$lib/lxx/lxxLexes6.json';

class LxxVocabDataset extends VocabDataset {{
    static booksDict = new BookDict();
    static posDict = {{
        0:  {{ 'abbrev': 'adj', 'desc': 'adjective' }},
        1:  {{ 'abbrev': 'c', 'desc': 'conjunction' }},
        2:  {{ 'abbrev': 'adv', 'desc': 'adverb' }},
        3:  {{ 'abbrev': 'interj', 'desc': 'interjection' }},
        4:  {{ 'abbrev': 'n', 'desc': 'noun' }},
        5:  {{ 'abbrev': 'prep', 'desc': 'preposition' }},
        6:  {{ 'abbrev': 'ar', 'desc': 'article' }},
        7:  {{ 'abbrev': 'demon', 'desc': 'pronoun, demonstrative' }},
        8:  {{ 'abbrev': 'intero', 'desc': 'pronoun, interrogative' }},
        9:  {{ 'abbrev': 'pers', 'desc': 'pronoun, personal/possessive' }},
        10: {{ 'abbrev': 'rel', 'desc': 'pronoun, relative' }},
        11: {{ 'abbrev': 'v', 'desc': 'verb' }},
        12: {{ 'abbrev': 'part', 'desc': 'particle' }},
        13: {{ 'abbrev': 'name', 'desc': 'proper noun or name' }},
        14: {{ 'abbrev': 'num', 'desc': 'numeral' }},
        15: {{ 'abbrev': 'unspec', 'desc': 'unspecified' }},
        16: {{ 'abbrev': 'pron', 'desc': 'pronoun' }}
    }};

    static posGroups = {{
        "CONT": [0, 4, 11, 13],
        "CONTENT": [0, 4, 11, 13],
        "SYNT": [1, 2, 5, 6, 7, 8, 9, 10, 12, 14, 16],
        "SYNTAX": [1, 2, 5, 6, 7, 8, 9, 10, 12, 14, 16],
        "PREP": [5],
        "PREPOSITIONS": [5],
        "PREPOSITION": [5],
        "PART": [12],
        "PARTICLES": [12],
        "PARTICLE": [12],
        "PRON": [7, 8, 9, 10, 16],
        "PRONOUNS": [7, 8, 9, 10, 16],
        "PRONOUN": [7, 8, 9, 10, 16]
    }};

    static posGroupsUIDesc = {{
        "CONTENT": "Content words (nouns, verbs, adjectives, adverbs)",
        "SYNTAX": "Syntax words (conjunctions, particles, prepositions)",
        "PREPOSITIONS": "Prepositions",
        "PARTICLES": "Particles",
        "PRONOUNS": "Pronouns"
    }};

    constructor() {{
        super();
        this.name = "LXX";
        this.abbrev = "LXX";
        this.lang = "greek";
        this.dbAbbrev = "lxx";
        this.booksDict = LxxVocabDataset.booksDict;
        this.booksDict.books = {json.dumps(books_dict, ensure_ascii=False, indent=12)};
        this.booksDict.chapters = {json.dumps(chapters_dict, ensure_ascii=False, indent=12)};
        this.posDict = LxxVocabDataset.posDict;
        this.posGroups = LxxVocabDataset.posGroups;
        this.posGroupsUIDesc = LxxVocabDataset.posGroupsUIDesc;
        this.lexStats.totalWords = {total_words};
        this.lexStats.totalLexemes = {total_lexemes};
        this.lexemes = lxxLexemes;
    }}
}}

class LxxGreekLexeme extends GreekLexeme {{
    constructor(id = 0, lemma = '', gloss = '', count = 0, pos = null, total = 0, beta = '', sectFreq = null, totalFreq = null, freqSectTotalRatio = null, posDict = LxxVocabDataset.posDict) {{
        super(id, lemma, gloss, count, pos, total, beta, sectFreq, totalFreq, freqSectTotalRatio, posDict);
    }}
}}

export {{ LxxVocabDataset, LxxGreekLexeme }};
// Compatibility alias
export {{ LxxVocabDataset as TfLxxDataset }};
export default LxxVocabDataset;
"""

    with open(APP_LXX_LIB_DIR / "lxxDataset.js", "w", encoding="utf-8") as f:
        f.write(dataset_js_code)

    tflxx_js_code = """import { LxxVocabDataset, LxxGreekLexeme, TfLxxDataset } from "./lxxDataset.js";

export { LxxVocabDataset, LxxGreekLexeme, TfLxxDataset };
export default LxxVocabDataset;
"""
    with open(APP_LXX_LIB_DIR / "tfLXX.js", "w", encoding="utf-8") as f:
        f.write(tflxx_js_code)


if __name__ == "__main__":
    emit()

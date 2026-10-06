"""Stage 1: Ingest, normalize, and tokenize Swete 1930 Septuagint.

Reads:
  - pipeline/sources/LXX-Swete-1930/00-Swete_versification.csv
  - pipeline/sources/LXX-Swete-1930/01-Swete_word_with_punctuations.csv

Emits:
  - pipeline/build/swete_tokens.json: Token stream with reference, surface, normalized word, and punctuation.
  - pipeline/build/swete_verses.json: Reconstructed continuous verse texts.
  - pipeline/build/swete_types.json: Unique vocabulary surface types with occurrence frequencies.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

from .config import (
    BUILD_DIR,
    SWETE_BOOK_MAP,
    SWETE_VERSIFICATION_CSV,
    SWETE_WORDS_CSV,
    TOKENS_FILE,
    TYPES_FILE,
    VERSES_FILE,
)

# Known decorative all-caps chapter/book openings in Swete typography
ALL_CAPS_NORMALIZATIONS = {
    "ΕΝ": "Ἐν",
    "ΑΡΧΗ": "ἀρχῇ",
    "ΤΑΥΤΑ": "Ταῦτα",
    "ΚΑΙ": "Καὶ",
    "ΟΥΤΟΙ": "Οὗτοι",
    "ἌΝΘΡΩΠΟΣ": "Ἄνθρωπος",
    "ΑΝΘΡΩΠΟΣ": "Ἄνθρωπος",
    "ΑΔΑΜ": "Ἀδάμ",
    "ΛΟΓΟΙ": "Λόγοι",
    "ΜΑΚΑΡΙΟΣ": "Μακάριος",
    "ΠΑΡΟΙΜΙΑΙ": "Παροιμίαι",
    "ΑΣΜΑ": "ᾎσμα",
    "ΑΣΜΑΤΩΝ": "ᾀσμάτων",
    "ΟΡΑCΙC": "Ὅρασις",
    "ΟΡΑΣΙΣ": "Ὅρασις",
    "ΤΟ": "Τὸ",
    "ΤΟΙΣ": "Τοῖς",
    "ΔΕ": "Δὲ",
    "ΡΗΜΑ": "ῥῆμα",
    "ΡΗΜΑΤΑ": "Ῥήματα",
    "ΠΡΟΦΗΤΕΙΑ": "Προφητεία",
    "ΒΙΒΛΟΣ": "Βίβλος",
    "ΛΗΜΜΑ": "Λῆμμα",
    "ΠΡΟΣΕΥΧΗ": "Προσευχή",
    "ΑΙΝΕΣΙΣ": "Αἴνεσις",
    "ΩΔΗ": "ᾨδή",
    "ΩΔΑΙ": "ᾨδαί",
    "ΕΤΟΥΣ": "Ἔτους",
    "ΑΓΑΠΗΣΑΤΕ": "Ἀγαπήσατε",
    "ΠΟΛΛΩΝ": "Πολλῶν",
    "ΠΑΣΑ": "Πᾶσα",
    "ΛΟΓΟΣ": "Λόγος",
    "ΑΝΤΙΓΡΑΦΟΝ": "Ἀντίγραφον",
    "ΕΠΙ": "Ἐπί",
    "ΦΙΛΟΣΟΦΩΤΑΤΟΝ": "Φιλοσοφώτατον",
    "ΕΒΟΗΣΑ": "Ἐβόησα",
    "ΑΣΩΜΕΝ": "ᾌσωμεν",
    "ΣέΒεε": "Σέβεε",
    "ΙΙερσῶν": "Περσῶν",
}


PUNCTUATION_CHARS = ".,;·:!?᾽’”“«»-—"
EDITORIAL_CHARS = set("⸂⸃⸆⸇⸀⸁⸄⸅⸈⸉⸊⸋[]⟦⟧⟨⟩⟪⟫()†‡*0123456789")
GREEK_DIAC_REGEX = re.compile(r"[\u0300-\u036f\u0313\u0314\u0342\u0345\u0308']+")


def has_greek_letters(text: str) -> bool:
    return any(("\u0370" <= c <= "\u03FF") or ("\u1F00" <= c <= "\u1FFF") for c in text)


def strip_accents(text: str) -> str:
    if not text:
        return ""
    norm = unicodedata.normalize("NFD", text)
    clean = "".join(c for c in norm if unicodedata.category(c) != "Mn")
    return unicodedata.normalize("NFC", clean).lower().replace("ς", "σ")


def load_versification() -> list[tuple[int, str, int, int, str]]:
    """Loads 00-Swete_versification.csv into list of (start_idx, book, chap, verse, ref_str)."""
    intervals = []
    with open(SWETE_VERSIFICATION_CSV, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) != 2:
                continue
            start_idx = int(parts[0])
            raw_ref = parts[1]  # e.g. "Gen.1:1", "1Sa.12:4", "Sir.Prol:1"

            # Parse book and chap:verse
            if "." in raw_ref:
                raw_book, chap_verse = raw_ref.split(".", 1)
            else:
                raw_book = raw_ref
                chap_verse = "1:1"

            canonical_book = SWETE_BOOK_MAP.get(raw_book, raw_book)

            # Split chap and verse
            if ":" in chap_verse:
                chap_str, v_str = chap_verse.split(":", 1)
            else:
                chap_str, v_str = chap_verse, "1"

            # Handle non-integer chapter/verse (e.g. Prol:1)
            try:
                chap_num = int(chap_str)
            except ValueError:
                chap_num = 1

            # Strip any trailing subverse letters (e.g. "1a" -> 1)
            v_digits = "".join(c for c in v_str if c.isdigit())
            verse_num = int(v_digits) if v_digits else 1

            ref_str = f"{canonical_book} {chap_str}:{v_str}"
            intervals.append((start_idx, canonical_book, chap_num, verse_num, ref_str))

    intervals.sort(key=lambda x: x[0])
    return intervals


def ingest():
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    print("Ingesting Swete versification intervals...")
    intervals = load_versification()
    print(f"Loaded {len(intervals):,} verse intervals across {len(set(x[1] for x in intervals))} books.")

    # Binary search helper for verse interval
    import bisect
    interval_starts = [x[0] for x in intervals]

    print("Reading and tokenizing Swete Greek words...")
    tokens = []
    types_counter = Counter()
    verse_tokens = defaultdict(list)

    sentence_enders = {".", ";", "·", ":"}
    prev_was_end = True

    with open(SWETE_WORDS_CSV, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) != 2:
                continue
            word_id = int(parts[0])
            raw_token = parts[1]

            # Find matching verse interval
            idx = bisect.bisect_right(interval_starts, word_id) - 1
            if idx < 0:
                idx = 0
            _, book, chap, verse, ref_str = intervals[idx]

            # If the token contains NO Greek letters (e.g. standalone critical signs '⸆', '⸂⸆⸃', footnote numbers '[1]', or lone punctuation)
            if not has_greek_letters(raw_token):
                stray_punct = "".join(c for c in raw_token if c in PUNCTUATION_CHARS or c in sentence_enders)
                if stray_punct and tokens:
                    tokens[-1]["punct"] += stray_punct
                    if verse_tokens[ref_str]:
                        verse_tokens[ref_str][-1] += stray_punct
                if any(p in sentence_enders for p in raw_token):
                    prev_was_end = True
                continue

            # Separate word and trailing punctuation
            raw_clean = raw_token.rstrip(PUNCTUATION_CHARS)
            punct = raw_token[len(raw_clean):]

            # Strip all editorial signs, brackets, and footnote digits from word
            clean_word = "".join(c for c in raw_clean if c not in EDITORIAL_CHARS).lstrip(PUNCTUATION_CHARS)

            if not clean_word or not has_greek_letters(clean_word):
                if punct and tokens:
                    tokens[-1]["punct"] += punct
                    if verse_tokens[ref_str]:
                        verse_tokens[ref_str][-1] += punct
                if any(p in sentence_enders for p in punct):
                    prev_was_end = True
                continue

            # Normalize decorative all-caps if applicable
            if clean_word in ALL_CAPS_NORMALIZATIONS:
                surface = ALL_CAPS_NORMALIZATIONS[clean_word]
            elif len(clean_word) > 1 and sum(1 for c in clean_word if c.isupper()) > 1:
                # If word has multiple uppercase letters (all-caps or internal capital typo)
                if prev_was_end:
                    # Sentence start: capitalize first letter, lowercase the rest
                    surface = clean_word[0] + clean_word[1:].lower()
                else:
                    # Mid-sentence: lowercase all letters
                    surface = clean_word.lower()
            else:
                surface = unicodedata.normalize("NFC", clean_word)

            norm = strip_accents(surface)
            is_cap = bool(surface and surface[0].isupper() and not surface.isupper())
            is_start = prev_was_end
            is_elided = bool(any(c in punct for c in ("᾽", "’", "'")))

            token_obj = {
                "id": word_id,
                "book": book,
                "chapter": chap,
                "verse": verse,
                "ref": ref_str,
                "surface": surface,
                "punct": punct,
                "norm": norm,
                "is_cap": is_cap,
                "is_sentence_start": is_start,
                "is_elided": is_elided,
            }


            tokens.append(token_obj)
            types_counter[surface] += 1
            verse_tokens[ref_str].append(surface + (punct if punct else ""))

            prev_was_end = bool(punct and any(p in sentence_enders for p in punct))

    print(f"Total tokens ingested: {len(tokens):,}")
    print(f"Total unique surface types: {len(types_counter):,}")
    print(f"Total verse texts generated: {len(verse_tokens):,}")

    # Reconstruct continuous verse text strings
    verses = {ref: " ".join(words) for ref, words in verse_tokens.items()}

    # Save outputs
    print(f"Writing tokens to {TOKENS_FILE}...")
    with open(TOKENS_FILE, "w", encoding="utf-8") as f:
        json.dump(tokens, f, ensure_ascii=False)

    print(f"Writing verses to {VERSES_FILE}...")
    with open(VERSES_FILE, "w", encoding="utf-8") as f:
        json.dump(verses, f, ensure_ascii=False, indent=2)

    print(f"Writing unique types to {TYPES_FILE}...")
    with open(TYPES_FILE, "w", encoding="utf-8") as f:
        json.dump(dict(types_counter.most_common()), f, ensure_ascii=False, indent=2)

    print("Stage 1 completed successfully!")


if __name__ == "__main__":
    ingest()

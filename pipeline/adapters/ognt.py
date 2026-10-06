"""Polyglot Bible Reader - Open Greek New Testament (OGNT) Adapter.

Parses OpenGNT_BASE_TEXT.zip (OpenGNT_version3_3.csv), extracting
all 27 NT books (Matthew to Revelation) with accented Greek words, lemmas,
Robinson Morphological Analysis Codes (RMAC), Extended Strong's IDs,
glosses, punctuation, and NA28 textual variants.
"""

from __future__ import annotations
import re
import zipfile
from pathlib import Path
from typing import Iterator, Optional, List
from .base import BaseAdapter, VerseUnit, WordToken
from ..config import CACHE_DIR, CANONICAL_BOOKS
from ..tvtms import TVTMSResolver, load_tvtms

# OpenGNT book numbers (40-66) to standard USFM 3-letter codes
OGNT_BOOK_MAP = {
    40: "MAT", 41: "MRK", 42: "LUK", 43: "JHN", 44: "ACT",
    45: "ROM", 46: "1CO", 47: "2CO", 48: "GAL", 49: "EPH",
    50: "PHP", 51: "COL", 52: "1TH", 53: "2TH", 54: "1TI",
    55: "2TI", 56: "TIT", 57: "PHM", 58: "HEB", 59: "JAS",
    60: "1PE", 61: "2PE", 62: "1JN", 63: "2JN", 64: "3JN",
    65: "JUD", 66: "REV"
}


def clean_punc_mark(raw_punc: str) -> tuple[str, bool, bool]:
    """Cleans punctuation, stripping XML tags like <pm>...</pm> and extracting
    semantic layout flags: (cleaned_punc, has_indent, has_para_break).
    """
    if not raw_punc:
        return "", False, False

    punc_clean = re.sub(r"<[^>]+>", "", raw_punc)
    has_indent = "¬" in punc_clean
    has_para = "¶" in punc_clean

    # Strip layout glyphs from printable punctuation
    punc_clean = punc_clean.replace("¬", "").replace("¶", "").strip()

    return punc_clean, has_indent, has_para


def build_verse_text(words_meta: List[tuple[str, bool, bool]]) -> str:
    """Builds clean, human-readable verse text with standard poetry line breaks and paragraph spacing."""
    parts = []
    prev_para = False
    for idx, (word, has_ind, has_p) in enumerate(words_meta):
        if idx > 0:
            if has_ind:
                parts.append("\n    ")
            elif prev_para:
                parts.append("\n\n")
            else:
                parts.append(" ")
        elif has_ind:
            parts.append("    ")
        parts.append(word)
        prev_para = has_p
    return "".join(parts)


class OGNTAdapter(BaseAdapter):
    corpus_id = "ognt"
    title = "Open Greek New Testament"
    language = "grc"
    direction = "ltr"
    category = "bible"
    default_scheme = "Greek"

    def __init__(self, zip_path: Optional[Path] = None, tvtms: Optional[TVTMSResolver] = None):
        self.zip_path = zip_path or (CACHE_DIR / "OpenGNT_BASE_TEXT.zip")
        self.tvtms = tvtms or load_tvtms()

    def iter_verses(self) -> Iterator[VerseUnit]:
        if not self.zip_path.exists():
            raise FileNotFoundError(f"OpenGNT zip not found at {self.zip_path}")

        print(f"Reading OpenGNT text from: {self.zip_path}")

        current_bcv: Optional[tuple[str, int, int]] = None
        current_tokens: List[WordToken] = []
        current_words_meta: List[tuple[str, bool, bool]] = []
        total_verses = 0

        with zipfile.ZipFile(self.zip_path) as z:
            csv_names = [n for n in z.namelist() if n.endswith(".csv") and not n.startswith("__MACOSX")]
            if not csv_names:
                raise ValueError("No CSV file found in OpenGNT_BASE_TEXT.zip")

            csv_name = csv_names[0]
            with z.open(csv_name) as f:
                header = f.readline().decode("utf-8")  # skip header

                for line_b in f:
                    line = line_b.decode("utf-8").strip("\r\n")
                    if not line:
                        continue

                    parts = line.split("\t")
                    if len(parts) < 13:
                        continue

                    # Col 6: 〔Book｜Chapter｜Verse〕
                    bcv_raw = parts[6].strip("〔〕").split("｜")
                    book_num = int(bcv_raw[0])
                    ch_num = int(bcv_raw[1])
                    v_num = int(bcv_raw[2])

                    book_code = OGNT_BOOK_MAP.get(book_num)
                    if not book_code:
                        continue

                    # Check if verse boundary changed
                    this_bcv = (book_code, ch_num, v_num)
                    if current_bcv is not None and this_bcv != current_bcv:
                        # Yield accumulated verse
                        prev_book, prev_ch, prev_v = current_bcv
                        std_ref = self.tvtms.resolve_to_standard("GREEK", prev_book, prev_ch, prev_v)
                        yield VerseUnit(
                            corpus_id=self.corpus_id,
                            std_book=std_ref.book,
                            std_chapter=std_ref.chapter,
                            std_verse=std_ref.verse,
                            std_subverse=std_ref.subverse,
                            native_book=prev_book,
                            native_chapter=prev_ch,
                            native_verse=prev_v,
                            native_citation=f"{prev_book} {prev_ch}:{prev_v}",
                            text=build_verse_text(current_words_meta),
                            tokens=current_tokens
                        )
                        total_verses += 1
                        current_tokens = []
                        current_words_meta = []

                    current_bcv = this_bcv

                    # Col 7: 〔OGNTk｜OGNTu｜OGNTa｜lexeme｜rmac｜sn〕
                    col7 = parts[7].strip("〔〕").split("｜")
                    surface_accented = col7[2] if len(col7) > 2 else ""
                    surface_unaccented = col7[1] if len(col7) > 1 else ""
                    lexeme = col7[3] if len(col7) > 3 else ""
                    rmac = col7[4] if len(col7) > 4 else ""
                    strongs = col7[5] if len(col7) > 5 else ""

                    # Col 10: 〔TBESG｜IT｜LT｜ST｜Español〕 (Glosses)
                    col10 = parts[10].strip("〔〕").split("｜")
                    gloss = col10[0] if len(col10) > 0 else ""

                    # Col 11: 〔PMpWord｜PMfWord〕 (Preceding / Following punctuation)
                    col11 = parts[11].strip("〔〕").split("｜")
                    punc_before, has_indent, _ = clean_punc_mark(col11[0] if len(col11) > 0 else "")
                    punc_after, _, has_para = clean_punc_mark(col11[1] if len(col11) > 1 else "")

                    # Col 12: 〔Note｜Mvar｜Mlexeme｜Mrmac｜Msn｜MTBESG〕 (NA28 variant notes)
                    col12 = parts[12].strip("〔〕").split("｜")
                    note = col12[0] if len(col12) > 0 else ""
                    var_word = col12[1] if len(col12) > 1 else ""

                    extra = {}
                    if note:
                        extra["note"] = note
                    if var_word:
                        extra["na28_variant"] = var_word

                    word_with_punc = f"{punc_before}{surface_accented}{punc_after}".strip()
                    current_words_meta.append((word_with_punc, has_indent, has_para))

                    token = WordToken(
                        word=word_with_punc,
                        normalized=surface_unaccented,
                        lemma=lexeme,
                        morph=rmac,
                        strongs=strongs,
                        gloss=gloss,
                        indent=True if has_indent else None,
                        para_break=True if has_para else None,
                        extra=extra
                    )
                    current_tokens.append(token)

        # Yield last verse
        if current_bcv is not None and current_tokens:
            prev_book, prev_ch, prev_v = current_bcv
            std_ref = self.tvtms.resolve_to_standard("GREEK", prev_book, prev_ch, prev_v)
            yield VerseUnit(
                corpus_id=self.corpus_id,
                std_book=std_ref.book,
                std_chapter=std_ref.chapter,
                std_verse=std_ref.verse,
                std_subverse=std_ref.subverse,
                native_book=prev_book,
                native_chapter=prev_ch,
                native_verse=prev_v,
                native_citation=f"{prev_book} {prev_ch}:{prev_v}",
                text=build_verse_text(current_words_meta),
                tokens=current_tokens
            )
            total_verses += 1

        print(f"OGNTAdapter: Finished reading {total_verses:,} verses across 27 NT books.")


if __name__ == "__main__":
    adapter = OGNTAdapter()
    sample_verses = []
    total_tokens = 0

    for v in adapter.iter_verses():
        total_tokens += len(v.tokens)
        if v.std_book == "JHN" and v.std_chapter == 1 and v.std_verse == 1:
            sample_verses.append(v)

    print(f"\n--- OpenGNT Adapter Validation ---")
    print(f"Total word tokens read: {total_tokens:,}")
    if sample_verses:
        v = sample_verses[0]
        print(f"John 1:1 text: {v.text}")
        print(f"Word tokens in John 1:1: {len(v.tokens)}")
        print(f"First token: word='{v.tokens[0].word}', lemma='{v.tokens[0].lemma}', morph='{v.tokens[0].morph}', strongs='{v.tokens[0].strongs}', gloss='{v.tokens[0].gloss}'")
        assert v.tokens[0].lemma == "ἐν" and v.tokens[0].strongs == "G1722"
        print("SUCCESS: John 1:1 verified with authentic lemmas, RMAC, and Strong's!")

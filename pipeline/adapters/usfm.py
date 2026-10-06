"""Polyglot Bible Reader - USFM Stream Parser.

Parses standard USFM (Unified Standard Format Markers) files into clean,
denormalized biblical verse records: (book, chapter, verse, subverse, text).

Features:
- Strips footnotes (\\f ...\\f*) and cross-references (\\x ...\\x*)
- Strips character marker tags (\\wj, \\add, \\nd, \\it, etc.) while preserving inner text
- Strips paragraph/section header markers (\\p, \\q1, \\q2, \\s1, \\b, etc.)
- Normalizes typography and whitespace
"""

from __future__ import annotations
import re
from pathlib import Path
from typing import Iterator, Tuple, Optional, List, Dict
from ..config import BOOK_ALIASES, resolve_canonical_book


def clean_usfm_text(text: str) -> str:
    """Cleans USFM markup and tags, leaving only clean surface text."""
    # 1. Remove footnotes: \f ...\f* and \fe ...\fe*
    t = re.sub(r"\\f\b.*?(?:\\f\*|$)", "", text, flags=re.DOTALL)
    t = re.sub(r"\\fe\b.*?(?:\\fe\*|$)", "", t, flags=re.DOTALL)

    # 2. Remove cross references: \x ...\x*
    t = re.sub(r"\\x\b.*?(?:\\x\*|$)", "", t, flags=re.DOTALL)

    # 3. Remove section headings and descriptive titles that occur inside text
    t = re.sub(r"\\(?:s[0-9]?|ms[0-9]?|mr|r|d|sp|qa)\b[^\n\\]*", "", t)

    # 4. Remove opening/closing character tags while keeping inner text
    # e.g., \wj words\wj* -> words, \nd LORD\nd* -> LORD, \add text\add* -> text
    t = re.sub(r"\\[\+]?[a-z0-9]+\*?", "", t)

    # 5. Clean up whitespace
    t = re.sub(r"\s+", " ", t).strip()
    return t


def parse_usfm_file(file_path: Path) -> List[Tuple[str, int, int, str, str, str]]:
    """
    Parses a single USFM file.
    Returns a list of tuples:
      (book_code, chapter, verse, subverse, native_citation, verse_text)
    """
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    # 1. Extract book code from \id marker (e.g. \id GEN ..., \id 1ES ...)
    m_id = re.search(r"\\id\s+([0-9]?[A-Za-z0-9]+)", content)
    if not m_id:
        return []

    raw_book = m_id.group(1).strip()
    book_code = resolve_canonical_book(raw_book) or raw_book.upper()

    results: List[Tuple[str, int, int, str, str, str]] = []

    # 2. Split content by chapters: \c <num>
    # Note: everything before the first \c is front matter
    chapter_chunks = re.split(r"\\c\s+([0-9]+)", content)
    # chapter_chunks[0] is preamble before \c 1
    # then alternating: [ch_num_1, ch_text_1, ch_num_2, ch_text_2, ...]

    for i in range(1, len(chapter_chunks), 2):
        ch_num = int(chapter_chunks[i])
        ch_text = chapter_chunks[i + 1]

        # 3. Split chapter text by verses: \v <verse_ident>
        # e.g. \v 1, \v 2, \v 1-2, \v 3a
        verse_chunks = re.split(r"\\v\s+([0-9]+[a-zA-Z]?(?:-[0-9]+[a-zA-Z]?)?)", ch_text)
        # verse_chunks[0] is text between \c and \v 1 (headings, intro)
        # then alternating: [v_num_str_1, v_text_1, v_num_str_2, v_text_2, ...]

        for j in range(1, len(verse_chunks), 2):
            raw_v_str = verse_chunks[j].strip()
            raw_v_text = verse_chunks[j + 1]

            clean_text = clean_usfm_text(raw_v_text)
            if not clean_text:
                continue

            # Parse verse number and optional subverse or range
            # E.g. "1" -> v=1, sub=""
            # E.g. "1a" -> v=1, sub="a"
            # E.g. "1-2" -> v=1, sub="" (range)
            m_v = re.match(r"^([0-9]+)([a-zA-Z])?", raw_v_str)
            if not m_v:
                continue

            v_num = int(m_v.group(1))
            subverse = m_v.group(2) or ""

            native_citation = f"{ch_num}:{raw_v_str}"

            results.append((
                book_code,
                ch_num,
                v_num,
                subverse,
                native_citation,
                clean_text,
            ))

    return results

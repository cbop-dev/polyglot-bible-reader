"""Polyglot Bible Reader - Base Text Adapter Interface.

Defines the standard data structures for verses, words, and corpora
emitted by all specific text adapters.
"""

from __future__ import annotations
import json
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any, Iterator


@dataclass
class WordToken:
    """Represents a single word token within a verse."""
    word: str                          # Surface form as written in the text
    normalized: Optional[str] = None   # Stripped / normalized surface form
    lemma: Optional[str] = None        # Dictionary headword / lexical form
    morph: Optional[str] = None        # Morphological code (e.g. RMAC or Robinson/CCAT)
    strongs: Optional[str] = None      # Extended Strong's ID (e.g. 'G976', 'H7225')
    gloss: Optional[str] = None        # Brief contextual English gloss
    indent: Optional[bool] = None      # Poetic quotation line break and indent
    para_break: Optional[bool] = None  # Paragraph break following word
    trailer: Optional[str] = None      # Trailing space or punctuation (e.g. '' for prefixes, '־' for Maqaf)
    extra: Dict[str, Any] = field(default_factory=dict) # Critical variants, translit, etc.

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if not d.get("extra"):
            del d["extra"]
        return {k: v for k, v in d.items() if v is not None}

    def to_tuple(self) -> List[Any]:
        flags = 0
        if self.indent:
            flags |= 1
        if self.para_break:
            flags |= 2
        tup = [
            self.word or "",
            self.normalized or "",
            self.strongs or "",
            self.morph or "",
            self.lemma or "",
            self.gloss or "",
        ]
        if self.trailer is not None or flags != 0:
            tup.append(self.trailer if self.trailer is not None else " ")
        if flags != 0:
            tup.append(flags)
        while tup and (tup[-1] == "" or tup[-1] is None):
            tup.pop()
        return tup


@dataclass
class VerseUnit:
    """Represents a standard text unit (verse) across any biblical corpus."""
    corpus_id: str                     # e.g. 'vulgate', 'ognt', 'wlc', 'swete_lxx'
    
    # Universal Hub Coordinates (Resolved via TVTMS for side-by-side alignment)
    std_book: str                      # USFM 3-letter code, e.g. 'PSA', 'MAT'
    std_chapter: int                   # Standard chapter number
    std_verse: int                     # Standard verse number
    std_subverse: str = ""             # 'a', 'b', or ''
    
    # Native Historical Coordinates (Preserving authentic manuscript citation)
    native_book: str = ""              # Raw book name in the source edition
    native_chapter: int = 0            # Historical chapter number
    native_verse: int = 0              # Historical verse number
    native_subverse: str = ""
    native_citation: str = ""          # e.g. 'Ps 50:3', 'In Ps. L, v. 1'
    
    # Text Content
    text: str = ""                     # Clean surface text for rendering
    text_xml: Optional[str] = None     # Optional tagged markup
    tokens: List[WordToken] = field(default_factory=list) # Word-by-word tokens

    def tokens_to_json(self) -> Optional[str]:
        if not self.tokens:
            return None
        return json.dumps([t.to_tuple() for t in self.tokens], separators=(",", ":"), ensure_ascii=False)


class BaseAdapter:
    """Abstract interface that all corpus adapters implement."""

    corpus_id: str
    title: str
    language: str
    direction: str = "ltr"
    category: str = "bible"
    default_scheme: str = "ENG"

    def iter_verses(self) -> Iterator[VerseUnit]:
        """Yields VerseUnit objects sequentially."""
        raise NotImplementedError

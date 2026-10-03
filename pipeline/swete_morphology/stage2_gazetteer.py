"""Stage 2: Build the Biblical Proper Name Gazetteer & Capitalization Filter.

Reads:
  - pipeline/build/swete_tokens.json
  - pipeline/build/swete_types.json

Emits:
  - pipeline/build/swete_gazetteer.json: Map of proper name surfaces -> canonical lemma & properties.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict

from .config import (
    BUILD_DIR,
    GAZETTEER_FILE,
    TOKENS_FILE,
    TYPES_FILE,
)
from .lexical_rules import (
    COMMON_LEMMA_OVERRIDES,
    DECLINABLE_PROPER_NOUNS,
    PROPER_NOUN_CANONICAL,
)

# Common words that are capitalized in Swete (e.g. at start of quotations or divine titles)
NOT_PROPER_NAMES = {
    # Divine titles / nouns
    "κύριος", "κυρίου", "κυρίῳ", "κύριον", "κύριε",
    "θεός", "θεοῦ", "θεῷ", "θεόν", "θεέ", "θεοί", "θεῶν",
    "ἰδού", "ἰδοὺ", "τί", "τίς", "τίνος", "τίνι", "τίνα",
    "μή", "μὴ", "οὐ", "οὐκ", "οὐχ", "οὐχί",
    # Articles
    "ὁ", "ἡ", "τό", "τόν", "τήν", "τοῦ", "τῆς", "τῷ", "τῇ",
    "τούς", "τάς", "τά", "τῶν", "τοῖς", "ταῖς", "τω", "τοιν",
    # Demonstratives & Pronouns
    "τάδε", "οὗτος", "αὕτη", "τοῦτο", "ταῦτα", "τούτου", "ταύτης", "τούτῳ", "ταύτῃ",
    "τοῦτον", "ταύτην", "τούτων", "τούτοις", "ταύταις", "τούτους", "ταύτας",
    "αὐτός", "αὐτή", "αὐτό", "αὐτοῦ", "αὐτῆς", "αὐτῷ", "αὐτῇ", "αὐτόν", "αὐτήν", "αὐτῶν", "αὐτοῖς", "αὐταῖς", "αὐτούς", "αὐτάς", "αὐτά",
    "πᾶς", "πάντες", "πάντα", "πᾶσα", "παντός", "παντί", "πᾶν",
    "ἐγώ", "ἐγὼ", "ἐμοῦ", "μοῦ", "ἐμοί", "μοί", "ἐμέ", "μέ", "ἡμεῖς", "ἡμῶν", "ἡμῖν", "ἡμᾶς",
    "σύ", "σὺ", "σοῦ", "σοί", "σέ", "ὑμεῖς", "ὑμῶν", "ὑμῖν", "ὑμᾶς",
    "ὅς", "ἥ", "ὅ", "οὗ", "ἧς", "ᾧ", "ᾗ", "ὅν", "ἥν", "ὧν", "οἷς", "αἷς", "οὕς", "ἅς", "ἅ",
    # Conjunctions & Prepositions
    "καί", "καὶ", "δέ", "δὲ", "ἀλλά", "ἀλλὰ", "ὅτι", "εἰ", "ἐάν",
    "ἐν", "εἰς", "ἐκ", "ἐξ", "πρός", "πρὸς", "ἀπό", "ἀπὸ", "ὑπό", "ὑπὸ",
    "διά", "διὰ", "μετά", "μετὰ", "κατά", "κατὰ", "ἐπί", "ἐπὶ", "περί", "περὶ",
    "σύν", "σὺν", "ἀνά", "ἀνὰ", "ὑπέρ", "ὑπὲρ", "ἕως", "πρό", "πρὸ",
    # Common verbs
    "πρόσεχε", "ἄκουσον", "εἶπεν", "εἶπαν", "λέγει", "λέγων", "ἀπεκρίθη",
    "ἐποίησεν", "ἔδωκεν", "ἔστιν", "ἐστιν", "ἦν", "ἦσαν", "ἐγένετο", "ἦλθεν",
    # Common nouns
    "ἄνθρωπος", "ἄνθρωποι", "βασιλεύς", "βασιλέως", "βασιλεῖ",
    "πατήρ", "πατρός", "μήτηρ", "μητρός", "υἱός", "υἱοῦ",
    "οἶκος", "οἴκου", "πόλις", "πόλεως", "γῆ", "γῆς",
    "ἅγιος", "ἅγιοι", "ἁγίων", "δικαιοσύνη", "εἰρήνη",
}

# Consonant endings strictly typical of Semitic transliterations (excluding ν and ρ which are common Greek endings)
SEMITIC_CONSONANT_ENDINGS = ("μ", "δ", "λ", "θ", "χ", "κ", "φ", "β", "γ")

# Known Semitic indeclinable names ending in -ν
KNOWN_SEMITIC_N_NAMES = {
    "ααρων", "συμεων", "σολομων", "γεδεων", "σιων", "χανααν", "βαβυλων",
    "λεβανων", "χεβρων", "ερμων", "αμαν", "λαμαν", "μαδιαν", "ωναν",
    "φαραν", "γομορραν", "σαλμων", "ναασσων", "γιων", "βελ", "νεβρων",
    "σαμψων", "ναν", "ρουβην", "αρραν", "βενιαμιν", "γεδδουρ", "ναασ",
    "εφραιμ", "σεδηρ", "σηειρ", "βηθελ", "δαν", "γαδ", "ασηρ",
    "νεφθαλι", "ισαχαρ", "ζαβουλων", "ωρ"
}

# Indeclinable names ending in vowels in LXX tradition
INDECLI_VOWEL_NAMES = {
    "νωε", "ναυη", "μανασση", "σαυχαι", "ιορδανα", "σιναι", "χωρηβ",
    "φαραω", "σαβαωθ", "ιωβηδ", "ιεσσαι", "οχοζια", "ιουδα", "βηρσαβεε",
    "θαμνα"
}



def strip_accents(text: str) -> str:
    if not text:
        return ""
    norm = unicodedata.normalize("NFD", text)
    clean = "".join(c for c in norm if unicodedata.category(c) != "Mn")
    return unicodedata.normalize("NFC", clean).lower().replace("ς", "σ")


def build_gazetteer():
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    print("Loading tokens from Stage 1...")
    with open(TOKENS_FILE, "r", encoding="utf-8") as f:
        tokens = json.load(f)

    print("Analyzing capitalized words across the corpus...")
    cap_counts = Counter()
    non_start_cap_counts = Counter()

    for t in tokens:
        surface = t["surface"]
        if t["is_cap"]:
            cap_counts[surface] += 1
            if not t["is_sentence_start"]:
                non_start_cap_counts[surface] += 1

    print(f"Total distinct capitalized surfaces: {len(cap_counts):,}")
    print(f"Distinct non-sentence-initial capitalized surfaces: {len(non_start_cap_counts):,}")

    gazetteer = {}

    # 1. Seed with known declinable proper nouns
    for name in DECLINABLE_PROPER_NOUNS:
        plain = strip_accents(name)
        gazetteer[name] = {"lemma": name, "plain": plain, "is_indecl": False, "pos": 13}
        gazetteer[plain] = {"lemma": name, "plain": plain, "is_indecl": False, "pos": 13}

    # 2. Seed with canonical mappings
    for raw, canonical in PROPER_NOUN_CANONICAL.items():
        plain = strip_accents(raw)
        is_indecl = canonical not in DECLINABLE_PROPER_NOUNS
        gazetteer[raw] = {"lemma": canonical, "plain": plain, "is_indecl": is_indecl, "pos": 13}
        gazetteer[plain] = {"lemma": canonical, "plain": plain, "is_indecl": is_indecl, "pos": 13}

    # 3. Detect candidate biblical names from corpus
    for surface, count in non_start_cap_counts.items():
        plain = strip_accents(surface)

        # Skip if in NOT_PROPER_NAMES
        if plain in NOT_PROPER_NAMES or surface.lower() in NOT_PROPER_NAMES:
            continue

        # Check if already handled
        if surface in gazetteer or plain in gazetteer:
            continue

        # Check for typical Semitic indeclinable endings
        is_semitic_consonant = plain.endswith(SEMITIC_CONSONANT_ENDINGS)
        is_known_vowel = plain in INDECLI_VOWEL_NAMES
        is_known_n = plain in KNOWN_SEMITIC_N_NAMES

        if is_semitic_consonant or is_known_vowel or is_known_n:
            # Canonicalize lemma to standard titlecase with acute/tonos
            canonical = PROPER_NOUN_CANONICAL.get(surface, surface)
            gazetteer[surface] = {
                "lemma": canonical,
                "plain": plain,
                "is_indecl": True,
                "pos": 13,
                "occurrences": count
            }
            if plain not in gazetteer:
                gazetteer[plain] = {
                    "lemma": canonical,
                    "plain": plain,
                    "is_indecl": True,
                    "pos": 13,
                    "occurrences": count
                }

    print(f"Generated gazetteer with {len(gazetteer):,} entries.")

    with open(GAZETTEER_FILE, "w", encoding="utf-8") as f:
        json.dump(gazetteer, f, ensure_ascii=False, indent=2)

    print(f"Saved gazetteer to {GAZETTEER_FILE}")
    print("Stage 2 completed successfully!")


if __name__ == "__main__":
    build_gazetteer()

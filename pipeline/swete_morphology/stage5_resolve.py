"""Stage 5: Constraint Solver & Morphological Resolution Engine.

Combines:
  - Gazetteer and Proper Name Heuristics (Stage 2)
  - Stanza Neural Predictions (Stage 4)
  - Lexical Normalization Rules & Deponent Fixes

Emits:
  - pipeline/build/swete_resolved_tokens.json: Fully resolved tokens with lemma, pos, morph, confidence.
"""

from __future__ import annotations

import json
import re
import sys
import time
from collections import Counter
from pathlib import Path

from .config import (
    BUILD_DIR,
    GAZETTEER_FILE,
    RESOLVED_TOKENS_FILE,
    TOKENS_FILE,
)
from .lexical_rules import (
    COMMON_LEMMA_OVERRIDES,
    DECLINABLE_PROPER_NOUNS,
    DEPONENT_FIXES,
    PROPER_NOUN_CANONICAL,
    SURFACE_LEMMA_OVERRIDES,
    UPOS_TO_APP_POS,
)
from .gi_bridge import load_gi, build_gi_cache, gi_verb_check
from .config import GI_DIR


STANZA_OUT_FILE = BUILD_DIR / "swete_stanza.json"

OXIA_TO_TONOS = {
    0x1F71: 0x03AC, 0x1F73: 0x03AD, 0x1F75: 0x03AE, 0x1F77: 0x03AF,
    0x1F79: 0x03CC, 0x1F7B: 0x03CD, 0x1F7D: 0x03CE, 0x1FBB: 0x03AC,
    0x1FC9: 0x03AD, 0x1FCB: 0x03AE, 0x1FDB: 0x03AF, 0x1FEB: 0x03CD,
    0x1FF9: 0x03CC, 0x1FFB: 0x03CE,
}


def norm_greek(s: str) -> str:
    """Normalize Greek to NFC and map archaic oxia diacritics to modern tonos."""
    if not s:
        return ""
    import unicodedata
    return unicodedata.normalize("NFC", s).translate(OXIA_TO_TONOS).strip()


from .config import TF_LXX_DIR


def load_tf_word_map(tf_dir: Optional[Path] = None) -> dict:
    if tf_dir is None:
        tf_dir = TF_LXX_DIR
    if not tf_dir.exists():
        print(f"Notice: CenterBLC TF dir not found at {tf_dir} (skipping TF surface lookup)")
        return {}

    def read_tf(feat: str) -> list[str]:
        p = tf_dir / f"{feat}.tf"
        if not p.exists():
            return []
        with open(p, "r", encoding="utf-8") as f:
            lines = [line.rstrip("\n") for line in f if not line.startswith("@")]
        return lines[1:] if len(lines) > 1 else []

    words = read_tf("word")
    lexes = read_tf("lex_utf8")
    sps = read_tf("sp")

    tf_words = {}
    for w, l, s in zip(words, lexes, sps):
        nw = norm_greek(w).lower()
        nl = norm_greek(l)
        if nw not in tf_words:
            tf_words[nw] = Counter()
        tf_words[nw][(nl, s)] += 1

    tf_best = {}
    for w, cnt in tf_words.items():
        (best_l, best_sp), _ = cnt.most_common(1)[0]
        tf_best[w] = (best_l, best_sp)

    print(f"Loaded {len(tf_best):,} distinct surface inflections from CenterBLC Text-Fabric.")
    return tf_best


STANZA_MANGLED_FALLBACKS = {
    "ἀαδίζω": ("βαδίζω", 11),
    "ἁαδίζω": ("βαδίζω", 11),
    "ἀαθίζω": ("καθίζω", 11),
    "ἀαλύπτω": ("καλύπτω", 11),
    "ἀακράν": ("μακράν", 2),
    "ἀάρειμι": ("Θαρσά", 13),
    "ἀάπειμι": ("Σαβά", 13),
    "δοιέω": ("ποιέω", 11),
    "ὁανέω": ("ἱκανόω", 11),
    "αασιλεύω": ("βασιλεύω", 11),
    "αατρεύω": ("ἰατρεύω", 11),
    "ααδιάζομαι": ("Χαδιάσαι", 13),
    "Eπάκουσος": ("Ἐπάκουσος", 13),
    "Eπίστρέφος": ("Ἐπίστρεφος", 13),
    "nηστεύω": ("νηστεύω", 11),
}

# Decorative drop caps / incipit word overrides (e.g. Job 1:1, Qoh 1:1)
INCIPIT_OVERRIDES = {
    "Ἄνθρωπος": ("ἄνθρωπος", 4, "N-NSM"),
    "ΑΝΘΡΩΠΟΣ": ("ἄνθρωπος", 4, "N-NSM"),
    "Ῥήματα": ("ῥῆμα", 4, "N-NPN"),
    "ΡΗΜΑΤΑ": ("ῥῆμα", 4, "N-NPN"),
    "Ἀγαπήσατε": ("ἀγαπάω", 11, "V-AAM-2P"),
    "ΑΓΑΠΗΣΑΤΕ": ("ἀγαπάω", 11, "V-AAM-2P"),
    "Πολλῶν": ("πολύς", 0, "A-GPM"),
    "ΠΟΛΛΩΝ": ("πολύς", 0, "A-GPM"),
    "Πᾶσα": ("πᾶς", 0, "A-NSF"),
    "ΠΑΣΑ": ("πᾶς", 0, "A-NSF"),
    "Λόγος": ("λόγος", 4, "N-NSM"),
    "ΛΟΓΟΣ": ("λόγος", 4, "N-NSM"),
    "Ἀντίγραφον": ("ἀντίγραφον", 4, "N-NSN"),
    "ΑΝΤΙΓΡΑΦΟΝ": ("ἀντίγραφον", 4, "N-NSN"),
    "Ἐπί": ("ἐπί", 5, "PREP"),
    "ΕΠΙ": ("ἐπί", 5, "PREP"),
    "Τοῖς": ("ὁ", 6, "RA-DPM"),
    "ΤΟΙΣ": ("ὁ", 6, "RA-DPM"),
    "Δὲ": ("δέ", 1, "CONJ"),
    "ΔΕ": ("δέ", 1, "CONJ"),
    "Φιλοσοφώτατον": ("φιλόσοφος", 0, "A-ASM-S"),
    "ΦΙΛΟΣΟΦΩΤΑΤΟΝ": ("φιλόσοφος", 0, "A-ASM-S"),
    "Ἐβόησα": ("βοάω", 11, "V-AAI-1S"),
    "ΕΒΟΗΣΑ": ("βοάω", 11, "V-AAI-1S"),
    "ᾌσωμεν": ("ᾄδω", 11, "V-AAS-1P"),
    "Θάρσει": ("θαρσέω", 11, "V-PAM-2S"),
    "Θάρσα": ("θαρσέω", 11, "V-PAM-2S"),
}

# Elided closed-class words mapping: surface -> (lemma, pos, morph)
ELIDED_WORDS = {
    # Conjunctions
    "ἀλλ": ("ἀλλά", 1, "CONJ"),
    "Ἀλλ": ("ἀλλά", 1, "CONJ"),
    "δ": ("δέ", 1, "CONJ"),
    "Δ": ("δέ", 1, "CONJ"),
    "οὐδ": ("οὐδέ", 1, "CONJ"),
    "Οὐδ": ("οὐδέ", 1, "CONJ"),
    "μηδ": ("μηδέ", 1, "CONJ"),
    "Μηδ": ("μηδέ", 1, "CONJ"),
    "οὔτ": ("οὔτε", 1, "CONJ"),
    "οὔθ": ("οὔτε", 1, "CONJ"),
    "Οὔτ": ("οὔτε", 1, "CONJ"),
    "Οὔθ": ("οὔτε", 1, "CONJ"),
    "μήτ": ("μήτε", 1, "CONJ"),
    "μήθ": ("μήτε", 1, "CONJ"),
    "Μήτ": ("μήτε", 1, "CONJ"),
    "Μήθ": ("μήτε", 1, "CONJ"),
    "ἵν": ("ἵνα", 1, "CONJ"),
    "Ἵν": ("ἵνα", 1, "CONJ"),
    "ὥστ": ("ὥστε", 1, "CONJ"),
    "ὥσθ": ("ὥστε", 1, "CONJ"),
    "Ὥστ": ("ὥστε", 1, "CONJ"),
    "Ὥσθ": ("ὥστε", 1, "CONJ"),
    "ὅτ": ("ὅτε", 1, "CONJ"),
    "ὅθ": ("ὅτε", 1, "CONJ"),
    "Ὅτ": ("ὅτε", 1, "CONJ"),
    "Ὅθ": ("ὅτε", 1, "CONJ"),
    # Prepositions
    "ἐπ": ("ἐπί", 5, "PREP"),
    "ἐφ": ("ἐπί", 5, "PREP"),
    "Ἐπ": ("ἐπί", 5, "PREP"),
    "Ἐφ": ("ἐπί", 5, "PREP"),
    "μετ": ("μετά", 5, "PREP"),
    "μεθ": ("μετά", 5, "PREP"),
    "Μετ": ("μετά", 5, "PREP"),
    "Μεθ": ("μετά", 5, "PREP"),
    "ἀπ": ("ἀπό", 5, "PREP"),
    "ἀφ": ("ἀπό", 5, "PREP"),
    "Ἀπ": ("ἀπό", 5, "PREP"),
    "Ἀφ": ("ἀπό", 5, "PREP"),
    "ὑπ": ("ὑπό", 5, "PREP"),
    "ὑφ": ("ὑπό", 5, "PREP"),
    "Ὑπ": ("ὑπό", 5, "PREP"),
    "Ὑφ": ("ὑπό", 5, "PREP"),
    "κατ": ("κατά", 5, "PREP"),
    "καθ": ("κατά", 5, "PREP"),
    "Κατ": ("κατά", 5, "PREP"),
    "Καθ": ("κατά", 5, "PREP"),
    "δι": ("διά", 5, "PREP"),
    "Δι": ("διά", 5, "PREP"),
    "παρ": ("παρά", 5, "PREP"),
    "Παρ": ("παρά", 5, "PREP"),
    "ἀντ": ("ἀντί", 5, "PREP"),
    "ἀνθ": ("ἀντί", 5, "PREP"),
    "Ἀντ": ("ἀντί", 5, "PREP"),
    "Ἀνθ": ("ἀντί", 5, "PREP"),
    # Pronouns & Adjectives
    "τοῦτ": ("οὗτος", 6, "D"),
    "Τοῦτ": ("οὗτος", 6, "D"),
    "ταῦτ": ("οὗτος", 6, "D"),
    "Ταῦτ": ("οὗτος", 6, "D"),
    "πάντ": ("πᾶς", 0, "A"),
    "Πάντ": ("πᾶς", 0, "A"),
}

# Closed class words with 100% fixed POS
CLOSED_CLASS_POS = {
    "καί": 1, "δέ": 1, "τε": 1, "ἀλλά": 1, "ὅτι": 1, "ἵνα": 1, "εἰ": 1, "ἐάν": 1, "ὥστε": 1, "ὅτε": 1, "ὅταν": 1, "ἤ": 1,
    "ἐν": 5, "εἰς": 5, "ἐκ": 5, "πρός": 5, "ἀπό": 5, "ὑπό": 5, "διά": 5, "μετά": 5, "κατά": 5, "ἐπί": 5, "περί": 5, "σύν": 5, "ἀνά": 5, "ὑπέρ": 5, "ἕως": 5, "πρό": 5,
    "οὐ": 12, "μή": 12, "ἄν": 12, "δή": 12, "οὖν": 12, "μέν": 12, "γε": 12, "ναί": 12, "ἆρα": 12,
    "ὁ": 6,
}


# Exact Greek article forms (never match relative pronouns ὃ, ὅ, ἥ, ἣ, ᾗ, οἳ, or conjunction ἢ)
ARTICLE_SURFACES = {
    "ὁ", "ἡ", "τό", "τὸ", "τόν", "τὸν", "τήν", "τὴν", "τοῦ", "του", "τῆς", "της", "τῷ", "τῳ", "τῇ", "τῃ",
    "οἱ", "αἱ", "τά", "τὰ", "τούς", "τοὺς", "τάς", "τὰς", "τῶν", "των", "τοῖς", "τοις", "ταῖς", "ταις",
    "Ὁ", "Ἡ", "Τό", "Τὸ", "Τόν", "Τὸν", "Τήν", "Τὴν", "Τοῦ", "Τῆς", "Τῷ", "Τῇ",
    "Οἱ", "Αἱ", "Τά", "Τὰ", "Τούς", "Τοὺς", "Τάς", "Τὰς", "Τῶν", "Τοῖς", "Ταῖς",
}

# Relative pronoun forms
RELATIVE_PRONOUN_SURFACES = {
    "ὅς", "ὃς", "ἥ", "ἣ", "ὅ", "ὃ", "οὗ", "ἧς", "ᾧ", "ᾗ", "ὅν", "ὃν", "ἥν", "ἣν",
    "οἵ", "οἳ", "αἵ", "αἳ", "ἅ", "ἃ", "ὧν", "οἷς", "αἷς", "οὕς", "οὓς", "ἅς", "ἃς",
    "Ὅς", "Ὃς", "Ἥ", "Ἣ", "Ὅ", "Ὃ", "Οὗ", "Ἧς", "ᾯ", "ᾟ", "Ὅν", "Ὃν", "Ἥν", "Ἣν",
    "Οἵ", "Οἳ", "Αἵ", "Αἳ", "Ἅ", "Ἃ", "Ὧν", "Οἷς", "Αἷς", "Οὕς", "Οὓς", "Ἅς", "Ἃς"
}


EDITORIAL_CHARS = set("⸂⸃⸆⸇⸀⸁⸄⸅⸈⸉⸊⸋[]⟦⟧⟨⟩⟪⟫()†‡*0123456789")


def resolve():
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    print("Loading tokens from Stage 1...")
    with open(TOKENS_FILE, "r", encoding="utf-8") as f:
        tokens = json.load(f)

    print("Loading gazetteer from Stage 2...")
    with open(GAZETTEER_FILE, "r", encoding="utf-8") as f:
        gazetteer = json.load(f)

    print(f"Loading Stanza predictions from {STANZA_OUT_FILE}...")
    with open(STANZA_OUT_FILE, "r", encoding="utf-8") as f:
        stanza_preds = json.load(f)

    print("Loading CenterBLC Text-Fabric word map for inflection lookup...")
    tf_word_map = load_tf_word_map()

    print(f"Resolving {len(tokens):,} tokens...")
    _gi_obj    = load_gi(GI_DIR)
    gi_cache   = build_gi_cache(
        _gi_obj, tokens, stanza_preds,
        BUILD_DIR / "gi_verb_cache.json",
    )
    resolved = []
    stats = Counter()

    for t in tokens:
        t_id = str(t["id"])
        surface = t["surface"]
        norm = t["norm"]
        is_cap = t["is_cap"]
        is_start = t["is_sentence_start"]

        stanza_info = stanza_preds.get(t_id, {})
        s_lemma_raw = stanza_info.get("lemma", surface.lower())
        s_lemma = "".join(c for c in s_lemma_raw if c not in EDITORIAL_CHARS) or surface.lower()
        s_pos = stanza_info.get("pos", 15)
        s_morph = stanza_info.get("morph", "X")
        s_upos = stanza_info.get("upos", "X")

        # gi_candidates is populated only by Priority 9 when GI returns multiple lemmas.
        # Initialized here so the field is always defined for the output token logic.
        extra_candidates: list[dict] = []

        # Normalize neural lemma with overrides early
        s_lemma_clean = COMMON_LEMMA_OVERRIDES.get(s_lemma, s_lemma)
        s_lemma_clean = DEPONENT_FIXES.get(s_lemma_clean, s_lemma_clean)

        if norm.startswith("πρεσβυτερ") and s_lemma_clean == "πρέσβυς":
            s_lemma_clean = "πρεσβύτερος"
            s_pos = 0

        if norm.startswith("παρεπικραν") and s_lemma_clean == "ἐπικραίνω":
            s_lemma_clean = "παραπικραίνω"

        if norm.startswith("ανεστρεψ") and s_lemma_clean == "ἀνατρέπω":
            s_lemma_clean = "ἀναστρέφω"

        if norm.startswith("παρεμβαλλ") and s_lemma_clean == "παραβάλλω":
            s_lemma_clean = "παρεμβάλλω"

        # Normalize feminine adjective citation back to masculine
        if (s_upos == "ADJ" or s_pos == 0) and not s_lemma_clean.endswith("αῖος"):
            if s_lemma_clean.endswith("ή"):
                s_lemma_clean = s_lemma_clean[:-1] + "ός"
            elif s_lemma_clean.endswith("ῆ"):
                s_lemma_clean = s_lemma_clean[:-1] + "οῦς"

        # -1. Decorative opening incipits (e.g. Job 1:1, Qoh 1:1)
        if surface in INCIPIT_OVERRIDES:
            lemma, pos, morph = INCIPIT_OVERRIDES[surface]
            confidence = 0.99
            source = "incipit_override"
            stats["incipit"] += 1

        # -0. Elided closed-class words (ἀλλ᾽, ἐπ᾽, μετ᾽, etc.)
        elif (t.get("is_elided") or any(c in t.get("punct", "") for c in ("᾽", "’", "'"))) and surface in ELIDED_WORDS:
            lemma, pos, morph = ELIDED_WORDS[surface]
            confidence = 0.99
            source = "elided_closed_class"
            stats["elided"] += 1

        elif surface in ELIDED_WORDS and surface in ("ἀλλ", "Ἀλλ", "οὐδ", "Οὐδ", "μηδ", "Μηδ", "οὔτ", "μήτ", "ὥστ", "ἵν", "ἐπ", "ἐφ", "μετ", "μεθ", "ἀπ", "ἀφ", "ὑπ", "ὑφ", "κατ", "καθ", "δι", "παρ", "ἀντ", "ἀνθ"):
            lemma, pos, morph = ELIDED_WORDS[surface]
            confidence = 0.99
            source = "elided_closed_class"
            stats["elided"] += 1

        # 0. High-confidence surface overrides (imperatives, irregular verbs, blindspots)
        elif surface in SURFACE_LEMMA_OVERRIDES:
            ov = SURFACE_LEMMA_OVERRIDES[surface]

            lemma = ov["lemma"]
            pos = ov["pos"]
            morph = ov.get("morph", s_morph)
            confidence = 0.99
            source = "surface_override"
            stats["surface_override"] += 1

        # 1. Definite Article check (exact surfaces only)
        elif surface in ARTICLE_SURFACES or (s_lemma == "ὁ" and s_upos == "DET"):
            lemma = "ὁ"
            pos = 6  # ARTICLE
            morph = s_morph if (s_morph.startswith("RA") or s_morph.startswith("D-")) else "RA"
            confidence = 0.99
            source = "article_rule"
            stats["article"] += 1

        # 2. Relative Pronoun check
        elif surface in RELATIVE_PRONOUN_SURFACES or s_lemma in ("ὅς", "ὁς") or (s_upos == "PRON" and s_lemma_clean in ("ὅς", "ὁς")):

            lemma = "ὅς"
            pos = 10  # PRONOUN_RELA
            morph = s_morph if s_morph.startswith("R-") else "R-NSM"
            confidence = 0.99
            source = "relative_pronoun"
            stats["relative_pronoun"] += 1

        # 3. High-frequency special overrides (divine titles, particles, adverbs)
        elif norm in ("κυριοσ", "κυριου", "κυριω", "κυριον", "κυριε") or s_lemma_clean == "κύριος":
            lemma = "κύριος"
            pos = 4  # NOUN
            morph = s_morph if s_morph.startswith("N-") else "N-NSM"
            confidence = 0.99
            source = "kyrios_override"
            stats["kyrios"] += 1

        elif norm in ("θεοσ", "θεου", "θεω", "θεον", "θεε", "θεοι", "θεων", "θεοισ", "θεουσ") or s_lemma_clean == "θεός":
            lemma = "θεός"
            pos = 4  # NOUN
            morph = s_morph if s_morph.startswith("N-") else "N-NSM"
            confidence = 0.99
            source = "theos_override"
            stats["theos"] += 1

        elif surface in ("ἐάν", "ἐὰν", "Ἐάν", "Ἐὰν"):
            lemma = "ἐάν"
            pos = 1  # CONJUNCTION
            morph = "CONJ"
            confidence = 0.99
            source = "ean_override"
            stats["ean"] += 1

        elif surface in ("πρωί", "πρωὶ", "πρωΐ", "πρωῒ", "Πρωί", "Πρωὶ"):
            lemma = "πρωί"
            pos = 2  # ADVERB
            morph = "ADV"
            confidence = 0.99
            source = "proi_override"
            stats["proi"] += 1

        elif surface in ("ᾅδου", "ᾅδης", "ᾅδην", "ᾅδῃ", "Ἅιδης", "ἅδης") or s_lemma_clean in ("ᾅδης", "Ἅιδης"):
            lemma = "ᾅδης"
            pos = 4  # NOUN
            morph = s_morph if s_morph.startswith("N-") else "N-NSM"
            confidence = 0.99
            source = "hades_override"
            stats["hades"] += 1

        elif surface in ("ἔδεσθε", "ἔδεται", "ἔδονται", "ἔδομαι", "ἔδηται"):
            lemma = "ἐσθίω"
            pos = 11  # VERB
            morph = s_morph if s_morph.startswith("V-") else "V-FMI-3S"
            confidence = 0.99
            source = "esthio_override"
            stats["esthio"] += 1

        elif surface in ("πρόσχες", "πρόσχετε", "Πρόσχες", "Πρόσχετε"):
            lemma = "προσέχω"
            pos = 11  # VERB
            morph = s_morph if s_morph.startswith("V-") else "V-AAM-2S"
            confidence = 0.99
            source = "prosecho_override"
            stats["prosecho"] += 1

        elif surface in ("ἐλέη", "ἐλεῶν") and s_lemma_clean in ("ἐλέη", "ἔλεος", "ἐλεέω"):
            lemma = "ἔλεος"
            pos = 4  # NOUN
            morph = s_morph if s_morph.startswith("N-") else "N-APN"
            confidence = 0.99
            source = "eleos_override"
            stats["eleos"] += 1

        # 4. Closed-class overrides (prepositions, conjunctions, particles)
        elif s_lemma_clean in CLOSED_CLASS_POS:
            lemma = s_lemma_clean
            pos = CLOSED_CLASS_POS[s_lemma_clean]
            morph = s_morph
            confidence = 0.99
            source = "closed_class"
            stats["closed_class"] += 1

        # 5. Confirmed proper nouns
        elif surface in PROPER_NOUN_CANONICAL or surface in DECLINABLE_PROPER_NOUNS:
            gaz_match = gazetteer.get(surface) or {"lemma": PROPER_NOUN_CANONICAL.get(surface, surface), "is_indecl": True}
            lemma = gaz_match["lemma"]
            pos = 13  # PROPER_NOUN
            is_indecl = gaz_match.get("is_indecl", False)
            morph = "N-PRI" if is_indecl else (s_morph if s_morph.startswith("N-") else "N-PR")
            confidence = 0.98
            source = "canonical_proper_noun"
            stats["proper_name"] += 1

        # 6. Capitalized / Initial tokens: check against known lowercase inflections first
        elif (is_cap or is_start or (len(surface) > 0 and surface[0].isupper())) and (
            (surface.lower() if (surface.isupper() and len(surface) > 1) else (surface[0].lower() + surface[1:] if len(surface) > 1 else surface.lower())) in tf_word_map
        ):
            low_surf = surface.lower() if (surface.isupper() and len(surface) > 1) else (surface[0].lower() + surface[1:] if len(surface) > 1 else surface.lower())
            tf_lem, tf_sp = tf_word_map[low_surf]
            if tf_sp == "verb":
                lemma = DEPONENT_FIXES.get(tf_lem, tf_lem)
                pos = 11
                morph = s_morph if (s_morph.startswith("V-") or s_morph.startswith("V.")) else "V"
                confidence = 0.98
                source = "tf_lowercase_verb"
                stats["tf_lowercase_verb"] += 1
            elif tf_sp in ("adverb", "conjunction", "preposition", "particle"):
                lemma = tf_lem
                pos = 2 if tf_sp == "adverb" else 1 if tf_sp == "conjunction" else 5 if tf_sp == "preposition" else 12
                morph = s_morph
                confidence = 0.98
                source = f"tf_lowercase_{tf_sp}"
                stats[f"tf_lowercase_{tf_sp}"] += 1
            elif not is_start and (surface in gazetteer or norm in gazetteer) and (s_upos == "PROPN" or s_pos == 13):
                # Mid-sentence token verified as proper noun in gazetteer
                gaz_match = gazetteer.get(surface) or gazetteer.get(norm)
                lemma = gaz_match["lemma"]
                pos = 13
                is_indecl = gaz_match.get("is_indecl", False)
                morph = "N-PRI" if is_indecl else (s_morph if s_morph.startswith("N-") else "N-PR")
                confidence = 0.98
                source = "gazetteer_mid_sentence"
                stats["proper_name"] += 1
            else:
                lemma = tf_lem
                pos = 4 if tf_sp == "noun" else 0
                morph = s_morph
                confidence = 0.95
                source = "tf_lowercase_nominal"
                stats["tf_lowercase_nominal"] += 1

        # 7. Sentence-initial tokens: presume COMMON word unless confirmed proper name
        elif is_start:
            if (surface in gazetteer or norm in gazetteer) and (s_upos == "PROPN" or s_pos == 13 or (surface not in ARTICLE_SURFACES and s_upos not in ("VERB", "AUX"))):
                gaz_match = gazetteer.get(surface) or gazetteer.get(norm)
                lemma = gaz_match["lemma"]
                pos = 13  # PROPER_NOUN
                is_indecl = gaz_match.get("is_indecl", False)
                morph = "N-PRI" if is_indecl else (s_morph if s_morph.startswith("N-") else "N-PR")
                confidence = 0.98
                source = "gazetteer_sentence_start"
                stats["proper_name"] += 1
            elif s_upos in ("VERB", "AUX", "DET", "ADP", "CCONJ", "SCONJ", "PART", "PRON") and s_pos != 13:
                lemma = s_lemma_clean
                pos = s_pos
                morph = s_morph
                confidence = 0.95
                source = "sentence_start_common"
                stats["sentence_start_common"] += 1
            else:
                lemma = s_lemma_clean
                pos = s_pos
                morph = s_morph
                confidence = 0.90
                source = "stanza_neural"
                stats["stanza_neural"] += 1

        # 8. Non-sentence-initial tokens: capitalization indicates proper name
        elif is_cap:
            gaz_match = gazetteer.get(surface) or gazetteer.get(norm)
            if gaz_match:
                lemma = gaz_match["lemma"]
                pos = 13  # PROPER_NOUN
                is_indecl = gaz_match.get("is_indecl", False)
                morph = "N-PRI" if is_indecl else (s_morph if s_morph.startswith("N-") else "N-PR")
                confidence = 0.98
                source = "gazetteer_mid_sentence"
                stats["proper_name"] += 1
            elif s_upos == "PROPN" or s_pos == 13:
                # Preserve indeclinable Semitic names rather than forcing pseudo-Greek declensions
                if any(surface.endswith(end) for end in ("ην", "αμ", "ωθ", "ωρ", "ειμ", "ουδ", "εε", "αθ", "αχ", "αδ", "ουρ")):
                    lemma = surface
                    pos = 13
                    morph = "N-PRI"
                    confidence = 0.98
                    source = "semitic_proper_name"
                    stats["proper_name"] += 1
                else:
                    propn_lemma = PROPER_NOUN_CANONICAL.get(surface) or PROPER_NOUN_CANONICAL.get(s_lemma_clean) or s_lemma_clean
                    lemma = propn_lemma if propn_lemma else surface
                    pos = 13
                    morph = s_morph if s_morph.startswith("N-") else "N-PR"
                    confidence = 0.90
                    source = "stanza_proper_name"
                    stats["proper_name"] += 1

            else:
                lemma = s_lemma_clean
                pos = s_pos
                morph = s_morph
                confidence = 0.92
                source = "stanza_neural"
                stats["stanza_neural"] += 1

        # 9. Default: GI verb gate (O(1) cache lookup), falling back to Stanza neural.
        # gi_verb_check() returns a hit only when:
        #   (a) The surface has a GI verbal parse in the precomputed cache, AND
        #   (b) Stanza also tagged it as VERB/AUX (POS agreement gate)
        # This prevents false-positive verb parses on nouns/adjectives that happen
        # to match a verbal stem because no nominal entry exists in the GI lexicon.
        else:
            gi_hit = gi_verb_check(gi_cache, surface, s_upos)
            if gi_hit:
                lemma, morph, extra_candidates = gi_hit
                pos = 11  # VERB
                confidence = 0.97
                source = "gi_verb"
                stats["gi_verb"] += 1
            else:
                lemma = s_lemma_clean
                pos = s_pos
                morph = s_morph
                extra_candidates = []
                confidence = 0.95 if s_upos != "X" else 0.70
                source = "stanza_neural"
                stats["stanza_neural"] += 1

        lemma = "".join(c for c in lemma if c not in EDITORIAL_CHARS) or surface
        if lemma in STANZA_MANGLED_FALLBACKS:
            fb_lem, fb_pos = STANZA_MANGLED_FALLBACKS[lemma]
            lemma = fb_lem
            pos = fb_pos

        resolved_token = {
            "id": t["id"],
            "book": t["book"],
            "chapter": t["chapter"],
            "verse": t["verse"],
            "ref": t["ref"],
            "surface": surface,
            "punct": t["punct"],
            "norm": norm,
            "lemma": lemma,
            "pos": pos,
            "morph": morph,
            "confidence": confidence,
            "source": source,
        }
        # Only write gi_candidates when GI found multiple distinct lemmas,
        # to keep the file lean for tokens with a single unambiguous parse.
        if extra_candidates:
            resolved_token["gi_candidates"] = extra_candidates
        resolved.append(resolved_token)

    print("\nResolution Statistics:")
    for k, v in stats.items():
        print(f"  {k}: {v:,} ({v / len(tokens) * 100:.1f}%)")

    print(f"\nWriting resolved tokens to {RESOLVED_TOKENS_FILE}...")
    with open(RESOLVED_TOKENS_FILE, "w", encoding="utf-8") as f:
        json.dump(resolved, f, ensure_ascii=False)

    print("Stage 5 completed successfully!")


if __name__ == "__main__":
    resolve()

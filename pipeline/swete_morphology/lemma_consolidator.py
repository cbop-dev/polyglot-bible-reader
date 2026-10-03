"""Lemma Consolidator for Septuagint (LXX) Dataset.

Consolidates redundant, fractured, or typographical variant lemmas into single,
authoritative headwords to maintain accurate word frequencies and clean vocabulary cards.
"""

from __future__ import annotations

import unicodedata
from collections import Counter, defaultdict
from typing import Any, Dict, List, Set


def strip_accents(s: str) -> str:
    if not s:
        return ""
    norm = unicodedata.normalize("NFKD", s)
    clean = "".join(
        c for c in norm
        if not unicodedata.combining(c) and c != "ͅ" and c != "\u0345"
    )
    return unicodedata.normalize("NFC", clean).lower().replace("ς", "σ")


# High-frequency gentilic / ethnic adjectives that legitimately retain capitalization
GENTILIC_LEMMAS: Set[str] = {
    "Ἰουδαῖος", "Ἰουδαία", "Ἰσραηλίτης", "Λευίτης", "Λευιτικός",
    "Ἀσσύριος", "Αἰγύπτιος", "Χαλδαῖος", "Ἀμορραῖος", "Χαναναῖος",
    "Φυλιστιείμ", "Μωαβίτης", "Ἀμμανίτης", "Ἐδωμίτης", "Σύρος",
    "Πέρσης", "Περσικός", "Ἕλλην", "Ἑλληνικός", "Ἑβραῖος",
}

# Explicit overrides for corruptions, apparatus relics, and known single-token anomalies
EXPLICIT_CONSOLIDATIONS: Dict[str, str] = {
    # Relics / Apparatus tokens / Incipit drop caps
    "ΛΟΓΟΣ": "λόγος",
    "ΠΑΣΑ": "πᾶς",
    "ἀάρω": "θαρσέω",
    "ἀαδίζω": "βαδίζω",
    "ἁαδίζω": "βαδίζω",
    "ἀαθίζω": "καθίζω",
    "ἀαλύπτω": "καλύπτω",
    "ἀακράν": "μακράν",
    "ἀάρειμι": "Θαρσά",
    "ἀάπειμι": "Σαβά",
    "δοιέω": "ποιέω",
    "ὁανέω": "ἱκανόω",
    "αασιλεύω": "βασιλεύω",
    "αατρεύω": "ἰατρεύω",
    "ααδιάζομαι": "Χαδιάσαι",
    "Eπάκουσος": "Ἐπάκουσος",
    "Eπίστρέφος": "Ἐπίστρεφος",
    "nηστεύω": "νηστεύω",
    "Ελογέω": "εὐλογέω",
    "ελογέω": "εὐλογέω",
    "ΑΝΘΡΩεύς": "ἄνθρωπος",
    "ΡΗΜΑΤεύς": "ῥῆμα",
    "ΑΓΑιΗΣΑΤήν": "ἀγαπάω",
    "ΠΟΛΛΩς": "πολύς",
    "ΑΝΤΙΓΡαΦῷς": "ἀντίγραφον",
    "ΦΙΛΟλΟΦΩΤν": "φιλόσοφος",
    "ΕΒΟΗυα": "βοάω",
    "ΑΣΩΜα": "ᾄδω",
    # Elided word fallbacks
    "ἀάλ": "ἀλλά",
    "ἀλλάω": "ἀλλά",
    "Ἀλλ": "ἀλλά",
    "ἀλλ": "ἀλλά",
    "ἐπ": "ἐπί",
    "ἐφ": "ἐπί",
    "ἐφός": "ἐπί",
    "μετ": "μετά",
    "μεθ": "μετά",
    "μέτος": "μετά",
    "ἀπ": "ἀπό",
    "ἀφ": "ἀπό",
    "ἀπόπ": "ἀπό",
    "ἀπόφ": "ἀπό",
    "δι": "διά",
    "κατ": "κατά",
    "καθ": "κατά",
    "κατάθ": "κατά",
    "παρ": "παρά",
    "ὑπ": "ὑπό",
    "ὑφ": "ὑπό",
    "ἀντ": "ἀντί",
    "ἀνθ": "ἀντί",

    # Single-token typo accents / breathing glitches
    "καἱ": "καί",
    "πρὀς": "πρός",
    "σῦ": "σύ",
    "οὖτος": "οὗτος",
    "αὑτός": "αὐτός",
    "Πάς": "πᾶς",
    # Inflected surface forms mistakenly assigned as distinct lemmas
    "βαθεῖα": "βαθύς",
    "βαρεία": "βαρύς",
    "τράχεια": "τραχύς",
    "φάτναι": "φάτνη",
    "ὀσμαί": "ὀσμή",
    "ἔντιμα": "ἔντιμος",
    "μεγαλοπρεπῆ": "μεγαλοπρεπής",
    "ἀμυγδάλων": "ἀμύγδαλον",
    "δαψιλή": "δαψιλής",
    # Asymmetric active citations for predominantly deponent verbs
    "Φοβέω": "φοβέομαι",
    "φοβέω": "φοβέομαι",
    "Ῥύω": "ῥύομαι",
    "ῥύω": "ῥύομαι",
    "εὔχω": "εὔχομαι",
    "καταράω": "καταράομαι",
    "ἐπιλαμβάνω": "ἐπιλαμβάνομαι",
    "ἐνωτίζω": "ἐνωτίζομαι",
    "κατασκέπτω": "κατασκέπτομαι",
    "ἀπελεύω": "ἀπελεύομαι",
}


def build_dynamic_consolidations(tokens: List[Dict[str, Any]]) -> Dict[str, str]:
    """Builds dynamic consolidation mapping across the token stream.
    
    1. Lowercases sentence-initial common nouns, verbs, adverbs, and adjectives
       when a lowercase counterpart exists or for non-nominal POS.
    2. Merges rare typo accents into established dominant headwords (e.g. >=20 vs <=3).
    3. Merges rare active verb stems into established deponents (>=10 vs <=5).
    """
    dynamic_map: Dict[str, str] = dict(EXPLICIT_CONSOLIDATIONS)

    # Calculate frequencies and POS distributions
    lemma_freq: Counter[str] = Counter()
    pos_by_lemma: Dict[str, Counter[int]] = defaultdict(Counter)

    for t in tokens:
        lem = t.get("lemma", "")
        if lem:
            lemma_freq[lem] += 1
            pos_by_lemma[lem][t.get("pos", 0)] += 1

    # 1. Capitalization normalization
    for lem, count in lemma_freq.items():
        if not lem or not lem[0].isupper() or lem in dynamic_map:
            continue
        if lem in GENTILIC_LEMMAS:
            continue

        dom_pos = pos_by_lemma[lem].most_common(1)[0][0]
        # POS 13 is proper noun (keep capitalized)
        if dom_pos != 13:
            lower_initial = lem[0].lower() + lem[1:]
            if lower_initial in lemma_freq:
                dynamic_map[lem] = lower_initial
            elif dom_pos in (11, 2, 5, 14, 1):
                # Verbs, adverbs, prepositions, numerals, particles never stay capitalized
                dynamic_map[lem] = lower_initial

    # 2. Group by plain unaccented form to detect typo accents and minor variants
    by_plain: Dict[str, List[str]] = defaultdict(list)
    for lem in lemma_freq:
        target = dynamic_map.get(lem, lem)
        by_plain[strip_accents(target)].append(target)

    for plain, cluster in by_plain.items():
        unique_cluster = list(set(cluster))
        if len(unique_cluster) > 1:
            sorted_cluster = sorted(unique_cluster, key=lambda x: -lemma_freq[x])
            dominant = sorted_cluster[0]
            dom_count = lemma_freq[dominant]
            for other in sorted_cluster[1:]:
                other_count = lemma_freq[other]
                if other not in dynamic_map:
                    # Rare single-token or low-occurrence variant of an established word
                    if other_count <= 3 and dom_count >= 20:
                        dynamic_map[other] = dominant

    # 3. Asymmetric active / deponent verbs
    for lem, count in lemma_freq.items():
        if lem.endswith("ω") and lem not in dynamic_map:
            dep = lem[:-1] + "ομαι"
            if dep in lemma_freq:
                if lemma_freq[dep] >= 10 and count <= 5:
                    dynamic_map[lem] = dep

    return dynamic_map


def canonicalize_token_lemma(token: Dict[str, Any], dynamic_map: Dict[str, str]) -> str:
    """Returns the consolidated canonical lemma for a token."""
    lem = token.get("lemma", "")
    if not lem:
        return ""
    return dynamic_map.get(lem, lem)

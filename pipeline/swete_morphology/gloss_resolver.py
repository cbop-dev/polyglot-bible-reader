"""Gloss and Strong's Number Resolver for Swete LXX Pipeline.

Enriches Swete lemmas with standard student English glosses and Strong's Concordance numbers
using public-domain and open-access sources:
1. CenterBLC Text-Fabric export (gloss.tf, bol_gloss.tf, strongs.tf)
2. SBLGNT New Testament Greek lexicon (static/data/sblgnt/lexemes.json)
3. Morphological & orthographic candidate variant generator (deponent/active, stem alternations)
4. Standard Biblical proper name catalog (David, Moses, Abraham, etc.)
5. Sharded Liddell-Scott-Jones (LSJ) Greek-English Lexicon (static/data/dictionary/)
"""

from __future__ import annotations

import glob
import json
import os
import re
import unicodedata
from pathlib import Path
from typing import Dict, List, Optional, Tuple

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
    return unicodedata.normalize("NFC", s).translate(OXIA_TO_TONOS).strip()

def strip_accents(s: str) -> str:
    """Normalize Greek to lowercase unaccented form with standard sigma."""
    if not s:
        return ""
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().replace("ς", "σ").strip()


# Top Biblical Proper Names: Greek lemma -> English biblical name
BIBLICAL_PROPER_NAMES = {
    "Ἀαρών": "Aaron",
    "Ἄβελ": "Abel",
    "Ἀβιά": "Abijah",
    "Ἀβιούδ": "Abiud",
    "Ἀβραάμ": "Abraham",
    "Ἀδάμ": "Adam",
    "Αἴγυπτος": "Egypt",
    "Ἀμινάδαβ": "Amminadab",
    "Ἀμιναδάβ": "Amminadab",
    "Ἀμώς": "Amos",
    "Ἀράμ": "Aram",
    "Ἀσάφ": "Asaph",
    "Ἀσήρ": "Asher",
    "Ἀχάζ": "Ahaz",
    "Ἀχίμ": "Achim",
    "Βαβυλών": "Babylon",
    "Βαλάκ": "Balak",
    "Βαλαάμ": "Balaam",
    "Βενιαμίν": "Benjamin",
    "Βηθλέεμ": "Bethlehem",
    "Βόες": "Boaz",
    "Γάδ": "Gad",
    "Γαλιλαία": "Galilee",
    "Γεδεών": "Gideon",
    "Δαυίδ": "David",
    "Δανιήλ": "Daniel",
    "Ἑζεκίας": "Hezekiah",
    "Ἐλεάζαρ": "Eleazar",
    "Ἐλιακίμ": "Eliakim",
    "Ἐλιούδ": "Eliud",
    "Ἐλισαιέ": "Elisha",
    "Ἐλισάβετ": "Elizabeth",
    "Ἐμμανουήλ": "Emmanuel",
    "Ἑνώχ": "Enoch",
    "Ἐφραίμ": "Ephraim",
    "Εὕα": "Eve",
    "Ζαβουλών": "Zebulun",
    "Ζαχαρίας": "Zechariah",
    "Ζάρα": "Zerah",
    "Ζοροβαβέλ": "Zerubbabel",
    "Ἡλίας": "Elijah",
    "Ἡρῴδης": "Herod",
    "Ἡσαῦ": "Esau",
    "Ἠσαΐας": "Isaiah",
    "Ἑσρώμ": "Hezron",
    "Θαμάρ": "Tamar",
    "Ἰακώβ": "Jacob",
    "Ἰεζεκιήλ": "Ezekiel",
    "Ἰερεμίας": "Jeremiah",
    "Ἰεροβοάμ": "Jeroboam",
    "Ἰεροσόλυμα": "Jerusalem",
    "Ἰερουσαλήμ": "Jerusalem",
    "Ἰεσσαί": "Jesse",
    "Ἰεφθάε": "Jephthah",
    "Ἰεχονίας": "Jechoniah",
    "Ἰησοῦς": "Jesus, Joshua",
    "Ἰορδάνης": "Jordan",
    "Ἰούδας": "Judah, Judas",
    "Ἰουδαία": "Judea",
    "Ἰουδαῖος": "Jew, Judean",
    "Ἰσαάκ": "Isaac",
    "Ἰσραήλ": "Israel",
    "Ἰσσάχαρ": "Issachar",
    "Ἰωαθάμ": "Jotham",
    "Ἰωάννης": "John",
    "Ἰώβ": "Job",
    "Ἰωβήδ": "Obed",
    "Ἰωνᾶς": "Jonah",
    "Ἰωράμ": "Joram",
    "Ἰωσάφατ": "Jehoshaphat",
    "Ἰωσήφ": "Joseph",
    "Ἰωσίας": "Josiah",
    "Κάιν": "Cain",
    "Λευί": "Levi",
    "Λευίτης": "Levite",
    "λευιτικός": "Levitical",
    "λευιτός": "Levitical, Levite",
    "Μαθουσάλα": "Methuselah",
    "Μανασσῆς": "Manasseh",
    "Μαρία": "Mary, Miriam",
    "Μαριάμ": "Miriam, Mary",
    "Ματθάν": "Matthan",
    "Μωυσῆς": "Moses",
    "Ναασσών": "Nahshon",
    "Ναζαρέτ": "Nazareth",
    "Ναζωραῖος": "Nazarene",
    "Ναθάν": "Nathan",
    "Νεφθαλί": "Naphtali",
    "Νῶε": "Noah",
    "Ὀζίας": "Uzziah",
    "Οὐρίας": "Uriah",
    "Παῦλος": "Paul",
    "Πέτρος": "Peter",
    "Ῥαβσακής": "Rabshakeh",
    "Ῥαμά": "Ramah",
    "Ῥαχάβ": "Rahab",
    "Ῥαχήλ": "Rachel",
    "Ῥοβοάμ": "Rehoboam",
    "Ῥουβήν": "Reuben",
    "Ῥούθ": "Ruth",
    "Σαδώκ": "Zadok",
    "Σαλαθιήλ": "Salathiel",
    "Σαλμών": "Salmon",
    "Σαμάρεια": "Samaria",
    "Σαμουήλ": "Samuel",
    "Σαμψών": "Samson",
    "Σάρρα": "Sarah",
    "Σαούλ": "Saul",
    "Σεδεκίας": "Zedekiah",
    "Σήθ": "Seth",
    "Σιών": "Zion",
    "Σολομών": "Solomon",
    "Σόδομα": "Sodom",
    "Συμεών": "Simeon",
    "Φαραώ": "Pharaoh",
    "Φαρές": "Perez",
    "Φαρισαῖος": "Pharisee",
    "Φιλιππήσιος": "Philippian",
    "Φίλιππος": "Philip",
    "Χαναάν": "Canaan",
    "Χαναναῖος": "Canaanite",
    "Χριστός": "Christ, Messiah",
}

CURATED_OVERRIDES = {
    "φοβέομαι": ("fear, be afraid, revere", "G5399"),
    "φοβέω": ("fear, be afraid, revere", "G5399"),
    "κοιμάομαι": ("sleep, fall asleep, die", "G2837"),
    "ἐξολεθρεύω": ("destroy utterly, extirpate", "G1842"),
    "ἐξολοθρεύω": ("destroy utterly, extirpate", "G1842"),
    "ὄμνυμι": ("swear, take an oath", "G3660"),
    "ὀμνύω": ("swear, take an oath", "G3660"),
    "παραγίγνομαι": ("arrive, come, appear", "G3854"),
    "παραγίνομαι": ("arrive, come, appear", "G3854"),
    "ἐθέλω": ("will, wish, desire", "G2309"),
    "θέλω": ("will, wish, desire", "G2309"),
    "πίμπλημι": ("fill, fulfill, satisfy", "G4130"),
    "τεσσεράκοντα": ("forty", "G5062"),
    "δείκνυμι": ("show, point out, explain", "G1166"),
    "ἐξομολογέομαι": ("confess, praise, give thanks", "G1843"),
    "διατίθημι": ("make a covenant, arrange, assign", "G1303"),
    "διατίθεμαι": ("make a covenant, arrange, assign", "G1303"),
    "λευιτός": ("Levitical, Levite", "G3019"),
    "ἀναγιγνώσκω": ("read, recognize, know well", "G314"),
    "διανοέομαι": ("think, meditate, consider", "G1260"),
    "διανοέω": ("think, meditate, consider", "G1260"),
    "βηλόω": ("profane, defile", "G953"),
    "ἀποκαθιστάνω": ("restore, re-establish", "G600"),
    "διασκεδάννυμι": ("scatter, disperse, confound", "G1287"),
    "πλημμελία": ("trespass, fault, sin", "G4134"),
    "πέρνημι": ("sell, export for sale", "G4097"),
    "ἕλκω": ("draw, drag, pull", "G1670"),
    "χερουβέω": ("act as cherub, dwell with cherubim", ""),
    "προκαταλαμβάνομαι": ("overtake beforehand, seize", "G2638"),
    "ἁλίσκομαι": ("be taken, be captured, fall", "G256"),
    "ἀπελεύομαι": ("go away, depart", "G565"),
    "συγγενία": ("kindred, relatives, family", "G4772"),
    "ἱστηκέω": ("stand, stand firm", "G2476"),
    "οἰκτειρμός": ("compassion, mercy, pity", "G3628"),
    "εὐοδίδωμι": ("prosper, give success", "G2137"),
    "διπλόος": ("double, twofold", "G1362"),
    "τακάω": ("melt, waste away", "G5080"),
    "εὐλαβέομαι": ("reverence, fear, beware", "G2125"),
    "ἰσχύνω": ("strengthen, make strong", "G2480"),
    "ἀείδω": ("sing, chant", "G103"),
    "χείμαρρος": ("torrent, brook, ravine", "G5493"),
    "ὀρινός": ("mountainous, hill country", "G3714"),
    "ἀπωλία": ("destruction, ruin, loss", "G684"),
    "ὄργανος": ("instrument, organ, tool", "G3788"),
    "δύω": ("sink, plunge, enter, set", "G1416"),
    "ἐκγείρω": ("awaken, raise up", "G1453"),
    "σέβω": ("worship, revere, adore", "G4576"),
    "σέβομαι": ("worship, revere, adore", "G4576"),
    "καθόπισθε": ("behind, after", "G3694"),
    "θυμεάω": ("burn incense", "G2370"),
    "φάσος": ("Passover, paschal offering", "G3957"),
}


class GlossResolver:
    """Multi-source resolver for Biblical Greek vocabulary glosses and Strong's IDs."""

    def __init__(self, repo_root: Optional[Path] = None, tf_dir: Optional[Path] = None):
        if repo_root is None:
            self.repo_root = Path(__file__).resolve().parent.parent.parent
        else:
            self.repo_root = Path(repo_root)

        if tf_dir is None:
            from .config import TF_LXX_DIR
            self.tf_dir = Path(os.environ.get("LXX_TF_DIR", str(TF_LXX_DIR)))
        else:
            self.tf_dir = Path(tf_dir)

        self.db: Dict[str, Tuple[str, str]] = {}
        self.plain_db: Dict[str, Tuple[str, str]] = {}
        self.surf_db: Dict[str, Tuple[str, str]] = {}
        self.surf_plain_db: Dict[str, Tuple[str, str]] = {}
        self.lsj_db: Dict[str, str] = {}

        self._load_centerblc_tf()
        self._load_sblgnt()
        self._load_lsj()

    def _load_centerblc_tf(self) -> None:
        """Load CenterBLC Text-Fabric gloss and Strong's features."""
        if not self.tf_dir.exists():
            print(f"[GlossResolver] Note: CenterBLC TF dir not found at {self.tf_dir}; proceeding with fallbacks.")
            return

        def read_tf(feat: str) -> List[str]:
            p = self.tf_dir / f"{feat}.tf"
            if not p.exists():
                return []
            with open(p, "r", encoding="utf-8") as f:
                lines = [line.rstrip("\n") for line in f if not line.startswith("@")]
            return lines[1:] if len(lines) > 1 else []

        words = read_tf("word")
        lex_utf8 = read_tf("lex_utf8")
        glosses = read_tf("gloss")
        bol_glosses = read_tf("bol_gloss")
        strongs = read_tf("strongs")

        print(f"[GlossResolver] Ingesting {len(lex_utf8):,} CenterBLC TF token features...")
        for w, l, g, bg, s in zip(words, lex_utf8, glosses, bol_glosses, strongs):
            nl = norm_greek(l)
            pl = strip_accents(l)
            nw = norm_greek(w)
            pw = strip_accents(w)
            chosen_g = g or bg
            if nl and chosen_g and nl not in self.db:
                self.db[nl] = (chosen_g, s)
            if pl and chosen_g and pl not in self.plain_db:
                self.plain_db[pl] = (chosen_g, s)
            if nw and chosen_g and nw not in self.surf_db:
                self.surf_db[nw] = (chosen_g, s)
            if pw and chosen_g and pw not in self.surf_plain_db:
                self.surf_plain_db[pw] = (chosen_g, s)

    def _load_sblgnt(self) -> None:
        """Load SBLGNT vocabulary glosses and Strong's IDs."""
        sbl_file = self.repo_root / "static" / "data" / "sblgnt" / "lexemes.json"
        if not sbl_file.exists():
            return
        try:
            with open(sbl_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            loaded = 0
            for item in data.values():
                nl = norm_greek(item.get("lemma", ""))
                pl = strip_accents(nl)
                g = item.get("gloss", "")
                s = item.get("strongs", "")
                if s and not s.startswith("G"):
                    s = f"G{s}"
                if nl and g and nl not in self.db:
                    self.db[nl] = (g, s)
                    loaded += 1
                if pl and g and pl not in self.plain_db:
                    self.plain_db[pl] = (g, s)
            print(f"[GlossResolver] Added {loaded:,} supplemental SBLGNT gloss entries.")
        except Exception as err:
            print(f"[GlossResolver] Note: could not load SBLGNT lexemes: {err}")

    def _load_lsj(self) -> None:
        """Load LSJ dictionary headword glosses from sharded JSON files."""
        dict_dir = self.repo_root / "static" / "data" / "dictionary"
        if not dict_dir.exists():
            return

        def extract_lsj_gloss(defn: str) -> str:
            bolds = re.findall(r"\*\*([^*]+)\*\*", defn)
            if not bolds:
                return ""
            glosses = []
            candidates = bolds[1:] if len(bolds) > 1 else bolds
            for b in candidates:
                b_clean = b.strip(" .,;:;'\"")
                if not b_clean:
                    continue
                if b_clean in ("A", "B", "C", "D", "E", "F", "I", "II", "III", "IV", "V", "VI", "Α", "Β", "Γ", "Δ", "Pass.", "Act.", "Med."):
                    continue
                if any("a" <= c.lower() <= "z" for c in b_clean) and not any(0x0370 <= ord(c) <= 0x1FFF for c in b_clean):
                    b_clean = re.sub(r"\[.*?\]|\(.*?\)", "", b_clean).strip()
                    if b_clean and len(b_clean) > 2:
                        glosses.append(b_clean)
                        if len(glosses) >= 2:
                            break
            return "; ".join(glosses) if glosses else ""

        count = 0
        for p in glob.glob(str(dict_dir / "*.json")):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    shard = json.load(f)
                for k, v in shard.items():
                    g = extract_lsj_gloss(v.get("def", ""))
                    if g and k not in self.lsj_db:
                        self.lsj_db[k] = g
                        count += 1
            except Exception:
                continue
        print(f"[GlossResolver] Loaded {count:,} LSJ definitions from dictionary shards.")

    def get_candidates(self, lem: str) -> List[str]:
        """Generate common morphological and orthographic plain variants."""
        cands = []
        pl = strip_accents(lem)

        # 1. Deponent <-> Active verbal alternations
        if pl.endswith("ομαι"):
            cands.append(pl[:-4] + "ω")
            cands.append(pl[:-4] + "εω")
            cands.append(pl[:-4] + "αω")
        if pl.endswith("ω"):
            cands.append(pl[:-1] + "ομαι")
        if pl.endswith("εω"):
            cands.append(pl[:-2] + "ομαι")
        if pl.endswith("αω"):
            cands.append(pl[:-2] + "ομαι")

        # 2. -μι verb stem alternations
        if pl.endswith("τιθημι"):
            cands.append(pl[:-6] + "τιθεμαι")
        if pl.endswith("τιθεμαι"):
            cands.append(pl[:-7] + "τιθημι")
        if pl.endswith("διδομι") or pl.endswith("διδωμι"):
            cands.append(pl[:-6] + "διδομαι")
        if pl.endswith("διδομαι"):
            cands.append(pl[:-7] + "διδωμι")
        if pl.endswith("ιστημι"):
            cands.append(pl[:-6] + "ισταμαι")
            cands.append(pl[:-6] + "ιστανω")
        if pl.endswith("ιστανω"):
            cands.append(pl[:-6] + "ιστημι")
        if pl.endswith("μι"):
            cands.append(pl[:-2] + "μαι")
            cands.append(pl[:-2] + "ομαι")
            cands.append(pl[:-2] + "ω")
        if pl.endswith("υμι"):
            cands.append(pl[:-3] + "υω")
        if pl.endswith("υω"):
            cands.append(pl[:-2] + "υμι")
        if pl.endswith("αννυμι"):
            cands.append(pl[:-6] + "αζω")

        # 3. Orthographic & phonological variants
        if "γιγν" in pl:
            cands.append(pl.replace("γιγν", "γιν"))
        if "γιν" in pl:
            cands.append(pl.replace("γιν", "γιγν"))
        if "ολεθρ" in pl:
            cands.append(pl.replace("ολεθρ", "ολοθρ"))
        if "ολοθρ" in pl:
            cands.append(pl.replace("ολοθρ", "ολεθρ"))
        if "εσσερ" in pl:
            cands.append(pl.replace("εσσερ", "εσσαρ"))
        if pl.startswith("εθελ"):
            cands.append(pl.replace("εθελ", "θελ"))
        if pl.startswith("θελ"):
            cands.append("ε" + pl)
        if pl.endswith("ια"):
            cands.append(pl[:-2] + "εια")
        if pl.endswith("εια"):
            cands.append(pl[:-3] + "ια")
        if pl.endswith("οοσ"):
            cands.append(pl[:-3] + "ουσ")
        if pl.endswith("ουσ"):
            cands.append(pl[:-3] + "οοσ")
        if pl.endswith("οσ") and not pl.endswith("ουσ"):
            cands.append(pl[:-2] + "ον")
        if pl.endswith("ον"):
            cands.append(pl[:-2] + "οσ")
        if pl == "αειδω":
            cands.append("αδω")
        if pl == "πιμπλημι":
            cands.append("πληθω")
        if "ειρμ" in pl:
            cands.append(pl.replace("ειρμ", "ιρμ"))
        if "ιρμ" in pl:
            cands.append(pl.replace("ιρμ", "ειρμ"))
        if "ριν" in pl:
            cands.append(pl.replace("ριν", "ρειν"))
        if pl.startswith("απελευ"):
            cands.append(pl.replace("απελευ", "απερχ"))
        if pl.startswith("προκαταλαμβαν"):
            cands.append("καταλαμβανω")

        return cands

    def resolve(self, lem: str, pos: int = 15, total: int = 0) -> Tuple[str, str]:
        """Resolve a lemma to its best English gloss and Strong's number.

        Returns (gloss, strongs).
        """
        norm_lem = norm_greek(lem)
        pl = strip_accents(norm_lem)

        # 0. Curated Overrides (deponents, special biblical terms)
        if norm_lem in CURATED_OVERRIDES:
            return CURATED_OVERRIDES[norm_lem]
        if pl in CURATED_OVERRIDES:
            return CURATED_OVERRIDES[pl]

        # 1. Biblical Proper Names override
        if norm_lem in BIBLICAL_PROPER_NAMES:
            s = self.db.get(norm_lem, ("", ""))[1] or self.plain_db.get(pl, ("", ""))[1]
            return (BIBLICAL_PROPER_NAMES[norm_lem], s)

        # 2. Exact normalized match in CenterBLC/SBLGNT database
        if norm_lem in self.db:
            return self.db[norm_lem]

        # 3. Plain unaccented match in CenterBLC/SBLGNT database
        if pl in self.plain_db:
            return self.plain_db[pl]

        # 4. Surface form match in CenterBLC
        if norm_lem in self.surf_db:
            return self.surf_db[norm_lem]
        if pl in self.surf_plain_db:
            return self.surf_plain_db[pl]

        # 5. Candidate morphological / orthographic variants
        for c in self.get_candidates(norm_lem):
            if c in self.plain_db:
                g, s = self.plain_db[c]
                return (g, s)

        # 6. LSJ Dictionary Shard Direct Match
        if pl in self.lsj_db:
            return (self.lsj_db[pl], "")

        # 7. LSJ Dictionary Shard Variant Match
        for c in self.get_candidates(norm_lem):
            if c in self.lsj_db:
                return (self.lsj_db[c], "")

        # 8. Proper Noun fallback (pos == 13 or Capitalized)
        if pos == 13 or (norm_lem and norm_lem[0].isupper()):
            return (norm_lem, "")

        return ("", "")

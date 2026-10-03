"""gi_bridge.py — Thin adapter for James Tauber's greek-inflexion package.

## Performance architecture

gi.parse() takes ~30 ms per call (it evaluates all stem rules for every call).
That's 160+ minutes for 320K tokens — unusable inline.

The fix: build a surface-form cache once at Stage 5 startup, then every
per-token lookup is an O(1) dict hit.

Cache lifecycle:
  - Built from the unique VERB/AUX surface forms in swete_stanza.json
  - Written to BUILD_DIR/gi_verb_cache.json
  - On subsequent Stage 5 runs, loaded directly (milliseconds)
  - Rebuild by deleting the cache file (or when Stage 4 re-runs)

Public API for Stage 5
----------------------
  gi          = load_gi(gi_dir)
  gi_cache    = build_or_load_gi_cache(gi, stanza_preds, cache_path)
  hit         = gi_verb_check(gi_cache, surface, stanza_upos)

gi_verb_check() returns (primary_lemma, primary_morph, extra_candidates)
when BOTH systems agree the token is a verb, or None otherwise.
"""

from __future__ import annotations

import json
import os
import re
import sys
import tempfile
import time
import unicodedata
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Greek normalization (mirrors stage5_resolve.py)
# ---------------------------------------------------------------------------

_OXIA_TO_TONOS = {
    0x1F71: 0x03AC, 0x1F73: 0x03AD, 0x1F75: 0x03AE, 0x1F77: 0x03AF,
    0x1F79: 0x03CC, 0x1F7B: 0x03CD, 0x1F7D: 0x03CE, 0x1FBB: 0x03AC,
    0x1FC9: 0x03AD, 0x1FCB: 0x03AE, 0x1FDB: 0x03AF, 0x1FEB: 0x03CD,
    0x1FF9: 0x03CC, 0x1FFB: 0x03CE,
}


def _norm(s: str) -> str:
    return unicodedata.normalize("NFC", s).translate(_OXIA_TO_TONOS).strip()


_PSILI = "\u0313"   # combining smooth breathing
_DASIA = "\u0314"   # combining rough breathing


def _strip_initial_breathing_nfd(nfd_text: str) -> str:
    """Strip the breathing mark (psili or dasia) from the first base character
    and its combining diacritics in an NFD string.

    Used to fix characters that were word-initial in the root but become
    internal after a prefix is prepended:
      'α\u0313\u0301γω'  (NFD of ἄγω)  →  'α\u0301γω'  (NFD of άγω)
    """
    result = []
    in_first_letter_diacritics = False
    first_base_seen = False

    for ch in nfd_text:
        cat = unicodedata.category(ch)
        is_base = cat.startswith("L")

        if not first_base_seen:
            if is_base:
                first_base_seen = True
                in_first_letter_diacritics = True
            result.append(ch)
        elif in_first_letter_diacritics:
            if is_base:
                # Second base letter: first letter's diacritics are done
                in_first_letter_diacritics = False
                result.append(ch)
            elif ch in (_PSILI, _DASIA):
                pass  # drop the spurious breathing
            else:
                result.append(ch)
        else:
            result.append(ch)

    return "".join(result)


def _strip_compound_markers(lemma: str) -> str:
    """Remove GI's prefix-boundary markers (++ and +) and fix spurious breathing.

    GI marks prefix boundaries with ++ (simple compound) or + (nested compound).
    The character immediately after the boundary was formerly word-initial in the
    root and may carry a smooth/rough breathing that becomes invalid once the root
    is prefixed.  We strip that breathing at the boundary only, so word-initial
    diphthongs like εἰ- in εἰμί are never affected.

    Examples:
      'συν++ἄγω'      → 'συνάγω'      (ἄ loses smooth breathing at ++ boundary)
      'ἀπο++στρέφω'   → 'ἀποστρέφω'   (στρ: no breathing, nothing to strip)
      'παρα+ἐνβάλλω'  → 'παρενβάλλω'  (ἐ loses smooth breathing at + boundary)
      'ἐκ+ἀποστέλλω'  → 'ἐκαποστέλλω' (ἀ loses smooth breathing)
    """
    if "+" not in lemma:
        return lemma

    # Work in NFD so we can manipulate combining diacritics directly.
    nfd = unicodedata.normalize("NFD", lemma)

    # Split on ++ or + (order matters: try ++ first so it isn't matched as two +)
    parts = re.split(r"\+\+|\+", nfd)

    if len(parts) == 1:
        return unicodedata.normalize("NFC", nfd)

    # First part: word-initial — breathings are legitimate, keep as-is.
    # Subsequent parts: each was formerly word-initial in the root — strip
    # the breathing from the first letter of each part.
    fixed_parts = [parts[0]] + [_strip_initial_breathing_nfd(p) for p in parts[1:]]

    joined = unicodedata.normalize("NFC", "".join(fixed_parts))

    # Collapse identical-vowel sequences created at the boundary (α+α → α, ε+ε → ε …).
    # This handles the common case of δια+ἀνα- → διαανα- → διανα-.
    # Cross-vowel elision (παρα+ε → παρε) is not handled here — it requires
    # full phonological analysis and affects only a small fraction of rare forms.
    joined = re.sub(r"([αεηιουω])\1", r"\1", joined)

    return joined


def _translate_morph(gi_code: str) -> str:
    """Translate GI's PROIEL morph code to the app's V-XXX-XX format.

    GI dot-separated codes:
      'AAI.3S'  → 'V-AAI-3S'   (Aorist Active Indicative 3rd Singular)
      'AAN'     → 'V-AAN'      (Aorist Active Infinitive)
      'PAP.NSM' → 'V-PAP-NSM' (Present Active Participle NSM)
    """
    return "V-" + gi_code.replace(".", "-")


# First character: tense/aspect.  Third character: mood/form.
_VERBAL_TENSE = frozenset("PIFAXYZ")
_VERBAL_MOOD  = frozenset("ISODNP")


def _is_verbal_code(morph_code: str) -> bool:
    """Return True if morph_code represents a verbal form in GI's notation."""
    return (
        len(morph_code) >= 3
        and morph_code[0] in _VERBAL_TENSE
        and morph_code[1] in "AMP"
        and morph_code[2] in _VERBAL_MOOD
    )


_VOWELS_BARE = frozenset("αεηιουωΑΕΗΙΟΥΩ")


def _fix_internal_breathings(lemma: str) -> str:
    """Remove breathing marks (psili/dasia) from non-initial positions.

    In Greek, breathing marks are only legitimate on:
      - the first character of a word (initial vowel), or
      - the second character when the first is also a vowel (initial diphthong,
        e.g. εἰ-, αἰ-, αὐ-).

    Any breathing on position 2+ is always spurious in a Greek verb lemma and
    arises here from GI's ++ prefix notation leaving behind a formerly word-initial
    vowel that is now internal (e.g. συν++ἄγω stripped → συνἄγω → fix → συνάγω).

    Parameters: lemma in NFC. Returns NFC.
    """
    nfd = unicodedata.normalize("NFD", lemma)

    # Identify the base characters (letters) in NFD order
    base_chars = [ch for ch in nfd if unicodedata.category(ch).startswith("L")]
    if len(base_chars) < 2:
        return lemma  # nothing to check

    # Breathing is allowed on base char 0, and on base char 1 only if it forms
    # a word-initial diphthong (both 0 and 1 are vowels).
    is_initial_diphthong = base_chars[0] in _VOWELS_BARE and base_chars[1] in _VOWELS_BARE
    allowed_base_indices = {0, 1} if is_initial_diphthong else {0}

    result = []
    current_base_index = -1
    for ch in nfd:
        cat = unicodedata.category(ch)
        if cat.startswith("L"):
            current_base_index += 1
            result.append(ch)
        elif ch in (_PSILI, _DASIA) and current_base_index not in allowed_base_indices:
            pass  # drop spurious breathing
        else:
            result.append(ch)

    return unicodedata.normalize("NFC", "".join(result))


# Type alias for the precomputed cache
# Maps normalized surface → list of {"lemma": str, "morph": str} dicts.
# An empty list means GI returned no verbal parse for that surface.
GiCache = dict[str, list[dict]]


# ---------------------------------------------------------------------------
# Step 1: load GI (needed only for cache building)
# ---------------------------------------------------------------------------

def load_gi(gi_dir: Path):
    """Load GreekInflexion with merged lxx+morphgnt lexicon.

    Returns a GreekInflexion instance used by build_or_load_gi_cache().
    Returns None if gi_dir is missing or dependencies are not installed.
    """
    if not gi_dir.exists():
        print(
            f"[gi_bridge] WARNING: GI dir not found at {gi_dir}. "
            "Verb gate disabled. Set GREEK_INFLEXION_DIR to enable."
        )
        return None

    try:
        import yaml
    except ImportError:
        print("[gi_bridge] WARNING: pyyaml not installed. Verb gate disabled.")
        return None

    try:
        sys.path.insert(0, str(gi_dir))
        from greek_inflexion import GreekInflexion  # type: ignore
    except ImportError as e:
        print(f"[gi_bridge] WARNING: could not import greek_inflexion: {e}. Verb gate disabled.")
        return None

    try:
        stemming_yaml = gi_dir / "stemming.yaml"
        lxx_yaml      = gi_dir / "STEM_DATA" / "lxx_lexicon.yaml"
        mgnt_yaml     = gi_dir / "STEM_DATA" / "morphgnt_lexicon.yaml"

        with open(lxx_yaml, encoding="utf-8") as f:
            lxx_data = yaml.safe_load(f) or {}
        with open(mgnt_yaml, encoding="utf-8") as f:
            mgnt_data = yaml.safe_load(f) or {}

        combined = {**mgnt_data, **lxx_data}  # lxx takes priority

        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=".yaml", delete=False, encoding="utf-8"
        )
        yaml.dump(combined, tmp, allow_unicode=True, default_flow_style=False)
        tmp.close()

        gi = GreekInflexion(str(stemming_yaml), tmp.name)
        os.unlink(tmp.name)

        print(
            f"[gi_bridge] Loaded GreekInflexion: "
            f"lxx={len(lxx_data)}, morphgnt={len(mgnt_data)}, "
            f"merged={len(combined)} lemmas."
        )
        return gi

    except Exception as e:
        print(f"[gi_bridge] ERROR loading GreekInflexion: {e}. Verb gate disabled.")
        return None


# ---------------------------------------------------------------------------
# Step 2: build or load the surface-form cache
# ---------------------------------------------------------------------------

def build_or_load_gi_cache(
    gi,
    stanza_preds: dict,
    cache_path: Path,
) -> GiCache | None:
    """Return a precomputed surface→[{lemma,morph}] cache.

    If cache_path exists, loads it immediately (O(1) per token from then on).
    Otherwise, runs gi.parse() on every unique VERB/AUX surface in stanza_preds,
    writes the result to cache_path, and returns the dict.

    Returns None if gi is None (feature disabled).
    """
    if gi is None:
        return None

    # --- Fast path: load existing cache ---
    if cache_path.exists():
        print(f"[gi_bridge] Loading GI verb cache from {cache_path} …")
        t0 = time.perf_counter()
        with open(cache_path, encoding="utf-8") as f:
            cache: GiCache = json.load(f)
        elapsed = time.perf_counter() - t0
        hits = sum(1 for v in cache.values() if v)
        print(
            f"[gi_bridge] Cache loaded in {elapsed:.2f}s: "
            f"{len(cache):,} surfaces, {hits:,} with GI parses. Verb gate active."
        )
        return cache

    # --- Slow path: build cache from unique VERB/AUX surfaces ---
    print("[gi_bridge] Building GI verb cache (one-time; subsequent runs load from disk) …")

    verb_surfaces: set[str] = set()
    for info in stanza_preds.values():
        if info.get("upos") in ("VERB", "AUX"):
            # Use the raw surface stored in the stanza predictions if present,
            # otherwise we can't recover it here — we'll handle via caller.
            pass  # surfaces come from the token loop in stage5; see below

    # stanza_preds is keyed by token id and does NOT include surface text.
    # The caller (stage5_resolve) passes surfaces via a separate set.
    # This function therefore accepts an already-populated verb_surfaces set
    # injected by the caller — see _build_gi_cache_from_surfaces() below.
    # (This variant is kept for the API; the real entry point is that function.)
    return _build_gi_cache_from_surfaces(gi, set(), cache_path)


# Distinctive verbal inflection endings that do not occur in nominal nominative citations
VERBAL_ENDINGS = ("ῶ", "οῦμαι", "ιεῖ", "ιοῦμεν", "ιοῦσι", "ιοῦσιν", "εῖται", "οῦνται")


def build_gi_cache(
    gi,
    tokens: list[dict],
    stanza_preds: dict,
    cache_path: Path,
) -> GiCache | None:
    """Build or load the GI verb cache given the full token list.

    This is the variant called by stage5_resolve, which has access to both
    the raw surface forms (from tokens) and the Stanza UPOS predictions.

    Parameters
    ----------
    gi          : GreekInflexion instance
    tokens      : list of token dicts from swete_tokens.json (has 'surface')
    stanza_preds: dict from swete_stanza.json (has 'upos' per token id)
    cache_path  : where to write/read the cache JSON
    """
    if gi is None:
        return None

    # Fast path
    if cache_path.exists():
        print(f"[gi_bridge] Loading GI verb cache from {cache_path} …")
        t0 = time.perf_counter()
        with open(cache_path, encoding="utf-8") as f:
            cache: GiCache = json.load(f)
        elapsed = time.perf_counter() - t0
        hits = sum(1 for v in cache.values() if v)
        print(
            f"[gi_bridge] Cache loaded in {elapsed:.2f}s: "
            f"{len(cache):,} surfaces, {hits:,} with GI parses. Verb gate active."
        )
        return cache

    # Collect unique candidate verbal surfaces
    verb_surfaces: set[str] = set()
    for t in tokens:
        info = stanza_preds.get(str(t["id"]), {})
        upos = info.get("upos", "")
        norm_surf = _norm(t["surface"])
        if (
            upos in ("VERB", "AUX")
            or any(norm_surf.endswith(end) for end in VERBAL_ENDINGS)
            or upos in ("ADP", "X", "INTJ")
        ):
            verb_surfaces.add(norm_surf)

    return _build_gi_cache_from_surfaces(gi, verb_surfaces, cache_path)


_worker_gi = None


def _init_gi_worker(gi_dir_str: str, combined_yaml_path: str):
    global _worker_gi
    import sys
    sys.path.insert(0, gi_dir_str)
    from greek_inflexion import GreekInflexion  # type: ignore
    _worker_gi = GreekInflexion(str(Path(gi_dir_str) / "stemming.yaml"), combined_yaml_path)


def _parse_surface_worker(surface: str) -> tuple[str, list[dict]]:
    global _worker_gi
    if _worker_gi is None:
        return (surface, [])
    try:
        result = _worker_gi.parse(surface)
    except Exception:
        result = set()

    if result and all(_is_verbal_code(r[1]) for r in result):
        seen: set[str] = set()
        candidates: list[dict] = []
        for raw_lemma, raw_morph in result:
            lem = _fix_internal_breathings(_norm(_strip_compound_markers(raw_lemma)))
            if lem not in seen:
                seen.add(lem)
                candidates.append({"lemma": lem, "morph": _translate_morph(raw_morph)})
        return (surface, candidates)
    return (surface, [])


def _build_gi_cache_from_surfaces(
    gi,
    surfaces: set[str],
    cache_path: Path,
) -> GiCache:
    """Run gi.parse() across surfaces in parallel, write cache JSON, return dict."""
    import multiprocessing as mp
    import yaml
    from .config import GI_DIR

    cache: GiCache = {}
    surface_list = sorted(surfaces)
    total = len(surface_list)
    num_workers = min(16, max(1, os.cpu_count() or 4))
    print(f"[gi_bridge] Parsing {total:,} candidate verbal surfaces with {num_workers} parallel workers …")
    t0 = time.perf_counter()

    # Create temporary merged lexicon for worker processes
    lxx_yaml = GI_DIR / "STEM_DATA" / "lxx_lexicon.yaml"
    mgnt_yaml = GI_DIR / "STEM_DATA" / "morphgnt_lexicon.yaml"
    with open(lxx_yaml, encoding="utf-8") as f:
        lxx_data = yaml.safe_load(f) or {}
    with open(mgnt_yaml, encoding="utf-8") as f:
        mgnt_data = yaml.safe_load(f) or {}
    combined = {**mgnt_data, **lxx_data}

    tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=".yaml", delete=False, encoding="utf-8"
    )
    yaml.dump(combined, tmp, allow_unicode=True, default_flow_style=False)
    tmp.close()

    try:
        with mp.Pool(
            num_workers,
            initializer=_init_gi_worker,
            initargs=(str(GI_DIR), tmp.name),
        ) as pool:
            # Use imap_unordered for fast streaming results with chunksize
            for idx, (surf, candidates) in enumerate(
                pool.imap_unordered(_parse_surface_worker, surface_list, chunksize=100), 1
            ):
                cache[surf] = candidates
                if idx % 5000 == 0 or idx == total:
                    elapsed = time.perf_counter() - t0
                    rate = idx / elapsed if elapsed > 0 else 0
                    print(f"[gi_bridge]   {idx:,}/{total:,} parsed ({elapsed:.1f}s, {rate:.1f} surfaces/s)")
    finally:
        if os.path.exists(tmp.name):
            os.unlink(tmp.name)

    elapsed_total = time.perf_counter() - t0
    hits = sum(1 for v in cache.values() if v)
    print(
        f"[gi_bridge] Cache built in {elapsed_total:.1f}s: "
        f"{len(cache):,} surfaces, {hits:,} with GI parses."
    )

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False)
    print(f"[gi_bridge] Cache written to {cache_path}. Verb gate active.")
    return cache


# ---------------------------------------------------------------------------
# Step 3: per-token lookup (O(1) dict hit)
# ---------------------------------------------------------------------------

def gi_verb_check(
    gi_cache: GiCache | None,
    surface: str,
    stanza_upos: str,
) -> tuple[str, str, list[dict]] | None:
    """Apply the GI verb gate to one token via the precomputed cache.

    Parameters
    ----------
    gi_cache    : dict from build_gi_cache() (or None → feature disabled)
    surface     : raw surface form from the Swete text
    stanza_upos : Stanza's Universal POS tag for this token

    Returns
    -------
    (primary_lemma, primary_morph_code, extra_candidates) on a hit, else None.

    POS agreement gate:
      - Fires when Stanza and GI agree on verbal category (VERB / AUX).
      - Also fires for high-confidence verbal inflections (e.g. contracted -ῶ, -οῦμαι)
        or when Stanza assigned an implausible POS (ADP, X, INTJ).
      - Blocks nouns/adjectives (e.g. πᾶσαν) from falsely matching absent nominals in GI.
    """
    if gi_cache is None or not surface:
        return None

    norm_surf = _norm(surface)

    # POS agreement & high-confidence inflection gate
    is_verb_agreement = stanza_upos in ("VERB", "AUX")
    is_high_conf_verbal_ending = any(norm_surf.endswith(end) for end in VERBAL_ENDINGS)
    is_mislabeled_pos = stanza_upos in ("ADP", "X", "INTJ", "SYM")

    if not (is_verb_agreement or is_high_conf_verbal_ending or is_mislabeled_pos):
        return None

    candidates = gi_cache.get(norm_surf)
    if not candidates:   # None (surface not in cache) or [] (cached NO_PARSE)
        return None

    primary = candidates[0]
    extra   = candidates[1:]   # empty when only one distinct lemma

    return primary["lemma"], primary["morph"], extra


if __name__ == "__main__":
    import argparse
    from .config import GI_DIR

    parser = argparse.ArgumentParser(
        description="Test Greek words using James Tauber's greek-inflexion parser."
    )
    parser.add_argument("words", nargs="*", help="Greek word(s) to test (e.g. ἐποίησεν ἀγαπᾷ)")
    parser.add_argument(
        "--gi-dir",
        type=Path,
        default=GI_DIR,
        help=f"Path to greek-inflexion repo (default: {GI_DIR})",
    )
    args = parser.parse_args()

    gi = load_gi(args.gi_dir)
    if not gi:
        print(f"Error: Could not load greek-inflexion from {args.gi_dir}.", file=sys.stderr)
        sys.exit(1)

    words = args.words or ["ἐποίησεν", "ἀγαπᾷ", "ἤγαγεν", "ἐγένετο", "συνάγει"]

    print(f"\nTesting {len(words)} word(s) with greek-inflexion:")
    print("=" * 70)

    for word in words:
        norm_w = _norm(word)
        try:
            raw_parses = gi.parse(norm_w)
        except Exception as e:
            print(f"\nSurface: '{word}' -> Parse error: {e}")
            continue

        print(f"\nSurface: '{word}' (normalized: '{norm_w}')")
        if raw_parses:
            print("  Parsematches:")
            for lem, morph in sorted(raw_parses):
                clean_lem = _fix_internal_breathings(_norm(_strip_compound_markers(lem)))
                app_morph = _translate_morph(morph)
                print(f"    ✓ Lemma: {clean_lem:<16} Morph: {app_morph:<12} (raw: {lem}, {morph})")
        else:
            print("  ✗ No parse found in greek-inflexion lexicon.")
            if hasattr(gi, "possible_stems"):
                stems = list(gi.possible_stems(norm_w))[:5]
                if stems:
                    print("  Stem rule hypotheses:")
                    for morph, stem in stems:
                        print(f"    ? Stem: {stem:<20} Morph: {morph}")
    print("\n" + "=" * 70)


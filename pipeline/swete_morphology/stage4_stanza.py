"""Stage 4: Neural Context Tagging using Stanza (grc_proiel).

Processes Swete tokens with pre-tokenized verse sentences.
Maps predictions to classical morphology codes and app POS enums.

Reads:
  - pipeline/build/swete_tokens.json

Emits:
  - pipeline/build/swete_stanza.json: Token-level neural POS, morphology, and lemma predictions.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections import defaultdict
from pathlib import Path

from .config import (
    BUILD_DIR,
    TOKENS_FILE,
)
from .lexical_rules import (
    COMMON_LEMMA_OVERRIDES,
    DEPONENT_FIXES,
    UPOS_TO_APP_POS,
    build_morph_code,
    parse_feats,
)

STANZA_OUT_FILE = BUILD_DIR / "swete_stanza.json"


def run_stanza(target_book: str | None = None, batch_size: int = 100):
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    import stanza

    print("Initializing Stanza Ancient Greek (PROIEL) pipeline...")
    nlp = stanza.Pipeline(
        "grc",
        package="proiel",
        processors="tokenize,pos,lemma",
        tokenize_pretokenized=True,
        download_method=None,
        verbose=False,
    )

    print(f"Loading tokens from {TOKENS_FILE}...")
    with open(TOKENS_FILE, "r", encoding="utf-8") as f:
        all_tokens = json.load(f)

    if target_book:
        tokens_to_process = [t for t in all_tokens if t["book"].lower() == target_book.lower()]
        print(f"Filtering to book '{target_book}': {len(tokens_to_process):,} tokens.")
    else:
        tokens_to_process = all_tokens
        print(f"Processing full corpus: {len(tokens_to_process):,} tokens.")

    # Group tokens by verse ref
    verses = defaultdict(list)
    for t in tokens_to_process:
        verses[t["ref"]].append(t)

    ref_list = list(verses.keys())
    print(f"Total verses to process: {len(ref_list):,}")

    t0 = time.time()
    results = {}
    processed_tokens = 0

    for i in range(0, len(ref_list), batch_size):
        batch_refs = ref_list[i : i + batch_size]
        batch_sentences = [[t["surface"] for t in verses[ref]] for ref in batch_refs]

        doc = nlp(batch_sentences)

        for ref, sent in zip(batch_refs, doc.sentences):
            token_list = verses[ref]
            for token_obj, word in zip(token_list, sent.words):
                t_id = token_obj["id"]
                raw_lemma = word.lemma or token_obj["surface"].lower()
                norm_lemma = COMMON_LEMMA_OVERRIDES.get(raw_lemma, raw_lemma)
                norm_lemma = DEPONENT_FIXES.get(norm_lemma, norm_lemma)

                upos = word.upos or "X"
                feats_dict = parse_feats(word.feats)
                morph_code = build_morph_code(upos, feats_dict)
                app_pos = UPOS_TO_APP_POS.get(upos, 15)

                results[t_id] = {
                    "id": t_id,
                    "lemma": norm_lemma,
                    "upos": upos,
                    "pos": app_pos,
                    "morph": morph_code,
                    "feats": feats_dict,
                }
                processed_tokens += 1

        elapsed = time.time() - t0
        rate = processed_tokens / elapsed if elapsed > 0 else 0
        if (i + batch_size) % 1000 == 0 or (i + batch_size) >= len(ref_list):
            print(f"Processed {processed_tokens:,} / {len(tokens_to_process):,} tokens ({rate:.1f} tokens/s)...")

    # If partial run, merge with existing results if present
    if target_book and STANZA_OUT_FILE.exists():
        print(f"Merging with existing {STANZA_OUT_FILE}...")
        with open(STANZA_OUT_FILE, "r", encoding="utf-8") as f:
            existing = json.load(f)
        # Convert keys to string for JSON consistency
        for k, v in results.items():
            existing[str(k)] = v
        final_output = existing
    else:
        final_output = {str(k): v for k, v in results.items()}

    print(f"Writing {len(final_output):,} predictions to {STANZA_OUT_FILE}...")
    with open(STANZA_OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(final_output, f, ensure_ascii=False)

    print(f"Stage 4 completed in {time.time() - t0:.2f}s!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Stanza on Swete corpus")
    parser.add_argument("--book", type=str, help="Process a single book (e.g. Ruth, Jonah)")
    parser.add_argument("--batch-size", type=int, default=100, help="Batch size in verses")
    args = parser.parse_args()

    run_stanza(target_book=args.book, batch_size=args.batch_size)

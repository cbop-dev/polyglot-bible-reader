#!/usr/bin/env python3
"""Swete Septuagint Morphology Pipeline Runner.

Automates and coordinates the execution of build stages for the Swete LXX morphology
and vocabulary datasets.

Available stages:
  - Stage 1: Ingest, normalize, and tokenize Swete 1930 CSVs.
  - Stage 2: Build biblical proper name gazetteer and capitalization heuristics.
  - Stage 4: Neural POS tagging & lemmatization via Stanza (grc_proiel).
  - Stage 5: Constraint solver & morphological resolution engine.
  - Stage 8: Canonical lemma consolidation & emit production datasets for the web app.

Usage examples:
  python pipeline/run_pipeline.py --all
  python pipeline/run_pipeline.py --all --skip-stanza
  python pipeline/run_pipeline.py --stages 5 8
  python pipeline/run_pipeline.py --emit-only
  python pipeline/run_pipeline.py --resolve
  python pipeline/run_pipeline.py --status
"""

from __future__ import annotations

import argparse
import datetime
import os
import sys
import time
from pathlib import Path

# Ensure repository root is on sys.path
PIPELINE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = PIPELINE_DIR.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from pipeline.swete_morphology.config import (
    BUILD_DIR,
    GAZETTEER_FILE,
    RESOLVED_TOKENS_FILE,
    TOKENS_FILE,
    TYPES_FILE,
    VERSES_FILE,
    APP_LXX_DATA_DIR,
    APP_LXX_LIB_DIR,
)

STAGE_INFO = {
    1: {
        "name": "Stage 1: Text Ingestion & Normalization",
        "module": "pipeline.swete_morphology.stage1_ingest",
        "func": "ingest",
        "description": "Ingest raw Swete CSVs, normalize polytonic Unicode, and build token stream.",
        "outputs": [TOKENS_FILE, VERSES_FILE, TYPES_FILE],
    },
    2: {
        "name": "Stage 2: Proper Name Gazetteer",
        "module": "pipeline.swete_morphology.stage2_gazetteer",
        "func": "build_gazetteer",
        "description": "Generate proper-noun gazetteer, Semitic name patterns, and capitalization rules.",
        "outputs": [GAZETTEER_FILE],
    },
    4: {
        "name": "Stage 4: Neural Stanza Tagging",
        "module": "pipeline.swete_morphology.stage4_stanza",
        "func": "run_stanza",
        "description": "Run neural POS tagging and lemmatization using Stanza (grc_proiel).",
        "outputs": [BUILD_DIR / "swete_stanza.json"],
    },
    5: {
        "name": "Stage 5: Constraint Resolution Solver",
        "module": "pipeline.swete_morphology.stage5_resolve",
        "func": "resolve",
        "description": "Merge gazetteer heuristics, closed-class overrides, and neural predictions with deponent normalizations.",
        "outputs": [RESOLVED_TOKENS_FILE],
    },
    8: {
        "name": "Stage 8: Canonical Consolidation & Dataset Emission",
        "module": "pipeline.swete_morphology.stage8_emit",
        "func": "emit",
        "description": "Consolidate duplicate lemmas, resolve English glosses, and emit production static JSON & client JS datasets.",
        "outputs": [
            APP_LXX_DATA_DIR / "lexemes.json",
            APP_LXX_DATA_DIR / "concordance.json",
            APP_LXX_DATA_DIR / "sections.json",
            APP_LXX_DATA_DIR / "books.json",
            APP_LXX_DATA_DIR / "verses.json",
            APP_LXX_LIB_DIR / "lxxLexes6.json",
            APP_LXX_LIB_DIR / "lxxDataset.js",
            APP_LXX_LIB_DIR / "tfLXX.js",
        ],
    },
}

ALL_STAGE_ORDER = [1, 2, 4, 5, 8]


def format_size(num_bytes: int) -> str:
    """Format bytes into a human-readable size string."""
    for unit in ["B", "KB", "MB", "GB"]:
        if num_bytes < 1024.0:
            return f"{num_bytes:3.1f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} TB"


def show_status():
    """Print the build status of all pipeline artifact outputs."""
    print("=" * 80)
    print("Swete Morphology Pipeline - Artifact Status")
    print("=" * 80)

    for stage_num in ALL_STAGE_ORDER:
        info = STAGE_INFO[stage_num]
        print(f"\n[{stage_num}] {info['name']}")
        print(f"    {info['description']}")
        print("    Artifacts:")

        for path in info["outputs"]:
            try:
                rel_path = path.relative_to(REPO_ROOT)
            except ValueError:
                rel_path = path

            if path.exists():
                stat = path.stat()
                mtime = datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                size_str = format_size(stat.st_size)
                print(f"      ✓ {rel_path} ({size_str}, modified {mtime})")
            else:
                print(f"      ✗ {rel_path} [MISSING]")

    print("\n" + "=" * 80)


def run_stage(stage_num: int, target_book: str | None = None, batch_size: int = 100) -> bool:
    """Execute a single pipeline stage by dynamically importing its module."""
    if stage_num not in STAGE_INFO:
        print(f"Error: Unknown stage {stage_num}")
        return False

    info = STAGE_INFO[stage_num]
    print("\n" + "=" * 80)
    print(f"Running: {info['name']}")
    print(f"Description: {info['description']}")
    print("=" * 80)

    t0 = time.time()
    try:
        import importlib
        module = importlib.import_module(info["module"])
        func = getattr(module, info["func"])

        if stage_num == 4:
            func(target_book=target_book, batch_size=batch_size)
        else:
            func()

        elapsed = time.time() - t0
        print(f"\n>>> {info['name']} finished successfully in {elapsed:.2f}s.")
        return True
    except ModuleNotFoundError as e:
        elapsed = time.time() - t0
        print(f"\n!!! Dependency missing in {info['name']} after {elapsed:.2f}s: {e}", file=sys.stderr)
        if "stanza" in str(e):
            print("\n" + "*" * 70, file=sys.stderr)
            print("Stage 4 requires the 'stanza' and 'torch' packages for neural NLP tagging.", file=sys.stderr)
            print("To install them in your active virtual environment, run:", file=sys.stderr)
            print("    pip install stanza torch", file=sys.stderr)
            print("\nNote: If 'pipeline/build/swete_stanza.json' already exists, you can skip Stage 4 by running:", file=sys.stderr)
            print("    python pipeline/run_pipeline.py --all --skip-stanza", file=sys.stderr)
            print("    # or for fast resolution and web dataset emission:", file=sys.stderr)
            print("    python pipeline/run_pipeline.py --resolve", file=sys.stderr)
            print("*" * 70 + "\n", file=sys.stderr)
        return False
    except Exception as e:
        elapsed = time.time() - t0
        print(f"\n!!! Error in {info['name']} after {elapsed:.2f}s: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False


def parse_stage_list(raw_stages: list[str]) -> list[int]:
    """Parse a list of string stage numbers / comma-separated lists into sorted valid stage numbers."""
    stages = set()
    for item in raw_stages:
        for sub in str(item).split(","):
            sub = sub.strip()
            if not sub:
                continue
            try:
                num = int(sub)
                if num in STAGE_INFO:
                    stages.add(num)
                else:
                    print(f"Warning: Ignoring invalid stage number '{num}'. Valid stages: {ALL_STAGE_ORDER}", file=sys.stderr)
            except ValueError:
                print(f"Warning: Ignoring non-integer stage '{sub}'.", file=sys.stderr)

    return sorted(stages)


def main():
    parser = argparse.ArgumentParser(
        description="Build runner for the Swete LXX morphology and vocabulary pipeline.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  # Check status of generated artifacts:
  python pipeline/run_pipeline.py --status

  # Run only stage 8 (emit client JS and static JSON):
  python pipeline/run_pipeline.py --emit
  # (or)
  python pipeline/run_pipeline.py -s 8

  # Run stages 5 and 8 (resolve constraints and emit, skipping neural Stanza):
  python pipeline/run_pipeline.py --resolve
  # (or)
  python pipeline/run_pipeline.py -s 5 8

  # Run entire pipeline end-to-end:
  python pipeline/run_pipeline.py --all

  # Run entire pipeline except Stanza neural step:
  python pipeline/run_pipeline.py --all --skip-stanza

  # Run custom selection of stages:
  python pipeline/run_pipeline.py -s 1 2 5
""",
    )

    # Preset / Mode options
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "-a", "--all", "-all",
        action="store_true",
        help="Run all pipeline stages (1, 2, 4, 5, 8).",
    )
    group.add_argument(
        "-s", "--stages",
        nargs="+",
        help="Specific stage numbers to run in order (e.g. -s 1 2 5 8 or -s 5,8).",
    )
    group.add_argument(
        "--emit", "--emit-only", "--fast",
        action="store_true",
        dest="emit_only",
        help="Run Stage 8 only (Fast lemma consolidation and dataset emission).",
    )
    group.add_argument(
        "--resolve", "--resolve-and-emit",
        action="store_true",
        dest="resolve_and_emit",
        help="Run Stages 5 and 8 (Constraint solver resolution and emission).",
    )
    group.add_argument(
        "--ingest",
        action="store_true",
        dest="stage1_only",
        help="Run Stage 1 only (Ingestion and tokenization).",
    )
    group.add_argument(
        "--gazetteer",
        action="store_true",
        dest="stage2_only",
        help="Run Stage 2 only (Gazetteer construction).",
    )
    group.add_argument(
        "--stanza",
        action="store_true",
        dest="stage4_only",
        help="Run Stage 4 only (Neural Stanza tagging).",
    )
    group.add_argument(
        "--status",
        action="store_true",
        help="Check and display the timestamp and status of all pipeline artifact files without running anything.",
    )

    # Modifiers
    parser.add_argument(
        "--skip-stanza",
        action="store_true",
        help="When running --all, skip Stage 4 (Neural Stanza tagging).",
    )
    parser.add_argument(
        "--book",
        type=str,
        default=None,
        help="Target single book for Stage 4 neural tagging (e.g. --book Ruth).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Batch size in verses for Stage 4 neural tagging (default: 100).",
    )

    args = parser.parse_args()

    if args.status:
        show_status()
        return 0

    stages_to_run: list[int] = []

    if args.all:
        stages_to_run = list(ALL_STAGE_ORDER)
        if args.skip_stanza and 4 in stages_to_run:
            stages_to_run.remove(4)
    elif args.stages:
        stages_to_run = parse_stage_list(args.stages)
    elif args.emit_only:
        stages_to_run = [8]
    elif args.resolve_and_emit:
        stages_to_run = [5, 8]
    elif args.stage1_only:
        stages_to_run = [1]
    elif args.stage2_only:
        stages_to_run = [2]
    elif args.stage4_only:
        stages_to_run = [4]
    else:
        # Default if no arguments provided: show help and status
        print("No stage selected. Displaying current artifact status.\n")
        show_status()
        print("\nUse --help to view available build options, e.g.:")
        print("  python pipeline/run_pipeline.py --all")
        print("  python pipeline/run_pipeline.py --resolve")
        print("  python pipeline/run_pipeline.py --emit")
        return 0

    if not stages_to_run:
        print("Error: No valid stages to execute.", file=sys.stderr)
        return 1

    print("=" * 80)
    print("Swete Morphology Pipeline Execution Plan")
    print(f"Stages to execute: {stages_to_run}")
    print("=" * 80)

    total_start = time.time()
    for stage_num in stages_to_run:
        success = run_stage(
            stage_num=stage_num,
            target_book=args.book,
            batch_size=args.batch_size,
        )
        if not success:
            print(f"\nPipeline halted due to error in Stage {stage_num}.", file=sys.stderr)
            return 1

    total_elapsed = time.time() - total_start
    print("\n" + "=" * 80)
    print(f"Pipeline finished successfully in {total_elapsed:.2f}s!")
    print("=" * 80)
    return 0


if __name__ == "__main__":
    sys.exit(main())

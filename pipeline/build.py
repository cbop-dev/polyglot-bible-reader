"""Polyglot Bible Reader - Pipeline Build Orchestrator.

Top-level CLI for executing the entire data pipeline:
  1. Fetch upstream sources (STEPBible TVTMS, VulgClementine, OpenGNT, BDB, TFLSJ)
  2. Ingest and align texts via TVTMS into pre-aligned SQLite (polyglot-working.sqlite3)
  3. Validate database integrity, cross-tradition alignments, and zero data loss
"""

from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path

from .config import BUILD_DIR, CACHE_DIR
from .fetcher import fetch_all_sources
from .db_builder import DatabaseBuilder
from .validate import DatabaseValidator
from .chunker import DatabaseChunker


def main():
    parser = argparse.ArgumentParser(description="Polyglot Bible Reader Build Pipeline")
    parser.add_argument("--all", action="store_true", help="Run full pipeline: fetch, build, validate, and chunk")
    parser.add_argument("--fetch", action="store_true", help="Download upstream sources into cache")
    parser.add_argument("--build", action="store_true", help="Build pre-aligned SQLite database")
    parser.add_argument("--validate", action="store_true", help="Run validation and integrity test suite")
    parser.add_argument("--chunk", action="store_true", help="Chunk database into static/db for sql.js-httpvfs")
    parser.add_argument("--rebuild-lxx-morphology", action="store_true", help="Re-run 8-stage Swete LXX morphology resolution pipeline from raw CSVs")
    parser.add_argument("--force", action="store_true", help="Force re-fetching or rebuilding")
    args = parser.parse_args()

    # Default to --all if no specific stage requested
    if not (args.all or args.fetch or args.build or args.validate or args.chunk or args.rebuild_lxx_morphology):
        args.all = True

    t0 = time.time()
    print("==================================================")
    print("Polyglot Bible Reader Pipeline")
    print(f"Build directory: {BUILD_DIR}")
    print(f"Cache directory: {CACHE_DIR}")
    print("==================================================")

    # Optional Stage: Rebuild Swete Morphology from raw sources
    if args.rebuild_lxx_morphology:
        print("\n>>> OPTIONAL STAGE: Rebuilding Swete LXX Morphology Engine <<<")
        import subprocess
        cmd = [sys.executable, "-m", "pipeline.swete_morphology.run_pipeline", "--all"]
        subprocess.check_call(cmd)

    # Stage 1: Fetch
    if args.all or args.fetch:
        print("\n>>> STAGE 1: Fetching Upstream Sources <<<")
        try:
            fetch_all_sources(force=args.force)
        except Exception as e:
            print(f"Notice: Fetch encountered an issue ({e}). Continuing with cached sources if available.")

    # Stage 2: Build Database
    if args.all or args.build:
        print("\n>>> STAGE 2: Building Pre-Aligned SQLite Database <<<")
        builder = DatabaseBuilder()
        builder.build_all()

    # Stage 3: Validate
    if args.all or args.validate:
        print("\n>>> STAGE 3: Validating Database & Alignment Integrity <<<")
        validator = DatabaseValidator()
        ok = validator.run_all()
        if not ok:
            print("Validation FAILED!")
            sys.exit(1)

    # Stage 4: Chunk for static web deployment
    if args.all or args.chunk:
        print("\n>>> STAGE 4: Chunking Database for Static Web VFS <<<")
        chunker = DatabaseChunker()
        chunker.chunk()

    # Stage 5: Generate TypeScript Book Definitions
    if args.all or args.build:
        print("\n>>> STAGE 5: Generating TypeScript Canonical Book Definitions <<<")
        from .generate_canonical_books import generate_typescript
        generate_typescript()

    elapsed = time.time() - t0
    print(f"==================================================")
    print(f"Pipeline executed successfully in {elapsed:.1f}s!")
    print(f"==================================================")


if __name__ == "__main__":
    main()

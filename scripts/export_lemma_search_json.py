#!/usr/bin/env python3
"""Export compact lemma search index JSON files for WLC, OpenGNT, and Swete LXX.

Produces:
  static/data/lemmas/wlc.json
  static/data/lemmas/ognt.json
  static/data/lemmas/swete_lxx.json
Format:
  [[strongs, lemma, total_count], ...]
Sorted by total_count descending.
"""

from __future__ import annotations
import json
import sqlite3
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT_DIR = ROOT / "static" / "data" / "lemmas"
CORPORA = ["wlc", "ognt", "swete_lxx"]


def export_lemma_indexes(conn: sqlite3.Connection, output_dir: Optional[Path] = None) -> None:
    out_dir = output_dir or DEFAULT_OUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    cur = conn.cursor()

    print("\n=== Exporting Compact Lemma Search Indexes ===")
    for corpus_id in CORPORA:
        cur.execute(
            """
            SELECT strongs, lemma, total_count
            FROM lemma_stats
            WHERE corpus_id = ?
            ORDER BY total_count DESC
            """,
            (corpus_id,),
        )
        rows = cur.fetchall()
        data = [[r[0], r[1], r[2]] for r in rows]

        out_file = out_dir / f"{corpus_id}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

        size_kb = out_file.stat().st_size / 1024
        print(f"  -> Wrote {len(data):,} lemmas to {out_file} ({size_kb:.1f} KB)")


def main():
    db_candidates = [
        ROOT / "pipeline" / "build" / "polyglot-working.sqlite3",
        ROOT / "polyglot-working.sqlite3",
        ROOT / "build" / "polyglot-working.sqlite3",
    ]
    db_path = next((p for p in db_candidates if p.exists()), None)
    if not db_path:
        print("Notice: No SQLite database found to export lemma indexes from. Skipping.")
        return

    conn = sqlite3.connect(db_path)
    try:
        export_lemma_indexes(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()

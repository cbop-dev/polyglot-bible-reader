"""Polyglot Bible Reader - Pipeline Upstream Source Fetcher.

Downloads upstream primary source files into pipeline/cache/ with streaming,
progress indication, and caching to ensure offline capability and reproducibility.
"""

from __future__ import annotations
import os
import sys
import time
import urllib.request
import zipfile
from pathlib import Path
from .config import CACHE_DIR, UPSTREAM_SOURCES


def fetch_file(url: str, dest_path: Path, force: bool = False) -> Path:
    """Downloads a remote URL to dest_path if not already present or if force=True."""
    if dest_path.exists() and not force:
        size_mb = dest_path.stat().st_size / (1024 * 1024)
        print(f"  [cached] {dest_path.name} ({size_mb:.2f} MB)")
        return dest_path

    print(f"  [downloading] {url}")
    print(f"             -> {dest_path}")

    # Use a custom user agent to avoid 403 blocks from raw GitHub / archive servers
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; PolyglotBibleReader/1.0; +https://github.com/cbop-dev)"}
    )

    tmp_dest = dest_path.with_suffix(dest_path.suffix + ".tmp")
    start_time = time.time()
    try:
        with urllib.request.urlopen(req) as resp, open(tmp_dest, "wb") as out_file:
            total_size = int(resp.headers.get("content-length", 0))
            downloaded = 0
            block_size = 64 * 1024

            while True:
                chunk = resp.read(block_size)
                if not chunk:
                    break
                out_file.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    pct = (downloaded / total_size) * 100
                    sys.stdout.write(f"\r     Progress: {downloaded / (1024*1024):.2f}/{total_size / (1024*1024):.2f} MB ({pct:.1f}%)")
                    sys.stdout.flush()
                else:
                    sys.stdout.write(f"\r     Downloaded: {downloaded / (1024*1024):.2f} MB")
                    sys.stdout.flush()

        print()  # newline
        tmp_dest.replace(dest_path)
        elapsed = time.time() - start_time
        print(f"  [done] Saved {dest_path.name} in {elapsed:.1f}s")
        return dest_path
    except Exception as e:
        if tmp_dest.exists():
            tmp_dest.unlink()
        raise RuntimeError(f"Failed to download {url}: {e}") from e


def fetch_source(source_key: str, force: bool = False) -> Path:
    """Fetches a specific registered upstream source by key."""
    if source_key not in UPSTREAM_SOURCES:
        raise KeyError(f"Unknown upstream source key: '{source_key}'. Available: {list(UPSTREAM_SOURCES.keys())}")

    spec = UPSTREAM_SOURCES[source_key]
    dest = CACHE_DIR / spec["filename"]
    res = fetch_file(spec["url"], dest, force=force)

    # Automatic post-fetch unpacking for sources
    if source_key == "swete_source":
        swete_target = CACHE_DIR / "sources" / "LXX-Swete-1930"
        if not swete_target.exists() or force:
            print(f"  [unpacking] {dest.name} -> {swete_target}")
            swete_target.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(dest, "r") as zf:
                # The zip archive has root folder LXX-Swete-1930-master/
                for member in zf.infolist():
                    parts = member.filename.split("/", 1)
                    if len(parts) > 1 and parts[1]:
                        target_file = swete_target / parts[1]
                        if member.is_dir():
                            target_file.mkdir(parents=True, exist_ok=True)
                        else:
                            target_file.parent.mkdir(parents=True, exist_ok=True)
                            with zf.open(member) as src, open(target_file, "wb") as dst:
                                dst.write(src.read())

    elif source_key == "webbe":
        webbe_target = CACHE_DIR / "sources" / "webbe_usfm"
        if not webbe_target.exists() or force:
            print(f"  [unpacking] {dest.name} -> {webbe_target}")
            webbe_target.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(dest, "r") as zf:
                for member in zf.infolist():
                    # Extract only .usfm files directly into webbe_target
                    filename = Path(member.filename).name
                    if filename.endswith(".usfm"):
                        target_file = webbe_target / filename
                        with zf.open(member) as src, open(target_file, "wb") as dst:
                            dst.write(src.read())

    elif source_key == "brenton":
        brenton_target = CACHE_DIR / "sources" / "brenton_usfm"
        if not brenton_target.exists() or force:
            print(f"  [unpacking] {dest.name} -> {brenton_target}")
            brenton_target.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(dest, "r") as zf:
                for member in zf.infolist():
                    # Extract only .usfm files directly into brenton_target
                    filename = Path(member.filename).name
                    if filename.endswith(".usfm"):
                        target_file = brenton_target / filename
                        with zf.open(member) as src, open(target_file, "wb") as dst:
                            dst.write(src.read())

    return res


def fetch_all_sources(force: bool = False) -> dict[str, Path]:
    """Downloads all registered upstream sources into pipeline/cache/."""
    print(f"=== Fetching Upstream Sources into {CACHE_DIR} ===")
    results = {}
    for key in UPSTREAM_SOURCES:
        results[key] = fetch_source(key, force=force)
    print("=== All Upstream Sources Ready ===\n")
    return results


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Fetch upstream biblical sources")
    parser.add_argument("--key", help="Specific source key to fetch (e.g. 'tvtms', 'vulgate')")
    parser.add_argument("--all", action="store_true", help="Fetch all upstream sources")
    parser.add_argument("--force", action="store_true", help="Force re-download even if cached")
    args = parser.parse_args()

    if args.key:
        fetch_source(args.key, force=args.force)
    elif args.all:
        fetch_all_sources(force=args.force)
    else:
        parser.print_help()

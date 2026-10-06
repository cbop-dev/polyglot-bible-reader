#!/usr/bin/env python3
"""
scripts/build_ezra_nehemiah_mappings.py

Populates clean, bidirectional versification mappings between:
  - LXX 2 Esdras (canonical_work_id 82) ch 1-10 <-> BHS Ezra (canonical_work_id 15) ch 1-10
  - LXX 2 Esdras (canonical_work_id 82) ch 11-23 <-> BHS Nehemiah (canonical_work_id 16) ch 1-13
"""

import sqlite3
import os
import sys

DB_PATH = "/home/cbrannan/dev/2-tmp/biblical-data-pipeline/db-workspace/openscriptorium-working.sqlite3"

def main():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Get scheme IDs
    lxx_scheme_id = cur.execute("SELECT id FROM versification_schemes WHERE code = 'LXX'").fetchone()[0]
    mt_scheme_id = cur.execute("SELECT id FROM versification_schemes WHERE code = 'MT'").fetchone()[0]

    # Map hierarchy -> canonical_ref_id
    def get_crefs(cw_id):
        rows = cur.execute("SELECT hierarchy, id FROM canonical_refs WHERE canonical_work_id = ?", (cw_id,)).fetchall()
        return {r[0]: r[1] for r in rows}

    ezra_crefs = get_crefs(15)
    neh_crefs = get_crefs(16)
    esdr_crefs = get_crefs(82)

    # 1. Delete all existing mappings involving 2-esdras (cw 82)
    esdr_ref_ids_str = ",".join(str(cid) for cid in esdr_crefs.values())
    deleted = cur.execute(f"""
        DELETE FROM versification_mappings 
        WHERE from_canonical_ref_id IN ({esdr_ref_ids_str})
           OR to_canonical_ref_id IN ({esdr_ref_ids_str})
    """).rowcount
    print(f"Deleted {deleted} stale mappings for 2-Esdras (cw 82).")

    # 2. Build mapping pairs: (from_cid, to_cid, notes)
    pairs = []

    # A. Ezra 1-10 <-> 2Esdr 1-10 (280 verses 1:1)
    for ch in range(1, 11):
        for v in range(1, 100):
            h = f"{ch},{v}"
            if h in ezra_crefs and h in esdr_crefs:
                pairs.append((esdr_crefs[h], ezra_crefs[h], f"LXX 2Esdr {h} <-> Ezra {h}"))

    # B. Nehemiah 1-13 <-> 2Esdr 11-23
    for neh_ch in range(1, 14):
        esdr_ch = neh_ch + 10
        if neh_ch in (1, 2, 5, 6, 7, 8, 11, 12, 13):
            for v in range(1, 100):
                esdr_h = f"{esdr_ch},{v}"
                neh_h = f"{neh_ch},{v}"
                if esdr_h in esdr_crefs and neh_h in neh_crefs:
                    pairs.append((esdr_crefs[esdr_h], neh_crefs[neh_h], f"LXX 2Esdr {esdr_h} <-> Neh {neh_h}"))
        elif neh_ch == 3:
            for v in range(1, 33):
                esdr_h = f"13,{v}"
                neh_h = f"3,{v}"
                if esdr_h in esdr_crefs and neh_h in neh_crefs:
                    pairs.append((esdr_crefs[esdr_h], neh_crefs[neh_h], f"LXX 2Esdr {esdr_h} <-> Neh {neh_h}"))
        elif neh_ch == 4:
            # Neh 4:1-5 <-> 2Esdr 13:33-37
            for v in range(1, 6):
                esdr_h = f"13,{v+32}"
                neh_h = f"4,{v}"
                if esdr_h in esdr_crefs and neh_h in neh_crefs:
                    pairs.append((esdr_crefs[esdr_h], neh_crefs[neh_h], f"LXX 2Esdr {esdr_h} <-> Neh {neh_h}"))
            # Neh 4:6 mapped to 2Esdr 14:1
            pairs.append((esdr_crefs["14,1"], neh_crefs["4,6"], "LXX 2Esdr 14:1 <-> Neh 4:6"))
            # Neh 4:7-23 <-> 2Esdr 14:1-17
            for v in range(1, 18):
                esdr_h = f"14,{v}"
                neh_h = f"4,{v+6}"
                if esdr_h in esdr_crefs and neh_h in neh_crefs:
                    pairs.append((esdr_crefs[esdr_h], neh_crefs[neh_h], f"LXX 2Esdr {esdr_h} <-> Neh {neh_h}"))
        elif neh_ch == 9:
            # Neh 9:1-37 <-> 2Esdr 19:1-37
            for v in range(1, 38):
                esdr_h = f"19,{v}"
                neh_h = f"9,{v}"
                if esdr_h in esdr_crefs and neh_h in neh_crefs:
                    pairs.append((esdr_crefs[esdr_h], neh_crefs[neh_h], f"LXX 2Esdr {esdr_h} <-> Neh {neh_h}"))
            # Neh 9:38 <-> 2Esdr 20:1
            if "20,1" in esdr_crefs and "9,38" in neh_crefs:
                pairs.append((esdr_crefs["20,1"], neh_crefs["9,38"], "LXX 2Esdr 20:1 <-> Neh 9:38"))
        elif neh_ch == 10:
            # Neh 10:1-39 <-> 2Esdr 20:2-40
            for v in range(1, 40):
                esdr_h = f"20,{v+1}"
                neh_h = f"10,{v}"
                if esdr_h in esdr_crefs and neh_h in neh_crefs:
                    pairs.append((esdr_crefs[esdr_h], neh_crefs[neh_h], f"LXX 2Esdr {esdr_h} <-> Neh {neh_h}"))

    # 3. Insert mappings into versification_mappings
    cur.executemany("""
        INSERT INTO versification_mappings 
        (from_scheme_id, from_canonical_ref_id, to_scheme_id, to_canonical_ref_id, mapping_type, notes)
        VALUES (?, ?, ?, ?, 'exact', ?)
    """, [(lxx_scheme_id, f_cid, mt_scheme_id, t_cid, notes) for f_cid, t_cid, notes in pairs])

    conn.commit()
    print(f"Successfully inserted {len(pairs)} versification mappings for Ezra / Nehemiah <-> 2-Esdras.")

    print("Running VACUUM and ANALYZE...")
    cur.execute("VACUUM")
    cur.execute("ANALYZE")
    conn.close()
    print("Database optimized successfully.")

if __name__ == "__main__":
    main()

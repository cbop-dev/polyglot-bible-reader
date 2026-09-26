import os
import shutil
import subprocess
import json
import hashlib

DB_PATH = '/home/cbrannan/dev/2-tmp/biblical-data-pipeline/db-workspace/openscriptorium-working.sqlite3'
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'db')
CHUNK_SIZE = 5242880

def rechunk():
    total_bytes = os.path.getsize(DB_PATH)
    print(f'Database size: {total_bytes:,} bytes ({total_bytes / (1024*1024):.2f} MB)')

    # Remove existing chunks
    for f in os.listdir(OUTPUT_DIR):
        if f.startswith('polyglot.db.'):
            os.remove(os.path.join(OUTPUT_DIR, f))

    # Split using split command
    prefix = os.path.join(OUTPUT_DIR, 'polyglot.db.')
    cmd = ['split', '-b', str(CHUNK_SIZE), '-d', '-a', '2', DB_PATH, prefix]
    print(f'Running: {" ".join(cmd)}')
    subprocess.check_call(cmd)

    chunks = sorted([f for f in os.listdir(OUTPUT_DIR) if f.startswith('polyglot.db.')])
    print(f'Created {len(chunks)} chunks ({chunks[0]} .. {chunks[-1]}).')

    # Update config.json
    config = {
        "serverMode": "chunked",
        "requestChunkSize": 4096,
        "urlPrefix": "polyglot.db.",
        "serverChunkSize": CHUNK_SIZE,
        "databaseLengthBytes": total_bytes,
        "suffixLength": 2
    }
    config_path = os.path.join(OUTPUT_DIR, 'config.json')
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)
    print(f'Updated config.json with length {total_bytes:,} bytes.')

    # Verify sha256 checksum of reassembled chunks
    orig_hasher = hashlib.sha256()
    with open(DB_PATH, 'rb') as f:
        while chunk := f.read(1024 * 1024):
            orig_hasher.update(chunk)
    orig_hash = orig_hasher.hexdigest()

    reasm_hasher = hashlib.sha256()
    reasm_size = 0
    for c in chunks:
        c_path = os.path.join(OUTPUT_DIR, c)
        reasm_size += os.path.getsize(c_path)
        with open(c_path, 'rb') as f:
            while chunk := f.read(1024 * 1024):
                reasm_hasher.update(chunk)
    reasm_hash = reasm_hasher.hexdigest()

    assert orig_hash == reasm_hash, f'Checksum mismatch! {orig_hash} != {reasm_hash}'
    assert total_bytes == reasm_size, f'Size mismatch! {total_bytes} != {reasm_size}'
    print(f'[PASS] Checksum verified: SHA256 {orig_hash}')
    print('Re-chunking complete!')

if __name__ == '__main__':
    rechunk()

import { base } from '$app/paths';

const HEBREW_BUCKET_MAP = {
	'א': 'aleph', 'ב': 'bet', 'ג': 'gimel', 'ד': 'dalet', 'ה': 'he', 'ו': 'vav',
	'ז': 'zayin', 'ח': 'het', 'ט': 'tet', 'י': 'yod', 'ך': 'kaf', 'כ': 'kaf',
	'ל': 'lamed', 'ם': 'mem', 'מ': 'mem', 'ן': 'nun', 'נ': 'nun', 'ס': 'samekh',
	'ע': 'ayin', 'ף': 'pe', 'פ': 'pe', 'ץ': 'tsadi', 'צ': 'tsadi', 'ק': 'qof',
	'ר': 'resh', 'ש': 'shin', 'ת': 'tav'
};

const HEBREW_DIAC_REGEX = /[\u0591-\u05C7]/g;

/**
 * Strips Hebrew niqqud and cantillation marks
 * @param {string} str
 * @returns {string}
 */
export function removeHebrewDiacritics(str) {
	if (!str) return '';
	return str.replace(HEBREW_DIAC_REGEX, '').trim();
}

/**
 * Determines the letter bucket ('aleph' through 'tav', or 'other') for a given Hebrew word
 * @param {string} text
 * @returns {string}
 */
export function getHebrewBucket(text) {
	if (!text) return 'other';
	const plain = removeHebrewDiacritics(text);
	if (!plain) return 'other';
	const ch = plain[0];
	return HEBREW_BUCKET_MAP[ch] || 'other';
}

/**
 * Client-side and SSR provider for sharded BDB dictionary entries
 */
export class BdbProvider {
	constructor() {
		/**
		 * Cache of shard promises: Map<bucketName, Promise<Record<string, any>>>
		 */
		this.shardCache = new Map();
	}

	/**
	 * Fetch or load a dictionary shard for a letter bucket
	 * @param {string} bucket
	 * @returns {Promise<Record<string, any>>}
	 */
	async loadShard(bucket) {
		if (!bucket) return {};
		if (this.shardCache.has(bucket)) {
			return this.shardCache.get(bucket);
		}

		const promise = (async () => {
			try {
				if (typeof window === 'undefined') {
					// Server / SSR / Vitest environment: read directly from filesystem
					try {
						const fs = await import('node:fs/promises');
						const path = await import('node:path');
						const filePath = path.resolve(process.cwd(), 'static', 'data', 'lexicons', 'bdb', `${bucket}.json`);
						const content = await fs.readFile(filePath, 'utf-8');
						return JSON.parse(content);
					} catch (fsErr) {
						const url = `/data/lexicons/bdb/${bucket}.json`;
						const res = await fetch(url);
						if (!res.ok) return {};
						return await res.json();
					}
				} else {
					// Browser environment
					const basePath = base || '';
					const url = `${basePath}/data/lexicons/bdb/${bucket}.json`;
					const res = await fetch(url);
					if (!res.ok) return {};
					return await res.json();
				}
			} catch (e) {
				console.error(`Failed to load BDB dictionary shard: ${bucket}`, e);
				return {};
			}
		})();

		this.shardCache.set(bucket, promise);
		return promise;
	}

	/**
	 * Retrieve the BDB entry for a given lemma
	 * @param {string} lemma - The Hebrew lemma
	 * @param {string} [plain] - Optional precomputed plain string
	 * @returns {Promise<{ found: boolean, entry?: { headword: string, strongs: string, matchType: string, def: string } }>}
	 */
	async getEntry(lemma, plain = '') {
		if (!lemma && !plain) {
			return { found: false };
		}

		const plainKey = removeHebrewDiacritics(plain || lemma);
		const bucket = getHebrewBucket(plainKey);

		if (bucket === 'other' || !plainKey) {
			return { found: false };
		}

		const shard = await this.loadShard(bucket);
		const entry = shard[plainKey];

		if (entry) {
			return {
				found: true,
				entry
			};
		}

		return {
			found: false
		};
	}
}

// Global singleton instance
export const bdbProvider = new BdbProvider();

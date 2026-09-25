import { base } from '$app/paths';

const GREEK_BUCKET_MAP = {
	'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta',
	'ε': 'epsilon', 'ζ': 'zeta', 'η': 'eta', 'θ': 'theta',
	'ι': 'iota', 'κ': 'kappa', 'λ': 'lambda', 'μ': 'mu',
	'ν': 'nu', 'ξ': 'xi', 'ο': 'omicron', 'π': 'pi',
	'ρ': 'rho', 'σ': 'sigma', 'ς': 'sigma', 'τ': 'tau',
	'υ': 'upsilon', 'φ': 'phi', 'χ': 'chi', 'ψ': 'psi',
	'ω': 'omega'
};

const GREEK_DIAC_REGEX = /[\u0300-\u036f\u0313\u0314\u0342\u0345\u0308'⸂⸃⸆⸇⸀⸁⸄⸅⸈⸉⸊⸋\[\]⟦⟧⟨⟩\(\)†‡*0-9\s.,;·:!?\-—]+/gu;

/**
 * Normalizes polytonic Greek text: NFD, removes vowel length marks
 * @param {string} str
 * @returns {string}
 */
export function normalizeGreek(str) {
	if (!str || typeof str !== 'string') return '';
	return str.normalize('NFD').replaceAll(/[\u0304\u0305\u0306]+/g, '');
}

/**
 * Strips all accents, breathings, and diacritics, returning lowercase Greek with final sigma normalized
 * @param {string} str
 * @returns {string}
 */
export function removeDiacritics(str) {
	if (!str) return '';
	const norm = normalizeGreek(str);
	return norm.replace(GREEK_DIAC_REGEX, '').toLowerCase().replace(/ς/g, 'σ').trim();
}

/**
 * Checks if a word is capitalized (indicating a proper noun or transliterated name)
 * @param {string} str
 * @returns {boolean}
 */
export function isCapitalized(str) {
	if (!str) return false;
	const clean = normalizeGreek(str.trim()).replace(GREEK_DIAC_REGEX, '');
	if (!clean) return false;
	return clean[0].toLowerCase() !== clean[0];
}

/**
 * Determines the letter bucket ('alpha' through 'omega', or 'other') for a given Greek word
 * @param {string} text
 * @returns {string}
 */
export function getGreekBucket(text) {
	if (!text) return 'other';
	const plain = removeDiacritics(text);
	if (!plain) return 'other';
	const ch = plain[0];
	return GREEK_BUCKET_MAP[ch] || 'other';
}

/**
 * Client-side and SSR provider for sharded LSJ dictionary entries
 */
export class LsjProvider {
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
						const filePath = path.resolve(process.cwd(), 'static', 'data', 'lexicons', 'lsj', `${bucket}.json`);
						const content = await fs.readFile(filePath, 'utf-8');
						return JSON.parse(content);
					} catch (fsErr) {
						const url = `/data/lexicons/lsj/${bucket}.json`;
						const res = await fetch(url);
						if (!res.ok) return {};
						return await res.json();
					}
				} else {
					// Browser environment
					const basePath = base || '';
					const url = `${basePath}/data/lexicons/lsj/${bucket}.json`;
					const res = await fetch(url);
					if (!res.ok) return {};
					return await res.json();
				}
			} catch (e) {
				console.error(`Failed to load LSJ dictionary shard: ${bucket}`, e);
				return {};
			}
		})();

		this.shardCache.set(bucket, promise);
		return promise;
	}

	/**
	 * Retrieve the LSJ entry for a given lemma
	 * @param {string} lemma - The Greek lemma (e.g. "λόγος", "πορεύομαι")
	 * @param {string} [plain] - Optional precomputed plain string
	 * @returns {Promise<{ found: boolean, entry?: { headword: string, lsjIndex: string, matchType: string, def: string }, isProper?: boolean }>}
	 */
	async getEntry(lemma, plain = '') {
		if (!lemma && !plain) {
			return { found: false, isProper: false };
		}

		const isProper = isCapitalized(lemma);
		const plainKey = removeDiacritics(plain || lemma);
		const bucket = getGreekBucket(plainKey);

		if (bucket === 'other' || !plainKey) {
			return { found: false, isProper };
		}

		const shard = await this.loadShard(bucket);
		const entry = shard[plainKey];

		if (entry) {
			return {
				found: true,
				entry,
				isProper
			};
		}

		return {
			found: false,
			isProper
		};
	}
}

// Global singleton instance
export const lsjProvider = new LsjProvider();

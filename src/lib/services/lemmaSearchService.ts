import { query } from './dbClient';
import { toPlainGreek, toPlainHebrew } from '$lib/utils/transliteration';

export interface CorpusLemmaItem {
	strongs: string;
	lemma: string;
	plain: string;
	total_count: number;
}

export interface LemmaFilterResult {
	bestMatches: CorpusLemmaItem[];
	otherMatches: CorpusLemmaItem[];
	totalFound: number;
}

export type SupportedSearchCorpus = 'wlc' | 'ognt' | 'swete_lxx';

const SUPPORTED_CORPUS_LANG: Record<SupportedSearchCorpus, 'hebrew' | 'greek'> = {
	wlc: 'hebrew',
	ognt: 'greek',
	swete_lxx: 'greek'
};

/**
 * Normalizes any version string/slug to one of the 3 supported search corpora.
 */
export function resolveSearchCorpus(versionOrCorpus: string): SupportedSearchCorpus | null {
	if (!versionOrCorpus) return null;
	const v = versionOrCorpus.toLowerCase().replace(/[-_]/g, '');
	if (v === 'bhs' || v === 'wlc' || v === 'hebrew') return 'wlc';
	if (v === 'opengnt' || v === 'ognt' || v === 'sblgnt') return 'ognt';
	if (v === 'lxx' || v === 'swetelxx' || v === 'septuagint') return 'swete_lxx';
	return null;
}

export function getCorpusLanguage(corpusId: SupportedSearchCorpus): 'hebrew' | 'greek' {
	return SUPPORTED_CORPUS_LANG[corpusId] || 'greek';
}

// In-memory cache per corpus
const lemmaCache = new Map<SupportedSearchCorpus, CorpusLemmaItem[]>();
const loadingPromises = new Map<SupportedSearchCorpus, Promise<CorpusLemmaItem[]>>();

/**
 * Loads and memoizes all unique lemmas for a target original-language corpus.
 */
export async function getCorpusLemmas(corpusId: SupportedSearchCorpus): Promise<CorpusLemmaItem[]> {
	const cached = lemmaCache.get(corpusId);
	if (cached) return cached;

	const pending = loadingPromises.get(corpusId);
	if (pending) return pending;

	const promise = (async () => {
		try {
			const rows = await query<{ strongs: string; lemma: string; total_count: number }>(
				`SELECT strongs, lemma, total_count 
				 FROM lemma_stats 
				 WHERE corpus_id = ? 
				 ORDER BY total_count DESC`,
				[corpusId]
			);

			const isHebrew = corpusId === 'wlc';
			const items: CorpusLemmaItem[] = rows.map((r) => {
				const plain = isHebrew ? toPlainHebrew(r.lemma) : toPlainGreek(r.lemma);
				return {
					strongs: r.strongs,
					lemma: r.lemma,
					plain,
					total_count: r.total_count
				};
			});

			lemmaCache.set(corpusId, items);
			return items;
		} finally {
			loadingPromises.delete(corpusId);
		}
	})();

	loadingPromises.set(corpusId, promise);
	return promise;
}

/**
 * Synchronously filters an array of CorpusLemmaItems against a search query.
 * Splits results into:
 * - bestMatches: lemmas starting with the normalized query
 * - otherMatches: lemmas containing the normalized query (substring)
 */
export function filterLemmas(
	lemmas: CorpusLemmaItem[],
	query: string,
	lang: 'hebrew' | 'greek',
	maxTotal: number = 60
): LemmaFilterResult {
	if (!lemmas || lemmas.length === 0) {
		return { bestMatches: [], otherMatches: [], totalFound: 0 };
	}

	const normQuery = lang === 'hebrew' ? toPlainHebrew(query) : toPlainGreek(query);
	if (!normQuery) {
		return { bestMatches: [], otherMatches: [], totalFound: 0 };
	}

	const bestMatches: CorpusLemmaItem[] = [];
	const otherMatches: CorpusLemmaItem[] = [];
	let totalFound = 0;

	for (let i = 0; i < lemmas.length; i++) {
		const item = lemmas[i];
		if (!item.plain) continue;

		if (item.plain.startsWith(normQuery)) {
			totalFound++;
			if (bestMatches.length < maxTotal) {
				bestMatches.push(item);
			}
		} else if (item.plain.includes(normQuery)) {
			totalFound++;
			if (bestMatches.length + otherMatches.length < maxTotal) {
				otherMatches.push(item);
			}
		}
	}

	return {
		bestMatches,
		otherMatches,
		totalFound
	};
}

/**
 * Pre-warms cache for a corpus in the background without blocking.
 */
export function preloadCorpusLemmas(corpusId: SupportedSearchCorpus): void {
	getCorpusLemmas(corpusId).catch((err) => {
		console.warn(`[lemmaSearchService] Failed to preload lemmas for ${corpusId}:`, err);
	});
}

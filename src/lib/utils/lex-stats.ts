/**
 * Lexeme Statistics Utilities & Calculations.
 * Ported and enhanced from biblical-lexeme-explorer.
 */

import { normalizeBookName } from '$lib/config/bookMapping.js';

export function floatRound(val: number, decimals = 3): number {
	if (!val || isNaN(val)) return 0;
	const factor = Math.pow(10, decimals);
	return Math.round(val * factor) / factor;
}

/**
 * Calculates frequency per 1,000 words.
 *
 * @param particularWordCount - occurrences of the lemma in the target unit
 * @param totalWordsCount - total tokens/words in that target unit
 * @returns frequency per 1,000 words
 */
export function calcTotalFrequency(particularWordCount: number, totalWordsCount: number): number {
	if (totalWordsCount > 0 && particularWordCount > 0) {
		return (1000 * particularWordCount) / totalWordsCount;
	}
	return 0;
}

/**
 * Calculates frequency ratio between section frequency and rest/total frequency.
 * (1.0 = identical frequency, 2.0 = 2x more frequent in section, 0.5 = half as frequent).
 */
export function calcFreqRatio(sectionFreq: number, baseFreq: number): number {
	if (sectionFreq > 0 && baseFreq > 0) {
		return sectionFreq / baseFreq;
	}
	return 0;
}

/**
 * Encapsulates comparative metrics between a specific section (e.g., Book)
 * and the entire corpus / rest-of-corpus.
 */
export class LemmaSectionStats {
	lexCounts: {
		section: number;
		corpus: number;
		rest: number;
	};
	words: {
		section: number;
		corpus: number;
		rest: number;
	};
	freq: {
		section: number;
		corpus: number;
		rest: number;
	};
	freqRatio: number;
	percentageUse: number;

	constructor(sectionCount = 0, corpusCount = 0, sectionWords = 0, corpusWords = 0) {
		const sCount = Math.max(0, sectionCount);
		const cCount = Math.max(sCount, corpusCount);
		const sWords = Math.max(0, sectionWords);
		const cWords = Math.max(sWords, corpusWords);

		this.lexCounts = {
			section: sCount,
			corpus: cCount,
			rest: Math.max(0, cCount - sCount)
		};

		this.words = {
			section: sWords,
			corpus: cWords,
			rest: Math.max(0, cWords - sWords)
		};

		this.freq = {
			section: calcTotalFrequency(this.lexCounts.section, this.words.section),
			corpus: calcTotalFrequency(this.lexCounts.corpus, this.words.corpus),
			rest: calcTotalFrequency(this.lexCounts.rest, this.words.rest)
		};

		// Ratio against rest of corpus; if rest is empty/0, compare against corpus average
		const baseFreq = this.freq.rest > 0 ? this.freq.rest : this.freq.corpus;
		this.freqRatio = calcFreqRatio(this.freq.section, baseFreq);

		this.percentageUse = cCount > 0 ? (100 * sCount) / cCount : 0;
	}
}

export type ChartSortOption = 'canonical' | 'value-desc' | 'value-asc';

export interface SortableBookItem {
	title: string;
	sbl_abbreviation?: string;
	count: number;
	book_words?: number;
}

/**
 * Sorts an array of book frequencies either by canonical book order (default)
 * or by data value (raw count or normalized frequency per 1k words).
 */
export function sortBookFrequencies<T extends SortableBookItem>(
	items: T[],
	sortOption: ChartSortOption = 'canonical',
	metric: 'count' | 'freq' = 'count'
): T[] {
	if (!items || items.length === 0) return [];
	const list = [...items];

	const getOrder = (item: T): number => {
		const book = normalizeBookName(item.sbl_abbreviation) || normalizeBookName(item.title);
		return book?.order ?? 999;
	};

	const getVal = (item: T): number => {
		if (metric === 'count') return item.count;
		return (1000 * item.count) / (item.book_words || 1);
	};

	return list.sort((a, b) => {
		if (sortOption === 'canonical') {
			const ordA = getOrder(a);
			const ordB = getOrder(b);
			if (ordA !== ordB) return ordA - ordB;
			return (a.sbl_abbreviation || a.title).localeCompare(b.sbl_abbreviation || b.title);
		} else if (sortOption === 'value-desc') {
			const diff = getVal(b) - getVal(a);
			if (diff !== 0) return diff;
			return getOrder(a) - getOrder(b);
		} else if (sortOption === 'value-asc') {
			const diff = getVal(a) - getVal(b);
			if (diff !== 0) return diff;
			return getOrder(a) - getOrder(b);
		}
		return 0;
	});
}

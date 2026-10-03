/**
 * Lexeme Statistics Utilities & Calculations.
 * Ported and enhanced from biblical-lexeme-explorer.
 */

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

import { describe, it, expect } from 'vitest';
import {
	calcTotalFrequency,
	calcFreqRatio,
	floatRound,
	LemmaSectionStats
} from './lex-stats';

describe('LexStats utilities', () => {
	it('calculates frequency per 1,000 words correctly', () => {
		// 5 occurrences in 2,500 words = (5 / 2500) * 1000 = 2.0
		expect(calcTotalFrequency(5, 2500)).toBeCloseTo(2.0);
		// 0 occurrences should be 0
		expect(calcTotalFrequency(0, 1000)).toBe(0);
		// 0 total words should be 0 (prevent div by zero)
		expect(calcTotalFrequency(10, 0)).toBe(0);
	});

	it('calculates frequency ratio correctly', () => {
		// Section freq = 4.0, Base freq = 2.0 => Ratio = 2.0 (twice as frequent)
		expect(calcFreqRatio(4.0, 2.0)).toBeCloseTo(2.0);
		// Section freq = 1.0, Base freq = 2.0 => Ratio = 0.5 (half as frequent)
		expect(calcFreqRatio(1.0, 2.0)).toBeCloseTo(0.5);
		// Zero occurrences in section
		expect(calcFreqRatio(0, 2.0)).toBe(0);
		// Base freq is zero
		expect(calcFreqRatio(2.0, 0)).toBe(0);
	});

	it('calculates LemmaSectionStats accurately', () => {
		// Example: Word occurs 50 times in Genesis (30,000 words),
		// and 200 times total in WLC (400,000 words).
		const stats = new LemmaSectionStats(50, 200, 30000, 400000);

		// Section counts: 50 in Genesis, 200 in corpus, 150 in rest of OT
		expect(stats.lexCounts.section).toBe(50);
		expect(stats.lexCounts.corpus).toBe(200);
		expect(stats.lexCounts.rest).toBe(150);

		// Words: 30,000 in Genesis, 400,000 in corpus, 370,000 in rest
		expect(stats.words.section).toBe(30000);
		expect(stats.words.corpus).toBe(400000);
		expect(stats.words.rest).toBe(370000);

		// Section freq: (50 / 30000) * 1000 = 1.6667 per 1,000 words
		expect(stats.freq.section).toBeCloseTo(1.6667, 3);

		// Rest freq: (150 / 370000) * 1000 = 0.4054 per 1,000 words
		expect(stats.freq.rest).toBeCloseTo(0.4054, 3);

		// Ratio: 1.6667 / 0.4054 = ~4.11x
		expect(stats.freqRatio).toBeCloseTo(1.6667 / 0.4054, 1);

		// % of corpus use: (50 / 200) * 100 = 25%
		expect(stats.percentageUse).toBeCloseTo(25.0);
	});

	it('handles zero section occurrences gracefully', () => {
		const stats = new LemmaSectionStats(0, 100, 15000, 400000);
		expect(stats.lexCounts.section).toBe(0);
		expect(stats.lexCounts.rest).toBe(100);
		expect(stats.freq.section).toBe(0);
		expect(stats.freqRatio).toBe(0);
		expect(stats.percentageUse).toBe(0);
	});
});

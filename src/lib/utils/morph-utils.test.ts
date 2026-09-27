import { describe, it, expect } from 'vitest';
import {
	HEBREW_PREFIX_MAP,
	parseHebrewMorphSegments,
	decodeHebrewMorph,
	decodeGreekMorph,
	formatMorphBadges
} from './morph-utils.js';

describe('morph-utils', () => {
	describe('HEBREW_PREFIX_MAP', () => {
		it('contains standard proclitic prefixes mapped to Strongs IDs and BDB keys', () => {
			expect(HEBREW_PREFIX_MAP['Prep-b']).toEqual({
				code: 'Prep-b',
				prefix: 'בְּ',
				name: 'Preposition',
				gloss: 'in, with, by',
				strongs: 'H9003',
				headword: 'בְּ',
				key: 'ב'
			});

			expect(HEBREW_PREFIX_MAP['Prep-k'].strongs).toBe('H9004');
			expect(HEBREW_PREFIX_MAP['Prep-l'].strongs).toBe('H9005');
			expect(HEBREW_PREFIX_MAP['Prep-m'].strongs).toBe('H4480');
			expect(HEBREW_PREFIX_MAP['Conj-w'].strongs).toBe('H9000');
			expect(HEBREW_PREFIX_MAP['Art'].strongs).toBe('H9009');
			expect(HEBREW_PREFIX_MAP['Interrog'].strongs).toBe('H9008');
			expect(HEBREW_PREFIX_MAP['DirObjM'].strongs).toBe('H853');
		});
	});

	describe('parseHebrewMorphSegments', () => {
		it('parses single prefix + stem (e.g. Prep-b | N-fs for Gen 1:1 בְּרֵאשִׁית)', () => {
			const parsed = parseHebrewMorphSegments('Prep-b | N-fs');
			expect(parsed.prefixes).toHaveLength(1);
			expect(parsed.prefixes[0].prefix).toBe('בְּ');
			expect(parsed.prefixes[0].name).toBe('Preposition');
			expect(parsed.prefixes[0].strongs).toBe('H9003');
			expect(parsed.stem).toBe('N-fs');
		});

		it('parses multiple prefixes (e.g. Conj-w, Art | N-fs)', () => {
			const parsed = parseHebrewMorphSegments('Conj-w, Art | N-fs');
			expect(parsed.prefixes).toHaveLength(2);
			expect(parsed.prefixes[0].code).toBe('Conj-w');
			expect(parsed.prefixes[0].strongs).toBe('H9000');
			expect(parsed.prefixes[1].code).toBe('Art');
			expect(parsed.prefixes[1].strongs).toBe('H9009');
			expect(parsed.stem).toBe('N-fs');
		});

		it('handles bare stem without prefixes', () => {
			const parsed = parseHebrewMorphSegments('V-qp3ms');
			expect(parsed.prefixes).toHaveLength(0);
			expect(parsed.stem).toBe('V-qp3ms');
		});
	});

	describe('decodeHebrewMorph and formatMorphBadges', () => {
		it('decodes Open Scriptures Hebrew verb morphology', () => {
			const badges = decodeHebrewMorph('V-qp3ms');
			expect(badges).toEqual(['Verb', 'Qal Perfect', '3rd Person Masculine Singular']);
		});

		it('decodes Open Scriptures compound prefix and noun morphology', () => {
			const badges = formatMorphBadges('Prep-b | N-fs', 'hebrew');
			expect(badges).toEqual(['Preposition בְּ', 'Noun', 'Feminine Singular']);
		});

		it('decodes multiple prefixes and noun morphology', () => {
			const badges = formatMorphBadges('Conj-w, Art | N-fs', 'hebrew');
			expect(badges).toEqual(['Conjunction וְ', 'Definite Article הַ', 'Noun', 'Feminine Singular']);
		});

		it('decodes Greek morphology (Swete & MorphGNT)', () => {
			const sweteBadges = decodeGreekMorph('V-AAI-3S');
			expect(sweteBadges).toEqual(['Verb', 'Aorist Active Indicative', '3rd Person Singular']);

			const gntBadges = decodeGreekMorph('V- 3AAI-S--');
			expect(gntBadges).toEqual(['Verb', 'Aorist Active Indicative', '3rd Person Singular']);
		});
	});
});

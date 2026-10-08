import { describe, it, expect } from 'vitest';
import {
	latinToGreek,
	toPlainGreek,
	latinToHebrew,
	toPlainHebrew,
	convertHebrewFinalConsonants,
	removeHebrewFinalConsonants,
	transliterate
} from './transliteration';

describe('transliteration', () => {
	describe('Greek transliteration', () => {
		it('converts basic Latin Beta Code to Greek', () => {
			expect(latinToGreek('logos')).toBe('λογος');
			expect(latinToGreek('en arxh')).toBe('εν αρξη'); // 'x' -> 'ξ'
			expect(latinToGreek('c')).toBe('χ');             // 'c' -> 'χ'
			expect(latinToGreek('q')).toBe('θ');             // 'q' -> 'θ'
			expect(latinToGreek('f')).toBe('φ');             // 'f' -> 'φ'
			expect(latinToGreek('y')).toBe('ψ');             // 'y' -> 'ψ'
			expect(latinToGreek('w')).toBe('ω');             // 'w' -> 'ω'
		});

		it('converts word-final sigma to ς', () => {
			expect(latinToGreek('logos')).toBe('λογος');
			expect(latinToGreek('logos kai')).toBe('λογος και');
			expect(latinToGreek('qeos')).toBe('θεος');
		});

		it('preserves casing for Greek capitals', () => {
			expect(latinToGreek('Logos')).toBe('Λογος');
			expect(latinToGreek('IHSOUS')).toBe('ΙΗΣΟΥΣ');
		});

		it('normalizes polytonic Greek with toPlainGreek', () => {
			expect(toPlainGreek('λόγος')).toBe('λογοσ');
			expect(toPlainGreek('Ἐν ἀρχῇ')).toBe('εν αρχη');
			expect(toPlainGreek('Ἰησοῦς Χριστός')).toBe('ιησουσ χριστοσ');
		});
	});

	describe('Hebrew transliteration', () => {
		it('converts single Latin letters to Hebrew consonants', () => {
			expect(latinToHebrew('b')).toBe('ב');
			expect(latinToHebrew('r')).toBe('ר');
			expect(latinToHebrew('a')).toBe('א');
			expect(latinToHebrew('j')).toBe('ש'); // 'j' -> Shin
			expect(latinToHebrew('J')).toBe('ש');
			expect(latinToHebrew('t')).toBe('ת');
		});

		it('converts trailing consonants to final forms', () => {
			// 'm' at end of word becomes final mem (ם)
			expect(latinToHebrew('adm')).toBe('אדם');
			expect(latinToHebrew('m')).toBe('ם');
			expect(latinToHebrew('ma')).toBe('מא');
			// 'k' at end becomes final kaf (ך)
			expect(latinToHebrew('mlk')).toBe('מלך');
			// 'n' at end becomes final nun (ן)
			expect(latinToHebrew('kn')).toBe('כן');
		});

		it('normalizes pointed Hebrew with toPlainHebrew', () => {
			expect(toPlainHebrew('בְּרֵאשִׁית')).toBe('בראשית');
			expect(toPlainHebrew('אָדָם')).toBe('אדמ'); // normalized final mem to regular mem
			expect(toPlainHebrew('מֶלֶךְ')).toBe('מלכ'); // normalized final kaf to regular kaf
		});
	});

	describe('transliterate generic helper', () => {
		it('transliterates based on language parameter', () => {
			expect(transliterate('logos', 'greek')).toBe('λογος');
			expect(transliterate('br>jyt', 'hebrew')).toBe('בראשית');
		});
	});
});

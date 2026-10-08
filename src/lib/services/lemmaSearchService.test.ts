import { describe, it, expect } from 'vitest';
import {
	resolveSearchCorpus,
	getCorpusLanguage,
	filterLemmas,
	type CorpusLemmaItem
} from './lemmaSearchService';

describe('lemmaSearchService', () => {
	describe('resolveSearchCorpus', () => {
		it('resolves BHS variants to wlc', () => {
			expect(resolveSearchCorpus('BHS')).toBe('wlc');
			expect(resolveSearchCorpus('bhs')).toBe('wlc');
			expect(resolveSearchCorpus('wlc')).toBe('wlc');
		});

		it('resolves Greek NT variants to ognt', () => {
			expect(resolveSearchCorpus('OpenGNT')).toBe('ognt');
			expect(resolveSearchCorpus('ognt')).toBe('ognt');
			expect(resolveSearchCorpus('SBLGNT')).toBe('ognt');
		});

		it('resolves Septuagint variants to swete_lxx', () => {
			expect(resolveSearchCorpus('LXX')).toBe('swete_lxx');
			expect(resolveSearchCorpus('swete-lxx')).toBe('swete_lxx');
			expect(resolveSearchCorpus('swete_lxx')).toBe('swete_lxx');
		});

		it('returns null for unsupported English/Latin versions', () => {
			expect(resolveSearchCorpus('KJV')).toBeNull();
			expect(resolveSearchCorpus('Vulgate')).toBeNull();
			expect(resolveSearchCorpus('WEB')).toBeNull();
		});
	});

	describe('getCorpusLanguage', () => {
		it('returns hebrew for wlc and greek for ognt and swete_lxx', () => {
			expect(getCorpusLanguage('wlc')).toBe('hebrew');
			expect(getCorpusLanguage('ognt')).toBe('greek');
			expect(getCorpusLanguage('swete_lxx')).toBe('greek');
		});
	});

	describe('filterLemmas', () => {
		const mockGreekLemmas: CorpusLemmaItem[] = [
			{ strongs: 'G3056', lemma: 'λόγος', plain: 'λογοσ', total_count: 330 },
			{ strongs: 'G3049', lemma: 'λογίζομαι', plain: 'λογιζομαι', total_count: 40 },
			{ strongs: 'G125', lemma: 'Αἴγυπτος', plain: 'αιγυπτοσ', total_count: 25 },
			{ strongs: 'G3956', lemma: 'πᾶς', plain: 'πασ', total_count: 1240 },
			{ strongs: 'G9999', lemma: 'ἀπολογία', plain: 'απολογια', total_count: 8 }
		];

		it('filters Greek lemmas with prefix matching into bestMatches', () => {
			const res = filterLemmas(mockGreekLemmas, 'λογ', 'greek');
			expect(res.bestMatches.length).toBe(2);
			expect(res.bestMatches[0].lemma).toBe('λόγος');
			expect(res.bestMatches[1].lemma).toBe('λογίζομαι');
			expect(res.otherMatches.length).toBe(1); // 'ἀπολογία' contains 'λογ'
			expect(res.otherMatches[0].lemma).toBe('ἀπολογία');
		});

		it('filters case and diacritic insensitively', () => {
			const res = filterLemmas(mockGreekLemmas, 'ΛΟΓ', 'greek');
			expect(res.bestMatches.length).toBe(2);
		});

		const mockHebrewLemmas: CorpusLemmaItem[] = [
			{ strongs: 'H1254', lemma: 'בָּרָא', plain: 'ברא', total_count: 54 },
			{ strongs: 'H1288', lemma: 'בָּרַךְ', plain: 'ברכ', total_count: 330 },
			{ strongs: 'H7225', lemma: 'רֵאשִׁית', plain: 'ראשית', total_count: 51 },
			{ strongs: 'H120', lemma: 'אָדָם', plain: 'אדמ', total_count: 562 }
		];

		it('filters Hebrew lemmas with prefix matching and normalized consonants', () => {
			const res = filterLemmas(mockHebrewLemmas, 'בר', 'hebrew');
			expect(res.bestMatches.length).toBe(2);
			expect(res.bestMatches[0].lemma).toBe('בָּרָא');
			expect(res.bestMatches[1].lemma).toBe('בָּרַךְ');
		});

		it('matches final forms seamlessly with normalized consonants', () => {
			// 'אדם' with regular or final mem
			const res = filterLemmas(mockHebrewLemmas, 'אד', 'hebrew');
			expect(res.bestMatches.length).toBe(1);
			expect(res.bestMatches[0].lemma).toBe('אָדָם');
		});
	});
});

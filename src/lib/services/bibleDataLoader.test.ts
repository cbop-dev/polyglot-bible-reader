import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadChapterFromDb, loadChaptersForBook, formatVerseText } from './bibleDataLoader';
import * as dbClient from './dbClient';

describe('bibleDataLoader', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads and formats parallel chapter verses', async () => {
		vi.spyOn(dbClient, 'getChapterVerses').mockResolvedValue([
			{
				base_cref_id: 1,
				ord: 1,
				hierarchy: '1,1',
				base_label: 'Genesis 1:1',
				version: 'BHS',
				work_unit_id: 101,
				verse_label: '1:1',
				body: 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃',
				words: [
					{
						id: 1,
						work_id: 2,
						work_unit_id: 101,
						position: 1,
						surface: 'בְּרֵאשִׁ֖ית',
						normalized: 'בראשית',
						strongs_number: '7225',
						morph_code: 'Prep-b'
					}
				]
			},
			{
				base_cref_id: 1,
				ord: 1,
				hierarchy: '1,1',
				base_label: 'Genesis 1:1',
				version: 'LXX',
				work_unit_id: 201,
				verse_label: '1:1',
				body: 'ἐν ἀρχῇ ἐποίησεν ὁ θεὸς τὸν οὐρανὸν καὶ τὴν γῆν',
				words: [
					{
						id: 2,
						work_id: 24,
						work_unit_id: 201,
						position: 1,
						surface: 'ἐν',
						normalized: 'ἐν',
						strongs_number: 'G1722',
						morph_code: 'PREP'
					}
				]
			},
			{
				base_cref_id: 2,
				ord: 2,
				hierarchy: '1,2',
				base_label: 'Genesis 1:2',
				version: 'BHS',
				work_unit_id: 102,
				verse_label: '1:2',
				body: 'וְהָאָ֗רֶץ הָיְתָ֥ה תֹ֙הוּ֙ וָבֹ֔הוּ...',
				words: []
			}
		]);

		const res = await loadChapterFromDb('Gen', 1, ['BHS', 'LXX']);
		expect(res.verseKeys).toEqual(['1', '2']);
		expect(res.chapterDataByVerse['1']['BHS'].exists).toBe(true);
		expect(res.chapterDataByVerse['1']['LXX'].exists).toBe(true);
		expect(res.chapterDataByVerse['1']['BHS'].verseData.words).toHaveLength(1);
		expect(res.chapterDataByVerse['1']['LXX'].verseData.words).toHaveLength(1);
		expect(res.chapterDataByVerse['2']['BHS'].exists).toBe(true);
	});

	it('loads chapters for a book', async () => {
		vi.spyOn(dbClient, 'getBookChapters').mockResolvedValue([1, 2, 3, 4, 5]);

		const chaps = await loadChaptersForBook('Gen');
		expect(chaps).toEqual([1, 2, 3, 4, 5]);
	});

	it('formats verse text with diacritics', () => {
		const hebrew = 'בְּרֵאשִׁ֖ית';
		expect(formatVerseText(hebrew, 'BHS', 'all', true)).toBe('בְּרֵאשִׁ֖ית');
		expect(formatVerseText(hebrew, 'BHS', 'none', true)).toBe('בראשׁית');

		const greek = 'ἐν ἀρχῇ';
		expect(formatVerseText(greek, 'LXX', 'all', true)).toBe('ἐν ἀρχῇ');
		expect(formatVerseText(greek, 'LXX', 'all', false)).toBe('εν αρχη');
	});
});

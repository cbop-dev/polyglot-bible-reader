import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	VERSION_MAP,
	SLUG_TO_VERSION,
	resolveCanonicalWorkId,
	getWorks,
	getChapterVerses,
	getLemma,
	getWordFrequencyByBook,
	getConcordance,
	_clearDbClientCache
} from './dbClient';
import * as dbWorker from './dbWorker';

describe('dbClient service', () => {
	it('maps UI versions to work slugs correctly', () => {
		expect(VERSION_MAP['BHS']).toBe('wlc');
		expect(VERSION_MAP['LXX']).toBe('swete-lxx');
		expect(VERSION_MAP['SBLGNT']).toBe('sblgnt');
		expect(VERSION_MAP['Vulgate']).toBe('vulgate-clementine');
		expect(VERSION_MAP['KJV']).toBe('kjv');
		expect(VERSION_MAP['WEB']).toBe('webbe');
		expect(VERSION_MAP['Brenton']).toBe('brenton-lxx');

		expect(SLUG_TO_VERSION['wlc']).toBe('BHS');
		expect(SLUG_TO_VERSION['swete-lxx']).toBe('LXX');
		expect(SLUG_TO_VERSION['sblgnt']).toBe('SBLGNT');
	});

	describe('with mocked database worker', () => {
		const mockQuery = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();
			_clearDbClientCache();
			vi.spyOn(dbWorker, 'getDbWorker').mockResolvedValue({
				db: { query: mockQuery } as any,
				worker: {} as any,
				configs: []
			});
		});

		it('fetches works list', async () => {
			mockQuery.mockResolvedValue([
				{ id: 2, slug: 'wlc', title: 'Westminster Leningrad Codex', language: 'he' },
				{ id: 24, slug: 'swete-lxx', title: "Swete's Septuagint", language: 'el-koine' }
			]);

			const works = await getWorks();
			expect(works).toHaveLength(2);
			expect(works[0].slug).toBe('wlc');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('SELECT id, slug, title'),
				expect.any(Array)
			);
		});

		it('resolves canonical work IDs for various aliases', async () => {
			mockQuery.mockResolvedValue([
				{ id: 1, slug: 'genesis', title: 'Genesis', sbl_abbreviation: 'Gen', book_key: 'genesis', testament: 'ot' },
				{ id: 19, slug: 'psalms', title: 'Psalms', sbl_abbreviation: 'Ps', book_key: 'psalms', testament: 'ot' },
				{ id: 40, slug: 'matthew', title: 'Matthew', sbl_abbreviation: 'Matt', book_key: 'matthew', testament: 'nt' },
				{ id: 46, slug: '1-corinthians', title: '1 Corinthians', sbl_abbreviation: '1 Cor', book_key: '1-corinthians', testament: 'nt' }
			]);

			expect(await resolveCanonicalWorkId('genesis')).toBe(1);
			expect(await resolveCanonicalWorkId('Gen')).toBe(1);
			expect(await resolveCanonicalWorkId('1-corinthians')).toBe(46);
			expect(await resolveCanonicalWorkId('1_Cor')).toBe(46);
			expect(await resolveCanonicalWorkId('1 Cor')).toBe(46);
			expect(await resolveCanonicalWorkId('psalms')).toBe(19);
			expect(await resolveCanonicalWorkId('Ps')).toBe(19);
		});

		it('retrieves chapter verses and re-maps slugs to UI version acronyms', async () => {
			// Mock canonical works resolution
			mockQuery.mockResolvedValueOnce([
				{ id: 1, slug: 'genesis', title: 'Genesis', sbl_abbreviation: 'Gen', book_key: 'genesis', testament: 'ot' }
			]);

			// Mock verse rows query
			mockQuery.mockResolvedValueOnce([
				{
					base_cref_id: 1,
					ord: 1,
					hierarchy: '1,1',
					base_label: 'Genesis 1:1',
					version: 'wlc',
					work_unit_id: 101,
					verse_label: '1:1',
					body: 'בְּרֵאשִׁ֖ית...'
				},
				{
					base_cref_id: 1,
					ord: 1,
					hierarchy: '1,1',
					base_label: 'Genesis 1:1',
					version: 'swete-lxx',
					work_unit_id: 201,
					verse_label: '1:1',
					body: 'ἐν ἀρχῇ...'
				}
			]);

			// Mock word tokens query for work units 101 and 201
			mockQuery.mockResolvedValueOnce([
				{ id: 1, work_id: 2, work_unit_id: 101, position: 1, surface: 'בְּרֵאשִׁ֖ית', normalized: 'בראשית', strongs_number: '7225', morph_code: 'Prep-b' },
				{ id: 2, work_id: 24, work_unit_id: 201, position: 1, surface: 'ἐν', normalized: 'ἐν', strongs_number: 'G1722', morph_code: 'PREP' }
			]);

			const verses = await getChapterVerses('Gen', 1, ['BHS', 'LXX'], true);
			expect(verses).toHaveLength(2);
			// Check remapping from 'wlc' to 'BHS' and 'swete-lxx' to 'LXX'
			expect(verses[0].version).toBe('BHS');
			expect(verses[1].version).toBe('LXX');
			expect(verses[0].words).toHaveLength(1);
			expect(verses[1].words).toHaveLength(1);
		});

		it('retrieves lemma information by lemma or lex_id', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					id: 14680,
					corpus: 'sblgnt',
					lex_id: 3040,
					lemma: 'λόγος',
					gloss: 'word, speech',
					pos: 4,
					strongs: 'G3056',
					beta: 'logos',
					plain: 'λογος',
					total: 330
				}
			]);

			const lemma = await getLemma('sblgnt', 'λόγος');
			expect(lemma).not.toBeNull();
			expect(lemma?.lemma).toBe('λόγος');
			expect(lemma?.strongs).toBe('G3056');
			expect(lemma?.total).toBe(330);
		});

		it('retrieves word frequency by book', async () => {
			mockQuery.mockResolvedValueOnce([
				{ title: 'Matthew', sbl_abbreviation: 'Matt', count: 33 },
				{ title: 'John', sbl_abbreviation: 'John', count: 40 }
			]);

			const freqs = await getWordFrequencyByBook(25, 'λόγος');
			expect(freqs).toHaveLength(2);
			expect(freqs[0].title).toBe('Matthew');
			expect(freqs[1].count).toBe(40);
		});

		it('retrieves concordance occurrences', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					work_unit_id: 5001,
					display_label: 'John 1:1',
					verse_label: '1:1',
					body: 'Ἐν ἀρχῇ ἦν ὁ λόγος...',
					surface: 'λόγος',
					position: 5
				}
			]);

			const conc = await getConcordance(25, 'λόγος', 10);
			expect(conc).toHaveLength(1);
			expect(conc[0].display_label).toBe('John 1:1');
			expect(conc[0].surface).toBe('λόγος');
		});
	});
});

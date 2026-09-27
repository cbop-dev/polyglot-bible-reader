import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	VERSION_MAP,
	SLUG_TO_VERSION,
	resolveCanonicalWorkId,
	getWorks,
	getChapterVerses,
	getWordsForWorkUnits,
	getLemma,
	getWordFrequencyByBook,
	getConcordance,
	getVerseText,
	getLexiconEntry,
	translateReference,
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

		it('resolves version-specific canonical work IDs for LXX and Brenton', async () => {
			mockQuery.mockResolvedValueOnce([
				{ id: 19, slug: 'psalms', title: 'Psalms', sbl_abbreviation: 'Ps', book_key: 'psalms', testament: 'ot' },
				{ id: 87, slug: 'psalms-lxx', title: 'Psalms (LXX)', sbl_abbreviation: null, book_key: 'psalms-lxx', testament: 'ot' },
				{ id: 24, slug: 'jeremiah', title: 'Jeremiah', sbl_abbreviation: 'Jer', book_key: 'jeremiah', testament: 'ot' },
				{ id: 88, slug: 'jeremiah-lxx', title: 'Jeremiah (LXX)', sbl_abbreviation: null, book_key: 'jeremiah-lxx', testament: 'ot' },
				{ id: 21, slug: 'ecclesiastes', title: 'Ecclesiastes', sbl_abbreviation: 'Eccl', book_key: 'ecclesiastes', testament: 'ot' },
				{ id: 85, slug: 'psalms-of-solomon', title: 'Psalms of Solomon', sbl_abbreviation: null, book_key: 'psalms-of-solomon', testament: 'ot' }
			]);

			// Jer in BHS vs LXX
			expect(await resolveCanonicalWorkId('Jer', 'BHS')).toBe(24);
			expect(await resolveCanonicalWorkId('Jer', 'LXX')).toBe(88);
			expect(await resolveCanonicalWorkId('Jer', 'Brenton')).toBe(88);

			// Ps in BHS vs LXX
			expect(await resolveCanonicalWorkId('Ps', 'BHS')).toBe(19);
			expect(await resolveCanonicalWorkId('Ps', 'LXX')).toBe(87);

			// Aliases
			expect(await resolveCanonicalWorkId('Qoh', 'BHS')).toBe(21);
			expect(await resolveCanonicalWorkId('PsSol', 'LXX')).toBe(85);
		});

		it('translates references between versions using versification mappings', async () => {
			// Mock canonical works resolution
			mockQuery.mockResolvedValueOnce([
				{ id: 24, slug: 'jeremiah', title: 'Jeremiah', sbl_abbreviation: 'Jer', book_key: 'jeremiah', testament: 'ot' },
				{ id: 88, slug: 'jeremiah-lxx', title: 'Jeremiah (LXX)', sbl_abbreviation: null, book_key: 'jeremiah-lxx', testament: 'ot' }
			]);

			// Mock versification mapping query returning Jer 38:1
			mockQuery.mockResolvedValueOnce([
				{ hierarchy: '38,1' }
			]);

			const trans = await translateReference('Jer', 31, 1, 'BHS', 'LXX');
			expect(trans).toEqual({ book: 'Jer', chapter: 38, verse: 1 });
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

		it('retrieves Psalms 1 verses using variant_identity_refs SQL structure', async () => {
			// Mock canonical works resolution for 'Ps'
			mockQuery.mockResolvedValueOnce([
				{ id: 19, slug: 'psalms', title: 'Psalms', sbl_abbreviation: 'Ps', book_key: 'psalms', testament: 'ot' }
			]);

			// Mock verse rows for Ps 1:1 in BHS and LXX
			mockQuery.mockResolvedValueOnce([
				{
					base_cref_id: 13941,
					ord: 13941,
					hierarchy: '1,1',
					base_label: 'Psalms 1:1',
					version: 'wlc',
					work_unit_id: 974950,
					verse_label: '1:1',
					body: 'אַ֥שְֽׁרֵי־ הָאִ֗ישׁ...'
				},
				{
					base_cref_id: 13941,
					ord: 13941,
					hierarchy: '1,1',
					base_label: 'Psalms 1:1',
					version: 'swete-lxx',
					work_unit_id: 974960,
					verse_label: '1:1',
					body: 'μακάριος ἀνήρ...'
				}
			]);

			// Mock word tokens
			mockQuery.mockResolvedValueOnce([]);

			const verses = await getChapterVerses('Ps', 1, ['BHS', 'LXX'], true);
			expect(verses).toHaveLength(2);
			expect(verses[0].version).toBe('BHS');
			expect(verses[1].version).toBe('LXX');

			// Verify that the query was called with the variant_identity_refs CTE and both cwId params
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('variant_identity_refs'),
				[19, '1', '1,%', 19, 'wlc', 'swete-lxx']
			);
		});

		it('retrieves Jeremiah 31 verses aligned with LXX 38', async () => {
			// Mock canonical works resolution for 'Jer'
			mockQuery.mockResolvedValueOnce([
				{ id: 24, slug: 'jeremiah', title: 'Jeremiah', sbl_abbreviation: 'Jer', book_key: 'jeremiah', testament: 'ot' }
			]);

			// Mock verse rows for Jer 31:1 (BHS 31:1, LXX 38:1)
			mockQuery.mockResolvedValueOnce([
				{
					base_cref_id: 19693,
					ord: 19693,
					hierarchy: '31,1',
					base_label: 'Jeremiah 31:1',
					version: 'wlc',
					work_unit_id: 985300,
					verse_label: '31:1',
					body: 'בָּעֵ֤ת הַהִיא֙ נְאֻם־ יְהוָ֔ה אֶֽהְיֶה֙ לֵֽאלֹהִ֔ים...'
				},
				{
					base_cref_id: 19693,
					ord: 19693,
					hierarchy: '31,1',
					base_label: 'Jeremiah 31:1',
					version: 'swete-lxx',
					work_unit_id: 985400,
					verse_label: '38:1',
					body: 'ἐν τῷ χρόνῳ ἐκείνῳ εἶπεν κύριος ἔσομαι εἰς θεὸν...'
				}
			]);

			// Mock words
			mockQuery.mockResolvedValueOnce([]);

			const verses = await getChapterVerses('Jer', 31, ['BHS', 'LXX'], true);
			expect(verses).toHaveLength(2);
			expect(verses[0].version).toBe('BHS');
			expect(verses[0].verse_label).toBe('31:1');
			expect(verses[1].version).toBe('LXX');
			expect(verses[1].verse_label).toBe('38:1');
		});

		it('consolidates contiguous workUnitIds into BETWEEN range scans with UNION ALL', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					id: 1,
					work_id: 2,
					work_unit_id: 101,
					position: 1,
					surface: 'בְּרֵאשִׁ֖ית',
					normalized: 'בראשית',
					strongs_number: 'H7225',
					morph_code: 'Ncfsa'
				},
				{
					id: 2,
					work_id: 24,
					work_unit_id: 201,
					position: 1,
					surface: 'ἐν',
					normalized: 'εν',
					strongs_number: 'G1722',
					morph_code: 'PREP'
				}
			]);

			// Pass two contiguous blocks: [101, 102, 103] and [201, 202]
			const words = await getWordsForWorkUnits([101, 102, 103, 201, 202]);
			expect(words).toHaveLength(2);
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('work_unit_id BETWEEN ? AND ?\nUNION ALL\nSELECT id, work_id, work_unit_id, position, surface, normalized, strongs_number, morph_code FROM words WHERE work_unit_id BETWEEN ? AND ?'),
				[101, 103, 201, 202]
			);
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
				{
					book_counts_json: JSON.stringify([
						{ title: 'Matthew', sbl_abbreviation: 'Matt', count: 33 },
						{ title: 'John', sbl_abbreviation: 'John', count: 40 }
					]),
					total_count: 73
				}
			]);

			const freqs = await getWordFrequencyByBook(25, 'λόγος');
			expect(freqs).toHaveLength(2);
			expect(freqs[0].title).toBe('Matthew');
			expect(freqs[1].count).toBe(40);
		});

		it('retrieves word frequencies for lemmas without Strongs number (pseudo-strongs)', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					book_counts_json: JSON.stringify([
						{ title: 'Genesis', sbl_abbreviation: 'Gen', count: 1 }
					]),
					total_count: 1
				}
			]);

			const freqs = await getWordFrequencyByBook(24, 'ἀκατασκεύαστος');
			expect(freqs).toHaveLength(1);
			expect(freqs[0].title).toBe('Genesis');
			expect(freqs[0].count).toBe(1);
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('FROM lemma_stats'),
				expect.arrayContaining([24, 'ἀκατασκεύαστος', 'ἀκατασκεύαστος', 'WORD:ἀκατασκεύαστος'])
			);
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

		it('queries pre-indexed concordance_refs with Strongs number priority', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					ref_label: 'Gen 1:1',
					display_label: 'Gen 1:1',
					work_unit_id: 58765
				},
				{
					ref_label: 'Gen 10:10',
					display_label: 'Gen 10:10',
					work_unit_id: 59000
				}
			]);

			const conc = await getConcordance(2, 'ראשית', 10, 'H7225');
			expect(conc).toHaveLength(2);
			expect(conc[0].ref_label).toBe('Gen 1:1');
			expect(conc[0].work_unit_id).toBe(58765);
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('FROM concordance_refs'),
				[2, 'H7225', 10]
			);
		});

		it('fetches on-demand verse text via getVerseText', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					body: 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃'
				}
			]);

			const body = await getVerseText(58765);
			expect(body).toContain('בְּרֵאשִׁ֖ית');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('SELECT body FROM work_units WHERE id = ?'),
				[58765]
			);
		});

		it('looks up BDB with Strongs priority, headword, and stripped key fallbacks', async () => {
			// Case 1: Strongs priority lookup (exact both match)
			mockQuery.mockResolvedValueOnce([
				{
					id: 1,
					dictionary: 'bdb',
					key: 'בראשית',
					headword: 'בְּרֵאשִׁית',
					strongs: 'H7225',
					definition: '<div><p><b>H7225. reshith</b></p><p>beginning, chief</p></div>'
				}
			]);

			const bdbStrongsRes = await getLexiconEntry('bdb', 'בְּרֵאשִׁית', '7225');
			expect(bdbStrongsRes).not.toBeNull();
			expect(bdbStrongsRes?.strongs).toBe('H7225');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining("WHERE dictionary = 'bdb' AND strongs = ? AND (headword = ? OR key = ?"),
				['H7225', 'בְּרֵאשִׁית', 'בְּרֵאשִׁית', 'בראשית', 'בראשית']
			);

			// Case 2: Direct headword lookup (when no strongs supplied)
			mockQuery.mockResolvedValueOnce([
				{
					id: 2,
					dictionary: 'bdb',
					key: 'ברא',
					headword: 'בָּרָא',
					strongs: 'H1254',
					definition: '<div><p><b>H1254. bara</b></p></div>'
				}
			]);

			const bdbHeadwordRes = await getLexiconEntry('bdb', 'בָּרָא');
			expect(bdbHeadwordRes).not.toBeNull();
			expect(bdbHeadwordRes?.headword).toBe('בָּרָא');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining("WHERE dictionary = 'bdb' AND headword = ?"),
				['בָּרָא']
			);

			// Case 3: Stripped key fallback when headword not matched
			mockQuery
				.mockResolvedValueOnce([]) // headword query returns empty
				.mockResolvedValueOnce([   // key query returns match
					{
						id: 3,
						dictionary: 'bdb',
						key: 'ברא',
						headword: 'ברא',
						strongs: 'H1254',
						definition: '<div><p><b>H1254. bara</b></p></div>'
					}
				]);

			const bdbKeyRes = await getLexiconEntry('bdb', 'בָּרָא');
			expect(bdbKeyRes).not.toBeNull();
			expect(bdbKeyRes?.key).toBe('ברא');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining("WHERE dictionary = 'bdb' AND key = ?"),
				['ברא']
			);

			// Case 4: LSJ lookup with Greek normalization
			mockQuery.mockResolvedValueOnce([
				{
					id: 4,
					dictionary: 'lsj',
					key: 'ποιεω',
					headword: 'ποιέω',
					lsj_index: 'n84234',
					definition: '<p>ποιέω to make</p>'
				}
			]);

			const lsjRes = await getLexiconEntry('lsj', 'ποιέω');
			expect(lsjRes).not.toBeNull();
			expect(lsjRes?.key).toBe('ποιεω');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining("WHERE dictionary = 'lsj' AND (key = ? OR headword = ? OR lsj_index = ?)"),
				['ποιεω', 'ποιέω', 'ποιέω']
			);
		});

		it('loads BHS and LXX Gen 1:1 word tokens and retrieves correct BDB and LSJ entries', async () => {
			// 1. Mock canonical works resolution for 'Gen'
			mockQuery.mockResolvedValueOnce([
				{ id: 1, slug: 'genesis', title: 'Genesis', sbl_abbreviation: 'Gen', book_key: 'genesis', testament: 'ot' }
			]);

			// 2. Mock verse rows for Gen 1:1 in BHS and LXX
			mockQuery.mockResolvedValueOnce([
				{
					base_cref_id: 1,
					ord: 1,
					hierarchy: '1,1',
					base_label: 'Genesis 1:1',
					version: 'wlc',
					work_unit_id: 58765,
					verse_label: '1:1',
					body: 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃'
				},
				{
					base_cref_id: 1,
					ord: 1,
					hierarchy: '1,1',
					base_label: 'Genesis 1:1',
					version: 'swete-lxx',
					work_unit_id: 958890,
					verse_label: '1:1',
					body: 'ἐν ἀρχῇ ἐποίησεν ὁ θεὸς τὸν οὐρανὸν καὶ τὴν γῆν'
				}
			]);

			// 3. Mock word tokens for work units 58765 and 958890
			mockQuery.mockResolvedValueOnce([
				{ id: 1090494, work_id: 2, work_unit_id: 58765, position: 1, surface: 'בְּרֵאשִׁ֖ית', normalized: 'בראשית', strongs_number: '7225', morph_code: 'Prep-b | N-fs' },
				{ id: 1090495, work_id: 2, work_unit_id: 58765, position: 2, surface: 'בָּרָ֣א', normalized: 'ברא', strongs_number: '1254', morph_code: 'V-qp3ms' },
				{ id: 3395930, work_id: 24, work_unit_id: 958890, position: 1, surface: 'ἐν', normalized: 'ἐν', strongs_number: 'G1722', morph_code: 'PREP' },
				{ id: 3395931, work_id: 24, work_unit_id: 958890, position: 2, surface: 'ἀρχῇ', normalized: 'ἀρχή', strongs_number: 'G746', morph_code: 'N-DSF' },
				{ id: 3395932, work_id: 24, work_unit_id: 958890, position: 3, surface: 'ἐποίησεν', normalized: 'ποιέω', strongs_number: 'G4160', morph_code: 'V-AAI' }
			]);

			const verses = await getChapterVerses('Gen', 1, ['BHS', 'LXX'], true);
			expect(verses).toHaveLength(2);

			const bhsVerse = verses.find((v) => v.version === 'BHS');
			const lxxVerse = verses.find((v) => v.version === 'LXX');
			expect(bhsVerse).toBeDefined();
			expect(lxxVerse).toBeDefined();

			// Test BHS 1st word: בְּרֵאשִׁ֖ית with Strong's 7225 -> exactBoth fails, strongs fallback finds BDB H7225
			const bhsWord1 = bhsVerse!.words![0];
			expect(bhsWord1.surface).toBe('בְּרֵאשִׁ֖ית');
			expect(bhsWord1.strongs_number).toBe('7225');

			mockQuery
				.mockResolvedValueOnce([]) // exactBoth returns empty
				.mockResolvedValueOnce([   // strongs alone returns match
					{
						id: 7225,
						dictionary: 'bdb',
						key: 'ראשית',
						headword: 'רֵאשִׁית',
						strongs: 'H7225',
						definition: '<div><p><b>H7225. reshith</b></p><p>beginning</p></div>'
					}
				]);

			const bdbEntry1 = await getLexiconEntry('bdb', bhsWord1.normalized || bhsWord1.surface, bhsWord1.strongs_number);
			expect(bdbEntry1).not.toBeNull();
			expect(bdbEntry1?.strongs).toBe('H7225');
			expect(bdbEntry1?.definition).toContain('reshith');

			// Test BHS 2nd word: בָּרָ֣א -> BDB H1254
			const bhsWord2 = bhsVerse!.words![1];
			expect(bhsWord2.position).toBe(2);
			expect(bhsWord2.surface).toBe('בָּרָ֣א');
			expect(bhsWord2.normalized).toBe('ברא');

			mockQuery.mockResolvedValueOnce([
				{
					id: 1152,
					dictionary: 'bdb',
					key: 'ברא',
					headword: 'ברא',
					strongs: 'H1254',
					definition: '<div><p><b>H1254. bara</b></p><p>to shape, create</p></div>'
				}
			]);

			const bdbEntry2 = await getLexiconEntry('bdb', bhsWord2.normalized || bhsWord2.surface, bhsWord2.strongs_number);
			expect(bdbEntry2).not.toBeNull();
			expect(bdbEntry2?.headword).toBe('ברא');
			expect(bdbEntry2?.strongs).toBe('H1254');
			expect(bdbEntry2?.definition).toContain('bara');

			// Test LXX 3rd word: ἐποίησεν -> LSJ (lemma: ποιέω)
			const lxxWord3 = lxxVerse!.words![2];
			expect(lxxWord3.position).toBe(3);
			expect(lxxWord3.surface).toBe('ἐποίησεν');
			expect(lxxWord3.normalized).toBe('ποιέω');

			mockQuery.mockResolvedValueOnce([
				{
					id: 4025,
					dictionary: 'lsj',
					key: 'ποιεω',
					headword: 'ποιέω',
					lsj_index: 'n84234',
					definition: '**ποιέω**, to make, produce, create'
				}
			]);

			const lsjEntry = await getLexiconEntry('lsj', lxxWord3.normalized || lxxWord3.surface, lxxWord3.strongs_number);
			expect(lsjEntry).not.toBeNull();
			expect(lsjEntry?.key).toBe('ποιεω');
			expect(lsjEntry?.headword).toBe('ποιέω');
			expect(lsjEntry?.definition).toContain('to make');
		});
	});
});

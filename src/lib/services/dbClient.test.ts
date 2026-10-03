import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	VERSION_MAP,
	SLUG_TO_VERSION,
	resolveBookCode,
	resolveCanonicalWorkId,
	getWorks,
	getCanonicalWorks,
	getBookChapters,
	getChapterVerses,
	getWordsForWorkUnits,
	getLemma,
	getLemmaTotalCount,
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
		expect(VERSION_MAP['LXX']).toBe('swete_lxx');
		expect(VERSION_MAP['OpenGNT']).toBe('ognt');
		expect(VERSION_MAP['OGNT']).toBe('ognt');
		expect(VERSION_MAP['SBLGNT']).toBe('ognt');
		expect(VERSION_MAP['Vulgate']).toBe('vulgate');
		expect(VERSION_MAP['KJV']).toBe('kjv');
		expect(VERSION_MAP['WEB']).toBe('webbe');
		expect(VERSION_MAP['Brenton']).toBe('brenton-lxx');

		expect(SLUG_TO_VERSION['wlc']).toBe('BHS');
		expect(SLUG_TO_VERSION['swete_lxx']).toBe('LXX');
		expect(SLUG_TO_VERSION['swete-lxx']).toBe('LXX');
		expect(SLUG_TO_VERSION['ognt']).toBe('OpenGNT');
		expect(SLUG_TO_VERSION['sblgnt']).toBe('OpenGNT');
		expect(SLUG_TO_VERSION['vulgate']).toBe('Vulgate');
		expect(SLUG_TO_VERSION['vulgate-clementine']).toBe('Vulgate');
		expect(SLUG_TO_VERSION['kjv']).toBe('KJV');
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

		it('fetches works list from corpora', async () => {
			mockQuery.mockResolvedValue([
				{ id: 'wlc', title: 'Westminster Leningrad Codex', language: 'hbo', category: 'bible' },
				{ id: 'swete_lxx', title: "Swete's Septuagint", language: 'grc', category: 'bible' }
			]);

			const works = await getWorks();
			expect(works).toHaveLength(2);
			expect(works[0].slug).toBe('wlc');
			expect(works[1].slug).toBe('swete_lxx');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('SELECT id, title, language, category FROM corpora'),
				expect.any(Array)
			);
		});

		it('resolves canonical book codes and works', async () => {
			expect(resolveBookCode('genesis')).toBe('GEN');
			expect(resolveBookCode('Gen')).toBe('GEN');
			expect(resolveBookCode('1-corinthians')).toBe('1CO');
			expect(resolveBookCode('1_Cor')).toBe('1CO');
			expect(resolveBookCode('1 Cor')).toBe('1CO');
			expect(resolveBookCode('psalms')).toBe('PSA');
			expect(resolveBookCode('Ps')).toBe('PSA');
			expect(resolveBookCode('Qoh')).toBe('ECC');
			expect(resolveBookCode('Eccl')).toBe('ECC');
			expect(resolveBookCode('Cant')).toBe('SNG');
			expect(resolveBookCode('2Esdr')).toBe('2ES');

			mockQuery.mockResolvedValue([
				{ code: 'GEN', order_index: 1, testament: 'OT', name_english: 'Genesis', total_chapters: 50 },
				{ code: 'PSA', order_index: 19, testament: 'OT', name_english: 'Psalms', total_chapters: 150 },
				{ code: 'MAT', order_index: 60, testament: 'NT', name_english: 'Matthew', total_chapters: 28 }
			]);

			const works = await getCanonicalWorks();
			expect(works).toHaveLength(3);
			expect(works[0].book_key).toBe('GEN');

			const id = await resolveCanonicalWorkId('Gen');
			expect(id).toBe(1);
		});

		it('fetches chapter count via getBookChapters', async () => {
			mockQuery.mockResolvedValueOnce([
				{ total_chapters: 50 }
			]);

			const chaps = await getBookChapters('Gen');
			expect(chaps).toHaveLength(50);
			expect(chaps[0]).toBe(1);
			expect(chaps[49]).toBe(50);
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('SELECT total_chapters FROM canonical_books WHERE code = ?'),
				['GEN']
			);
		});

		it('translates references between versions using text_units alignment join', async () => {
			mockQuery.mockResolvedValueOnce([
				{ native_book: 'Ps', native_chapter: 50, native_verse: 3 }
			]);

			const trans = await translateReference('Ps', 51, 3, 'BHS', 'LXX');
			expect(trans).toEqual({ book: 'Ps', chapter: 50, verse: 3 });
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('FROM text_units a\n\t\t\tJOIN text_units b'),
				['wlc', 'Ps', 'PSA', 51, 51, 3, 3, 'swete_lxx']
			);
		});

		it('returns null when reference translation fails or passage does not exist', async () => {
			mockQuery.mockResolvedValueOnce([]);

			const trans = await translateReference('Gen', 1, 1, 'BHS', 'OpenGNT');
			expect(trans).toBeNull();
		});

		it('retrieves chapter verses from text_units and embeds tokens_json into words', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					work_unit_id: 101,
					corpus_id: 'wlc',
					std_book: 'GEN',
					std_chapter: 1,
					std_verse: 1,
					std_subverse: '',
					native_book: 'Gen',
					native_chapter: 1,
					native_verse: 1,
					verse_label: 'Gen 1:1',
					body: 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃',
					tokens_json: JSON.stringify([
						{ word: 'בְּרֵאשִׁ֖ית', normalized: 'בראשית', strongs: 'H7225', morph: 'Prep-b' }
					])
				},
				{
					work_unit_id: 201,
					corpus_id: 'swete_lxx',
					std_book: 'GEN',
					std_chapter: 1,
					std_verse: 1,
					std_subverse: '',
					native_book: 'Gen',
					native_chapter: 1,
					native_verse: 1,
					verse_label: 'Gen 1:1',
					body: 'ἐν ἀρχῇ ἐποίησεν ὁ θεὸς τὸν οὐρανὸν καὶ τὴν γῆν',
					tokens_json: JSON.stringify([
						{ word: 'ἐν', normalized: 'εν', strongs: 'G1722', morph: 'PREP' }
					])
				}
			]);

			const verses = await getChapterVerses('Gen', 1, ['BHS', 'LXX'], true);
			expect(verses).toHaveLength(2);
			expect(verses[0].version).toBe('BHS');
			expect(verses[1].version).toBe('LXX');
			expect(verses[0].words).toHaveLength(1);
			expect(verses[0].words![0].surface).toBe('בְּרֵאשִׁ֖ית');
			expect(verses[0].words![0].strongs_number).toBe('H7225');
			expect(verses[1].words).toHaveLength(1);
			expect(verses[1].words![0].surface).toBe('ἐν');
			expect(verses[1].words![0].strongs_number).toBe('G1722');

			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('FROM text_units\n\t\t\tWHERE std_book = ? AND std_chapter = ? AND corpus_id IN (?,?)'),
				['GEN', 1, 'wlc', 'swete_lxx']
			);
		});

		it('retrieves parallel Psalm 51 verses with divergent native labels', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					work_unit_id: 1,
					corpus_id: 'kjv',
					std_book: 'PSA',
					std_chapter: 51,
					std_verse: 1,
					std_subverse: '',
					native_book: 'Ps',
					native_chapter: 51,
					native_verse: 1,
					verse_label: 'Ps 51:1',
					body: 'Have mercy upon me, O God, according to thy lovingkindness...',
					tokens_json: null
				},
				{
					work_unit_id: 2,
					corpus_id: 'swete_lxx',
					std_book: 'PSA',
					std_chapter: 51,
					std_verse: 1,
					std_subverse: '',
					native_book: 'Ps',
					native_chapter: 50,
					native_verse: 3,
					verse_label: 'Ps 50:3',
					body: 'ἐλέησόν με ὁ θεός κατὰ τὸ μέγα ἔλεός σου...',
					tokens_json: null
				},
				{
					work_unit_id: 3,
					corpus_id: 'vulgate',
					std_book: 'PSA',
					std_chapter: 51,
					std_verse: 1,
					std_subverse: '',
					native_book: 'Ps',
					native_chapter: 50,
					native_verse: 3,
					verse_label: 'Ps 50:3',
					body: 'Miserere mei, Deus, secundum magnam misericordiam tuam...',
					tokens_json: null
				},
				{
					work_unit_id: 4,
					corpus_id: 'wlc',
					std_book: 'PSA',
					std_chapter: 51,
					std_verse: 1,
					std_subverse: '',
					native_book: 'Ps',
					native_chapter: 51,
					native_verse: 3,
					verse_label: 'Ps 51:3',
					body: 'חָנֵּ֣נִי אֱלֹהִ֣ים כְּחַסְדֶּ֑ךָ...',
					tokens_json: null
				}
			]);

			const verses = await getChapterVerses('Ps', 51, ['KJV', 'LXX', 'Vulgate', 'BHS'], false);
			expect(verses).toHaveLength(4);
			expect(verses[0].verse_label).toBe('51:1');
			expect(verses[1].verse_label).toBe('50:3');
			expect(verses[2].verse_label).toBe('50:3');
			expect(verses[3].verse_label).toBe('51:3');
		});

		it('queries aligned parallel verses for Esther across BHS and LXX under EST', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					work_unit_id: 1,
					corpus_id: 'wlc',
					std_book: 'EST',
					std_chapter: 1,
					std_verse: 1,
					std_subverse: '',
					native_book: 'Esth',
					native_chapter: 1,
					native_verse: 1,
					verse_label: 'Esth 1:1',
					body: 'וַיְהִ֖י בִּימֵ֣י אֲחַשְׁוֵרֹ֑ושׁ',
					tokens_json: null
				},
				{
					work_unit_id: 2,
					corpus_id: 'swete_lxx',
					std_book: 'EST',
					std_chapter: 1,
					std_verse: 1,
					std_subverse: '',
					native_book: 'Esth',
					native_chapter: 1,
					native_verse: 1,
					verse_label: 'Esth 1:1',
					body: 'ἔτους δευτέρου βασιλεύοντος Ἀρταξέρξου',
					tokens_json: null
				}
			]);

			const verses = await getChapterVerses('Esth', 1, ['BHS', 'LXX'], false);
			expect(verses).toHaveLength(2);
			expect(verses[0].version).toBe('BHS');
			expect(verses[0].base_label).toBe('EST 1:1');
			expect(verses[1].version).toBe('LXX');
			expect(verses[1].base_label).toBe('EST 1:1');
		});

		it('queries words for work units via getWordsForWorkUnits', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					id: 101,
					corpus_id: 'wlc',
					tokens_json: JSON.stringify([
						{ word: 'בְּרֵאשִׁ֖ית', normalized: 'בראשית', strongs: 'H7225', morph: 'Prep-b' }
					])
				},
				{
					id: 201,
					corpus_id: 'swete_lxx',
					tokens_json: JSON.stringify([
						{ word: 'ἐν', normalized: 'εν', strongs: 'G1722', morph: 'PREP' }
					])
				}
			]);

			const words = await getWordsForWorkUnits([101, 201]);
			expect(words).toHaveLength(2);
			expect(words[0].surface).toBe('בְּרֵאשִׁ֖ית');
			expect(words[1].surface).toBe('ἐν');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('SELECT id, corpus_id, tokens_json\n\t\t\tFROM text_units\n\t\t\tWHERE id IN (?,?)'),
				[101, 201]
			);
		});

		it('retrieves lemma information by querying lexicon_entries', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					id: 14680,
					dictionary: 'lsj',
					strongs_id: 'G3056',
					lemma: 'λόγος',
					gloss: 'word, speech',
					consonant_key: 'λογος'
				}
			]);

			const lemma = await getLemma('sblgnt', 'λόγος');
			expect(lemma).not.toBeNull();
			expect(lemma?.lemma).toBe('λόγος');
			expect(lemma?.strongs).toBe('G3056');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('SELECT id, dictionary, strongs_id, lemma, gloss, consonant_key\n\t\t\t\tFROM lexicon_entries'),
				['lsj', 'λόγος', 'λόγος']
			);
		});

		it('retrieves word frequency by book from lemma_stats', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					book_counts_json: JSON.stringify([
						{ title: 'Matthew', sbl_abbreviation: 'MAT', count: 33 },
						{ title: 'John', sbl_abbreviation: 'JHN', count: 40 }
					]),
					total_count: 73
				}
			]);

			const freqs = await getWordFrequencyByBook(40, 'λόγος', 'G3056');
			expect(freqs).toHaveLength(2);
			expect(freqs[0].title).toBe('Matthew');
			expect(freqs[1].count).toBe(40);
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('FROM lemma_stats'),
				['ognt', 40, 'G3056', 'G3056']
			);
		});

		it('retrieves total count directly from lemma_stats via getLemmaTotalCount', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					total_count: 917
				}
			]);

			const total = await getLemmaTotalCount(40, 'Ἰησοῦς', 'G2424');
			expect(total).toBe(917);
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('SELECT total_count'),
				['ognt', 40, 'G2424', 'G2424']
			);
		});

		it('retrieves concordance occurrences from concordance_refs', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					work_unit_id: 5001,
					display_label: 'John 1:1',
					ref_label: 'John 1:1'
				}
			]);

			const conc = await getConcordance(40, 'λόγος', 10, 'G3056');
			expect(conc).toHaveLength(1);
			expect(conc[0].display_label).toBe('John 1:1');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('FROM concordance_refs'),
				['ognt', 40, 'G3056', 'G3056', 10]
			);
		});

		it('fetches on-demand verse text via getVerseText', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					text_content: 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃'
				}
			]);

			const body = await getVerseText(58765);
			expect(body).toContain('בְּרֵאשִׁ֖ית');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('SELECT text_content FROM text_units WHERE id = ?'),
				[58765]
			);
		});

		it('looks up BDB with Strongs priority, headword, and stripped key fallbacks', async () => {
			// Case 1: Strongs priority lookup (exact both match)
			mockQuery.mockResolvedValueOnce([
				{
					id: 1,
					dictionary: 'bdb',
					key: 'ראשית',
					headword: 'רֵאשִׁית',
					strongs: 'H7225',
					definition: '<div><p><b>H7225. reshith</b></p><p>beginning, chief</p></div>'
				}
			]);

			const bdbStrongsRes = await getLexiconEntry('bdb', 'בְּרֵאשִׁית', '7225');
			expect(bdbStrongsRes).not.toBeNull();
			expect(bdbStrongsRes?.strongs).toBe('H7225');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining("WHERE dictionary = 'bdb' AND strongs_id = ? AND (lemma = ? OR consonant_key = ?"),
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
				expect.stringContaining("WHERE dictionary = 'bdb' AND lemma = ?"),
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
				expect.stringContaining("WHERE dictionary = 'bdb' AND consonant_key = ?"),
				['ברא']
			);

			// Case 4: LSJ lookup with Greek normalization
			mockQuery.mockResolvedValueOnce([
				{
					id: 4,
					dictionary: 'lsj',
					key: 'ποιεω',
					headword: 'ποιέω',
					strongs: 'G4160',
					definition: '<p>ποιέω to make</p>'
				}
			]);

			const lsjRes = await getLexiconEntry('lsj', 'ποιέω');
			expect(lsjRes).not.toBeNull();
			expect(lsjRes?.key).toBe('ποιεω');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining("WHERE dictionary = 'lsj' AND (consonant_key = ? OR lemma = ?)"),
				['ποιεω', 'ποιέω']
			);
		});

		it('loads BHS and LXX Gen 1:1 word tokens and retrieves correct BDB and LSJ entries', async () => {
			// Mock verse rows for Gen 1:1 in BHS and LXX with tokens_json embedded
			mockQuery.mockResolvedValueOnce([
				{
					work_unit_id: 58765,
					corpus_id: 'wlc',
					std_book: 'GEN',
					std_chapter: 1,
					std_verse: 1,
					std_subverse: '',
					native_book: 'Gen',
					native_chapter: 1,
					native_verse: 1,
					verse_label: 'Gen 1:1',
					body: 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃',
					tokens_json: JSON.stringify([
						{ word: 'בְּרֵאשִׁ֖ית', normalized: 'בראשית', strongs: '7225', morph: 'Prep-b | N-fs' },
						{ word: 'בָּרָ֣א', normalized: 'ברא', strongs: '1254', morph: 'V-qp3ms' }
					])
				},
				{
					work_unit_id: 958890,
					corpus_id: 'swete_lxx',
					std_book: 'GEN',
					std_chapter: 1,
					std_verse: 1,
					std_subverse: '',
					native_book: 'Gen',
					native_chapter: 1,
					native_verse: 1,
					verse_label: 'Gen 1:1',
					body: 'ἐν ἀρχῇ ἐποίησεν ὁ θεὸς τὸν οὐρανὸν καὶ τὴν γῆν',
					tokens_json: JSON.stringify([
						{ word: 'ἐν', normalized: 'ἐν', strongs: 'G1722', morph: 'PREP' },
						{ word: 'ἀρχῇ', normalized: 'ἀρχή', strongs: 'G746', morph: 'N-DSF' },
						{ word: 'ἐποίησεν', normalized: 'ποιέω', strongs: 'G4160', morph: 'V-AAI' }
					])
				}
			]);

			const verses = await getChapterVerses('Gen', 1, ['BHS', 'LXX'], true);
			expect(verses).toHaveLength(2);

			const bhsVerse = verses.find((v) => v.version === 'BHS');
			const lxxVerse = verses.find((v) => v.version === 'LXX');
			expect(bhsVerse).toBeDefined();
			expect(lxxVerse).toBeDefined();

			// Test BHS 1st word: בְּרֵאשִׁ֖ית with Strong's 7225
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
			expect(bhsWord2.position).toBe(1);
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
			expect(lxxWord3.position).toBe(2);
			expect(lxxWord3.surface).toBe('ἐποίησεν');
			expect(lxxWord3.normalized).toBe('ποιέω');

			mockQuery.mockResolvedValueOnce([
				{
					id: 4025,
					dictionary: 'lsj',
					key: 'ποιεω',
					headword: 'ποιέω',
					strongs: 'G4160',
					definition: '**ποιέω**, to make, produce, create'
				}
			]);

			const lsjEntry = await getLexiconEntry('lsj', lxxWord3.normalized || lxxWord3.surface, lxxWord3.strongs_number);
			expect(lsjEntry).not.toBeNull();
			expect(lsjEntry?.key).toBe('ποιεω');
			expect(lsjEntry?.headword).toBe('ποιέω');
			expect(lsjEntry?.definition).toContain('to make');
		});

		it('resolves Roman numeral Vulgate books and LXX dual recension book codes', () => {
			// Vulgate Roman numerals
			expect(resolveBookCode('I Samuel')).toBe('1SA');
			expect(resolveBookCode('II Samuel')).toBe('2SA');
			expect(resolveBookCode('I Kings')).toBe('1KI');
			expect(resolveBookCode('II Kings')).toBe('2KI');
			expect(resolveBookCode('I Chronicles')).toBe('1CH');
			expect(resolveBookCode('II Chronicles')).toBe('2CH');
			expect(resolveBookCode('I Maccabees')).toBe('1MA');
			expect(resolveBookCode('II Maccabees')).toBe('2MA');
			expect(resolveBookCode('I Corinthians')).toBe('1CO');
			expect(resolveBookCode('II Corinthians')).toBe('2CO');
			expect(resolveBookCode('Revelation of John')).toBe('REV');

			// Psalms of Solomon
			expect(resolveBookCode('PsSol')).toBe('PSS');
			expect(resolveBookCode('PssSol')).toBe('PSS');

			// Version-aware dual recensions for LXX vs Western
			expect(resolveBookCode('Sus', 'LXX')).toBe('SUG');
			expect(resolveBookCode('SusTh', 'LXX')).toBe('SUS');
			expect(resolveBookCode('Sus', 'KJV')).toBe('SUS');
			expect(resolveBookCode('Dan', 'LXX')).toBe('DAG');
			expect(resolveBookCode('DanTh', 'LXX')).toBe('DAN');
			expect(resolveBookCode('Dan', 'BHS')).toBe('DAN');
			expect(resolveBookCode('Bel', 'LXX')).toBe('BLG');
			expect(resolveBookCode('BelTh', 'LXX')).toBe('BEL');
			expect(resolveBookCode('Bel', 'KJV')).toBe('BEL');
		});

		it('returns 23 chapters for 2Esdr', async () => {
			const chapters = await getBookChapters('2Esdr');
			expect(chapters).toHaveLength(23);
			expect(chapters[0]).toBe(1);
			expect(chapters[22]).toBe(23);
		});

		it('routes 2Esdr 1 to EZR and 2Esdr 11 to NEH 1', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					work_unit_id: 101,
					corpus_id: 'swete_lxx',
					std_book: 'EZR',
					std_chapter: 1,
					std_verse: 1,
					std_subverse: '',
					native_book: '2Esdr',
					native_chapter: 1,
					native_verse: 1,
					verse_label: '2Esdr 1:1',
					body: 'Ἐν ἔτει πρώτῳ Κύρου',
					tokens_json: null
				}
			]);

			const ezrResults = await getChapterVerses('2Esdr', 1, ['LXX']);
			expect(ezrResults).toHaveLength(1);
			expect(ezrResults[0].base_label).toBe('EZR 1:1');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('WHERE std_book = ? AND std_chapter = ?'),
				['EZR', 1, 'swete_lxx']
			);

			mockQuery.mockResolvedValueOnce([
				{
					work_unit_id: 201,
					corpus_id: 'swete_lxx',
					std_book: 'NEH',
					std_chapter: 1,
					std_verse: 1,
					std_subverse: '',
					native_book: '2Esdr',
					native_chapter: 11,
					native_verse: 1,
					verse_label: '2Esdr 11:1',
					body: 'Λόγοι Νεεμια υἱοῦ Χελκια',
					tokens_json: null
				}
			]);

			const nehResults = await getChapterVerses('2Esdr', 11, ['LXX']);
			expect(nehResults).toHaveLength(1);
			expect(nehResults[0].base_label).toBe('NEH 1:1');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('WHERE std_book = ? AND std_chapter = ?'),
				['NEH', 1, 'swete_lxx']
			);
		});

		it('queries PsSol without legacy work_units fallback', async () => {
			mockQuery.mockResolvedValueOnce([
				{
					work_unit_id: 301,
					corpus_id: 'swete_lxx',
					std_book: 'PSS',
					std_chapter: 1,
					std_verse: 1,
					std_subverse: '',
					native_book: 'PsSol',
					native_chapter: 1,
					native_verse: 1,
					verse_label: 'PsSol 1:1',
					body: 'Ἐβόησα πρὸς κύριον ἐν τῷ θλίβεσθαί με',
					tokens_json: null
				}
			]);

			const pssResults = await getChapterVerses('PsSol', 1, ['LXX']);
			expect(pssResults).toHaveLength(1);
			expect(pssResults[0].base_label).toBe('PSS 1:1');
			expect(pssResults[0].verse_label).toBe('1:1');
		});

		it('handles empty results cleanly without throwing work_units error', async () => {
			mockQuery.mockResolvedValueOnce([]);

			const emptyResults = await getChapterVerses('Gen', 999, ['LXX']);
			expect(emptyResults).toEqual([]);
		});

		it('queries Old Greek vs Theodotion Susanna correctly', async () => {
			// Old Greek Susanna
			mockQuery.mockResolvedValueOnce([
				{
					work_unit_id: 401,
					corpus_id: 'swete_lxx',
					std_book: 'SUG',
					std_chapter: 1,
					std_verse: 6,
					std_subverse: '',
					native_book: 'Sus',
					native_chapter: 1,
					native_verse: 6,
					verse_label: 'Sus 1:6',
					body: 'καὶ ἦν Ἰωακιμ πλούσιος σφόδρα',
					tokens_json: null
				}
			]);

			const sugResults = await getChapterVerses('Sus', 1, ['LXX'], false, 'LXX');
			expect(sugResults).toHaveLength(1);
			expect(sugResults[0].base_label).toBe('SUG 1:6');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining("std_book = 'SUG'"),
				[1, 'swete_lxx']
			);

			// Theodotion Susanna
			mockQuery.mockResolvedValueOnce([
				{
					work_unit_id: 501,
					corpus_id: 'swete_lxx',
					std_book: 'SUS',
					std_chapter: 1,
					std_verse: 1,
					std_subverse: '',
					native_book: 'SusTh',
					native_chapter: 1,
					native_verse: 1,
					verse_label: 'SusTh 1:1',
					body: 'καὶ ἦν ἀνὴρ οἰκῶν ἐν Βαβυλῶνι',
					tokens_json: null
				}
			]);

			const susThResults = await getChapterVerses('SusTh', 1, ['LXX'], false, 'LXX');
			expect(susThResults).toHaveLength(1);
			expect(susThResults[0].base_label).toBe('SUS 1:1');
			expect(mockQuery).toHaveBeenCalledWith(
				expect.stringContaining('WHERE std_book = ? AND std_chapter = ?'),
				['SUS', 1, 'swete_lxx']
			);
		});
	});
});

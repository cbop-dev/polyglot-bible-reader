import { getDbWorker } from './dbWorker';
import { mylog } from '$lib/lemma-ui/env/env';
import { normalizeBookName, getBookForVersion, formatDisplayReference, formatBookAbbreviation } from '$lib/config/bookMapping.js';
import { getStaticCorpusTotalWords, getStaticBookWordStats } from '$lib/config/corpusBookStats';

export interface WorkRow {
	id: number;
	slug: string;
	title: string;
	native_title: string | null;
	language: string;
	work_type: string;
	publication_year: number | null;
}

export interface CanonicalWorkRow {
	id: number;
	slug: string;
	title: string;
	book_key: string;
	testament: string;
	sbl_abbreviation: string;
}

export interface VerseResult {
	base_cref_id: number;
	ord: number;
	hierarchy: string;
	base_label: string;
	version: string;
	work_unit_id: number;
	verse_label: string;
	native_citation?: string;
	body: string;
	words?: WordRow[];
}

export interface WordRow {
	id: number;
	work_id: number;
	work_unit_id: number;
	position: number;
	surface: string;
	normalized: string;
	strongs_number: string;
	morph_code: string;
	lemma?: string;
	gloss?: string;
	trailer?: string;
	indent?: boolean;
	para_break?: boolean;
}

function unpackToken(t: any, rowId: number, corpusId: string, idx: number): WordRow {
	if (Array.isArray(t)) {
		// Tuple format: [word, norm, strongs, morph, lemma, gloss, trailer, flags]
		const word = t[0] || '';
		const norm = t[1] || word;
		const strongs = t[2] || '';
		const morph = t[3] || '';
		const lemma = t[4] || '';
		const gloss = t[5] || '';
		const trailer = t[6] !== undefined ? t[6] : undefined;
		const flags = typeof t[7] === 'number' ? t[7] : 0;
		return {
			id: (rowId * 1000) + idx,
			work_id: getCorpusWorkId(corpusId),
			work_unit_id: rowId,
			position: idx,
			surface: word,
			normalized: norm,
			strongs_number: strongs,
			morph_code: morph,
			lemma,
			gloss,
			trailer,
			indent: (flags & 1) !== 0 ? true : undefined,
			para_break: (flags & 2) !== 0 ? true : undefined
		};
	}
	return {
		id: (rowId * 1000) + idx,
		work_id: getCorpusWorkId(corpusId),
		work_unit_id: rowId,
		position: idx,
		surface: t.word || '',
		normalized: t.normalized || t.word || '',
		strongs_number: t.strongs || '',
		morph_code: t.morph || '',
		lemma: t.lemma || '',
		gloss: t.gloss || '',
		trailer: t.trailer !== undefined ? t.trailer : undefined,
		indent: t.indent,
		para_break: t.para_break
	};
}

export interface LexemeRow {
	id: number;
	corpus: string;
	lex_id: number;
	lemma: string;
	gloss: string;
	pos: number | null;
	strongs: string;
	beta: string;
	plain: string;
	total: number;
}

export interface BookFrequency {
	title: string;
	sbl_abbreviation: string;
	count: number;
	book_words?: number;
}

export interface CorpusBookStat {
	corpus_id: string;
	book_code: string;
	total_words: number;
	total_verses: number;
}

export interface ConcordanceOccurrence {
	work_unit_id: number;
	display_label: string;
	ref_label?: string;
	verse_label?: string;
	body?: string;
	surface?: string;
	position?: number;
}

export interface LexiconEntryRow {
	id: number;
	dictionary: string;
	key: string;
	headword: string;
	strongs?: string;
	lsj_index?: string;
	match_type?: string;
	definition: string;
}

// Mapping from UI version acronyms to database corpus IDs
export const VERSION_MAP: Record<string, string> = {
	BHS: 'wlc',
	bhs: 'wlc',
	wlc: 'wlc',
	LXX: 'swete_lxx',
	lxx: 'swete_lxx',
	'swete-lxx': 'swete_lxx',
	swete_lxx: 'swete_lxx',
	OpenGNT: 'ognt',
	opengnt: 'ognt',
	OGNT: 'ognt',
	ognt: 'ognt',
	SBLGNT: 'ognt',
	sblgnt: 'ognt',
	Vulgate: 'vulgate',
	vulgate: 'vulgate',
	'vulgate-clementine': 'vulgate',
	KJV: 'kjv',
	kjv: 'kjv',
	WEB: 'webbe',
	web: 'webbe',
	webbe: 'webbe',
	Brenton: 'brenton-lxx',
	brenton: 'brenton-lxx',
	'brenton-lxx': 'brenton-lxx'
};

// Reverse mapping from corpus IDs to UI version acronyms
export const SLUG_TO_VERSION: Record<string, string> = {
	wlc: 'BHS',
	swete_lxx: 'LXX',
	'swete-lxx': 'LXX',
	ognt: 'OpenGNT',
	sblgnt: 'OpenGNT',
	vulgate: 'Vulgate',
	'vulgate-clementine': 'Vulgate',
	kjv: 'KJV',
	webbe: 'WEB',
	'brenton-lxx': 'Brenton'
};

// Versions that have word-level tokens in tokens_json
export const VERSIONS_WITH_WORDS = new Set<string>([
	'BHS', 'bhs', 'wlc',
	'LXX', 'lxx', 'swete_lxx', 'swete-lxx',
	'OpenGNT', 'opengnt', 'OGNT', 'ognt',
	'SBLGNT', 'sblgnt',
	'KJV', 'kjv'
]);

// USFM 3-letter codes by alias
export const USFM_ALIASES: Record<string, string> = {
	// OT
	genesis: 'GEN', gen: 'GEN', ge: 'GEN',
	exodus: 'EXO', exod: 'EXO', exo: 'EXO',
	leviticus: 'LEV', lev: 'LEV',
	numbers: 'NUM', num: 'NUM',
	deuteronomy: 'DEU', deut: 'DEU', deu: 'DEU', dt: 'DEU',
	joshua: 'JOS', josh: 'JOS', jos: 'JOS',
	judges: 'JDG', judg: 'JDG', jdg: 'JDG', jdgs: 'JDG', judgs: 'JDG',
	ruth: 'RUT', rut: 'RUT',
	'1samuel': '1SA', '1sam': '1SA', '1sa': '1SA', '1kingdoms': '1SA', '1kgdms': '1SA', isamuel: '1SA', isam: '1SA',
	'2samuel': '2SA', '2sam': '2SA', '2sa': '2SA', '2kingdoms': '2SA', '2kgdms': '2SA', iisamuel: '2SA', iisam: '2SA',
	'1kings': '1KI', '1kgs': '1KI', '1ki': '1KI', '3kingdoms': '1KI', '3kgdms': '1KI', ikings: '1KI', ikgs: '1KI',
	'2kings': '2KI', '2kgs': '2KI', '2ki': '2KI', '4kingdoms': '2KI', '4kgdms': '2KI', iikings: '2KI', iikgs: '2KI',
	'1chronicles': '1CH', '1chr': '1CH', '1ch': '1CH', '1chron': '1CH', ichronicles: '1CH', ichr: '1CH',
	'2chronicles': '2CH', '2chr': '2CH', '2ch': '2CH', '2chron': '2CH', iichronicles: '2CH', iichr: '2CH',
	ezra: 'EZR', ezr: 'EZR',
	nehemiah: 'NEH', neh: 'NEH',
	esther: 'EST', esth: 'EST', est: 'EST',
	job: 'JOB',
	psalms: 'PSA', psalm: 'PSA', ps: 'PSA', psa: 'PSA', psalmi: 'PSA', 'psalms-lxx': 'PSA', 'psalmslxx': 'PSA',
	proverbs: 'PRO', prov: 'PRO', pro: 'PRO',
	ecclesiastes: 'ECC', eccl: 'ECC', ecc: 'ECC', qoh: 'ECC', qoheleth: 'ECC',
	'songofsolomon': 'SNG', song: 'SNG', cant: 'SNG', canticles: 'SNG', sng: 'SNG', 'songofsongs': 'SNG',
	isaiah: 'ISA', isa: 'ISA', is: 'ISA',
	jeremiah: 'JER', jer: 'JER', 'jeremiah-lxx': 'JER', 'jeremiahlxx': 'JER',
	lamentations: 'LAM', lam: 'LAM',
	ezekiel: 'EZK', ezek: 'EZK', ezk: 'EZK',
	daniel: 'DAN', dan: 'DAN', danth: 'DAN',
	hosea: 'HOS', hos: 'HOS',
	joel: 'JOL', joe: 'JOL', jol: 'JOL',
	amos: 'AMO', amo: 'AMO',
	obadiah: 'OBA', obad: 'OBA', oba: 'OBA',
	jonah: 'JON', jon: 'JON',
	micah: 'MIC', mic: 'MIC',
	nahum: 'NAM', nah: 'NAM', nam: 'NAM',
	habakkuk: 'HAB', hab: 'HAB',
	zephaniah: 'ZEP', zeph: 'ZEP', zep: 'ZEP',
	haggai: 'HAG', hag: 'HAG',
	zechariah: 'ZEC', zech: 'ZEC', zec: 'ZEC',
	malachi: 'MAL', mal: 'MAL',

	// Deuterocanon / Apocrypha
	tobit: 'TOB', tob: 'TOB', tobba: 'TOB', tobs: 'TOB',
	judith: 'JDT', jdt: 'JDT',
	'esther(greek)': 'ESG', 'esthergreek': 'ESG', esg: 'ESG', addesth: 'ESG',
	wisdomofsolomon: 'WIS', wisdom: 'WIS', wis: 'WIS', wisd: 'WIS',
	sirach: 'SIR', sir: 'SIR', ecclesiasticus: 'SIR',
	baruch: 'BAR', bar: 'BAR',
	letterofjeremiah: 'LJE', lje: 'LJE', epjer: 'LJE',
	prayerofazariah: 'S3Y', s3y: 'S3Y', prazar: 'S3Y',
	susanna: 'SUS', sus: 'SUS', susth: 'SUS', sug: 'SUG',
	belandthedragon: 'BEL', bel: 'BEL', belth: 'BEL', blg: 'BLG',
	'1maccabees': '1MA', '1mac': '1MA', '1ma': '1MA', '1macc': '1MA', imaccabees: '1MA', imac: '1MA',
	'2maccabees': '2MA', '2mac': '2MA', '2ma': '2MA', '2macc': '2MA', iimaccabees: '2MA', iimac: '2MA',
	'3maccabees': '3MA', '3mac': '3MA', '3ma': '3MA', '3macc': '3MA', iiimaccabees: '3MA',
	'4maccabees': '4MA', '4mac': '4MA', '4ma': '4MA', '4macc': '4MA', ivmaccabees: '4MA',
	'1esdras': '1ES', '1esdr': '1ES', '1es': '1ES', iesdras: '1ES',
	'2esdras': '2ES', '2esdr': '2ES', '2es': '2ES', iiesdras: '2ES',
	prayerofmanasseh: 'MAN', prman: 'MAN', man: 'MAN', prayerofmanasses: 'MAN',
	psalm151: 'PS2', addps: 'PS2', ps151: 'PS2', ps2: 'PS2', additionalpsalm: 'PS2',
	odes: 'ODA', oda: 'ODA', od: 'ODA',
	psalmsofsolomon: 'PSS', pss: 'PSS', pssol: 'PSS', psssol: 'PSS',
	laodiceans: 'LAO', lao: 'LAO',

	// NT
	matthew: 'MAT', matt: 'MAT', mat: 'MAT', mt: 'MAT',
	mark: 'MRK', mrk: 'MRK', mk: 'MRK',
	luke: 'LUK', luk: 'LUK', lk: 'LUK',
	john: 'JHN', jhn: 'JHN', jn: 'JHN',
	acts: 'ACT', act: 'ACT', ac: 'ACT',
	romans: 'ROM', rom: 'ROM', ro: 'ROM',
	'1corinthians': '1CO', '1cor': '1CO', '1co': '1CO', icorinthians: '1CO', icor: '1CO',
	'2corinthians': '2CO', '2cor': '2CO', '2co': '2CO', iicorinthians: '2CO', iicor: '2CO',
	galatians: 'GAL', gal: 'GAL', ga: 'GAL',
	ephesians: 'EPH', eph: 'EPH', ep: 'EPH',
	philippians: 'PHP', php: 'PHP', phil: 'PHP',
	colossians: 'COL', col: 'COL',
	'1thessalonians': '1TH', '1thess': '1TH', '1th': '1TH', ithessalonians: '1TH',
	'2thessalonians': '2TH', '2thess': '2TH', '2th': '2TH', iithessalonians: '2TH',
	'1timothy': '1TI', '1tim': '1TI', '1ti': '1TI', itimothy: '1TI',
	'2timothy': '2TI', '2tim': '2TI', '2ti': '2TI', iitimothy: '2TI',
	titus: 'TIT', tit: 'TIT',
	philemon: 'PHM', phm: 'PHM', phlm: 'PHM',
	hebrews: 'HEB', heb: 'HEB',
	james: 'JAS', jas: 'JAS', jm: 'JAS',
	'1peter': '1PE', '1pet': '1PE', '1pe': '1PE', ipeter: '1PE',
	'2peter': '2PE', '2pet': '2PE', '2pe': '2PE', iipeter: '2PE',
	'1john': '1JN', '1jn': '1JN', ijohn: '1JN',
	'2john': '2JN', '2jn': '2JN', iijohn: '2JN',
	'3john': '3JN', '3jn': '3JN', iiijohn: '3JN',
	jude: 'JUD', jud: 'JUD', jd: 'JUD',
	revelation: 'REV', rev: 'REV', re: 'REV', revelationofjohn: 'REV'
};

export const BOOK_ALIASES = USFM_ALIASES;

export function resolveBookCode(input?: string | null, version?: string): string {
	if (!input) return '';
	const clean = input.trim().toLowerCase().replace(/[\s\-_]+/g, '');

	// Version-aware resolution for LXX dual recensions
	if (version === 'LXX') {
		if (clean === 'sus') return 'SUG';
		if (clean === 'susth') return 'SUS';
		if (clean === 'dan') return 'DAG';
		if (clean === 'danth') return 'DAN';
		if (clean === 'bel') return 'BLG';
		if (clean === 'belth') return 'BEL';
	}

	if (USFM_ALIASES[clean]) return USFM_ALIASES[clean];
	const upper = input.trim().toUpperCase();
	if (upper.length === 3) return upper;
	return '';
}

const CORPUS_WORK_IDS: Record<string, number> = {
	vulgate: 1,
	'vulgate-clementine': 1,
	wlc: 2,
	bhs: 2,
	swete_lxx: 24,
	'swete-lxx': 24,
	lxx: 24,
	ognt: 40,
	opengnt: 40,
	sblgnt: 40,
	kjv: 5,
	webbe: 6,
	'brenton-lxx': 7
};

export function getCorpusWorkId(corpusId: string): number {
	const c = corpusId.toLowerCase();
	return CORPUS_WORK_IDS[c] || 1;
}

export function workIdToCorpusId(workId: number): string {
	switch (workId) {
		case 2: return 'wlc';
		case 24: return 'swete_lxx';
		case 40: return 'ognt';
		case 1: return 'vulgate';
		case 5: return 'kjv';
		case 6: return 'webbe';
		case 7: return 'brenton-lxx';
		default: return 'wlc';
	}
}

// Cached canonical works
let canonicalWorksCache: CanonicalWorkRow[] | null = null;

export function _clearDbClientCache() {
	canonicalWorksCache = null;
}

/**
 * Execute an arbitrary parameterized SQL query against the chunked database.
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
	const worker = await getDbWorker();
	return (worker.db as any).query(sql, params);
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
	const rows = await query<T>(sql, params);
	return rows.length > 0 ? rows[0] : null;
}

/**
 * Fetch all available works in the database from corpora table.
 */
export async function getWorks(): Promise<WorkRow[]> {
	try {
		const rows = await query<{
			id: string;
			title: string;
			language: string;
			category: string;
		}>('SELECT id, title, language, category FROM corpora ORDER BY id');

		if (rows && rows.length > 0) {
			return rows.map((r, idx) => ({
				id: idx + 1,
				slug: r.id,
				title: r.title,
				native_title: null,
				language: r.language,
				work_type: r.category,
				publication_year: null
			}));
		}
	} catch (e) {
		console.warn('[dbClient] Failed to query corpora, falling back to works table:', e);
	}

	return query<WorkRow>(
		'SELECT id, slug, title, native_title, language, work_type, publication_year FROM works ORDER BY id'
	);
}

/**
 * Fetch all canonical works (books of the Bible and deuterocanon).
 */
export async function getCanonicalWorks(): Promise<CanonicalWorkRow[]> {
	if (canonicalWorksCache) return canonicalWorksCache;

	try {
		const rows = await query<{
			code: string;
			order_index: number;
			testament: string;
			name_english: string;
			total_chapters: number;
		}>('SELECT code, order_index, testament, name_english, total_chapters FROM canonical_books ORDER BY order_index');

		if (rows && rows.length > 0) {
			canonicalWorksCache = rows.map((r) => ({
				id: r.order_index,
				slug: r.name_english.toLowerCase().replace(/\s+/g, '-'),
				title: r.name_english,
				book_key: r.code,
				testament: r.testament.toLowerCase(),
				sbl_abbreviation: r.code
			}));
			return canonicalWorksCache;
		}
	} catch (e) {
		console.warn('[dbClient] Failed to query canonical_books, falling back to canonical_works:', e);
	}

	const fallback = await query<CanonicalWorkRow>(
		'SELECT id, slug, title, book_key, testament, sbl_abbreviation FROM canonical_works ORDER BY id'
	);
	canonicalWorksCache = fallback;
	return fallback;
}

/**
 * Resolve any book identifier (abbreviation, slug, or title) to its canonical_work_id.
 */
export async function resolveCanonicalWorkId(
	bookIdentifier: string,
	version?: string
): Promise<number | null> {
	if (!bookIdentifier) return null;
	const code = resolveBookCode(bookIdentifier);
	if (!code) return null;

	const books = await getCanonicalWorks();
	const match = books.find((b) => b.book_key === code || b.sbl_abbreviation === code);
	if (match) return match.id;
	return null;
}

/**
 * Fetch all available chapter numbers for a canonical book and version.
 */
export async function getBookChapters(bookIdentifier: string, version?: string): Promise<number[]> {
	const clean = (bookIdentifier || '').trim().toLowerCase().replace(/[\s\-_]+/g, '');
	if (clean === '2esdr' || clean === '2esdras') {
		return Array.from({ length: 23 }, (_, i) => i + 1);
	}

	const code = resolveBookCode(bookIdentifier, version);
	if (!code) return [];

	if (version) {
		const corpusId = VERSION_MAP[version] || version.toLowerCase();
		try {
			const rows = await query<{ std_chapter: number }>(
				'SELECT DISTINCT std_chapter FROM text_units WHERE std_book = ? AND corpus_id = ? ORDER BY std_chapter',
				[code, corpusId]
			);
			if (rows.length > 0) return rows.map((r) => r.std_chapter);
		} catch (e) {}
	}

	try {
		const row = await queryOne<{ total_chapters: number }>(
			'SELECT total_chapters FROM canonical_books WHERE code = ?',
			[code]
		);
		if (row && row.total_chapters > 0) {
			return Array.from({ length: row.total_chapters }, (_, i) => i + 1);
		}
	} catch (e) {}

	// Fallback to legacy canonical_refs if canonical_books is not available
	const cwId = await resolveCanonicalWorkId(bookIdentifier, version);
	if (!cwId) return [];
	const rows = await query<{ chapter: number }>(`
		SELECT DISTINCT CAST(substr(hierarchy, 1, instr(hierarchy, ',') - 1) AS INTEGER) AS chapter
		FROM canonical_refs
		WHERE canonical_work_id = ?
		ORDER BY chapter
	`, [cwId]);
	return rows.map((r) => r.chapter);
}

export interface TranslatedReference {
	book: string;
	chapter: number;
	verse: number;
}

/**
 * Translates a reference from one version's versification to another using authentic text_units alignment.
 * Cross-tradition mappings (e.g. 2 Esdras <-> Ezra/Nehemiah, Psalm offsets, Jeremiah chapter shifts)
 * are handled entirely by standard coordinates in SQLite text_units without hardcoded client routing.
 * Returns null if the reference cannot be translated to the target version.
 */
export async function translateReference(
	book: string,
	chapter: number,
	verse: number = 1,
	fromVersion: string,
	toVersion: string
): Promise<TranslatedReference | null> {
	if (!book) return null;
	const fromCorpus = VERSION_MAP[fromVersion] || fromVersion.toLowerCase();
	const toCorpus = VERSION_MAP[toVersion] || toVersion.toLowerCase();
	if (fromCorpus === toCorpus) return { book, chapter, verse };

	const code = resolveBookCode(book, fromVersion);
	const resolvedBook = normalizeBookName(book)?.standardAbbrev || book;
	if (!code && !resolvedBook) return null;

	try {
		const rows = await query<{ native_book: string; native_chapter: number; native_verse: number }>(`
			SELECT b.native_book, b.native_chapter, b.native_verse
			FROM text_units a
			JOIN text_units b ON a.std_book = b.std_book AND a.std_chapter = b.std_chapter AND a.std_verse = b.std_verse
			WHERE a.corpus_id = ? 
			  AND (a.native_book = ? COLLATE NOCASE OR a.std_book = ?)
			  AND (a.native_chapter = ? OR a.std_chapter = ?) 
			  AND (a.native_verse = ? OR a.std_verse = ?)
			  AND b.corpus_id = ?
			LIMIT 1
		`, [fromCorpus, resolvedBook, code, chapter, chapter, verse, verse, toCorpus]);

		if (rows.length > 0) {
			return {
				book: rows[0].native_book || book,
				chapter: rows[0].native_chapter,
				verse: rows[0].native_verse
			};
		}
	} catch (err) {
		console.warn('[translateReference] DB query error:', (err as any)?.message || err);
	}

	return null;
}

/**
 * Load aligned parallel chapter verses for specified versions directly from text_units.
 * Coordinates are pre-aligned across traditions using universal standard hub coordinates.
 */
export async function getChapterVerses(
	bookIdentifier: string,
	chapter: number,
	versions: string[],
	includeWords: boolean = true,
	primaryVersion?: string
): Promise<VerseResult[]> {
	const clean = (bookIdentifier || '').trim().toLowerCase().replace(/[\s\-_]+/g, '');
	let targetBook = resolveBookCode(bookIdentifier, primaryVersion);
	let targetChapter = chapter;

	// Cross-tradition 2 Esdras routing:
	// Chapters 1-10 -> EZR (Ezra 1-10)
	// Chapters 11-23 -> NEH (Nehemiah 1-13)
	if (clean === '2esdr' || clean === '2esdras') {
		if (chapter <= 10) {
			targetBook = 'EZR';
			targetChapter = chapter;
		} else {
			targetBook = 'NEH';
			targetChapter = chapter - 10;
		}
	}

	if (!targetBook) {
		console.warn(`[DB] Book not found for identifier: ${bookIdentifier} (version: ${primaryVersion})`);
		return [];
	}

	// Map UI versions to database corpus IDs
	const corpusIds = versions.map((v) => VERSION_MAP[v] || v.toLowerCase());
	const placeholders = corpusIds.map(() => '?').join(',');

	try {
		let bookWhereClause = 'std_book = ?';
		const queryParams: any[] = [targetBook, targetChapter, ...corpusIds];

		// For Greek Old Greek recensions where Greek text is SUG/DAG/BLG but parallels in Vulgate/KJV/MT use SUS/DAN/BEL
		if (targetBook === 'SUG') {
			bookWhereClause = "(std_book = 'SUG' OR (std_book = 'SUS' AND corpus_id != 'swete_lxx'))";
			queryParams.shift();
		} else if (targetBook === 'DAG') {
			bookWhereClause = "(std_book = 'DAG' OR (std_book = 'DAN' AND corpus_id != 'swete_lxx'))";
			queryParams.shift();
		} else if (targetBook === 'BLG') {
			bookWhereClause = "(std_book = 'BLG' OR (std_book = 'BEL' AND corpus_id != 'swete_lxx'))";
			queryParams.shift();
		}

		const sql = `
			SELECT 
				id AS work_unit_id,
				corpus_id,
				std_book,
				std_chapter,
				std_verse,
				std_subverse,
				native_book,
				native_chapter,
				native_verse,
				native_citation AS verse_label,
				text_content AS body,
				tokens_json
			FROM text_units
			WHERE ${bookWhereClause} AND std_chapter = ? AND corpus_id IN (${placeholders})
			ORDER BY std_verse, std_subverse, id
		`;

		const rows = await query<any>(sql, queryParams);

		if (rows && rows.length > 0) {
			const results: VerseResult[] = [];

			for (const row of rows) {
				const versionAcronym = SLUG_TO_VERSION[row.corpus_id] || row.corpus_id;
				const subv = row.std_subverse ? String(row.std_subverse) : '';
				const hierarchy = `${row.std_chapter},${row.std_verse}${subv}`;
				const baseLabel = `${row.std_book} ${row.std_chapter}:${row.std_verse}${subv}`;

				let words: WordRow[] | undefined = undefined;
				if (includeWords && row.tokens_json) {
					try {
						const tokens = typeof row.tokens_json === 'string' ? JSON.parse(row.tokens_json) : row.tokens_json;
						if (Array.isArray(tokens)) {
							words = tokens.map((t: any, idx: number) => unpackToken(t, row.work_unit_id, row.corpus_id, idx));
						}
					} catch (err) {
						console.warn('[dbClient] Failed to parse tokens_json for unit', row.work_unit_id, err);
					}
				}

				const nativeLabel = `${row.native_chapter}:${row.native_verse}${row.native_subverse ? String(row.native_subverse) : ''}`;

				results.push({
					base_cref_id: row.work_unit_id,
					ord: (row.std_chapter * 1000) + row.std_verse,
					hierarchy,
					base_label: baseLabel,
					version: versionAcronym,
					work_unit_id: row.work_unit_id,
					verse_label: nativeLabel,
					native_citation: formatDisplayReference(row.verse_label || (row.native_book ? `${row.native_book} ${nativeLabel}` : nativeLabel), versionAcronym),
					body: row.body,
					words
				});
			}

			return results;
		}
	} catch (e) {
		console.warn('[dbClient] Failed to query text_units:', e);
	}

	return [];
}

/**
 * Fetch word tokens for given work unit IDs.
 * Queries tokens_json from text_units directly.
 */
export async function getWordsForWorkUnits(workUnitIds: number[]): Promise<WordRow[]> {
	if (!workUnitIds || workUnitIds.length === 0) return [];

	const uniqueIds = Array.from(new Set(workUnitIds)).sort((a, b) => a - b);
	if (uniqueIds.length === 0) return [];
	const placeholders = uniqueIds.map(() => '?').join(',');

	try {
		const rows = await query<{ id: number; corpus_id: string; tokens_json: string }>(`
			SELECT id, corpus_id, tokens_json
			FROM text_units
			WHERE id IN (${placeholders})
			ORDER BY id
		`, uniqueIds);

		const allWords: WordRow[] = [];
		for (const row of rows) {
			if (!row.tokens_json) continue;
			try {
				const tokens = typeof row.tokens_json === 'string' ? JSON.parse(row.tokens_json) : row.tokens_json;
				if (Array.isArray(tokens)) {
					tokens.forEach((t: any, idx: number) => {
						allWords.push(unpackToken(t, row.id, row.corpus_id, idx));
					});
				}
			} catch (e) {}
		}
		if (allWords.length > 0) return allWords;
	} catch (e) {
		// Fallback to legacy words table
	}

	const fallbackSql = `
		SELECT id, work_id, work_unit_id, position, surface, normalized, strongs_number, morph_code
		FROM words
		WHERE work_unit_id IN (${placeholders})
		ORDER BY work_unit_id, position
	`;
	return query<WordRow>(fallbackSql, uniqueIds);
}

/**
 * Lookup lexeme entry by lemma, plain form, or strongs.
 * Queries unabridged lexicon_entries table directly.
 */
export async function getLemma(
	corpus: string,
	identifier: string | number,
	strongs?: string
): Promise<LexemeRow | null> {
	if (!identifier && !strongs) return null;
	const dict = (corpus === 'bhs' || corpus === 'wlc' || corpus === 'hebrew') ? 'bdb' : 'lsj';

	try {
		if (strongs) {
			const sClean = String(strongs).trim().toUpperCase();
			const sCode = dict === 'bdb'
				? (sClean.startsWith('H') ? sClean : `H${sClean}`)
				: (sClean.startsWith('G') ? sClean : `G${sClean}`);

			const row = await queryOne<{
				id: number;
				dictionary: string;
				strongs_id: string;
				lemma: string;
				gloss: string;
				consonant_key: string;
			}>(`
				SELECT id, dictionary, strongs_id, lemma, gloss, consonant_key
				FROM lexicon_entries
				WHERE dictionary = ? AND strongs_id = ?
				LIMIT 1
			`, [dict, sCode]);

			if (row) {
				return {
					id: row.id,
					corpus: dict,
					lex_id: row.id,
					lemma: row.lemma,
					gloss: row.gloss,
					pos: null,
					strongs: row.strongs_id,
					beta: '',
					plain: row.consonant_key || '',
					total: 0
				};
			}
		}

		const str = String(identifier).trim();
		if (str) {
			const row = await queryOne<{
				id: number;
				dictionary: string;
				strongs_id: string;
				lemma: string;
				gloss: string;
				consonant_key: string;
			}>(`
				SELECT id, dictionary, strongs_id, lemma, gloss, consonant_key
				FROM lexicon_entries
				WHERE dictionary = ? AND (lemma = ? OR consonant_key = ?)
				LIMIT 1
			`, [dict, str, str]);

			if (row) {
				return {
					id: row.id,
					corpus: dict,
					lex_id: row.id,
					lemma: row.lemma,
					gloss: row.gloss,
					pos: null,
					strongs: row.strongs_id,
					beta: '',
					plain: row.consonant_key || '',
					total: 0
				};
			}
		}
	} catch (e) {
		// Fallback to legacy lexemes table
	}

	// Legacy lexemes query fallback
	if (strongs) {
		const sCode = String(strongs).trim();
		const sWithPrefix = corpus === 'bhs'
			? (sCode.toUpperCase().startsWith('H') ? sCode.toUpperCase() : `H${sCode}`)
			: (sCode.toUpperCase().startsWith('G') ? sCode.toUpperCase() : `G${sCode}`);
		const sNumOnly = sCode.replace(/^[HG]/i, '');

		const rows = await query<LexemeRow>(`
			SELECT id, corpus, lex_id, lemma, gloss, pos, strongs, beta, plain, total
			FROM lexemes
			WHERE corpus = ? AND (strongs = ? OR strongs = ?)
			LIMIT 1
		`, [corpus, sWithPrefix, sNumOnly]);
		if (rows.length > 0) return rows[0];
	}

	const rows = await query<LexemeRow>(`
		SELECT id, corpus, lex_id, lemma, gloss, pos, strongs, beta, plain, total
		FROM lexemes
		WHERE corpus = ? AND (lemma = ? OR plain = ?)
		LIMIT 1
	`, [corpus, String(identifier), String(identifier)]);
	return rows.length > 0 ? rows[0] : null;
}

/**
 * Retrieve total occurrence count of a lemma directly from lemma_stats.total_count.
 */
export async function getLemmaTotalCount(
	workId: number,
	lemma: string,
	strongs?: string
): Promise<number> {
	if (!workId) return 0;
	const corpusId = workIdToCorpusId(workId);

	try {
		// 1. Check pre-computed lemma_stats by strongs first
		if (strongs && strongs.trim()) {
			const sNorm = strongs.trim().toUpperCase();
			const sCode = sNorm.startsWith('H') || sNorm.startsWith('G')
				? sNorm
				: (workId === 2 ? `H${sNorm}` : `G${sNorm}`);

			const statRow = await queryOne<{ total_count: number }>(`
				SELECT total_count
				FROM lemma_stats
				WHERE corpus_id = ? AND (strongs = ? OR strongs = ?)
				LIMIT 1
			`, [corpusId, sCode, sNorm]);

			if (statRow && typeof statRow.total_count === 'number') {
				return statRow.total_count;
			}
		}

		// 2. Check pre-computed lemma_stats by lemma (including pseudo-strongs WORD:<lemma>)
		if (lemma && lemma.trim()) {
			const lTrim = lemma.trim();
			const lNFC = lTrim.normalize('NFC');
			const pseudoStrongs = `WORD:${lTrim}`;
			const statRow = await queryOne<{ total_count: number }>(`
				SELECT total_count
				FROM lemma_stats
				WHERE corpus_id = ? AND (lemma = ? OR lemma = ? OR strongs = ?)
				LIMIT 1
			`, [corpusId, lTrim, lNFC, pseudoStrongs]);

			if (statRow && typeof statRow.total_count === 'number') {
				return statRow.total_count;
			}
		}

		// 3. Fallback: count from indexed concordance_refs
		if (lemma || strongs) {
			const occs = await getConcordance(workId, lemma, 0, strongs);
			return occs ? occs.length : 0;
		}
	} catch (e) {
		// In non-browser / mock environment, gracefully return 0
	}

	return 0;
}

/**
 * Retrieve frequency distribution of a lemma grouped by canonical biblical book.
 */
export async function getWordFrequencyByBook(
	workId: number,
	lemma: string,
	strongs?: string
): Promise<BookFrequency[]> {
	if (!workId) return [];
	const corpusId = workIdToCorpusId(workId);

	const formatItems = (raw: any): BookFrequency[] => {
		if (!Array.isArray(raw)) return [];
		const ver = SLUG_TO_VERSION[corpusId] || corpusId;
		return raw.map((item: any) => {
			let bCode = '';
			let count = 0;
			let bookWords = 0;
			if (Array.isArray(item)) {
				bCode = item[0] || '';
				count = item[1] || 0;
			} else {
				bCode = item.sbl_abbreviation || item.title || '';
				count = item.count || 0;
				bookWords = item.book_words || 0;
			}
			const canon = normalizeBookName(bCode);
			const abbrev = formatBookAbbreviation(getBookForVersion(bCode, ver));
			const words = bookWords || getStaticBookWordStats(corpusId, canon?.usfm || bCode)?.words || 0;
			return {
				title: canon?.title || bCode,
				sbl_abbreviation: abbrev || formatBookAbbreviation(bCode),
				count,
				book_words: words
			};
		});
	};

	// 1. Check pre-computed lemma_stats by strongs first
	if (strongs && strongs.trim()) {
		const sNorm = strongs.trim().toUpperCase();
		const sCode = sNorm.startsWith('H') || sNorm.startsWith('G')
			? sNorm
			: (workId === 2 ? `H${sNorm}` : `G${sNorm}`);

		const statRow = await queryOne<{ book_counts_json: string; total_count: number }>(`
			SELECT book_counts_json, total_count
			FROM lemma_stats
			WHERE corpus_id = ? AND (strongs = ? OR strongs = ?)
			LIMIT 1
		`, [corpusId, sCode, sNorm]);

		if (statRow?.book_counts_json) {
			try {
				return formatItems(JSON.parse(statRow.book_counts_json));
			} catch {}
		}
	}

	// 2. Check pre-computed lemma_stats by lemma (including pseudo-strongs WORD:<lemma>)
	if (lemma && lemma.trim()) {
		const lTrim = lemma.trim();
		const lNFC = lTrim.normalize('NFC');
		const pseudoStrongs = `WORD:${lTrim}`;
		const statRow = await queryOne<{ book_counts_json: string; total_count: number }>(`
			SELECT book_counts_json, total_count
			FROM lemma_stats
			WHERE corpus_id = ? AND (lemma = ? OR lemma = ? OR strongs = ?)
			LIMIT 1
		`, [corpusId, lTrim, lNFC, pseudoStrongs]);

		if (statRow?.book_counts_json) {
			try {
				return formatItems(JSON.parse(statRow.book_counts_json));
			} catch {}
		}
	}

	// 3. Fallback: aggregate from indexed concordance_refs (fast indexed lookup)
	if (lemma || strongs) {
		try {
			const occs = await getConcordance(workId, lemma, 0, strongs);
			if (occs && occs.length > 0) {
				const bookMap = new Map<string, { title: string; count: number }>();
				for (const occ of occs) {
					const ref = occ.ref_label || occ.display_label || '';
					const parts = ref.split(' ');
					const bAbbrev = parts[0] || 'Unknown';
					const existing = bookMap.get(bAbbrev);
					if (existing) {
						existing.count++;
					} else {
						bookMap.set(bAbbrev, { title: bAbbrev, count: 1 });
					}
				}
				const items = Array.from(bookMap.entries())
					.map(([bCode, val]) => ({
						title: val.title,
						sbl_abbreviation: bCode,
						count: val.count
					}))
					.sort((a, b) => b.count - a.count);
				return formatItems(items);
			}
		} catch (e) {
			console.warn('[dbClient] Fallback concordance aggregation error:', e);
		}
	}

	return [];
}

/**
 * Retrieve total words in a corpus.
 */
export async function getCorpusTotalWords(corpusId: string): Promise<number> {
	if (!corpusId) return 0;
	try {
		const row = await queryOne<{ total: number }>(`
			SELECT SUM(total_words) as total
			FROM corpus_book_stats
			WHERE corpus_id = ?
		`, [corpusId.toLowerCase()]);
		if (row && row.total > 0) return row.total;
	} catch (e) {}

	return getStaticCorpusTotalWords(corpusId);
}

/**
 * Retrieve total words for a specific book in a corpus.
 */
export async function getCorpusBookWords(corpusId: string, bookIdentifier: string): Promise<number> {
	if (!corpusId || !bookIdentifier) return 0;
	const code = resolveBookCode(bookIdentifier);
	if (!code) return 0;

	try {
		const row = await queryOne<{ total_words: number }>(`
			SELECT total_words
			FROM corpus_book_stats
			WHERE corpus_id = ? AND book_code = ?
			LIMIT 1
		`, [corpusId.toLowerCase(), code.toUpperCase()]);
		if (row && row.total_words > 0) return row.total_words;
	} catch (e) {}

	const stat = getStaticBookWordStats(corpusId, code);
	return stat ? stat.words : 0;
}

/**
 * Retrieve sample concordance occurrences containing a specific lemma or Strong's ID.
 */
export async function getConcordance(
	workId: number,
	lemma: string,
	limit: number = 0,
	strongs?: string
): Promise<ConcordanceOccurrence[]> {
	if (!workId) return [];
	const corpusId = workIdToCorpusId(workId);
	const ver = SLUG_TO_VERSION[corpusId] || corpusId;

	const hasLimit = typeof limit === 'number' && limit > 0;
	const limitSql = hasLimit ? `LIMIT ?` : '';
	const limitParams = hasLimit ? [limit] : [];

	// 1. Try pre-indexed concordance_refs by strongs
	if (strongs && strongs.trim()) {
		const sNorm = strongs.trim().toUpperCase();
		const sCode = sNorm.startsWith('H') || sNorm.startsWith('G')
			? sNorm
			: (workId === 2 ? `H${sNorm}` : `G${sNorm}`);

		const rows = await query<ConcordanceOccurrence>(`
			SELECT ref_label, ref_label AS display_label, work_unit_id
			FROM concordance_refs
			WHERE corpus_id = ? AND (strongs = ? OR strongs = ?)
			ORDER BY work_unit_id
			${limitSql}
		`, [corpusId, sCode, sNorm, ...limitParams]);

		if (rows.length > 0) {
			return rows.map((r) => ({
				...r,
				display_label: formatDisplayReference(r.ref_label, ver)
			}));
		}
	}

	// 2. Try pre-indexed concordance_refs by lemma or pseudo-strongs
	if (lemma && lemma.trim()) {
		const cleanLemma = lemma.trim();
		const cleanNFC = cleanLemma.normalize('NFC');
		const pseudoStrongs = `WORD:${cleanLemma}`;

		const rows = await query<ConcordanceOccurrence>(`
			SELECT ref_label, ref_label AS display_label, work_unit_id
			FROM concordance_refs
			WHERE corpus_id = ? AND (lemma = ? OR lemma = ? OR strongs = ?)
			ORDER BY work_unit_id
			${limitSql}
		`, [corpusId, cleanLemma, cleanNFC, pseudoStrongs, ...limitParams]);

		if (rows.length > 0) {
			return rows.map((r) => ({
				...r,
				display_label: formatDisplayReference(r.ref_label, ver)
			}));
		}
	}

	return [];
}

/**
 * Fetch the verse body text for a single work unit ID on demand.
 */
export async function getVerseText(workUnitId: number): Promise<string | null> {
	if (!workUnitId) return null;
	try {
		const row = await queryOne<{ text_content: string }>(
			'SELECT text_content FROM text_units WHERE id = ? LIMIT 1',
			[workUnitId]
		);
		if (row) return row.text_content;
	} catch (e) {}

	const row = await queryOne<{ body: string }>(
		'SELECT body FROM work_units WHERE id = ? LIMIT 1',
		[workUnitId]
	);
	return row ? row.body : null;
}

/**
 * Strips Hebrew niqqud and cantillation marks
 */
export function removeHebrewDiacritics(str: string): string {
	if (!str) return '';
	return str.replace(/[\u0591-\u05C7]/g, '').trim();
}

/**
 * Normalizes polytonic Greek text to plain unaccented lowercase Greek
 */
export function normalizeGreek(str: string): string {
	if (!str) return '';
	return str
		.normalize('NFD')
		.replace(/[\u0300-\u036f\u0313\u0314\u0342\u0345\u0308\u0304\u0305\u0306'⸂⸃⸆⸇⸀⸁⸄⸅⸈⸉⸊⸋\[\]⟦⟧⟨⟩\(\)†‡*0-9\s.,;·:!?\-—]+/gu, '')
		.toLowerCase()
		.replace(/ς/g, 'σ')
		.trim();
}

/**
 * Retrieve unabridged lexicon entry (BDB or LSJ).
 */
export async function getLexiconEntry(
	dictionary: 'bdb' | 'lsj',
	key: string,
	strongs?: string
): Promise<LexiconEntryRow | null> {
	if (!key && !strongs) return null;
	const dict = dictionary.toLowerCase() as 'bdb' | 'lsj';

	if (dict === 'bdb') {
		let sId = strongs?.trim() || '';
		if (!sId && key && /^H?\d+[a-z]?$/i.test(key.trim())) {
			sId = key.trim();
		}
		const trimmedKey = key?.trim() || '';
		const cleanKey = trimmedKey ? removeHebrewDiacritics(trimmedKey) : '';

		// 1. Prioritize Strong's ID
		if (sId) {
			const sCode = sId.toUpperCase().startsWith('H') ? sId.toUpperCase() : `H${sId}`;

			// 1a. Prioritize matching BOTH strongs AND key/headword
			if (trimmedKey || cleanKey) {
				const exactBoth = await query<LexiconEntryRow>(
					`SELECT id, dictionary, consonant_key AS key, lemma AS headword, strongs_id AS strongs, definition
					 FROM lexicon_entries
					 WHERE dictionary = 'bdb' AND strongs_id = ? AND (lemma = ? OR consonant_key = ? OR lemma = ? OR consonant_key = ?)
					 LIMIT 1`,
					[sCode, trimmedKey, trimmedKey, cleanKey, cleanKey]
				);
				if (exactBoth.length > 0) return exactBoth[0];
			}

			// 1b. If no exact both match, query by strongs alone
			const rows = await query<LexiconEntryRow>(
				`SELECT id, dictionary, consonant_key AS key, lemma AS headword, strongs_id AS strongs, definition
				 FROM lexicon_entries
				 WHERE dictionary = 'bdb' AND strongs_id = ?
				 LIMIT 1`,
				[sCode]
			);
			if (rows.length > 0) return rows[0];
		}

		// 2. Direct lookup of headword/lemma field
		if (trimmedKey) {
			const headwordRows = await query<LexiconEntryRow>(
				`SELECT id, dictionary, consonant_key AS key, lemma AS headword, strongs_id AS strongs, definition
				 FROM lexicon_entries
				 WHERE dictionary = 'bdb' AND lemma = ?
				 LIMIT 1`,
				[trimmedKey]
			);
			if (headwordRows.length > 0) return headwordRows[0];

			// 3. Consonants key lookup
			if (cleanKey) {
				const keyRows = await query<LexiconEntryRow>(
					`SELECT id, dictionary, consonant_key AS key, lemma AS headword, strongs_id AS strongs, definition
					 FROM lexicon_entries
					 WHERE dictionary = 'bdb' AND consonant_key = ?
					 LIMIT 1`,
					[cleanKey]
				);
				if (keyRows.length > 0) return keyRows[0];
			}
		}
		return null;
	}

	if (dict === 'lsj') {
		let sId = strongs?.trim() || '';
		if (!sId && key && /^G?\d+[a-z]?$/i.test(key.trim())) {
			sId = key.trim();
		}
		if (sId) {
			const sCode = sId.toUpperCase().startsWith('G') ? sId.toUpperCase() : `G${sId}`;
			const rows = await query<LexiconEntryRow>(
				`SELECT id, dictionary, consonant_key AS key, lemma AS headword, strongs_id AS strongs, definition
				 FROM lexicon_entries
				 WHERE dictionary = 'lsj' AND strongs_id = ?
				 LIMIT 1`,
				[sCode]
			);
			if (rows.length > 0) return rows[0];
		}

		if (key && key.trim()) {
			const cleanKey = normalizeGreek(key);
			const rows = await query<LexiconEntryRow>(
				`SELECT id, dictionary, consonant_key AS key, lemma AS headword, strongs_id AS strongs, definition
				 FROM lexicon_entries
				 WHERE dictionary = 'lsj' AND (consonant_key = ? OR lemma = ?)
				 LIMIT 1`,
				[cleanKey, key.trim()]
			);
			if (rows.length > 0) return rows[0];
		}
		return null;
	}

	return null;
}

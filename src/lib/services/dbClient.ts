import { getDbWorker } from './dbWorker';

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
}

export interface ConcordanceOccurrence {
	work_unit_id: number;
	display_label: string;
	verse_label: string;
	body: string;
	surface: string;
	position: number;
}

// Mapping from UI version acronyms to database work slugs
export const VERSION_MAP: Record<string, string> = {
	BHS: 'wlc',
	LXX: 'swete-lxx',
	SBLGNT: 'sblgnt',
	Vulgate: 'vulgate-clementine',
	KJV: 'kjv',
	WEB: 'webbe',
	Brenton: 'brenton-lxx'
};

// Reverse mapping from work slugs to UI version acronyms
export const SLUG_TO_VERSION: Record<string, string> = {
	'wlc': 'BHS',
	'swete-lxx': 'LXX',
	'sblgnt': 'SBLGNT',
	'vulgate-clementine': 'Vulgate',
	'kjv': 'KJV',
	'webbe': 'WEB',
	'brenton-lxx': 'Brenton'
};

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

/**
 * Fetch all available works in the database.
 */
export async function getWorks(): Promise<WorkRow[]> {
	return query<WorkRow>(
		'SELECT id, slug, title, native_title, language, work_type, publication_year FROM works ORDER BY id'
	);
}

/**
 * Fetch all canonical works (books of the Bible and deuterocanon).
 */
export async function getCanonicalWorks(): Promise<CanonicalWorkRow[]> {
	if (canonicalWorksCache) return canonicalWorksCache;
	const rows = await query<CanonicalWorkRow>(
		'SELECT id, slug, title, book_key, testament, sbl_abbreviation FROM canonical_works ORDER BY id'
	);
	canonicalWorksCache = rows;
	return rows;
}

function cleanNorm(str: string): string {
	return str.trim().toLowerCase().replace(/[\s\-_]+/g, '');
}

/**
 * Resolve any book identifier (abbreviation, slug, or title) to its canonical_work_id.
 */
export async function resolveCanonicalWorkId(bookIdentifier: string): Promise<number | null> {
	if (!bookIdentifier) return null;
	const books = await getCanonicalWorks();
	const norm = cleanNorm(bookIdentifier);

	// Exact slug match (e.g. '1-corinthians' -> '1corinthians')
	const bySlug = books.find((b) => cleanNorm(b.slug) === norm);
	if (bySlug) return bySlug.id;

	// SBL abbreviation match (e.g. '1 Cor', 'Gen', 'Matt')
	const byAbbrev = books.find((b) => b.sbl_abbreviation && cleanNorm(b.sbl_abbreviation) === norm);
	if (byAbbrev) return byAbbrev.id;

	// Title match (e.g. '1 Corinthians')
	const byTitle = books.find((b) => cleanNorm(b.title) === norm);
	if (byTitle) return byTitle.id;

	// Partial match on slug
	const byPartial = books.find((b) => cleanNorm(b.slug).includes(norm));
	if (byPartial) return byPartial.id;

	return null;
}

/**
 * Fetch all available chapter numbers for a canonical book.
 */
export async function getBookChapters(bookIdentifier: string): Promise<number[]> {
	const cwId = await resolveCanonicalWorkId(bookIdentifier);
	if (!cwId) return [];
	const rows = await query<{ chapter: number }>(`
		SELECT DISTINCT CAST(substr(hierarchy, 1, instr(hierarchy, ',') - 1) AS INTEGER) AS chapter
		FROM canonical_refs
		WHERE canonical_work_id = ?
		ORDER BY chapter
	`, [cwId]);
	return rows.map((r) => r.chapter);
}

/**
 * Load aligned parallel chapter verses for specified versions.
 * Integrates TVTMS versification mappings so divergent verses align side-by-side.
 */
export async function getChapterVerses(
	bookIdentifier: string,
	chapter: number,
	versions: string[],
	includeWords: boolean = true
): Promise<VerseResult[]> {
	const cwId = await resolveCanonicalWorkId(bookIdentifier);
	if (!cwId) {
		console.warn(`[DB] Book not found for identifier: ${bookIdentifier}`);
		return [];
	}

	// Translate UI versions (e.g. 'BHS', 'LXX') to database work slugs (e.g. 'wlc', 'swete-lxx')
	const workSlugs = versions.map((v) => VERSION_MAP[v] || v);
	const slugPlaceholders = workSlugs.map(() => '?').join(',');

	const sql = `
		WITH target_refs AS (
			SELECT id, ord, hierarchy, display_label
			FROM canonical_refs
			WHERE canonical_work_id = ? AND (hierarchy = ? OR hierarchy LIKE ?)
		),
		mapped_refs AS (
			SELECT vm.to_canonical_ref_id AS target_cref_id, vm.from_canonical_ref_id AS aligned_cref_id
			FROM versification_mappings vm
			JOIN target_refs tr ON vm.to_canonical_ref_id = tr.id
			UNION
			SELECT vm.from_canonical_ref_id AS target_cref_id, vm.to_canonical_ref_id AS aligned_cref_id
			FROM versification_mappings vm
			JOIN target_refs tr ON vm.from_canonical_ref_id = tr.id
		),
		variant_identity_refs AS (
			SELECT tr.id AS target_cref_id, cr_alt.id AS aligned_cref_id
			FROM target_refs tr
			JOIN canonical_works cw_main ON cw_main.id = ?
			JOIN canonical_works cw_alt ON (
				cw_alt.slug = cw_main.slug || '-lxx' OR cw_main.slug = cw_alt.slug || '-lxx'
			)
			JOIN canonical_refs cr_alt ON cr_alt.canonical_work_id = cw_alt.id AND cr_alt.hierarchy = tr.hierarchy
			WHERE NOT EXISTS (
				SELECT 1 FROM mapped_refs mr
				JOIN canonical_refs cr_mapped ON mr.aligned_cref_id = cr_mapped.id
				WHERE mr.target_cref_id = tr.id AND cr_mapped.canonical_work_id = cw_alt.id
			)
		),
		aligned_refs AS (
			SELECT id AS target_cref_id, id AS aligned_cref_id FROM target_refs
			UNION
			SELECT * FROM mapped_refs
			UNION
			SELECT * FROM variant_identity_refs
		)
		SELECT 
			tr.id AS base_cref_id,
			tr.ord,
			tr.hierarchy,
			tr.display_label AS base_label,
			w.slug AS version,
			wu.id AS work_unit_id,
			wu.label AS verse_label,
			wu.body
		FROM target_refs tr
		JOIN aligned_refs ar ON ar.target_cref_id = tr.id
		JOIN work_units wu ON wu.canonical_ref_id = ar.aligned_cref_id
		JOIN works w ON wu.work_id = w.id
		WHERE w.slug IN (${slugPlaceholders})
		ORDER BY tr.ord, w.id;
	`;

	const params = [cwId, String(chapter), `${chapter},%`, cwId, ...workSlugs];
	const rows = await query<VerseResult>(sql, params);

	// Remap version slug back to UI version acronym (e.g. 'wlc' -> 'BHS')
	for (const row of rows) {
		row.version = SLUG_TO_VERSION[row.version] || row.version;
	}

	if (includeWords && rows.length > 0) {
		const wuIds = rows.map((r) => r.work_unit_id);
		const words = await getWordsForWorkUnits(wuIds);
		const wordsByUnit = new Map<number, WordRow[]>();
		for (const w of words) {
			const arr = wordsByUnit.get(w.work_unit_id) || [];
			arr.push(w);
			wordsByUnit.set(w.work_unit_id, arr);
		}
		for (const row of rows) {
			row.words = wordsByUnit.get(row.work_unit_id) || [];
		}
	}

	return rows;
}

/**
 * Fetch word tokens with morphology and Strong's IDs for given work unit IDs.
 */
export async function getWordsForWorkUnits(workUnitIds: number[]): Promise<WordRow[]> {
	if (!workUnitIds || workUnitIds.length === 0) return [];
	const placeholders = workUnitIds.map(() => '?').join(',');
	const sql = `
		SELECT id, work_id, work_unit_id, position, surface, normalized, strongs_number, morph_code
		FROM words
		WHERE work_unit_id IN (${placeholders})
		ORDER BY work_unit_id, position
	`;
	return query<WordRow>(sql, workUnitIds);
}

/**
 * Lookup lexeme entry by lemma, plain form, or lex_id in the lexemes table.
 */
export async function getLemma(
	corpus: string,
	identifier: string | number
): Promise<LexemeRow | null> {
	if (!identifier) return null;
	const isNumeric = typeof identifier === 'number' || /^\d+$/.test(String(identifier));
	let sql: string;
	let params: any[];

	if (isNumeric) {
		sql = `
			SELECT id, corpus, lex_id, lemma, gloss, pos, strongs, beta, plain, total
			FROM lexemes
			WHERE corpus = ? AND lex_id = ?
			LIMIT 1
		`;
		params = [corpus, Number(identifier)];
	} else {
		sql = `
			SELECT id, corpus, lex_id, lemma, gloss, pos, strongs, beta, plain, total
			FROM lexemes
			WHERE corpus = ? AND (lemma = ? OR plain = ?)
			LIMIT 1
		`;
		params = [corpus, String(identifier), String(identifier)];
	}

	const rows = await query<LexemeRow>(sql, params);
	return rows.length > 0 ? rows[0] : null;
}

/**
 * Retrieve frequency distribution of a lemma grouped by canonical biblical book.
 */
export async function getWordFrequencyByBook(
	workId: number,
	lemma: string
): Promise<BookFrequency[]> {
	const sql = `
		SELECT 
			COALESCE(cw_parent.title, cw.title) AS title, 
			COALESCE(cw_parent.sbl_abbreviation, cw.sbl_abbreviation) AS sbl_abbreviation, 
			count(*) as count
		FROM words wd
		JOIN work_units wu ON wd.work_unit_id = wu.id
		JOIN canonical_refs cr ON wu.canonical_ref_id = cr.id
		JOIN canonical_works cw ON cr.canonical_work_id = cw.id
		LEFT JOIN canonical_works cw_parent ON cw.slug = cw_parent.slug || '-lxx'
		WHERE wd.work_id = ? AND wd.normalized = ?
		GROUP BY COALESCE(cw_parent.id, cw.id)
		ORDER BY COALESCE(cw_parent.id, cw.id)
	`;
	return query<BookFrequency>(sql, [workId, lemma]);
}

/**
 * Retrieve sample concordance verses containing a specific lemma.
 */
export async function getConcordance(
	workId: number,
	lemma: string,
	limit: number = 25
): Promise<ConcordanceOccurrence[]> {
	const sql = `
		SELECT 
			wu.id AS work_unit_id,
			cr.display_label,
			wu.label AS verse_label,
			wu.body,
			wd.surface,
			wd.position
		FROM words wd
		JOIN work_units wu ON wd.work_unit_id = wu.id
		JOIN canonical_refs cr ON wu.canonical_ref_id = cr.id
		WHERE wd.work_id = ? AND wd.normalized = ?
		ORDER BY cr.ord
		LIMIT ?
	`;
	return query<ConcordanceOccurrence>(sql, [workId, lemma, limit]);
}

import { getDbWorker } from './dbWorker';
import { mylog } from '$lib/lemma-ui/env/env';
import { normalizeBookName, getMappedReference } from '$lib/bookMapping.js';

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

// Versions that have word-level tokens in the words table
export const VERSIONS_WITH_WORDS = new Set<string>([
	'BHS', 'wlc',
	'LXX', 'swete-lxx',
	'SBLGNT', 'sblgnt',
	'KJV', 'kjv'
]);

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
//	mylog(`query db:`, true);
	return (worker.db as any).query(sql, params);
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
	const rows = await query<T>(sql, params);
	return rows.length > 0 ? rows[0] : null;
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
//	mylog(`dbClient.getCanonicalWorks(): [${rows.map((w)=>w.id+"="+w.slug).join(',')}]`,true);
	canonicalWorksCache = rows;
	return rows;
}

function cleanNorm(str?: string | null): string {
	if (!str) return '';
	return str.trim().toLowerCase().replace(/[\s\-_]+/g, '');
}

export const BOOK_ALIASES: Record<string, string> = {
	qoh: 'ecclesiastes',
	eccl: 'ecclesiastes',
	cant: 'song-of-solomon',
	song: 'song-of-solomon',
	pssol: 'psalms-of-solomon',
	epjer: 'letter-of-jeremiah',
	'1mac': '1-maccabees',
	'2mac': '2-maccabees',
	'3mac': '3-maccabees',
	'4mac': '4-maccabees',
	'1esdr': '1-esdras',
	'2esdr': '2-esdras',
	tobba: 'tobit',
	tobs: 'tobit',
	tob: 'tobit',
	danth: 'daniel',
	susth: 'susanna',
	sus: 'susanna',
	belth: 'bel-and-the-dragon',
	bel: 'bel-and-the-dragon',
	addesth: 'esther-greek',
	prman: 'prayer-of-manasseh',
	prazar: 'prayer-of-azariah',
	addps: 'psalm-151',
	ps151: 'psalm-151'
};

export const LXX_VARIANT_BOOKS: Record<string, string> = {
	psalms: 'psalms-lxx',
	jeremiah: 'jeremiah-lxx',
	job: 'job-lxx',
	esther:'esther-greek'
};

/**
 * Resolve any book identifier (abbreviation, slug, or title) to its canonical_work_id.
 * If version is provided (e.g. 'LXX' or 'Brenton'), resolves variant canonical works
 * (e.g. 'psalms-lxx', 'jeremiah-lxx', 'job-lxx').
 */
export async function resolveCanonicalWorkId(
	bookIdentifier: string,
	version?: string
): Promise<number | null> {
	if (!bookIdentifier) return null;
	const books = await getCanonicalWorks();
	const norm = cleanNorm(bookIdentifier);
	const canonical = normalizeBookName(bookIdentifier);
	let targetSlug = canonical ? cleanNorm(canonical.slug) : cleanNorm(BOOK_ALIASES[norm] || norm);

	const isLxx = version === 'LXX' || version === 'Brenton' || version === 'swete-lxx' || version === 'brenton-lxx';
	if (isLxx) {
		if (LXX_VARIANT_BOOKS[targetSlug]) {
			targetSlug = cleanNorm(LXX_VARIANT_BOOKS[targetSlug]);
		} else if (targetSlug === 'ezra' || targetSlug === 'nehemiah') {
			targetSlug = '2-esdras';
		}
	}

	// Exact slug match (e.g. '1-corinthians' -> '1corinthians')
	const bySlug = books.find((b) => cleanNorm(b.slug) === targetSlug);
	if (bySlug) return bySlug.id;

	// SBL abbreviation match (e.g. '1 Cor', 'Gen', 'Matt')
	const byAbbrev = books.find((b) => b.sbl_abbreviation && cleanNorm(b.sbl_abbreviation) === norm);
	if (byAbbrev) {
		if (isLxx && LXX_VARIANT_BOOKS[cleanNorm(byAbbrev.slug)]) {
			const lxxSlug = cleanNorm(LXX_VARIANT_BOOKS[cleanNorm(byAbbrev.slug)]);
			const lxxBook = books.find((b) => cleanNorm(b.slug) === lxxSlug);
			if (lxxBook) return lxxBook.id;
		}
		return byAbbrev.id;
	}

	// Title match (e.g. '1 Corinthians')
	const byTitle = books.find((b) => cleanNorm(b.title) === norm);
	if (byTitle) {
		if (isLxx && LXX_VARIANT_BOOKS[cleanNorm(byTitle.slug)]) {
			const lxxSlug = cleanNorm(LXX_VARIANT_BOOKS[cleanNorm(byTitle.slug)]);
			const lxxBook = books.find((b) => cleanNorm(b.slug) === lxxSlug);
			if (lxxBook) return lxxBook.id;
		}
		return byTitle.id;
	}

	// Partial match on slug
	const byPartial = books.find((b) => cleanNorm(b.slug).includes(targetSlug));
	if (byPartial) return byPartial.id;

	return null;
}

/**
 * Fetch all available chapter numbers for a canonical book and version.
 */
export async function getBookChapters(bookIdentifier: string, version?: string): Promise<number[]> {
	const cwId = await resolveCanonicalWorkId(bookIdentifier, version);
//	mylog(`getBookChapters(${version??''}.${bookIdentifier}): cwId=${cwId}`, true);
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
 * Translates a reference from one version's versification to another using versification_mappings.
 */
export async function translateReference(
	book: string,
	chapter: number,
	verse: number = 1,
	fromVersion: string,
	toVersion: string
): Promise<TranslatedReference | null> {
	if (!book) return null;

	// 1. Check declarative cross-tradition alignment rules first
	const inMem = getMappedReference(toVersion, book, chapter, verse);
	if (inMem && !inMem.omitted && (inMem.mappedBook !== book || inMem.mappedChapter !== String(chapter))) {
		return {
			book: inMem.mappedBook,
			chapter: parseInt(inMem.mappedChapter, 10),
			verse: parseInt(inMem.mappedVerse, 10) || 1
		};
	}

	const fromCwId = await resolveCanonicalWorkId(book, fromVersion);
	const toCwId = await resolveCanonicalWorkId(book, toVersion);

	if (!fromCwId || !toCwId || fromCwId === toCwId) {
		return { book, chapter, verse };
	}

	const hier = `${chapter},${verse}`;
	// 1. Direct mapping
	const directRows = await query<{ hierarchy: string }>(`
		SELECT cr_to.hierarchy
		FROM versification_mappings vm
		JOIN canonical_refs cr_from ON vm.from_canonical_ref_id = cr_from.id
		JOIN canonical_refs cr_to ON vm.to_canonical_ref_id = cr_to.id
		WHERE cr_from.canonical_work_id = ? AND cr_from.hierarchy = ?
		  AND cr_to.canonical_work_id = ?
		LIMIT 1
	`, [fromCwId, hier, toCwId]);

	if (directRows.length > 0) {
		const parts = directRows[0].hierarchy.split(',');
		return { book, chapter: parseInt(parts[0], 10), verse: parseInt(parts[1], 10) || 1 };
	}

	// 2. Reverse mapping
	const reverseRows = await query<{ hierarchy: string }>(`
		SELECT cr_from.hierarchy
		FROM versification_mappings vm
		JOIN canonical_refs cr_to ON vm.to_canonical_ref_id = cr_to.id
		JOIN canonical_refs cr_from ON vm.from_canonical_ref_id = cr_from.id
		WHERE cr_to.canonical_work_id = ? AND cr_to.hierarchy = ?
		  AND cr_from.canonical_work_id = ?
		LIMIT 1
	`, [fromCwId, hier, toCwId]);

	if (reverseRows.length > 0) {
		const parts = reverseRows[0].hierarchy.split(',');
		return { book, chapter: parseInt(parts[0], 10), verse: parseInt(parts[1], 10) || 1 };
	}

	// 3. Fallback: check if the exact chapter/verse exists in target canonical work
	const identityRows = await query<{ id: number }>(`
		SELECT id FROM canonical_refs WHERE canonical_work_id = ? AND hierarchy = ? LIMIT 1
	`, [toCwId, hier]);

	if (identityRows.length > 0) {
		return { book, chapter, verse };
	}

	return { book, chapter, verse };
}

/**
 * Load aligned parallel chapter verses for specified versions.
 * Integrates TVTMS versification mappings so divergent verses align side-by-side.
 */
export async function getChapterVerses(
	bookIdentifier: string,
	chapter: number,
	versions: string[],
	includeWords: boolean = true,
	primaryVersion?: string
): Promise<VerseResult[]> {
	const cwId = await resolveCanonicalWorkId(bookIdentifier, primaryVersion);
	
	if (!cwId) {
		console.warn(`[DB] Book not found for identifier: ${bookIdentifier} (version: ${primaryVersion})`);
		return [];
	}

	// Translate UI versions (e.g. 'BHS', 'LXX') to database work slugs (e.g. 'wlc', 'swete-lxx')
	const workSlugs = versions.map((v) => VERSION_MAP[v] || v);
	//mylog(`getChapterVerses.workSlugs:[${workSlugs.join(',')}]`, true);
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
				OR cw_alt.slug = cw_main.slug || '-greek' OR cw_main.slug = cw_alt.slug || '-greek'
			)
			JOIN canonical_refs cr_alt ON cr_alt.canonical_work_id = cw_alt.id AND cr_alt.hierarchy = tr.hierarchy
			WHERE NOT EXISTS (
				SELECT 1 FROM mapped_refs mr
				JOIN canonical_refs cr_mapped ON mr.aligned_cref_id = cr_mapped.id
				WHERE mr.target_cref_id = tr.id AND cr_mapped.canonical_work_id = cw_alt.id
			)
		),
		aligned_refs AS (
			SELECT id AS target_cref_id, id AS aligned_cref_id, 0 AS priority FROM target_refs
			UNION
			SELECT target_cref_id, aligned_cref_id, 1 AS priority FROM mapped_refs
			UNION
			SELECT target_cref_id, aligned_cref_id, 2 AS priority FROM variant_identity_refs
		),
		candidate_verses AS (
			SELECT 
				tr.id AS base_cref_id,
				tr.ord,
				tr.hierarchy,
				tr.display_label AS base_label,
				w.slug AS version,
				w.id AS work_id,
				wu.id AS work_unit_id,
				wu.label AS verse_label,
				wu.body,
				ROW_NUMBER() OVER (
					PARTITION BY tr.id, w.id 
					ORDER BY ar.priority, wu.id
				) AS rn
			FROM target_refs tr
			JOIN aligned_refs ar ON ar.target_cref_id = tr.id
			JOIN work_units wu ON wu.canonical_ref_id = ar.aligned_cref_id
			JOIN works w ON wu.work_id = w.id
			WHERE w.slug IN (${slugPlaceholders})
		)
		SELECT 
			base_cref_id,
			ord,
			hierarchy,
			base_label,
			version,
			work_unit_id,
			verse_label,
			body
		FROM candidate_verses
		WHERE rn = 1
		ORDER BY ord, work_id;
	`;

	const params = [cwId, String(chapter), `${chapter},%`, cwId, ...workSlugs];
	const rows = await query<VerseResult>(sql, params);

	// Remap version slug back to UI version acronym (e.g. 'wlc' -> 'BHS')
	for (const row of rows) {
		row.version = SLUG_TO_VERSION[row.version] || row.version;
	}

	if (includeWords && rows.length > 0) {
		// Only fetch word tokens for versions that actually have word tokens in the words table
		const targetRows = rows.filter((r) => VERSIONS_WITH_WORDS.has(r.version));
		const wuIds = targetRows.map((r) => r.work_unit_id);
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
 * Groups contiguous work unit IDs into range scans (BETWEEN min AND max) combined
 * with UNION ALL so that SQLite executes fast sequential index range scans instead of
 * dozens of scattered point probes.
 */
export async function getWordsForWorkUnits(workUnitIds: number[]): Promise<WordRow[]> {
	if (!workUnitIds || workUnitIds.length === 0) return [];

	// Deduplicate and sort IDs
	const uniqueIds = Array.from(new Set(workUnitIds)).sort((a, b) => a - b);
	if (uniqueIds.length === 0) return [];

	// Group contiguous IDs into [start, end] ranges
	const ranges: [number, number][] = [];
	let rangeStart = uniqueIds[0];
	let rangeEnd = uniqueIds[0];

	for (let i = 1; i < uniqueIds.length; i++) {
		const id = uniqueIds[i];
		if (id === rangeEnd + 1) {
			rangeEnd = id;
		} else {
			ranges.push([rangeStart, rangeEnd]);
			rangeStart = id;
			rangeEnd = id;
		}
	}
	ranges.push([rangeStart, rangeEnd]);

	// For a compact number of ranges (e.g. <= 12, typical for chapters across 1-4 versions),
	// use UNION ALL of range queries for sequential index range scans
	if (ranges.length <= 12) {
		const selectParts = ranges.map(([start, end]) => {
			if (start === end) {
				return `SELECT id, work_id, work_unit_id, position, surface, normalized, strongs_number, morph_code FROM words WHERE work_unit_id = ?`;
			}
			return `SELECT id, work_id, work_unit_id, position, surface, normalized, strongs_number, morph_code FROM words WHERE work_unit_id BETWEEN ? AND ?`;
		});

		const params: number[] = [];
		for (const [start, end] of ranges) {
			if (start === end) {
				params.push(start);
			} else {
				params.push(start, end);
			}
		}

		const sql = `${selectParts.join('\nUNION ALL\n')}\nORDER BY work_unit_id, position;`;
		return query<WordRow>(sql, params);
	}

	// Fallback for fragmented, scattered IDs
	const placeholders = uniqueIds.map(() => '?').join(',');
	const sql = `
		SELECT id, work_id, work_unit_id, position, surface, normalized, strongs_number, morph_code
		FROM words
		WHERE work_unit_id IN (${placeholders})
		ORDER BY work_unit_id, position
	`;
	return query<WordRow>(sql, uniqueIds);
}

/**
 * Lookup lexeme entry by lemma, plain form, or lex_id in the lexemes table.
 */
export async function getLemma(
	corpus: string,
	identifier: string | number,
	strongs?: string
): Promise<LexemeRow | null> {
	if (!identifier && !strongs) return null;

	// 1. If strongs is provided, check strongs first
	if (strongs) {
		const sCode = String(strongs).trim();
		if (sCode) {
			const sWithPrefix = corpus === 'bhs'
				? (sCode.toUpperCase().startsWith('H') ? sCode.toUpperCase() : `H${sCode}`)
				: (sCode.toUpperCase().startsWith('G') ? sCode.toUpperCase() : `G${sCode}`);
			const sNumOnly = sCode.replace(/^[HG]/i, '');

			const sql = `
				SELECT id, corpus, lex_id, lemma, gloss, pos, strongs, beta, plain, total
				FROM lexemes
				WHERE corpus = ? AND (strongs = ? OR strongs = ?)
				LIMIT 1
			`;
			const rows = await query<LexemeRow>(sql, [corpus, sWithPrefix, sNumOnly]);
			if (rows.length > 0) return rows[0];
		}
	}

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
/**
 * Retrieve frequency distribution of a lemma grouped by canonical biblical book.
 * First queries the pre-computed lemma_stats table for instant O(1) response.
 * Falls back to dynamic query if not found.
 */
export async function getWordFrequencyByBook(
	workId: number,
	lemma: string,
	strongs?: string
): Promise<BookFrequency[]> {
	if (!workId) return [];

	// 1. Check pre-computed lemma_stats by strongs first
	if (strongs) {
		const sNorm = strongs.trim().toUpperCase();
		const statRow = await queryOne<{ book_counts_json: string; total_count: number }>(`
			SELECT book_counts_json, total_count
			FROM lemma_stats
			WHERE work_id = ? AND strongs = ?
			LIMIT 1
		`, [workId, sNorm]);
		if (statRow?.book_counts_json) {
			try {
				return JSON.parse(statRow.book_counts_json);
			} catch {}
		}
	}

	// 2. Check pre-computed lemma_stats by lemma (including pseudo-strongs WORD:<lemma>)
	if (lemma) {
		const lTrim = lemma.trim();
		const lNFC = lTrim.normalize('NFC');
		const pseudoStrongs = `WORD:${lTrim}`;
		const statRow = await queryOne<{ book_counts_json: string; total_count: number }>(`
			SELECT book_counts_json, total_count
			FROM lemma_stats
			WHERE work_id = ? AND (lemma = ? OR lemma = ? OR strongs = ?)
			LIMIT 1
		`, [workId, lTrim, lNFC, pseudoStrongs]);
		if (statRow?.book_counts_json) {
			try {
				return JSON.parse(statRow.book_counts_json);
			} catch {}
		}
	}

	// 3. Fallback: aggregate from indexed concordance_refs (fast indexed lookup)
	if (lemma || strongs) {
		try {
			const occs = await getConcordance(workId, lemma, 0, strongs);
			if (occs && occs.length > 0) {
				const bookCounts: { [book: string]: number } = {};
				for (const o of occs) {
					const ref = o.ref_label || o.display_label || '';
					const bookMatch = ref.match(/^([1-3]?[A-Za-z]+)/);
					const book = bookMatch ? bookMatch[1] : (ref.split(/\s+/)[0] || 'Unknown');
					bookCounts[book] = (bookCounts[book] || 0) + 1;
				}
				return Object.entries(bookCounts).map(([abbrev, count]) => ({
					title: abbrev,
					sbl_abbreviation: abbrev,
					count
				}));
			}
		} catch (err) {
			console.warn('[dbClient] Failed to aggregate from concordance_refs:', err);
		}
	}

	// 4. Ultimate fallback: query words table using indexed normalized column
	const cleanLemma = lemma?.trim() || '';
	if (!cleanLemma) return [];
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
	return query<BookFrequency>(sql, [workId, cleanLemma]);
}

/**
 * Retrieve sample concordance occurrences containing a specific lemma or Strong's ID.
 * First queries the pre-indexed concordance_refs table for instant 1-request response.
 * Falls back to dynamic query across words if not present.
 */
export async function getConcordance(
	workId: number,
	lemma: string,
	limit: number = 0,
	strongs?: string
): Promise<ConcordanceOccurrence[]> {
	if (!workId) return [];

	const hasLimit = typeof limit === 'number' && limit > 0;
	const limitSql = hasLimit ? `LIMIT ?` : '';
	const limitParams = hasLimit ? [limit] : [];

	// 1. Try pre-indexed concordance_refs by strongs
	if (strongs) {
		const sNorm = strongs.trim().toUpperCase();
		const sCode = sNorm.startsWith('H') || sNorm.startsWith('G')
			? sNorm
			: (workId === 2 ? `H${sNorm}` : `G${sNorm}`);

		const rows = await query<ConcordanceOccurrence>(`
			SELECT ref_label, ref_label AS display_label, work_unit_id
			FROM concordance_refs
			WHERE work_id = ? AND strongs = ?
			ORDER BY work_unit_id
			${limitSql}
		`, [workId, sCode, ...limitParams]);

		if (rows.length > 0) return rows;
	}

	// 2. Try pre-indexed concordance_refs by lemma
	if (lemma && lemma.trim()) {
		const cleanLemma = lemma.trim();
		const pseudoStrongs = `WORD:${cleanLemma}`;
		// Check if lemma matches in concordance_refs directly (by lemma or pseudo-strongs)
		const rows = await query<ConcordanceOccurrence>(`
			SELECT ref_label, ref_label AS display_label, work_unit_id
			FROM concordance_refs
			WHERE work_id = ? AND (lemma = ? OR strongs = ?)
			ORDER BY work_unit_id
			${limitSql}
		`, [workId, cleanLemma, pseudoStrongs, ...limitParams]);

		if (rows.length > 0) return rows;

		// Check if we can find Strong's from lemma_stats
		const stat = await queryOne<{ strongs: string }>(`
			SELECT strongs FROM lemma_stats
			WHERE work_id = ? AND lemma = ?
			LIMIT 1
		`, [workId, cleanLemma]);

		if (stat?.strongs) {
			const sRows = await query<ConcordanceOccurrence>(`
				SELECT ref_label, ref_label AS display_label, work_unit_id
				FROM concordance_refs
				WHERE work_id = ? AND strongs = ?
				ORDER BY work_unit_id
				${limitSql}
			`, [workId, stat.strongs, ...limitParams]);

			if (sRows.length > 0) return sRows;
		}
	}

	// 3. Fallback: dynamic query across words table using indexed normalized column
	const cleanLemma = lemma?.trim() || '';
	if (!cleanLemma) return [];
	const sql = `
		SELECT 
			wu.id AS work_unit_id,
			cr.display_label,
			cr.sbl_citation AS ref_label,
			wu.label AS verse_label,
			wu.body,
			wd.surface,
			wd.position
		FROM words wd
		JOIN work_units wu ON wd.work_unit_id = wu.id
		JOIN canonical_refs cr ON wu.canonical_ref_id = cr.id
		WHERE wd.work_id = ? AND wd.normalized = ?
		ORDER BY cr.ord
		${limitSql}
	`;
	return query<ConcordanceOccurrence>(sql, [workId, cleanLemma, ...limitParams]);
}

/**
 * Fetch the verse body text for a single work unit ID on demand.
 */
export async function getVerseText(workUnitId: number): Promise<string | null> {
	if (!workUnitId) return null;
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
 * For BDB:
 * 1. Prioritizes Strong's ID (e.g. 'H7225' or '7225')
 * 2. Direct lookup of headword field (with pointing/vowels)
 * 3. Strips vowels/diacritics and looks up with key field (consonants only)
 *
 * For LSJ:
 * 1. Prioritizes Strong's ID (e.g. 'G4160') if available
 * 2. Looks up normalized Greek key, headword, or lsj_index
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

			// 1a. Prioritize matching BOTH strongs AND key/headword (prevents cross-reference collisions)
			if (trimmedKey || cleanKey) {
				const exactBoth = await query<LexiconEntryRow>(
					`SELECT id, dictionary, key, headword, strongs, lsj_index, match_type, definition
					 FROM lexicon_entries
					 WHERE dictionary = 'bdb' AND strongs = ? AND (headword = ? OR key = ? OR headword = ? OR key = ?)
					 LIMIT 1`,
					[sCode, trimmedKey, trimmedKey, cleanKey, cleanKey]
				);
				if (exactBoth.length > 0) return exactBoth[0];
			}

			// 1b. If no exact both match, query by strongs alone
			const rows = await query<LexiconEntryRow>(
				`SELECT id, dictionary, key, headword, strongs, lsj_index, match_type, definition
				 FROM lexicon_entries
				 WHERE dictionary = 'bdb' AND strongs = ?
				 LIMIT 1`,
				[sCode]
			);
			if (rows.length > 0) return rows[0];
		}

		// 2. Direct lookup of headword field (with vowels/pointing)
		if (trimmedKey) {
			const headwordRows = await query<LexiconEntryRow>(
				`SELECT id, dictionary, key, headword, strongs, lsj_index, match_type, definition
				 FROM lexicon_entries
				 WHERE dictionary = 'bdb' AND headword = ?
				 LIMIT 1`,
				[trimmedKey]
			);
			if (headwordRows.length > 0) return headwordRows[0];

			// 3. Strip vowels and lookup with key field (consonants only)
			if (cleanKey) {
				const keyRows = await query<LexiconEntryRow>(
					`SELECT id, dictionary, key, headword, strongs, lsj_index, match_type, definition
					 FROM lexicon_entries
					 WHERE dictionary = 'bdb' AND key = ?
					 LIMIT 1`,
					[cleanKey]
				);
				if (keyRows.length > 0) return keyRows[0];
			}
		}
		return null;
	}

	if (dict === 'lsj') {
		// 1. Strong's ID if provided
		let sId = strongs?.trim() || '';
		if (!sId && key && /^G?\d+[a-z]?$/i.test(key.trim())) {
			sId = key.trim();
		}
		if (sId) {
			const sCode = sId.toUpperCase().startsWith('G') ? sId.toUpperCase() : `G${sId}`;
			const rows = await query<LexiconEntryRow>(
				`SELECT id, dictionary, key, headword, strongs, lsj_index, match_type, definition
				 FROM lexicon_entries
				 WHERE dictionary = 'lsj' AND strongs = ?
				 LIMIT 1`,
				[sCode]
			);
			if (rows.length > 0) return rows[0];
		}

		// 2. Normalized Greek key, headword, or lsj_index
		if (key && key.trim()) {
			const cleanKey = normalizeGreek(key);
			const rows = await query<LexiconEntryRow>(
				`SELECT id, dictionary, key, headword, strongs, lsj_index, match_type, definition
				 FROM lexicon_entries
				 WHERE dictionary = 'lsj' AND (key = ? OR headword = ? OR lsj_index = ?)
				 LIMIT 1`,
				[cleanKey, key.trim(), key.trim()]
			);
			if (rows.length > 0) return rows[0];
		}
		return null;
	}

	return null;
}

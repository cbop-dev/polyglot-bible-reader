import { bookAbbrevMap } from '$lib/utils/bible-utils.js';

export interface BookDefinition {
	slug: string; // Exact canonical_works DB slug
	standardAbbrev: string; // Standard UI abbreviation
	title: string; // Full English title
	testament: 'ot' | 'nt' | 'apocrypha';
	versionBooks?: Partial<Record<string, string>>; // Version-specific preferred abbreviations
	extraAliases?: string[]; // Extra synonyms/variants
}

export const CANONICAL_BOOK_DEFINITIONS: BookDefinition[] = [
	// OT (Hebrew Canon)
	{ slug: 'genesis', standardAbbrev: 'Gen', title: 'Genesis', testament: 'ot' },
	{ slug: 'exodus', standardAbbrev: 'Exod', title: 'Exodus', testament: 'ot' },
	{ slug: 'leviticus', standardAbbrev: 'Lev', title: 'Leviticus', testament: 'ot' },
	{ slug: 'numbers', standardAbbrev: 'Num', title: 'Numbers', testament: 'ot' },
	{ slug: 'deuteronomy', standardAbbrev: 'Deut', title: 'Deuteronomy', testament: 'ot' },
	{ slug: 'joshua', standardAbbrev: 'Josh', title: 'Joshua', testament: 'ot' },
	{ slug: 'judges', standardAbbrev: 'Judg', title: 'Judges', testament: 'ot' },
	{ slug: 'ruth', standardAbbrev: 'Ruth', title: 'Ruth', testament: 'ot' },
	{ slug: '1-samuel', standardAbbrev: '1Sam', title: '1 Samuel', testament: 'ot', extraAliases: ['1Kgdms', '1 Kingdoms', 'I Kingdoms', '1_Sam'] },
	{ slug: '2-samuel', standardAbbrev: '2Sam', title: '2 Samuel', testament: 'ot', extraAliases: ['2Kgdms', '2 Kingdoms', 'II Kingdoms', '2_Sam'] },
	{ slug: '1-kings', standardAbbrev: '1Kgs', title: '1 Kings', testament: 'ot', extraAliases: ['3Kgdms', '3 Kingdoms', 'III Kingdoms', '1_Kgs'] },
	{ slug: '2-kings', standardAbbrev: '2Kgs', title: '2 Kings', testament: 'ot', extraAliases: ['4Kgdms', '4 Kingdoms', 'IV Kingdoms', '2_Kgs'] },
	{ slug: '1-chronicles', standardAbbrev: '1Chr', title: '1 Chronicles', testament: 'ot', extraAliases: ['1_Chr', '1 Chron'] },
	{ slug: '2-chronicles', standardAbbrev: '2Chr', title: '2 Chronicles', testament: 'ot', extraAliases: ['2_Chr', '2 Chron'] },
	{ slug: 'ezra', standardAbbrev: 'Ezra', title: 'Ezra', testament: 'ot', extraAliases: ['1 Ezra', '1Esdr (Vulgate)'] },
	{ slug: 'nehemiah', standardAbbrev: 'Neh', title: 'Nehemiah', testament: 'ot', extraAliases: ['2 Ezra', '2Esdr (Vulgate)'] },
	{ slug: 'esther', standardAbbrev: 'Esth', title: 'Esther', testament: 'ot' },
	{ slug: 'job', standardAbbrev: 'Job', title: 'Job', testament: 'ot' },
	{ slug: 'psalms', standardAbbrev: 'Ps', title: 'Psalms', testament: 'ot', extraAliases: ['Psa', 'Psalmi'] },
	{ slug: 'proverbs', standardAbbrev: 'Prov', title: 'Proverbs', testament: 'ot' },
	{
		slug: 'ecclesiastes',
		standardAbbrev: 'Eccl',
		title: 'Ecclesiastes',
		testament: 'ot',
		versionBooks: { BHS: 'Qoh', LXX: 'Qoh', KJV: 'Eccl', WEB: 'Eccl', Vulgate: 'Eccl', Brenton: 'Eccl' },
		extraAliases: ['Qoh', 'Qoheleth']
	},
	{
		slug: 'song-of-solomon',
		standardAbbrev: 'Song',
		title: 'Song of Solomon',
		testament: 'ot',
		versionBooks: { BHS: 'Cant', LXX: 'Cant', KJV: 'Song', WEB: 'Song', Vulgate: 'Song', Brenton: 'Song' },
		extraAliases: ['Cant', 'Canticles', 'Song of Songs']
	},
	{ slug: 'isaiah', standardAbbrev: 'Isa', title: 'Isaiah', testament: 'ot' },
	{ slug: 'jeremiah', standardAbbrev: 'Jer', title: 'Jeremiah', testament: 'ot' },
	{ slug: 'lamentations', standardAbbrev: 'Lam', title: 'Lamentations', testament: 'ot' },
	{ slug: 'ezekiel', standardAbbrev: 'Ezek', title: 'Ezekiel', testament: 'ot' },
	{ slug: 'daniel', standardAbbrev: 'Dan', title: 'Daniel', testament: 'ot', extraAliases: ['DanTh', 'Daniel (Theodotion)'] },
	{ slug: 'hosea', standardAbbrev: 'Hos', title: 'Hosea', testament: 'ot' },
	{ slug: 'joel', standardAbbrev: 'Joel', title: 'Joel', testament: 'ot' },
	{ slug: 'amos', standardAbbrev: 'Amos', title: 'Amos', testament: 'ot' },
	{ slug: 'obadiah', standardAbbrev: 'Obad', title: 'Obadiah', testament: 'ot' },
	{ slug: 'jonah', standardAbbrev: 'Jonah', title: 'Jonah', testament: 'ot' },
	{ slug: 'micah', standardAbbrev: 'Mic', title: 'Micah', testament: 'ot' },
	{ slug: 'nahum', standardAbbrev: 'Nah', title: 'Nahum', testament: 'ot' },
	{ slug: 'habakkuk', standardAbbrev: 'Hab', title: 'Habakkuk', testament: 'ot' },
	{ slug: 'zephaniah', standardAbbrev: 'Zeph', title: 'Zephaniah', testament: 'ot' },
	{ slug: 'haggai', standardAbbrev: 'Hag', title: 'Haggai', testament: 'ot' },
	{ slug: 'zechariah', standardAbbrev: 'Zech', title: 'Zechariah', testament: 'ot' },
	{ slug: 'malachi', standardAbbrev: 'Mal', title: 'Malachi', testament: 'ot' },

	// NT Books
	{ slug: 'matthew', standardAbbrev: 'Matt', title: 'Matthew', testament: 'nt' },
	{ slug: 'mark', standardAbbrev: 'Mark', title: 'Mark', testament: 'nt' },
	{ slug: 'luke', standardAbbrev: 'Luke', title: 'Luke', testament: 'nt' },
	{ slug: 'john', standardAbbrev: 'John', title: 'John', testament: 'nt' },
	{ slug: 'acts', standardAbbrev: 'Acts', title: 'Acts', testament: 'nt' },
	{ slug: 'romans', standardAbbrev: 'Rom', title: 'Romans', testament: 'nt' },
	{ slug: '1-corinthians', standardAbbrev: '1_Cor', title: '1 Corinthians', testament: 'nt', extraAliases: ['1Cor', '1 Cor', 'I Corinthians'] },
	{ slug: '2-corinthians', standardAbbrev: '2_Cor', title: '2 Corinthians', testament: 'nt', extraAliases: ['2Cor', '2 Cor', 'II Corinthians'] },
	{ slug: 'galatians', standardAbbrev: 'Gal', title: 'Galatians', testament: 'nt' },
	{ slug: 'ephesians', standardAbbrev: 'Eph', title: 'Ephesians', testament: 'nt' },
	{ slug: 'philippians', standardAbbrev: 'Phil', title: 'Philippians', testament: 'nt' },
	{ slug: 'colossians', standardAbbrev: 'Col', title: 'Colossians', testament: 'nt' },
	{ slug: '1-thessalonians', standardAbbrev: '1_Thess', title: '1 Thessalonians', testament: 'nt', extraAliases: ['1Thess', '1 Thess'] },
	{ slug: '2-thessalonians', standardAbbrev: '2_Thess', title: '2 Thessalonians', testament: 'nt', extraAliases: ['2Thess', '2 Thess'] },
	{ slug: '1-timothy', standardAbbrev: '1_Tim', title: '1 Timothy', testament: 'nt', extraAliases: ['1Tim', '1 Tim'] },
	{ slug: '2-timothy', standardAbbrev: '2_Tim', title: '2 Timothy', testament: 'nt', extraAliases: ['2Tim', '2 Tim'] },
	{ slug: 'titus', standardAbbrev: 'Titus', title: 'Titus', testament: 'nt' },
	{ slug: 'philemon', standardAbbrev: 'Phlm', title: 'Philemon', testament: 'nt' },
	{ slug: 'hebrews', standardAbbrev: 'Heb', title: 'Hebrews', testament: 'nt' },
	{ slug: 'james', standardAbbrev: 'Jas', title: 'James', testament: 'nt' },
	{ slug: '1-peter', standardAbbrev: '1_Pet', title: '1 Peter', testament: 'nt', extraAliases: ['1Pet', '1 Pet'] },
	{ slug: '2-peter', standardAbbrev: '2_Pet', title: '2 Peter', testament: 'nt', extraAliases: ['2Pet', '2 Pet'] },
	{ slug: '1-john', standardAbbrev: '1_John', title: '1 John', testament: 'nt', extraAliases: ['1John', '1 John', '1Jn', '1 Jn'] },
	{ slug: '2-john', standardAbbrev: '2_John', title: '2 John', testament: 'nt', extraAliases: ['2John', '2 John', '2Jn', '2 Jn'] },
	{ slug: '3-john', standardAbbrev: '3_John', title: '3 John', testament: 'nt', extraAliases: ['3John', '3 John', '3Jn', '3 Jn'] },
	{ slug: 'jude', standardAbbrev: 'Jude', title: 'Jude', testament: 'nt' },
	{ slug: 'revelation', standardAbbrev: 'Rev', title: 'Revelation', testament: 'nt' },

	// Deuterocanon / Septuagint / Apocrypha
	{
		slug: '1-esdras',
		standardAbbrev: '1Esdr',
		title: '1 Esdras',
		testament: 'apocrypha',
		extraAliases: ['1 Esdras', '1Esd', '1 Esdr', 'Greek Ezra', '3 Ezra', 'EsdrA', 'Esdras A']
	},
	{
		slug: '2-esdras',
		standardAbbrev: '2Esdr',
		title: '2 Esdras',
		testament: 'apocrypha',
		extraAliases: ['2 Esdras', '2Esd', '2 Esdr', 'EsdrB', 'Esdras B', 'Ezra-Nehemiah (Greek)']
	},
	{
		slug: 'tobit',
		standardAbbrev: 'Tob',
		title: 'Tobit',
		testament: 'apocrypha',
		versionBooks: { LXX: 'TobBA', KJV: 'Tob', WEB: 'Tob', Vulgate: 'Tob', Brenton: 'Tob' },
		extraAliases: ['TobBA', 'Tobit (BA)', 'Tobit Vaticanus']
	},
	{
		slug: 'tobit-sinaiticus',
		standardAbbrev: 'TobS',
		title: 'Tobit (Sinaiticus)',
		testament: 'apocrypha',
		versionBooks: { LXX: 'TobS', KJV: 'Tob', WEB: 'Tob', Vulgate: 'Tob', Brenton: 'Tob' },
		extraAliases: ['TobS', 'Tobit (Sinaiticus)', 'Tobit Sinaiticus', 'Tobit-Sinaiticus']
	},
	{ slug: 'judith', standardAbbrev: 'Jdt', title: 'Judith', testament: 'apocrypha' },
	{
		slug: 'esther-greek',
		standardAbbrev: 'AddEsth',
		title: 'Esther (Greek)',
		testament: 'apocrypha',
		versionBooks: { LXX: 'Esth', KJV: 'AddEsth', WEB: 'AddEsth', Brenton: 'AddEsth' },
		extraAliases: ['AddEsth', 'Add Esth', 'Esther Greek', 'EsthGr']
	},
	{ slug: 'wisdom', standardAbbrev: 'Wis', title: 'Wisdom of Solomon', testament: 'apocrypha' },
	{ slug: 'sirach', standardAbbrev: 'Sir', title: 'Sirach (Ecclesiasticus)', testament: 'apocrypha', extraAliases: ['Ecclesiasticus'] },
	{ slug: 'baruch', standardAbbrev: 'Bar', title: 'Baruch', testament: 'apocrypha' },
	{ slug: 'letter-of-jeremiah', standardAbbrev: 'EpJer', title: 'Letter of Jeremiah', testament: 'apocrypha', extraAliases: ['Ep Jer'] },
	{ slug: 'prayer-of-azariah', standardAbbrev: 'PrAzar', title: 'Prayer of Azariah', testament: 'apocrypha', extraAliases: ['Pr Azar'] },
	{ slug: 'susanna', standardAbbrev: 'Sus', title: 'Susanna', testament: 'apocrypha' },
	{
		slug: 'susanna-theodotion',
		standardAbbrev: 'SusTh',
		title: 'Susanna (Theodotion)',
		testament: 'apocrypha',
		versionBooks: { LXX: 'SusTh', KJV: 'Sus', WEB: 'Sus', Brenton: 'Sus' },
		extraAliases: ['SusTh', 'Susanna (Theodotion)']
	},
	{ slug: 'bel-and-the-dragon', standardAbbrev: 'Bel', title: 'Bel and the Dragon', testament: 'apocrypha' },
	{
		slug: 'bel-and-the-dragon-theodotion',
		standardAbbrev: 'BelTh',
		title: 'Bel and the Dragon (Theodotion)',
		testament: 'apocrypha',
		versionBooks: { LXX: 'BelTh', KJV: 'Bel', WEB: 'Bel', Brenton: 'Bel' },
		extraAliases: ['BelTh', 'Bel and the Dragon (Theodotion)']
	},
	{
		slug: 'daniel-theodotion',
		standardAbbrev: 'DanTh',
		title: 'Daniel (Theodotion)',
		testament: 'apocrypha',
		versionBooks: { LXX: 'DanTh', KJV: 'Dan', WEB: 'Dan', Brenton: 'Dan' },
		extraAliases: ['DanTh', 'Daniel (Theodotion)']
	},
	{
		slug: '1-maccabees',
		standardAbbrev: '1Mac',
		title: '1 Maccabees',
		testament: 'apocrypha',
		versionBooks: { LXX: '1Mac', KJV: '1Mac', WEB: '1Mac', Vulgate: '1Mac', Brenton: '1Mac' },
		extraAliases: ['1Mac', '1Macc', '1 Macc', '1 Maccabees', 'I Maccabees']
	},
	{
		slug: '2-maccabees',
		standardAbbrev: '2Mac',
		title: '2 Maccabees',
		testament: 'apocrypha',
		versionBooks: { LXX: '2Mac', KJV: '2Mac', WEB: '2Mac', Vulgate: '2Mac', Brenton: '2Mac' },
		extraAliases: ['2Mac', '2Macc', '2 Macc', '2 Maccabees', 'II Maccabees']
	},
	{
		slug: '3-maccabees',
		standardAbbrev: '3Mac',
		title: '3 Maccabees',
		testament: 'apocrypha',
		versionBooks: { LXX: '3Mac', Brenton: '3Mac' },
		extraAliases: ['3Mac', '3Macc', '3 Macc', '3 Maccabees', 'III Maccabees']
	},
	{
		slug: '4-maccabees',
		standardAbbrev: '4Mac',
		title: '4 Maccabees',
		testament: 'apocrypha',
		versionBooks: { LXX: '4Mac', Brenton: '4Mac' },
		extraAliases: ['4Mac', '4Macc', '4 Macc', '4 Maccabees', 'IV Maccabees']
	},
	{ slug: 'prayer-of-manasseh', standardAbbrev: 'PrMan', title: 'Prayer of Manasseh', testament: 'apocrypha', extraAliases: ['Pr Man'] },
	{ slug: 'psalm-151', standardAbbrev: 'Ps151', title: 'Psalm 151', testament: 'apocrypha', extraAliases: ['AddPs', 'Ps 151'] },
	{ slug: 'psalms-of-solomon', standardAbbrev: 'PsSol', title: 'Psalms of Solomon', testament: 'apocrypha', extraAliases: ['PssSol', 'Pss. Sol.'] },
	{ slug: 'odes', standardAbbrev: 'Od', title: 'Odes', testament: 'apocrypha', extraAliases: ['Odes'] }
];

/**
 * Normalizes any string to a clean alphanumeric key (lowercase, no spaces, hyphens, or underscores).
 */
export function cleanKey(str?: string | null): string {
	if (!str) return '';
	return str.trim().toLowerCase().replace(/[\s\-_]+/g, '');
}

/**
 * Fast lookup map from any cleaned variant string to its Canonical Book Definition.
 */
const NORM_TO_CANONICAL = new Map<string, BookDefinition>();

function initCanonicalIndex() {
	// 1. Primary keys first: slug, standard abbreviation, title, and explicit aliases
	for (const book of CANONICAL_BOOK_DEFINITIONS) {
		NORM_TO_CANONICAL.set(cleanKey(book.slug), book);
		NORM_TO_CANONICAL.set(cleanKey(book.standardAbbrev), book);
		NORM_TO_CANONICAL.set(cleanKey(book.title), book);

		if (book.extraAliases) {
			for (const alias of book.extraAliases) {
				const cAlias = cleanKey(alias);
				if (!NORM_TO_CANONICAL.has(cAlias)) {
					NORM_TO_CANONICAL.set(cAlias, book);
				}
			}
		}
	}

	// 2. Secondary keys: versionBooks (only if not already registered to a primary book)
	for (const book of CANONICAL_BOOK_DEFINITIONS) {
		if (book.versionBooks) {
			for (const vb of Object.values(book.versionBooks)) {
				if (vb) {
					const cVb = cleanKey(vb);
					if (!NORM_TO_CANONICAL.has(cVb)) {
						NORM_TO_CANONICAL.set(cVb, book);
					}
				}
			}
		}
	}

	// Enrich with synonyms from bible-utils bookAbbrevMap
	for (const [key, aliases] of Object.entries(bookAbbrevMap)) {
		const targetBook = NORM_TO_CANONICAL.get(cleanKey(key));
		if (targetBook) {
			for (const alias of aliases) {
				const cAlias = cleanKey(alias);
				if (!NORM_TO_CANONICAL.has(cAlias)) {
					NORM_TO_CANONICAL.set(cAlias, targetBook);
				}
			}
		}
	}
}

initCanonicalIndex();

/**
 * Resolves any book identifier, title, synonym, or abbreviation to its Canonical Book Definition.
 */
export function normalizeBookName(input?: string | null): BookDefinition | null {
	if (!input) return null;
	const c = cleanKey(input);
	return NORM_TO_CANONICAL.get(c) || null;
}

/**
 * Resolves any book identifier to its canonical DB slug.
 */
export function getCanonicalSlug(input?: string | null): string | null {
	return normalizeBookName(input)?.slug || null;
}

/**
 * Rules for books that diverge structurally across traditions (BHS vs LXX).
 */
export interface TraditionAlignmentRule {
	fromCanonical: string; // Source canonical slug (e.g. 'ezra', 'nehemiah', '2-esdras')
	targetVersion: string; // 'LXX', 'BHS', etc.
	targetBook: string | ((chapter: number) => string | null);
	mapChapter?: (chapter: number) => number;
	omitted?: boolean;
}

export const CROSS_TRADITION_RULES: TraditionAlignmentRule[] = [
	// BHS / Western -> LXX
	{
		fromCanonical: 'ezra',
		targetVersion: 'LXX',
		targetBook: '2Esdr',
		mapChapter: (ch) => ch // Ezra 1-10 -> 2Esdr 1-10
	},
	{
		fromCanonical: 'nehemiah',
		targetVersion: 'LXX',
		targetBook: '2Esdr',
		mapChapter: (ch) => ch + 10 // Neh 1-13 -> 2Esdr 11-23
	},

	// LXX -> BHS / Western
	{
		fromCanonical: '2-esdras',
		targetVersion: 'BHS',
		targetBook: (ch) => (ch <= 10 ? 'Ezra' : 'Neh'),
		mapChapter: (ch) => (ch <= 10 ? ch : ch - 10)
	},
	{
		fromCanonical: '2-esdras',
		targetVersion: 'KJV',
		targetBook: (ch) => (ch <= 10 ? 'Ezra' : 'Neh'),
		mapChapter: (ch) => (ch <= 10 ? ch : ch - 10)
	},
	{
		fromCanonical: '2-esdras',
		targetVersion: 'Vulgate',
		targetBook: (ch) => (ch <= 10 ? 'Ezra' : 'Neh'),
		mapChapter: (ch) => (ch <= 10 ? ch : ch - 10)
	},
	{
		fromCanonical: '2-esdras',
		targetVersion: 'WEB',
		targetBook: (ch) => (ch <= 10 ? 'Ezra' : 'Neh'),
		mapChapter: (ch) => (ch <= 10 ? ch : ch - 10)
	},
	{
		fromCanonical: '1-esdras',
		targetVersion: 'BHS',
		targetBook: () => null,
		omitted: true
	}
];

/**
 * Given a book identifier and a Bible version (with optional chapter), returns the exact book symbol
 * that the version expects in its UI or query.
 */
export function getBookForVersion(bookIdentifier: string, version: string, chapter?: number): string {
	const canonical = normalizeBookName(bookIdentifier);
	if (!canonical) return bookIdentifier;

	const chapNum = typeof chapter === 'number' ? chapter : 1;

	// Check cross-tradition rules first (e.g. 2Esdr -> Ezra/Neh in BHS, or Ezra/Neh -> 2Esdr in LXX)
	for (const rule of CROSS_TRADITION_RULES) {
		if (rule.fromCanonical === canonical.slug && rule.targetVersion === version) {
			if (typeof rule.targetBook === 'function') {
				const res = rule.targetBook(chapNum);
				if (res) return res;
			} else if (rule.targetBook) {
				return rule.targetBook;
			}
		}
	}

	// Check version-specific override (e.g. Qoh for BHS/LXX, Cant for BHS/LXX, 1Mac for LXX)
	if (canonical.versionBooks && canonical.versionBooks[version]) {
		return canonical.versionBooks[version]!;
	}

	// Special version overrides
	if (version === 'Brenton') {
		if (canonical.slug === 'esther' || canonical.slug === 'esther-greek') return 'AddEsth';
		if (canonical.slug === '2-esdras') return '2Esdr';
	}
	if (version === 'LXX') {
		if (canonical.slug === 'esther-greek') return 'Esth';
	}

	return canonical.standardAbbrev;
}

/**
 * Backward-compatible helper matching legacy getBookFile(version, canonicalBook, chapter?).
 */
export function getBookFile(version: string, canonicalBook: string, chapter?: number): string {
	return getBookForVersion(canonicalBook, version, chapter);
}

export interface MappedReferenceResult {
	mappedBook: string;
	mappedChapter: string;
	mappedVerse: string;
	omitted?: boolean;
}

/**
 * Maps a reference from one version/tradition to another, handling cross-tradition
 * book splits, combinations, and chapter offsets.
 */
export function getMappedReference(
	targetVersion: string,
	book: string,
	chapter: string | number,
	verse: string | number
): MappedReferenceResult {
	const chNum = typeof chapter === 'number' ? chapter : parseInt(String(chapter), 10) || 1;
	const vStr = String(verse);
	const canonical = normalizeBookName(book);

	if (!canonical) {
		return { mappedBook: book, mappedChapter: String(chapter), mappedVerse: vStr };
	}

	let targetBook = getBookForVersion(book, targetVersion, chNum);
	let targetCh = chNum;
	let omitted = false;

	// Check cross-tradition alignment rules
	for (const rule of CROSS_TRADITION_RULES) {
		if (rule.fromCanonical === canonical.slug && rule.targetVersion === targetVersion) {
			if (rule.omitted) {
				omitted = true;
			}
			if (typeof rule.targetBook === 'function') {
				const tb = rule.targetBook(chNum);
				if (tb) targetBook = tb;
			} else if (rule.targetBook) {
				targetBook = rule.targetBook;
			}
			if (rule.mapChapter) {
				targetCh = rule.mapChapter(chNum);
			}
			break;
		}
	}

	// Chapter offsets for Psalms and Jeremiah in LXX
	if (targetVersion === 'LXX') {
		if (canonical.slug === 'psalms') {
			// BHS Ps 10-146 -> LXX Ps 9-145 roughly
			if (chNum >= 10 && chNum <= 146) {
				if (chNum === 10) targetCh = 9;
				else if (chNum >= 11 && chNum <= 113) targetCh = chNum - 1;
				else if (chNum >= 116 && chNum <= 145) targetCh = chNum - 1;
				else targetCh = chNum - 1;
			}
		} else if (canonical.slug === 'jeremiah') {
			if (chNum === 30) targetCh = 37;
			else if (chNum === 36) targetCh = 43;
		}
	}

	return {
		mappedBook: targetBook,
		mappedChapter: String(targetCh),
		mappedVerse: vStr,
		omitted
	};
}

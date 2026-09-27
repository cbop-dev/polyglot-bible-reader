import { formatHebrew, formatGreek, type HebrewDiacriticMode } from '$lib/utils/diacritics';
import { getBookForVersion } from '$lib/bookMapping';
import {
	getChapterVerses,
	getBookChapters,
	type VerseResult,
	type WordRow
} from './dbClient';

export interface ChapterDataResult {
	verses: VerseResult[];
	verseKeys: string[];
	chapterDataByVerse: Record<string, Record<string, any>>;
}

/**
 * Loads aligned parallel chapter verses across all active versions from the SQLite database.
 * Returns structured verse rows and an indexed lookup map.
 */
export async function loadChapterFromDb(
	book: string,
	chapter: number,
	activeVersions: string[],
	primaryVersion?: string
): Promise<ChapterDataResult> {
	try {
		const verses = await getChapterVerses(book, chapter, activeVersions, true, primaryVersion);

		// Extract unique verse keys in numerical order based on canonical hierarchy
		const verseKeySet = new Set<string>();
		const chapterDataByVerse: Record<string, Record<string, any>> = {};

		for (const v of verses) {
			const vKey = v.hierarchy.includes(',') ? v.hierarchy.split(',')[1] : String(v.ord);
			verseKeySet.add(vKey);

			if (!chapterDataByVerse[vKey]) {
				chapterDataByVerse[vKey] = {};
			}

			// Format words array for UI compatibility
			const formattedWords = (v.words || []).map((w: WordRow) => ({
				word: w.surface,
				trailer: ' ',
				id: w.id,
				work_id: w.work_id,
				position: w.position,
				normalized: w.normalized,
				strongs: w.strongs_number,
				morph: w.morph_code
			}));

			chapterDataByVerse[vKey][v.version] = {
				exists: true,
				omitted: false,
				label: v.verse_label ? `${getBookForVersion(book,v.version)} ${v.verse_label}` : v.base_label,
				isDivergent: v.verse_label ? v.verse_label !== `${chapter}:${vKey}` : false,
				verseData: {
					id: v.work_unit_id,
					text: v.body,
					words: formattedWords.length > 0 ? formattedWords : undefined
				}
			};
		}

		// Sort verse keys numerically
		const verseKeys = Array.from(verseKeySet).sort((a, b) => {
			const na = Number(a);
			const nb = Number(b);
			if (!isNaN(na) && !isNaN(nb)) return na - nb;
			return a.localeCompare(b);
		});

		return {
			verses,
			verseKeys,
			chapterDataByVerse
		};
	} catch (err) {
		console.error(`[DB] Error loading chapter ${book} ${chapter}:`, err);
		return {
			verses: [],
			verseKeys: [],
			chapterDataByVerse: {}
		};
	}
}

/**
 * Fetch available chapters for a given book from SQLite database.
 */
export async function loadChaptersForBook(book: string, primaryVersion?: string): Promise<number[]> {
	return getBookChapters(book, primaryVersion);
}

/**
 * Format Hebrew and Greek verse text according to active diacritic settings.
 */
export function formatVerseText(
	text: any,
	version: string,
	hebrewMode: HebrewDiacriticMode,
	greekDiacritics: boolean
): string {
	if (!text) return '';
	let ret = String(text);
	if (version === 'BHS') {
		ret = formatHebrew(ret, hebrewMode);
	} else if (version === 'LXX' || version === 'SBLGNT') {
		ret = formatGreek(ret, greekDiacritics);
	}
	return ret;
}

import { formatHebrew, formatGreek, type HebrewDiacriticMode } from '$lib/utils/diacritics';
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
 * Computes word trailers based on explicit token trailers or by matching substrings in the verse text body.
 */
export function computeWordTrailers(words: WordRow[], body?: string): string[] {
	if (!words || words.length === 0) return [];
	const cleanBody = (body || '').trim();

	const trailers: string[] = [];
	let searchPos = 0;

	for (let i = 0; i < words.length; i++) {
		if (words[i].trailer !== undefined) {
			trailers.push(words[i].trailer!);
			continue;
		}

		if (!cleanBody) {
			trailers.push(' ');
			continue;
		}

		const surface = words[i].surface;
		const matchIdx = cleanBody.indexOf(surface, searchPos);
		if (matchIdx === -1) {
			trailers.push(' ');
			continue;
		}

		const wordEnd = matchIdx + surface.length;
		if (i < words.length - 1) {
			const nextSurface = words[i + 1].surface;
			const nextIdx = cleanBody.indexOf(nextSurface, wordEnd);
			if (nextIdx !== -1) {
				trailers.push(cleanBody.slice(wordEnd, nextIdx));
				searchPos = nextIdx;
			} else {
				trailers.push(' ');
				searchPos = wordEnd;
			}
		} else {
			trailers.push(' ');
		}
	}

	return trailers;
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
			const words = v.words || [];
			const wordTrailers = computeWordTrailers(words, v.body);
			const formattedWords = words.map((w: WordRow, idx: number) => ({
				word: w.surface,
				surface: w.surface,
				trailer: w.trailer !== undefined ? w.trailer : wordTrailers[idx] ?? ' ',
				id: w.id,
				work_id: w.work_id,
				position: w.position,
				normalized: w.normalized,
				strongs: w.strongs_number,
				morph: w.morph_code,
				lemma: w.lemma,
				gloss: w.gloss
			}));

			chapterDataByVerse[vKey][v.version] = {
				exists: true,
				omitted: false,
				label: v.native_citation || (v.verse_label ? `${v.verse_label}` : v.base_label),
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
	} else if (version === 'LXX' || version === 'OpenGNT' || version === 'OGNT' || version === 'SBLGNT') {
		ret = formatGreek(ret, greekDiacritics);
	}
	return ret;
}

/**
 * Canonical Book Mapping and Normalization Service.
 *
 * Backed by auto-generated definitions in `canonicalBooks.generated.ts`
 * which are produced directly from SQLite `canonical_books`.
 *
 * NOTE: All cross-tradition alignment math (Ezra/Neh <-> 2 Esdras, Psalm offsets,
 * Jeremiah chapters) has been eliminated from this file. The single source of truth
 * for coordinates and versification alignment is the SQLite `text_units` table
 * via `dbClient.ts:translateReference()`.
 */

import {
	CANONICAL_BOOK_DEFINITIONS,
	type CanonicalBook,
	cleanKey,
	normalizeBookName,
	resolveBookCode,
	getCanonicalSlug,
	getCanonicalBook
} from './canonicalBooks.generated.js';

export type BookDefinition = CanonicalBook;
export {
	CANONICAL_BOOK_DEFINITIONS,
	cleanKey,
	normalizeBookName,
	resolveBookCode,
	getCanonicalSlug,
	getCanonicalBook
};

/**
 * Given a book identifier and a Bible version, returns the preferred abbreviation/symbol
 * for that version (e.g. 'Qoh' for BHS vs 'Eccl' for KJV). If none found, returns empty string
 */
export function getBookForVersion(bookIdentifier: string, version: string, chapter?: number): string {
	const canonical = normalizeBookName(bookIdentifier);
	if (!canonical) return '';

	if (canonical.versionBooks && canonical.versionBooks[version]) {
		return canonical.versionBooks[version]!;
	}

	return canonical.standardAbbrev;
}

/**
 * Backward-compatible helper matching legacy getBookFile(version, canonicalBook, chapter?).
 */
export function getBookFile(version: string, canonicalBook: string, chapter?: number): string {
	return getBookForVersion(canonicalBook, version, chapter);
}

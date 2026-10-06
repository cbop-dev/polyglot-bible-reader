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

/**
 * Formats a book abbreviation for user display:
 * - Replaces underscores with spaces (e.g. '1_Cor' -> '1 Cor', '2_Pet' -> '2 Pet')
 * - Adds a space after a leading number (e.g. '2Mac' -> '2 Mac', '1Sam' -> '1 Sam')
 */
export function formatBookAbbreviation(name?: string | null): string {
	if (!name) return '';
	return name.replace(/_/g, ' ').replace(/^([1-4])\s*([a-zA-Z])/, '$1 $2').trim();
}

/**
 * Formats any reference string (e.g. "2PE 1:1" or "ECC 1:2" or "Qoh 1:2") into a human-readable reference,
 * prioritizing versionBooks for the given version (e.g. "Qoh 1:2" for BHS vs "Eccl 1:2" for KJV),
 * falling back to standardAbbrev (e.g. "2 Pet 1:1").
 * Formats abbreviations by replacing underscores with spaces and adding spaces after leading numbers.
 */
export function formatDisplayReference(ref?: string | null, version?: string): string {
	if (!ref) return '';
	const trimmed = ref.trim();
	const parts = trimmed.split(' ');
	if (parts.length >= 2) {
		const bookPart = parts.slice(0, -1).join(' ');
		const cvPart = parts[parts.length - 1];
		const versionBook = getBookForVersion(bookPart, version || '');
		const displayBook = formatBookAbbreviation(versionBook || bookPart);
		return `${displayBook} ${cvPart}`;
	} else {
		const versionBook = getBookForVersion(trimmed, version || '');
		return formatBookAbbreviation(versionBook || trimmed);
	}
}


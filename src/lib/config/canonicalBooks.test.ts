import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { CANONICAL_BOOK_DEFINITIONS, normalizeBookName, resolveBookCode, getCanonicalSlug } from './canonicalBooks.generated.js';

describe('canonicalBooks Parity with SQLite Database', () => {
	const dbPath = resolve(process.cwd(), 'pipeline/build/polyglot-working.sqlite3');

	it('should match the exact count of canonical_books in the database (90 books)', () => {
		const raw = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM canonical_books;"`, { encoding: 'utf-8' }).trim();
		const count = parseInt(raw, 10);
		expect(CANONICAL_BOOK_DEFINITIONS.length).toBe(count);
		expect(CANONICAL_BOOK_DEFINITIONS.length).toBe(90);
	});

	it('should have 1:1 code, order, and testament parity with canonical_books', () => {
		const raw = execSync(
			`sqlite3 "${dbPath}" "SELECT code, order_index, testament, name_english, total_chapters FROM canonical_books ORDER BY order_index, code;"`,
			{ encoding: 'utf-8' }
		).trim();

		const lines = raw.split('\n').filter(Boolean);
		expect(lines).toHaveLength(90);

		for (const line of lines) {
			const [code, orderStr, testament, nameEnglish, totalChStr] = line.split('|');
			const orderIndex = parseInt(orderStr, 10);
			const totalChapters = parseInt(totalChStr, 10);

			const matched = CANONICAL_BOOK_DEFINITIONS.find((b) => b.code === code);
			expect(matched, `Missing book in generated definitions: ${code}`).toBeDefined();
			expect(matched?.order).toBe(orderIndex);
			expect(matched?.totalChapters).toBe(totalChapters);

			const expectedTestament = testament.toLowerCase() === 'ap' ? 'apocrypha' : testament.toLowerCase();
			expect(matched?.testament).toBe(expectedTestament);
		}
	});

	it('should normalize book aliases correctly', () => {
		expect(resolveBookCode('Genesis')).toBe('GEN');
		expect(resolveBookCode('1 Kingdoms')).toBe('1SA');
		expect(resolveBookCode('1Kgdms')).toBe('1SA');
		expect(resolveBookCode('I Samuel')).toBe('1SA');
		expect(resolveBookCode('Qoheleth')).toBe('ECC');
		expect(resolveBookCode('Qoh')).toBe('ECC');
		expect(resolveBookCode('Song of Songs')).toBe('SNG');
		expect(resolveBookCode('Canticles')).toBe('SNG');
		expect(resolveBookCode('Ecclesiasticus')).toBe('SIR');
		expect(resolveBookCode('2 Esdras')).toBe('2ES');
		expect(resolveBookCode('Laodiceans')).toBe('LAO');
	});

	it('should resolve dual Greek recensions in LXX mode', () => {
		expect(resolveBookCode('Sus', 'LXX')).toBe('SUG');
		expect(resolveBookCode('SusTh', 'LXX')).toBe('SUS');
		expect(resolveBookCode('Dan', 'LXX')).toBe('DAG');
		expect(resolveBookCode('DanTh', 'LXX')).toBe('DAN');
		expect(resolveBookCode('Bel', 'LXX')).toBe('BLG');
		expect(resolveBookCode('BelTh', 'LXX')).toBe('BEL');
	});

	it('should have exact version available books generated from SQLite text_units', async () => {
		const { VERSION_AVAILABLE_BOOKS } = await import('./canonicalBooks.generated.js');
		const { getVersionBooks, isBookInVersion } = await import('./versions.js');

		expect(VERSION_AVAILABLE_BOOKS['BHS']).toHaveLength(39);
		expect(VERSION_AVAILABLE_BOOKS['LXX']).toHaveLength(57);
		expect(VERSION_AVAILABLE_BOOKS['OpenGNT']).toHaveLength(27);
		expect(VERSION_AVAILABLE_BOOKS['KJV']).toHaveLength(80);
		expect(VERSION_AVAILABLE_BOOKS['Vulgate']).toHaveLength(80);
		expect(VERSION_AVAILABLE_BOOKS['WEB']).toHaveLength(77);
		expect(VERSION_AVAILABLE_BOOKS['Brenton']).toHaveLength(53);

		// Vulgate contains Revelation and canonical additions
		expect(VERSION_AVAILABLE_BOOKS['Vulgate']).toContain('Rev');
		expect(VERSION_AVAILABLE_BOOKS['Vulgate']).toContain('1Esdr');
		expect(VERSION_AVAILABLE_BOOKS['Vulgate']).toContain('2Esdr');

		// OpenGNT uses standard abbreviations
		expect(VERSION_AVAILABLE_BOOKS['OpenGNT']).toContain('2_Pet');
		expect(VERSION_AVAILABLE_BOOKS['OpenGNT']).toContain('Matt');

		// getVersionBooks and isBookInVersion helpers
		expect(getVersionBooks('OpenGNT')).toEqual(VERSION_AVAILABLE_BOOKS['OpenGNT']);
		expect(isBookInVersion('2_Pet', 'OpenGNT')).toBe(true);
		expect(isBookInVersion('Gen', 'OpenGNT')).toBe(false);
	});

	it('should format book abbreviations with spaces after numbers and underscores replaced', async () => {
		const { formatBookAbbreviation } = await import('./bookMapping.js');

		expect(formatBookAbbreviation('2Mac')).toBe('2 Mac');
		expect(formatBookAbbreviation('1Sam')).toBe('1 Sam');
		expect(formatBookAbbreviation('1_Cor')).toBe('1 Cor');
		expect(formatBookAbbreviation('2_Pet')).toBe('2 Pet');
		expect(formatBookAbbreviation('3Macc')).toBe('3 Macc');
		expect(formatBookAbbreviation('1Kgs')).toBe('1 Kgs');
		expect(formatBookAbbreviation('Matt')).toBe('Matt');
		expect(formatBookAbbreviation('Qoh')).toBe('Qoh');
		expect(formatBookAbbreviation(null)).toBe('');
		expect(formatBookAbbreviation(undefined)).toBe('');
	});

	it('should format references with version-specific and standard human-readable abbreviations', async () => {
		const { formatDisplayReference } = await import('./bookMapping.js');

		// OpenGNT converts USFM code to formatted standardAbbrev
		expect(formatDisplayReference('2PE 1:1', 'OpenGNT')).toBe('2 Pet 1:1');
		expect(formatDisplayReference('2PE 1:1')).toBe('2 Pet 1:1');
		expect(formatDisplayReference('MAT 5:3')).toBe('Matt 5:3');
		expect(formatDisplayReference('1CO 13:4')).toBe('1 Cor 13:4');
		expect(formatDisplayReference('2PE')).toBe('2 Pet');

		// Version-specific naming priority
		expect(formatDisplayReference('ECC 1:1', 'BHS')).toBe('Qoh 1:1');
		expect(formatDisplayReference('ECC 1:1', 'LXX')).toBe('Qoh 1:1');
		expect(formatDisplayReference('ECC 1:1', 'KJV')).toBe('Eccl 1:1');
		expect(formatDisplayReference('TOB 1:1', 'LXX')).toBe('TobBA 1:1');
		expect(formatDisplayReference('TOB 1:1', 'KJV')).toBe('Tob 1:1');
	});
});


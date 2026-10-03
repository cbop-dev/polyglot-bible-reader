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
});

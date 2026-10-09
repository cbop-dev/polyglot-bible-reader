import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HighlightStore, HIGHLIGHT_PALETTE } from './highlightStore.svelte';

describe('HighlightStore', () => {
	let store: HighlightStore;

	beforeEach(() => {
		// Mock localStorage
		const storage: Record<string, string> = {};
		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => storage[key] ?? null),
			setItem: vi.fn((key: string, value: string) => {
				storage[key] = value;
			}),
			removeItem: vi.fn((key: string) => {
				delete storage[key];
			}),
			clear: vi.fn(() => {
				for (const k of Object.keys(storage)) delete storage[k];
			})
		});

		store = new HighlightStore();
	});

	it('initializes with empty items', () => {
		expect(store.items).toEqual([]);
	});

	it('adds Greek lemma and normalizes plain text', () => {
		const item = store.addLemma('λόγος', 'G3056', 'greek');
		expect(item).toBeDefined();
		expect(item.lang).toBe('greek');
		expect(item.plain).toBe('λογοσ');
		expect(item.strongs).toBe('G3056');
		expect(item.colorIndex).toBe(0);
		expect(item.color).toBe(HIGHLIGHT_PALETTE[0].hex);
		expect(store.items.length).toBe(1);
	});

	it('adds Hebrew lemma and normalizes plain text', () => {
		const item = store.addLemma('בָּרָא', 'H1254', 'hebrew');
		expect(item).toBeDefined();
		expect(item.lang).toBe('hebrew');
		expect(item.plain).toBe('ברא');
		expect(item.strongs).toBe('H1254');
		expect(store.items.length).toBe(1);
	});

	it('auto-detects Hebrew vs Greek by Unicode characters', () => {
		const hebrewItem = store.addLemma('שָׁלוֹם');
		expect(hebrewItem.lang).toBe('hebrew');

		const greekItem = store.addLemma('ἀγάπη');
		expect(greekItem.lang).toBe('greek');
	});

	it('cycles palette colors when adding multiple items', () => {
		const item1 = store.addLemma('λόγος', undefined, 'greek');
		const item2 = store.addLemma('ἀγάπη', undefined, 'greek');
		const item3 = store.addLemma('בָּרָא', undefined, 'hebrew');

		expect(item1.colorIndex).toBe(0);
		expect(item2.colorIndex).toBe(1);
		expect(item3.colorIndex).toBe(2);
		expect(item1.color).not.toBe(item2.color);
		expect(item2.color).not.toBe(item3.color);
	});

	it('prevents duplicate additions of the same lemma', () => {
		const first = store.addLemma('λόγος', 'G3056', 'greek');
		const second = store.addLemma('λόγος', 'G3056', 'greek');
		expect(store.items.length).toBe(1);
		expect(first).toEqual(second);
	});

	it('toggles lemma on and off', () => {
		const added = store.toggleLemma('λόγος', 'G3056', 'greek');
		expect(added).toBe(true);
		expect(store.isHighlighted('λόγος', 'G3056', 'greek')).toBe(true);

		const removed = store.toggleLemma('λόγος', 'G3056', 'greek');
		expect(removed).toBe(false);
		expect(store.isHighlighted('λόγος', 'G3056', 'greek')).toBe(false);
		expect(store.items.length).toBe(0);
	});

	it('removes lemma by id', () => {
		const item = store.addLemma('λόγος', undefined, 'greek');
		expect(store.items.length).toBe(1);
		store.removeLemma(item.id);
		expect(store.items.length).toBe(0);
	});

	it('changes color of an active highlight', () => {
		const item = store.addLemma('λόγος', undefined, 'greek');
		expect(item.colorIndex).toBe(0);

		store.setColor(item.id, 4);
		const updated = store.items.find((i) => i.id === item.id);
		expect(updated?.colorIndex).toBe(4);
		expect(updated?.color).toBe(HIGHLIGHT_PALETTE[4].hex);
	});

	it('clears all highlights', () => {
		store.addLemma('λόγος', undefined, 'greek');
		store.addLemma('ἀγάπη', undefined, 'greek');
		expect(store.items.length).toBe(2);

		store.clearAll();
		expect(store.items.length).toBe(0);
	});

	describe('getHighlightForToken matching', () => {
		it('matches token by Strongs number (prefixed or raw)', () => {
			store.addLemma('λόγος', 'G3056', 'greek');

			// Matching with G3056
			const m1 = store.getHighlightForToken({ strongs: 'G3056', word: 'logos' }, 'greek');
			expect(m1).toBeDefined();
			expect(m1?.plain).toBe('λογοσ');

			// Matching with raw number 3056
			const m2 = store.getHighlightForToken({ strongs_number: 3056, word: 'logos' }, 'greek');
			expect(m2).toBeDefined();

			// Hebrew token with same number should NOT match Greek
			const m3 = store.getHighlightForToken({ strongs: 'H3056' }, 'hebrew');
			expect(m3).toBeNull();
		});

		it('matches token by lemma with accents stripped', () => {
			store.addLemma('λόγος', undefined, 'greek');

			const match = store.getHighlightForToken({ lemma: 'λόγος', word: 'λόγον' }, 'greek');
			expect(match).toBeDefined();
			expect(match?.plain).toBe('λογοσ');
		});

		it('matches token by normalized word', () => {
			store.addLemma('λόγος', undefined, 'greek');

			const match = store.getHighlightForToken({ normalized: 'λογος' }, 'greek');
			expect(match).toBeDefined();
		});

		it('matches Hebrew tokens by lemma or word', () => {
			store.addLemma('בָּרָא', 'H1254', 'hebrew');

			const m1 = store.getHighlightForToken({ lemma: 'בָּרָא' }, 'hebrew');
			expect(m1).toBeDefined();

			const m2 = store.getHighlightForToken({ word: 'ברא' }, 'hebrew');
			expect(m2).toBeDefined();

			const m3 = store.getHighlightForToken({ strongs: 'H1254' }, 'hebrew');
			expect(m3).toBeDefined();
		});

		it('returns null if token does not match', () => {
			store.addLemma('λόγος', undefined, 'greek');

			const match = store.getHighlightForToken({ lemma: 'θεός' }, 'greek');
			expect(match).toBeNull();
		});
	});

	describe('getInlineStyle theme styling', () => {
		it('generates distinct styles for light and dark themes', () => {
			const item = store.addLemma('λόγος', undefined, 'greek');
			const styleLight = store.getInlineStyle(item, 'light');
			const styleDark = store.getInlineStyle(item, 'dark');

			expect(styleLight).toContain(HIGHLIGHT_PALETTE[0].bgLight);
			expect(styleLight).toContain(HIGHLIGHT_PALETTE[0].textLight);

			expect(styleDark).toContain(HIGHLIGHT_PALETTE[0].bgDark);
			expect(styleDark).toContain(HIGHLIGHT_PALETTE[0].textDark);
		});
	});
});

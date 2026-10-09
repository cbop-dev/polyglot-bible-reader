import { toPlainGreek, toPlainHebrew } from '$lib/utils/transliteration';

export interface PaletteColor {
	id: number;
	name: string;
	hex: string;
	bgLight: string;
	textLight: string;
	borderLight: string;
	bgDark: string;
	textDark: string;
	borderDark: string;
}

export const HIGHLIGHT_PALETTE: PaletteColor[] = [
	{
		id: 0,
		name: 'Amber',
		hex: '#f59e0b',
		bgLight: 'rgba(245, 158, 11, 0.28)',
		textLight: '#78350f',
		borderLight: 'rgba(245, 158, 11, 0.6)',
		bgDark: 'rgba(245, 158, 11, 0.42)',
		textDark: '#fef3c7',
		borderDark: 'rgba(245, 158, 11, 0.7)'
	},
	{
		id: 1,
		name: 'Sky Blue',
		hex: '#0ea5e9',
		bgLight: 'rgba(14, 165, 233, 0.26)',
		textLight: '#0369a1',
		borderLight: 'rgba(14, 165, 233, 0.6)',
		bgDark: 'rgba(14, 165, 233, 0.42)',
		textDark: '#e0f2fe',
		borderDark: 'rgba(14, 165, 233, 0.7)'
	},
	{
		id: 2,
		name: 'Emerald',
		hex: '#10b981',
		bgLight: 'rgba(16, 185, 129, 0.26)',
		textLight: '#065f46',
		borderLight: 'rgba(16, 185, 129, 0.6)',
		bgDark: 'rgba(16, 185, 129, 0.42)',
		textDark: '#d1fae5',
		borderDark: 'rgba(16, 185, 129, 0.7)'
	},
	{
		id: 3,
		name: 'Rose',
		hex: '#f43f5e',
		bgLight: 'rgba(244, 63, 94, 0.26)',
		textLight: '#9f1239',
		borderLight: 'rgba(244, 63, 94, 0.6)',
		bgDark: 'rgba(244, 63, 94, 0.42)',
		textDark: '#ffe4e6',
		borderDark: 'rgba(244, 63, 94, 0.7)'
	},
	{
		id: 4,
		name: 'Violet',
		hex: '#8b5cf6',
		bgLight: 'rgba(139, 92, 246, 0.26)',
		textLight: '#5b21b6',
		borderLight: 'rgba(139, 92, 246, 0.6)',
		bgDark: 'rgba(139, 92, 246, 0.42)',
		textDark: '#ede9fe',
		borderDark: 'rgba(139, 92, 246, 0.7)'
	},
	{
		id: 5,
		name: 'Orange',
		hex: '#f97316',
		bgLight: 'rgba(249, 115, 22, 0.28)',
		textLight: '#9a3412',
		borderLight: 'rgba(249, 115, 22, 0.6)',
		bgDark: 'rgba(249, 115, 22, 0.42)',
		textDark: '#ffedd5',
		borderDark: 'rgba(249, 115, 22, 0.7)'
	},
	{
		id: 6,
		name: 'Teal',
		hex: '#14b8a6',
		bgLight: 'rgba(20, 184, 166, 0.26)',
		textLight: '#0f766e',
		borderLight: 'rgba(20, 184, 166, 0.6)',
		bgDark: 'rgba(20, 184, 166, 0.42)',
		textDark: '#ccfbf1',
		borderDark: 'rgba(20, 184, 166, 0.7)'
	},
	{
		id: 7,
		name: 'Fuchsia',
		hex: '#d946ef',
		bgLight: 'rgba(217, 70, 239, 0.26)',
		textLight: '#86198f',
		borderLight: 'rgba(217, 70, 239, 0.6)',
		bgDark: 'rgba(217, 70, 239, 0.42)',
		textDark: '#fae8ff',
		borderDark: 'rgba(217, 70, 239, 0.7)'
	},
	{
		id: 8,
		name: 'Lime',
		hex: '#84cc16',
		bgLight: 'rgba(132, 204, 22, 0.30)',
		textLight: '#3f6212',
		borderLight: 'rgba(132, 204, 22, 0.6)',
		bgDark: 'rgba(132, 204, 22, 0.42)',
		textDark: '#ecfccb',
		borderDark: 'rgba(132, 204, 22, 0.7)'
	},
	{
		id: 9,
		name: 'Indigo',
		hex: '#6366f1',
		bgLight: 'rgba(99, 102, 241, 0.26)',
		textLight: '#3730a3',
		borderLight: 'rgba(99, 102, 241, 0.6)',
		bgDark: 'rgba(99, 102, 241, 0.42)',
		textDark: '#e0e7ff',
		borderDark: 'rgba(99, 102, 241, 0.7)'
	},
	{
		id: 10,
		name: 'Coral',
		hex: '#fb7185',
		bgLight: 'rgba(251, 113, 133, 0.26)',
		textLight: '#881337',
		borderLight: 'rgba(251, 113, 133, 0.6)',
		bgDark: 'rgba(251, 113, 133, 0.42)',
		textDark: '#ffe4e6',
		borderDark: 'rgba(251, 113, 133, 0.7)'
	},
	{
		id: 11,
		name: 'Cyan',
		hex: '#06b6d4',
		bgLight: 'rgba(6, 182, 212, 0.26)',
		textLight: '#155e75',
		borderLight: 'rgba(6, 182, 212, 0.6)',
		bgDark: 'rgba(6, 182, 212, 0.42)',
		textDark: '#cffafe',
		borderDark: 'rgba(6, 182, 212, 0.7)'
	},
	{
		id: 12,
		name: 'Yellow',
		hex: '#eab308',
		bgLight: 'rgba(234, 179, 8, 0.30)',
		textLight: '#713f12',
		borderLight: 'rgba(234, 179, 8, 0.6)',
		bgDark: 'rgba(234, 179, 8, 0.42)',
		textDark: '#fef9c3',
		borderDark: 'rgba(234, 179, 8, 0.7)'
	},
	{
		id: 13,
		name: 'Plum',
		hex: '#a855f7',
		bgLight: 'rgba(168, 85, 247, 0.26)',
		textLight: '#6b21a8',
		borderLight: 'rgba(168, 85, 247, 0.6)',
		bgDark: 'rgba(168, 85, 247, 0.42)',
		textDark: '#f3e8ff',
		borderDark: 'rgba(168, 85, 247, 0.7)'
	},
	{
		id: 14,
		name: 'Mint',
		hex: '#2dd4bf',
		bgLight: 'rgba(45, 212, 191, 0.26)',
		textLight: '#134e4a',
		borderLight: 'rgba(45, 212, 191, 0.6)',
		bgDark: 'rgba(45, 212, 191, 0.42)',
		textDark: '#ccfbf1',
		borderDark: 'rgba(21, 184, 166, 0.7)'
	},
	{
		id: 15,
		name: 'Slate',
		hex: '#64748b',
		bgLight: 'rgba(100, 116, 139, 0.26)',
		textLight: '#1e293b',
		borderLight: 'rgba(100, 116, 139, 0.6)',
		bgDark: 'rgba(100, 116, 139, 0.42)',
		textDark: '#f1f5f9',
		borderDark: 'rgba(100, 116, 139, 0.7)'
	}
];

export interface HighlightedLemma {
	id: string; // e.g. 'greek:λογος' or 'hebrew:ברא'
	lemma: string; // Display lemma (e.g. 'λόγος', 'בָּרָא')
	plain: string; // Normalized plain form (e.g. 'λογοσ', 'ברא')
	strongs?: string; // Normalized Strong's ID (e.g. 'G3056', 'H1254')
	lang: 'greek' | 'hebrew';
	colorIndex: number;
	color: string; // Hex color
	createdAt: number;
}

const STORAGE_KEY = 'pbr_highlighted_lemmas';

function normalizeStrongsId(s?: string): string {
	if (!s) return '';
	return s.trim().toUpperCase().replace(/^[A-Z]*0+/, (m) => m[0]);
}

export class HighlightStore {
	items = $state<HighlightedLemma[]>([]);

	// Fast O(1) lookup maps derived reactively
	plainMap = $derived.by(() => {
		const m = new Map<string, HighlightedLemma>();
		for (const item of this.items) {
			m.set(`${item.lang}:${item.plain}`, item);
		}
		return m;
	});

	strongsMap = $derived.by(() => {
		const m = new Map<string, HighlightedLemma>();
		for (const item of this.items) {
			if (item.strongs) {
				const sCode = normalizeStrongsId(item.strongs);
				if (sCode) {
					m.set(`${item.lang}:${sCode}`, item);
					// Also store raw digits if prefixed with G/H
					const numOnly = sCode.replace(/^[GH]/, '');
					if (numOnly) m.set(`${item.lang}:${numOnly}`, item);
				}
			}
		}
		return m;
	});

	constructor() {
		this.loadFromStorage();
	}

	loadFromStorage() {
		if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					this.items = parsed;
				}
			}
		} catch (e) {
			console.warn('[HighlightStore] Failed to load from localStorage:', e);
		}
	}

	private saveToStorage() {
		if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
		} catch (e) {
			console.warn('[HighlightStore] Failed to save to localStorage:', e);
		}
	}

	private getNextColorIndex(): number {
		const usedIndices = new Set(this.items.map((i) => i.colorIndex));
		for (let i = 0; i < HIGHLIGHT_PALETTE.length; i++) {
			if (!usedIndices.has(i)) return i;
		}
		// If all colors used, cycle based on count
		return this.items.length % HIGHLIGHT_PALETTE.length;
	}

	makeId(plain: string, lang: 'greek' | 'hebrew'): string {
		return `${lang}:${plain}`;
	}

	/**
	 * Detects language from lemma string or corpus code.
	 */
	detectLanguage(lemma: string, langHint?: string): 'greek' | 'hebrew' {
		if (langHint === 'hebrew' || langHint === 'bhs' || langHint === 'wlc') return 'hebrew';
		if (langHint === 'greek' || langHint === 'ognt' || langHint === 'swete_lxx' || langHint === 'lxx') return 'greek';
		// Check for Hebrew Unicode block (\u0590 - \u05FF)
		if (/[\u0590-\u05FF]/.test(lemma)) return 'hebrew';
		return 'greek';
	}

	addLemma(lemma: string, strongs?: string, langHint?: string, colorIndex?: number): HighlightedLemma {
		if (!lemma && !strongs) throw new Error('Lemma or Strongs is required');
		const lang = this.detectLanguage(lemma || '', langHint);
		const plain = lang === 'hebrew' ? toPlainHebrew(lemma) : toPlainGreek(lemma);
		const id = this.makeId(plain || strongs || '', lang);

		// Check if already present
		const existingIdx = this.items.findIndex((i) => i.id === id);
		if (existingIdx >= 0) {
			return this.items[existingIdx];
		}

		const cIdx = typeof colorIndex === 'number' && colorIndex >= 0 && colorIndex < HIGHLIGHT_PALETTE.length
			? colorIndex
			: this.getNextColorIndex();
		const paletteColor = HIGHLIGHT_PALETTE[cIdx];

		const item: HighlightedLemma = {
			id,
			lemma: lemma || strongs || '',
			plain,
			strongs: strongs ? normalizeStrongsId(strongs) : undefined,
			lang,
			colorIndex: cIdx,
			color: paletteColor.hex,
			createdAt: Date.now()
		};

		this.items = [...this.items, item];
		this.saveToStorage();
		return item;
	}

	removeLemma(id: string) {
		this.items = this.items.filter((i) => i.id !== id);
		this.saveToStorage();
	}

	toggleLemma(lemma: string, strongs?: string, langHint?: string): boolean {
		const lang = this.detectLanguage(lemma || '', langHint);
		const plain = lang === 'hebrew' ? toPlainHebrew(lemma) : toPlainGreek(lemma);
		const id = this.makeId(plain || strongs || '', lang);

		const exists = this.items.some((i) => i.id === id);
		if (exists) {
			this.removeLemma(id);
			return false;
		} else {
			this.addLemma(lemma, strongs, lang);
			return true;
		}
	}

	isHighlighted(lemma: string, strongs?: string, langHint?: string): boolean {
		const lang = this.detectLanguage(lemma || '', langHint);
		const plain = lang === 'hebrew' ? toPlainHebrew(lemma) : toPlainGreek(lemma);
		const id = this.makeId(plain || strongs || '', lang);
		return this.items.some((i) => i.id === id);
	}

	getHighlight(lemma: string, strongs?: string, langHint?: string): HighlightedLemma | null {
		const lang = this.detectLanguage(lemma || '', langHint);
		const plain = lang === 'hebrew' ? toPlainHebrew(lemma) : toPlainGreek(lemma);
		const id = this.makeId(plain || strongs || '', lang);
		return this.items.find((i) => i.id === id) || null;
	}

	setColor(id: string, colorIndex: number) {
		const cIdx = Math.max(0, Math.min(colorIndex, HIGHLIGHT_PALETTE.length - 1));
		const paletteColor = HIGHLIGHT_PALETTE[cIdx];
		this.items = this.items.map((item) => {
			if (item.id === id) {
				return {
					...item,
					colorIndex: cIdx,
					color: paletteColor.hex
				};
			}
			return item;
		});
		this.saveToStorage();
	}

	clearAll() {
		this.items = [];
		this.saveToStorage();
	}

	/**
	 * Fast O(1) matching for a word token in VerseCard.
	 */
	getHighlightForToken(token: any, lang: 'greek' | 'hebrew'): HighlightedLemma | null {
		if (!token || this.items.length === 0) return null;

		// 1. Check by Strong's number
		const sRaw = token.strongs || token.strongs_number;
		if (sRaw) {
			const sCode = normalizeStrongsId(String(sRaw));
			const match = this.strongsMap.get(`${lang}:${sCode}`);
			if (match) return match;
		}

		// 2. Check by token lemma
		if (token.lemma) {
			const p = lang === 'hebrew' ? toPlainHebrew(token.lemma) : toPlainGreek(token.lemma);
			const match = this.plainMap.get(`${lang}:${p}`);
			if (match) return match;
		}

		// 3. Check by normalized surface word
		if (token.normalized) {
			const p = lang === 'hebrew' ? toPlainHebrew(token.normalized) : toPlainGreek(token.normalized);
			const match = this.plainMap.get(`${lang}:${p}`);
			if (match) return match;
		}

		// 4. Check by surface word
		if (token.word) {
			const p = lang === 'hebrew' ? toPlainHebrew(token.word) : toPlainGreek(token.word);
			const match = this.plainMap.get(`${lang}:${p}`);
			if (match) return match;
		}

		return null;
	}

	/**
	 * Generates CSS inline style string for a highlighted token.
	 */
	getInlineStyle(hl: HighlightedLemma, themeMode: string = 'light'): string {
		const pal = HIGHLIGHT_PALETTE[hl.colorIndex] || HIGHLIGHT_PALETTE[0];
		const isDark = themeMode === 'dark';
		const bg = isDark ? pal.bgDark : pal.bgLight;
		const color = isDark ? pal.textDark : pal.textLight;
		const border = isDark ? pal.borderDark : pal.borderLight;
		return `background-color: ${bg}; color: ${color}; border-bottom: 2px solid ${border}; border-radius: 4px; padding: 1px 3px; font-weight: 600;`;
	}
}

export const highlightStore = new HighlightStore();

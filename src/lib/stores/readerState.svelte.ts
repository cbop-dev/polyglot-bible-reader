import { getVersionBooks } from '$lib/config/versions';
import { getBookFile } from '$lib/bookMapping.js';
import type { HebrewDiacriticMode } from '$lib/utils/diacritics';
import { loadChapterFromDb, loadChaptersForBook } from '$lib/services/bibleDataLoader';
import { getLemma, getWorks, translateReference, type WorkRow } from '$lib/services/dbClient';

export interface VerseDataItem {
	exists: boolean;
	omitted: boolean;
	label: string;
	isDivergent: boolean;
	verseData?: {
		id: number;
		text: string;
		words?: any[];
	};
}

export class ReaderState {
	selectedVersion = $state<string>('BHS');
	selectedBook = $state<string>('Gen');
	selectedChapter = $state<string>('1');

	versionGrid = $state<string[][]>([['BHS', 'LXX']]);
	gridAlignments = $state<(( 'left' | 'right' ) | null)[][]>([[null, null]]);

	hebrewMode = $state<HebrewDiacriticMode>('all');
	greekDiacritics = $state<boolean>(true);
	gridHeaderExpanded = $state<boolean>(false);

	loadedBooks = $state<Record<string, any>>({});
	chapterDataByVerse = $state<Record<string, Record<string, VerseDataItem>>>({});
	chapterVerseKeys = $state<string[]>([]);
	bookChapters = $state<number[]>([]);
	isLoading = $state<boolean>(false);

	// Modal / popup toggles
	versionDropdownOpen = $state<boolean>(false);
	bookDropdownOpen = $state<boolean>(false);
	chapterDropdownOpen = $state<boolean>(false);
	verseDropdownOpen = $state<boolean>(false);
	showLemmaModal = $state<boolean>(false);
	activeWord = $state<any>(null);

	visibleVersions = $derived<string[]>(
		Array.from(new Set(this.versionGrid.flat()))
	);
	activeVersions = $derived<string[]>(
		Array.from(new Set([...this.versionGrid.flat(), this.selectedVersion]))
	);

	availableBooks = $derived<string[]>(getVersionBooks(this.selectedVersion));

	availableChapters = $derived<number[]>(
		this.bookChapters.length > 0 ? this.bookChapters : [1]
	);

	verseKeys = $derived<string[]>(this.chapterVerseKeys);

	async initStaticData() {
		try {
			const { getDbWorker } = await import('$lib/services/dbWorker');
			await getDbWorker();
		} catch (e) {
			console.warn('[ReaderState] DB worker initialization:', e);
		}
	}

	/**
	 * Retrieve pre-aligned verse data for a specific verse and version.
	 */
	getVerseData(verseKey: string, colVersion: string): VerseDataItem {
		const rowData = this.chapterDataByVerse[verseKey]?.[colVersion];
		if (rowData) return rowData;

		return {
			exists: false,
			omitted: true,
			label: `${this.selectedBook} ${this.selectedChapter}:${verseKey}`,
			isDivergent: false,
			verseData: undefined
		};
	}

	/**
	 * Loads the active chapter for all active grid versions from the SQLite database.
	 */
	async loadCurrentChapter() {
		this.isLoading = true;
		const book = this.selectedBook;
		const chapNum = parseInt(this.selectedChapter, 10) || 1;
		const versions = this.activeVersions;
		const primaryVersion = this.selectedVersion;

		try {
			// Fetch book chapters in parallel if not already loaded for current book and primary version
			const chaptersPromise = loadChaptersForBook(book, primaryVersion);
			const chapterDataPromise = loadChapterFromDb(book, chapNum, versions, primaryVersion);

			const [chapters, res] = await Promise.all([chaptersPromise, chapterDataPromise]);

			if (chapters.length > 0) {
				this.bookChapters = chapters;
				if (!chapters.includes(chapNum)) {
					this.selectedChapter = String(chapters[0] || 1);
				}
			}

			this.chapterVerseKeys = res.verseKeys;
			this.chapterDataByVerse = res.chapterDataByVerse as Record<string, Record<string, VerseDataItem>>;

			// Populate loadedBooks map for backward compatibility with existing components
			const booksMap: Record<string, any> = {};
			for (const ver of versions) {
				const chapObj: Record<string, any> = {};
				for (const vKey of res.verseKeys) {
					const vItem = res.chapterDataByVerse[vKey]?.[ver];
					if (vItem?.exists && vItem.verseData) {
						chapObj[vKey] = vItem.verseData;
					}
				}
				booksMap[ver] = {
					book,
					chapters: {
						[String(chapNum)]: chapObj
					}
				};
			}
			this.loadedBooks = booksMap;
		} finally {
			this.isLoading = false;
		}
	}

	async loadCurrentBooks() {
		return this.loadCurrentChapter();
	}

	closeAllPopups() {
		this.showLemmaModal = false;
		this.activeWord = null;
		this.versionDropdownOpen = false;
		this.bookDropdownOpen = false;
		this.chapterDropdownOpen = false;
		this.verseDropdownOpen = false;
	}

	getDefaultAlign(rIdx: number, cIdx: number, version: string): 'left' | 'right' {
		const totalCols = this.versionGrid[0]?.length || 2;
		if (totalCols === 2) {
			return cIdx === 0 ? 'right' : 'left';
		}
		return version === 'BHS' ? 'right' : 'left';
	}

	getCellAlign(rIdx: number, cIdx: number): 'left' | 'right' {
		const override = this.gridAlignments[rIdx]?.[cIdx];
		if (override) return override;
		const ver = this.versionGrid[rIdx]?.[cIdx] || 'WEB';
		return this.getDefaultAlign(rIdx, cIdx, ver);
	}

	toggleCellAlign(rIdx: number, cIdx: number) {
		const current = this.getCellAlign(rIdx, cIdx);
		const next = current === 'right' ? 'left' : 'right';
		this.gridAlignments = this.gridAlignments.map((row, r) => {
			if (r !== rIdx) return row;
			const newRow = [...row];
			newRow[cIdx] = next;
			return newRow;
		});
	}

	addColumn() {
		const defaults = ['BHS', 'LXX', 'KJV', 'Vulgate', 'WEB', 'Brenton', 'SBLGNT'];
		const used = new Set(this.versionGrid.flat());
		const nextVer = defaults.find((d) => !used.has(d)) || 'WEB';
		this.versionGrid = this.versionGrid.map((row) => [...row, nextVer]);
		this.gridAlignments = this.gridAlignments.map((row) => [...row, null]);
		this.loadCurrentChapter();
	}

	removeColumn(colIndex: number) {
		if ((this.versionGrid[0]?.length || 0) <= 1) return;
		this.versionGrid = this.versionGrid.map((row) => row.filter((_, idx) => idx !== colIndex));
		this.gridAlignments = this.gridAlignments.map((row) => row.filter((_, idx) => idx !== colIndex));
	}

	addRow() {
		const cols = this.versionGrid[0]?.length || 2;
		const defaults = ['KJV', 'Vulgate', 'WEB', 'Brenton', 'BHS', 'LXX', 'SBLGNT'];
		const used = new Set(this.versionGrid.flat());
		const unused = defaults.filter((d) => !used.has(d));
		const newRow: string[] = [];
		for (let c = 0; c < cols; c++) {
			newRow.push(unused[c] || defaults[c % defaults.length] || 'WEB');
		}
		this.versionGrid = [...this.versionGrid, newRow];
		this.gridAlignments = [...this.gridAlignments, new Array(cols).fill(null)];
		this.loadCurrentChapter();
	}

	removeRow(rowIndex: number) {
		if (this.versionGrid.length <= 1) return;
		this.versionGrid = this.versionGrid.filter((_, idx) => idx !== rowIndex);
		this.gridAlignments = this.gridAlignments.filter((_, idx) => idx !== rowIndex);
	}

	updateCell(rIdx: number, cIdx: number, version: string) {
		this.versionGrid = this.versionGrid.map((row, r) => {
			if (r !== rIdx) return row;
			const newRow = [...row];
			newRow[cIdx] = version;
			return newRow;
		});
		this.loadCurrentChapter();
	}

	cycleHebrewMode() {
		if (this.hebrewMode === 'all') {
			this.hebrewMode = 'vowels';
		} else if (this.hebrewMode === 'vowels') {
			this.hebrewMode = 'none';
		} else {
			this.hebrewMode = 'all';
		}
	}

	toggleGreekDiacritics() {
		this.greekDiacritics = !this.greekDiacritics;
	}

	async handleVersionSelect(version: string) {
		const oldVersion = this.selectedVersion;
		this.selectedVersion = version;
		this.versionDropdownOpen = false;

		const books = getVersionBooks(version);

		// If current book is available in new version, attempt reference translation (Option B)
		if (books.includes(this.selectedBook)) {
			const currentCh = parseInt(this.selectedChapter, 10) || 1;
			try {
				const translated = await translateReference(this.selectedBook, currentCh, 1, oldVersion, version);
				if (translated && translated.chapter) {
					this.selectedChapter = String(translated.chapter);
				}
			} catch (e) {
				console.warn('[ReaderState] Reference translation error:', e);
			}
			this.loadCurrentChapter();
			return;
		}

		// Try mapped book
		const targetBook = getBookFile(version, this.selectedBook);
		if (books.includes(targetBook)) {
			this.selectedBook = targetBook;
			const currentCh = parseInt(this.selectedChapter, 10) || 1;
			try {
				const translated = await translateReference(targetBook, currentCh, 1, oldVersion, version);
				if (translated && translated.chapter) {
					this.selectedChapter = String(translated.chapter);
				}
			} catch (e) {
				console.warn('[ReaderState] Reference translation error:', e);
			}
			this.loadCurrentChapter();
			return;
		}

		this.selectedBook = books[0] || 'Gen';
		this.selectedChapter = '1';
		this.loadCurrentChapter();
	}

	selectBook(book: string) {
		this.selectedBook = book;
		this.selectedChapter = '1';
		this.bookDropdownOpen = false;
		this.loadCurrentChapter();
	}

	selectChapter(chapter: string) {
		this.selectedChapter = chapter;
		this.chapterDropdownOpen = false;
		this.loadCurrentChapter();
	}

	scrollToVerse(verseKey: string) {
		if (typeof document === 'undefined') return;
		const el = document.getElementById(`verse-${verseKey}`);
		if (el) {
			const headerOffset = 150;
			const elementPosition = el.getBoundingClientRect().top;
			const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
			window.scrollTo({
				top: offsetPosition,
				behavior: 'smooth'
			});
		}
	}

	async inspectWord(wordObj: any, colVersion: string) {
		if (!wordObj) return;
		const corpus = colVersion.toLowerCase();
		this.activeWord = { ...wordObj, isLoading: true, corpus };
		this.showLemmaModal = true;

		try {
			// Query lexemes table directly
			const lookupKey = wordObj.normalized || wordObj.word || wordObj.id;
			const lexData = await getLemma(corpus, lookupKey);
			if (lexData) {
				this.activeWord = {
					...wordObj,
					...lexData,
					corpus,
					lemma: lexData.lemma,
					gloss: lexData.gloss,
					strongs: lexData.strongs,
					isLoading: false
				};
			} else {
				this.activeWord = {
					...wordObj,
					corpus,
					lemma: wordObj.normalized || wordObj.word,
					isLoading: false
				};
			}
		} catch (err) {
			console.warn('[ReaderState] Error inspecting word:', err);
			this.activeWord = { ...wordObj, corpus, isLoading: false };
		}
	}
}

export const readerState = new ReaderState();

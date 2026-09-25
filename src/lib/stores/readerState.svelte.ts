import { getVersionBooks } from '$lib/config/versions';
import { getBookFile } from '$lib/bookMapping.js';
import type { HebrewDiacriticMode } from '$lib/utils/diacritics';
import { loadBooksForVersions, loadLexemeDictionaries } from '$lib/services/bibleDataLoader';
import { fetchWordInfo } from '$lib/services/lexiconService';

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
  alignmentData = $state<any>({});
  lexemes = $state<Record<string, any>>({
    bhs: {},
    lxx: {},
    sblgnt: {},
    vulgate: {}
  });

  // Modal / popup toggles
  versionDropdownOpen = $state<boolean>(false);
  bookDropdownOpen = $state<boolean>(false);
  chapterDropdownOpen = $state<boolean>(false);
  verseDropdownOpen = $state<boolean>(false);
  showLemmaModal = $state<boolean>(false);
  activeWord = $state<any>(null);

  activeVersions = $derived<string[]>(
    Array.from(new Set([...this.versionGrid.flat(), this.selectedVersion]))
  );

  availableBooks = $derived<string[]>(getVersionBooks(this.selectedVersion));

  availableChapters = $derived<number[]>((() => {
    const curBook = this.loadedBooks[this.selectedVersion];
    const chapters = curBook?.chapters;
    if (!chapters) return [];
    return Object.keys(chapters).map(Number).sort((a, b) => a - b);
  })());

  verseKeys = $derived<string[]>((() => {
    const curBook = this.loadedBooks[this.selectedVersion];
    const chapterData = curBook?.chapters?.[this.selectedChapter];
    if (!chapterData) return [];
    return Object.keys(chapterData).sort((a, b) => Number(a) - Number(b)).map(String);
  })());

  async initStaticData() {
    const dicts = await loadLexemeDictionaries();
    this.alignmentData = dicts.alignmentData;
    this.lexemes = {
      bhs: dicts.bhs,
      lxx: dicts.lxx,
      sblgnt: dicts.sblgnt,
      vulgate: dicts.vulgate
    };
  }

  async loadCurrentBooks() {
    const books = await loadBooksForVersions(this.activeVersions, this.selectedBook);
    this.loadedBooks = books;
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

  handleVersionSelect(version: string) {
    this.selectedVersion = version;
    this.versionDropdownOpen = false;
    const books = getVersionBooks(version);
    if (books.includes(this.selectedBook)) {
      return;
    }
    const targetBook = getBookFile(version, this.selectedBook);
    if (books.includes(targetBook)) {
      this.selectedBook = targetBook;
      return;
    }
    this.selectedBook = books[0] || 'Gen';
    this.selectedChapter = '1';
  }

  selectBook(book: string) {
    this.selectedBook = book;
    this.selectedChapter = '1';
    this.bookDropdownOpen = false;
  }

  selectChapter(chapter: string) {
    this.selectedChapter = chapter;
    this.chapterDropdownOpen = false;
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
    if (!wordObj || !wordObj.id) return;
    const corpus = colVersion.toLowerCase();
    this.activeWord = { ...wordObj, isLoading: true, corpus };
    this.showLemmaModal = true;

    const dict =
      colVersion === 'BHS'
        ? this.lexemes.bhs
        : colVersion === 'LXX'
          ? this.lexemes.lxx
          : colVersion === 'SBLGNT'
            ? this.lexemes.sblgnt
            : this.lexemes.vulgate;

    const lexemeInstance = await fetchWordInfo(wordObj, dict, corpus);
    if (lexemeInstance) {
      this.activeWord = lexemeInstance;
    }
  }
}

export const readerState = new ReaderState();

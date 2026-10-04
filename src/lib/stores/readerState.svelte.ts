import { getVersionBooks, myDataSets } from '$lib/config/versions';
import { mylog } from '$lib/lemma-ui/env/env';
import { getBookForVersion, normalizeBookName, formatBookAbbreviation } from '$lib/config/bookMapping.js';
import type { HebrewDiacriticMode } from '$lib/utils/diacritics';
import { loadChapterFromDb, loadChaptersForBook } from '$lib/services/bibleDataLoader';
//import { availableBibles } from '$lib/services/bible-datasets';
import { isValidVersion, availableBibles,dataSets,getCorrectVersionName } from '$lib/config/versions'
import {page} from "$app/state";
import { getBaseurl } from '$lib/utils/ui-utils';
import {
	getLemma,
	getLemmaTotalCount,
	getWorks,
	translateReference,
	getLexiconEntry,
	type WorkRow,
	type LexiconEntryRow
} from '$lib/services/dbClient';




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

interface CachedChapter {
    verseKeys: string[];
    chapterDataByVerse: Record<string, Record<string, VerseDataItem>>;
    bookChapters: number[];
}



export class ReaderState {
	// Maintain an LRU Map capped at e.g. 15-20 chapters (~1-2 MB of memory)
	private _chapterCache = new Map<string, CachedChapter>();
	private _maxCacheSize = 20;
	selectedVersion = $state<string>('BHS');
	selectedBook = $state<string>('Gen');
	selectedChapter = $state<string>('1');

	versionGrid = $state<string[][]>([['BHS', 'LXX']]);
	gridAlignments = $state<(( 'left' | 'right' ) | null)[][]>([['right', 'left']]);

	hebrewMode = $state<HebrewDiacriticMode>('all');
	greekDiacritics = $state<boolean>(true);
	gridHeaderExpanded = $state<boolean>(false);
	
	loadedBooks = $state<Record<string, any>>({});
	chapterDataByVerse = $state<Record<string, Record<string, VerseDataItem>>>({});
	chapterVerseKeys = $state<string[]>([]);
	bookChapters = $state<number[]>([]);
	isLoading = $state<boolean>(false);
	loadingMessage = $state<string>('Loading Book and Chapter...');
	private _loadSeq = 0;
	meditationMode=$state<boolean>(false); //like "Zen" mode, but better
	showGridHeader=$derived(this.gridHeaderExpanded && !this.meditationMode);
	// Modal / popup toggles
	versionDropdownOpen = $state<boolean>(false);
	bookDropdownOpen = $state<boolean>(false);
	chapterDropdownOpen = $state<boolean>(false);
	verseDropdownOpen = $state<boolean>(false);
	showLemmaModal = $state<boolean>(false);
	activeWord = $state<any>(null);
	hotkeysEnabled=$state(true);
	visibleVersions = $derived<string[]>(
		Array.from(new Set(this.versionGrid.flat()))
	);
	activeVersions = $derived<string[]>(
		Array.from(new Set([...this.versionGrid.flat(), this.selectedVersion]))
	);

	private getCacheKey(book: string, chapter: number, versions: string[]): string {
		const sortedVersions = [...versions].sort().join(',');
		return `${book}:${chapter}:${sortedVersions}`;
	}

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


	ensureVisibleContainsSelectedVersion(replaceOne = true) {
		if (!this.visibleVersions.includes(this.selectedVersion)) {
			const selectedDataset = dataSets.find(
				(ds) => ds.abbrev.toLowerCase() === this.selectedVersion.toLowerCase()
			);
			const selectedLang = selectedDataset?.language ?? '';

			if (selectedLang) {
				if (replaceOne) {
					const matchingLangs = this.visibleVersions.filter((visVer) =>
						dataSets.find((ds) => ds.language === selectedLang && ds.abbrev === visVer)
					);

					if (matchingLangs.length) {
						const versionToReplace = matchingLangs[0];
						let replaced = false;
						this.versionGrid = this.versionGrid.map((row) =>
							row.map((col) => {
								if (!replaced && col === versionToReplace) {
									replaced = true;
									return this.selectedVersion;
								}
								return col;
							})
						);
					} else {
						const row = 0;
						let col = 0;
						if (this.versionGrid[row]?.[0] === 'BHS' && selectedDataset?.testament === 'ot') {
							col = 1;
						} else if (this.versionGrid[row]?.[0] === 'LXX' && this.selectedVersion === 'Brenton') {
							col = 1;
						}

						this.versionGrid = this.versionGrid.map((r, rIdx) =>
							r.map((c, cIdx) => (rIdx === row && cIdx === col ? this.selectedVersion : c))
						);
					}
				} else {
					this.addColumn(this.selectedVersion);
				}
			}
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
			label: `${formatBookAbbreviation(getBookForVersion(this.selectedBook, this.selectedVersion))} ${this.selectedChapter}:${verseKey}`,
			isDivergent: false,
			verseData: undefined
		};
	}

	/**
	 * Loads the active chapter for all active grid versions from the SQLite database.
	 */
	async loadCurrentChapter(realign=true) {
		//mylog(`loadCurrentChapter(${this.selectedBook} ${this.selectedChapter})`, true);
		const seq = ++this._loadSeq;
		this.isLoading = true;
		const book = this.selectedBook;
		const chapNum = parseInt(this.selectedChapter, 10) || 1;
		const versions = this.activeVersions;
		const primaryVersion = this.selectedVersion;

		const cacheKey = this.getCacheKey(book, chapNum, versions);
		const cached = this._chapterCache.get(cacheKey);

		if (cached) {
			// Refresh LRU order: delete and re-insert to mark as most recently used
			this._chapterCache.delete(cacheKey);
			this._chapterCache.set(cacheKey, cached);

			if (cached.bookChapters.length > 0) {
				this.bookChapters = cached.bookChapters;
				if (!cached.bookChapters.includes(chapNum)) {
					this.selectedChapter = String(cached.bookChapters[0] || 1);
				}
			}

			this.chapterVerseKeys = cached.verseKeys;
			this.chapterDataByVerse = cached.chapterDataByVerse;

			// Populate loadedBooks map for backward compatibility
			const booksMap: Record<string, any> = {};
			for (const ver of versions) {
				const chapObj: Record<string, any> = {};
				for (const vKey of cached.verseKeys) {
					const vItem = cached.chapterDataByVerse[vKey]?.[ver];
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

			if (realign) {
				this.realignAll();
			}
			this.isLoading = false;
			this.loadingMessage = 'Loading Book and Chapter...';
			return;
		}

		try {
			// Fetch book chapters in parallel if not already loaded for current book and primary version
			const chaptersPromise = loadChaptersForBook(book, primaryVersion);
			const chapterDataPromise = loadChapterFromDb(book, chapNum, versions, primaryVersion);

			const [chapters, res] = await Promise.all([chaptersPromise, chapterDataPromise]);

			if (seq !== this._loadSeq) {
				return;
			}

			if (chapters.length > 0) {
				this.bookChapters = chapters;
				if (!chapters.includes(chapNum)) {
					this.selectedChapter = String(chapters[0] || 1);
				}
			}

			this.chapterVerseKeys = res.verseKeys;
			this.chapterDataByVerse = res.chapterDataByVerse as Record<string, Record<string, VerseDataItem>>;

			// Save to LRU cache
			this._chapterCache.set(cacheKey, {
				verseKeys: res.verseKeys,
				chapterDataByVerse: res.chapterDataByVerse as Record<string, Record<string, VerseDataItem>>,
				bookChapters: chapters
			});

			// Evict oldest if exceeding max cache size
			if (this._chapterCache.size > this._maxCacheSize) {
				const oldestKey = this._chapterCache.keys().next().value;
				if (oldestKey) {
					this._chapterCache.delete(oldestKey);
				}
			}

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
			if (seq === this._loadSeq) {
				if(realign){
//					mylog("loadCurrentChapter: realigning!", true);
					this.realignAll();
				}
				this.isLoading = false;
				this.loadingMessage = 'Loading Book and Chapter...';
			}
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
		/*if (totalCols === 2) {
			return cIdx === 0 ? 'right' : 'left';
		}*/
		const align =  version === 'BHS' ? 'right' : 'left';

		return align
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

	async setDisplayGrid(grid: string[][], reload=true, fixAlignment=true): Promise<boolean>{
		let changed = false;
		const newGrid :string[][]= [];
		grid.forEach((row)=>{
			const theRow: string[]=[];
			row.forEach((col)=>{
				const versionToAdd=getCorrectVersionName(col.trim());
				if (versionToAdd){
					theRow.push(versionToAdd);
				}
			});
			if (theRow.length)
				newGrid.push(theRow);
		});
		
		if (newGrid.length){
			this.versionGrid=newGrid;
			changed = true;
			if(fixAlignment) {
//				mylog(`realigning!`, true);
				this.realignAll();
			}
			if (reload)
				this.loadCurrentChapter();
		}
		return changed;
	}
	addColumn(newVersion='',reload=true) {
		const used = new Set(this.versionGrid.flat());
		const normVersion = newVersion ? (getCorrectVersionName(newVersion) || newVersion) : '';
		const nextVer = normVersion ? normVersion : (availableBibles.find((d) => !used.has(d)) || 'WEB');
		this.versionGrid = this.versionGrid.map((row) => [...row, nextVer]);
		this.gridAlignments = this.gridAlignments.map((row) => [...row, null]);
		if (reload) this.loadCurrentChapter();
	}

	removeColumn(colIndex: number) {
		if ((this.versionGrid[0]?.length || 0) <= 1) return;
		this.versionGrid = this.versionGrid.map((row) => row.filter((_, idx) => idx !== colIndex));
		this.gridAlignments = this.gridAlignments.map((row) => row.filter((_, idx) => idx !== colIndex));
	}

	addRow() {
		const cols = this.versionGrid[0]?.length || 2;
		//const defaults = ['KJV', 'Vulgate', 'WEB', 'Brenton', 'BHS', 'LXX', 'SBLGNT'];
		const used = new Set(this.versionGrid.flat());
		const unused = availableBibles.filter((d) => !used.has(d));
		const newRow: string[] = [];
		for (let c = 0; c < cols; c++) {
			newRow.push(unused[c] || availableBibles[c % availableBibles.length] || 'WEB');
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

	realignAll(){
		this.gridAlignments = this.versionGrid.map(
			(row, rIdx)=>
				row.map((col,cIdx)=>
					this.getDefaultAlign(rIdx,cIdx,col))
		);

		
	}

	realignCell(rIdx: number, cIdx: number){
		if (this.gridAlignments[rIdx] && this.gridAlignments[rIdx].length){
			if (this.versionGrid[rIdx].length > cIdx ){
			this.gridAlignments[rIdx][cIdx] = 
				(myDataSets.lookup(this.versionGrid[rIdx][cIdx])?.language.toLocaleLowerCase() == "hebrew") ?
				"right" : "left";
			this.gridAlignments=this.gridAlignments;//for reactivity!)
				
			} 
			else{
//				mylog(`found alignment for ${rIdx}, ${cIdx}, but not version!`, true);
			}
		
		}
		else{
			mylog(`could not find valid grid entry for row ${rIdx} and col ${cIdx}: grid rows=${this.gridAlignments.length}; 
				row1: ${this.gridAlignments[0].join(",")}`, true);
		}
	}

	updateCell(rIdx: number, cIdx: number, version: string, realign=false, reload=true) {
		this.versionGrid = this.versionGrid.map((row, r) => {
			if (r !== rIdx) return row;
			const newRow = [...row];
			newRow[cIdx] = version;
			return newRow;
		});

		if(realign){
			this.realignCell(rIdx,cIdx);
		}

		
		if (reload) this.loadCurrentChapter();
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

	

	async selectVersionBookChapter(version: string, book:string, chapter: string): Promise<boolean> {
		let changed = false;
		if (await this.selectVersion(version, false))
		 	if (await this.selectBook(book, false))
		 		changed = await this.selectChapter(chapter);
		
		return changed;
	}

	getGridRowColIdxOfVersion(version:string){
		const rowColObj = this.versionGrid
					.map((row,rIdx)=>({index:rIdx,row: row.map((col,cIdx)=>({index:cIdx, col: col})).filter((col)=>col.col==version)}))
						.find((row)=>row.row.length);

		return rowColObj? [rowColObj.index, rowColObj?.row[0].index] : [];
	}

	/**
	 * @description removes/replaces all those restrictive (OT vs. NT) visible versions if the selected version is exclusively OT/NT.
	 * @param [reloadChapter=false] if true, will reload the chapter data/display
	 */
	ensureVisibleCompatibleWithSelectedVersion(reloadChapter = false) {
		const incompatVersions = this.findIncompatibleVersions(this.selectedVersion);
		if (!incompatVersions.length) return;

		let madeChanges = false;
		const compatibleVersions = this.findCompatibleVersions(this.selectedVersion);
		let currentVisible = new Set(this.visibleVersions);

		const newGrid = this.versionGrid.map((row) =>
			row.map((col) => {
				if (!incompatVersions.includes(col)) {
					return col;
				}

				const theVersionData = myDataSets.lookup(col);
				const unusedCompatible = compatibleVersions.filter((v) => !currentVisible.has(v));
				const sameLang = unusedCompatible.find(
					(v) => myDataSets.lookup(v)?.language === theVersionData?.language
				);
				const replacement = sameLang || unusedCompatible[0] || compatibleVersions[0] || 'KJV';

				currentVisible.delete(col);
				currentVisible.add(replacement);
				madeChanges = true;
				return replacement;
			})
		);

		if (madeChanges) {
			this.versionGrid = newGrid;
		}

		if (reloadChapter && madeChanges) {
			this.loadCurrentChapter();
		}
	}

	/**
	 * 
	 * @param version version to check against
	 * @returns an array of strings, each of which is a version in this.versionGrid/visibleVersions which is either exlusively OT or NT,
	 * but the 'version' given is the opposite. NB: passing an invalid version, or a version of both NT/OT returns empty array. 
	 * NB: this does not check for book compatibility, only testament (OT/NT) compatibitility.
	 */
	findIncompatibleVersions(version: string): string[]{
		let ret: string[] = [];
		const theChosenDataset = myDataSets.lookup(version);
		if (theChosenDataset){
			if (theChosenDataset.testament=='nt'){
				ret.push(...this.visibleVersions.filter((ver)=>myDataSets.lookup(ver)?.testament=='ot'));
			}
			else if(theChosenDataset.testament=='ot'){
				ret.push(...this.visibleVersions.filter((ver)=>myDataSets.lookup(ver)?.testament=='nt'));
			}
		} 
		
		return ret;
	}

	findCompatibleVersions(version:string): string[]{
		return Array.from(new Set(availableBibles).difference(new Set(this.findIncompatibleVersions(version))));
	}
	/**
	 * @description changes the version used. If the new version was not among the displayed ones, it replaces one of them.
	 * @param version 
	 * @param reload 
	 * @returns {Promise<boolean>} true if a valid version was given and selectedVersion was changed.
	 */
	async selectVersion(version: string, reload = true, realign = true): Promise<boolean> {
//		mylog(`selectVersion(${version})`, true);
		const matchingVersion = getCorrectVersionName(version);
		if (!matchingVersion) {
//			mylog(`selectVersion(${version}): No matching version found`, true);
			return false;
		}

//		mylog(`selectVersion(${version}): matchingVersion found: ${matchingVersion}`, true);
		const oldVersion = this.selectedVersion;
		const prevBook = this.selectedBook;
		const prevChapter = this.selectedChapter;

		// Immediately update the Version button and close the dropdown
		this.selectedVersion = matchingVersion;
		this.versionDropdownOpen = false;
		if (reload) {
			this.isLoading = true;
			this.loadingMessage = `Loading ${matchingVersion}...`;
		}

		// Yield to event loop to allow immediate UI paint before background DB queries
		await new Promise((resolve) => setTimeout(resolve, 0));

		try {
			const books = getVersionBooks(matchingVersion);
			const currentCh = parseInt(prevChapter, 10) || 1;

			let resolvedBook = '';
			let resolvedChapter = prevChapter;

			// 1. Attempt reference translation directly via SQLite text_units
			try {
				const translated = await translateReference(prevBook, currentCh, 1, oldVersion, matchingVersion);
				if (translated?.book) {
					const match = books.find((b) => b.toLowerCase() === translated.book.toLowerCase());
					if (match) {
						resolvedBook = match;
						resolvedChapter = String(translated.chapter);
					}
				}
			} catch (e) {
				console.warn('[ReaderState] Reference translation error:', e);
			}

			// 2. Fallback: check naming map for current book in target version (e.g. Qoh -> Eccl)
			if (!resolvedBook) {
				const mapped = getBookForVersion(prevBook, matchingVersion);
				if (mapped) {
					const match = books.find((b) => b.toLowerCase() === mapped.toLowerCase());
					if (match) {
						resolvedBook = match;
					}
				}
			}

			// 3. Fallback: check if the current book name itself exists in target version
			if (!resolvedBook) {
				const match = books.find((b) => b.toLowerCase() === prevBook.toLowerCase());
				if (match) {
					resolvedBook = match;
				}
			}

			// 4. Final fallback: book does not exist in target version (e.g. OT book -> OpenGNT),
			// so switch to the first available book in target version
			if (!resolvedBook) {
				resolvedBook = books[0] || 'Gen';
				resolvedChapter = '1';
//				mylog(`selectVersion(${version}): book '${prevBook}' not available in ${matchingVersion}, defaulting to '${resolvedBook}'`, true);
			}

			this.ensureVisibleContainsSelectedVersion();
			this.ensureVisibleCompatibleWithSelectedVersion(false);
			this.selectedBook = resolvedBook;
			this.selectedChapter = resolvedChapter;

			if (realign) this.realignAll();
			if (reload) await this.loadCurrentChapter();

			return true;
		} finally {
			if (!reload && this.isLoading) {
				this.isLoading = false;
				//this.loadingMessage = 'Loading Book and Chapter...';
			}
		}
	}

	async selectBook(book: string, reload=true): Promise<boolean> {
//		mylog(`Trying to select book ${book} in version ${this.selectedVersion}...`, true);
		let ret = false;
		const books = getVersionBooks(this.selectedVersion);
		if (!books || books.length === 0) return false;

		// 1. Direct match in version books (case-insensitive)
		let matchedBook = books.find((b) => b.toLocaleLowerCase() === book.trim().toLocaleLowerCase());

		// 2. Resolve version-specific book abbreviation (e.g. '2PE' -> '2_Pet', 'ECC' -> 'Qoh')
		if (!matchedBook) {
			const versionMapped = getBookForVersion(book, this.selectedVersion);
			if (versionMapped) {
				matchedBook = books.find((b) => b.toLocaleLowerCase() === versionMapped.toLocaleLowerCase());
			}
		}

		// 3. Fallback: match by canonical code
		if (!matchedBook) {
			const canon = normalizeBookName(book);
			if (canon) {
				matchedBook = books.find((b) => {
					const bCanon = normalizeBookName(b);
					return bCanon && bCanon.code === canon.code;
				});
			}
		}

		if (matchedBook) {
			this.selectedBook = matchedBook;
			this.selectedChapter = '1';
			this.bookDropdownOpen = false;
			if (reload) {
				this.isLoading = true;
				this.loadingMessage = `Loading ${matchedBook} 1...`;
			}
			ret = true;
			if (reload) await this.loadCurrentChapter();
		} else {
//			mylog(`Did NOT find book '${book}' in version '${this.selectedVersion}! Version books=[${books.join(',')}]`, true);
		}
		if (!ret) mylog(`Did not successfully select the book ${book}!`, true);
		return ret;
	}

	async navigateToReference(book: string, chapter: string, verse?: string): Promise<boolean> {
		this.closeAllPopups();
		const bookSelected = await this.selectBook(book, false);
		if (!bookSelected) return false;

		const chSelected = await this.selectChapter(chapter, true);
		if (verse) {
			setTimeout(() => {
				this.scrollToVerse(verse);
			}, 200);
		}
		return chSelected;
	}


	
	async selectChapter(chapter: string, reload=true): Promise<boolean> {
		let ret = false;
		this.selectedChapter = chapter;
		this.chapterDropdownOpen = false;
		if (reload) {
			this.isLoading = true;
			this.loadingMessage = `Loading ${formatBookAbbreviation(this.selectedBook)} ${chapter}...`;
		}
		ret = true;
		if (reload) await this.loadCurrentChapter();
		return ret;
	}

	async scrollToVerse(verseKey: string) {
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
		const isGreekNT = colVersion === 'OpenGNT' || colVersion === 'OGNT' || colVersion === 'SBLGNT' || corpus === 'ognt' || corpus === 'sblgnt';
		const workId =
			wordObj.work_id ||
			(colVersion === 'BHS' || corpus === 'wlc' || corpus === 'bhs' ? 2 : colVersion === 'LXX' || corpus === 'swete_lxx' ? 24 : isGreekNT ? 40 : 0);
		const dictionary = (colVersion === 'BHS' || corpus === 'wlc' || corpus === 'bhs') ? 'bdb' : 'lsj';

		this.activeWord = {
			...wordObj,
			isLoading: true,
			corpus,
			colVersion,
			work_id: workId,
			dictionary
		};
		this.showLemmaModal = true;

		try {
			// Query lexemes table directly, prioritizing strongs when available
			const lookupKey = wordObj.normalized || wordObj.word || wordObj.id;
			const lexData = await getLemma(corpus, lookupKey, wordObj.strongs);

			// Query lexicon entry (BDB or LSJ) to get the true dictionary headword
			let lexiconRow: LexiconEntryRow | null = null;
			try {
				lexiconRow = await getLexiconEntry(dictionary, lookupKey, wordObj.strongs);
			} catch (e) {
				console.warn('[ReaderState] Error fetching lexicon entry in inspectWord:', e);
			}

			const primaryHeadword = lexiconRow?.headword || lexData?.lemma || wordObj.lemma || wordObj.normalized || wordObj.word;
			const primaryStrongs = lexiconRow?.strongs || lexData?.strongs || wordObj.strongs;

			let totalCount = 0;
			try {
				totalCount = await getLemmaTotalCount(workId, lookupKey, primaryStrongs);
			} catch (e) {
				console.warn('[ReaderState] Error fetching lemma total_count:', e);
			}

			this.activeWord = {
				...wordObj,
				...(lexData || {}),
				corpus,
				colVersion,
				work_id: workId,
				dictionary,
				lemma: primaryHeadword,
				headword: primaryHeadword,
				gloss: lexData?.gloss || wordObj.gloss || '',
				strongs: primaryStrongs,
				morph: wordObj.morph,
				word: wordObj.word,
				total_count: totalCount,
				total: totalCount,
				isLoading: false
			};
		} catch (err) {
			console.warn('[ReaderState] Error inspecting word:', err);
			this.activeWord = {
				...wordObj,
				corpus,
				colVersion,
				work_id: workId,
				dictionary,
				lemma: wordObj.lemma || wordObj.normalized || wordObj.word,
				headword: wordObj.lemma || wordObj.normalized || wordObj.word,
				gloss: wordObj.gloss || '',
				isLoading: false
			};
		}
	}
  
	

	
	generatePageStateURL(verse="1", meditate=this.meditationMode){
		const base = getBaseurl();
		const params = {
			'version': this.selectedVersion,
			'chapter':this.selectedChapter,
			'book':this.selectedBook,
			'grid':this.versionGrid.map((row)=>row.join(',')).join("|"),
			'verse':verse,
			'meditate':meditate ? 1 : 0
		}

		return base+'?'+Object.entries(params).map(([k,v])=>`${k}=${v}`).join("&");
	}
}

export const readerState = new ReaderState();

import { getVersionBooks } from '$lib/config/versions';
import { mylog } from '$lib/lemma-ui/env/env';
import { getBookFile, getMappedReference, getBookForVersion, getCorrectVersionName } from '$lib/bookMapping.js';
import type { HebrewDiacriticMode } from '$lib/utils/diacritics';
import { loadChapterFromDb, loadChaptersForBook } from '$lib/services/bibleDataLoader';
//import { availableBibles } from '$lib/services/bible-datasets';
import { isValidVersion, availableBibles,dataSets } from '$lib/bookMapping.js';
import {
	getLemma,
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


  ensureVisibleContainsSelectedVersion(replaceOne=true){
//    mylog("ensureVisibleContainsSelectedVersion() with " + this.selectedVersion, true);
    if(!this.visibleVersions.includes(this.selectedVersion)){
//        mylog(`Selectedversion: '${this.selectedVersion}'`, true);
//      mylog(`datasets abbrevs: [${dataSets.map((ds)=>ds.abbrev).join(',')}]`, true);
      const selectedDataset = dataSets.find((ds)=>ds.abbrev.toLocaleLowerCase()==this.selectedVersion.toLocaleLowerCase());
//      mylog("found seelected dataset: "+selectedDataset?.abbrev, true);
      const selectedLang = selectedDataset?.language ?? '';
       
       
//       const lang = selectedDataset?.language ?? "not found";
//      mylog(`didn't find  in display ${this.selectedVersion}(lang:${selectedLang}) in grid!`, true);

      if (selectedLang){
//        mylog("Find another ", true);
        if (replaceOne){
          const matchingLangs=this.visibleVersions.filter((visVer)=>dataSets.find((ds)=>ds.language==selectedLang && ds.abbrev==visVer));
        
        
          if (matchingLangs.length){
              const versionToReplace = matchingLangs[0];
            for (let row =0; row < this.versionGrid.length; row++){
              for (let col =0; col < this.versionGrid[row].length; col++){
                if (this.versionGrid[row][col]==versionToReplace){
                  this.versionGrid[row][col]=this.selectedVersion;
                  break;
                }
              }
            }

          }
          else {
            const row = 0; 
            let  col = 0;
            if (this.versionGrid[row][0]=='BHS' && selectedDataset?.testament=='ot' ){
              //leave the BHS in left column if it's there--put this and we got an OT version: make left-aligned, to look NICE alongside BHS
              col = 1;

            }
            else if(this.versionGrid[row][0]=='LXX' && this.selectedVersion =="Brenton"){
              //similar for Brenton alongside LXX; the user will be AMAZED out how smart we are! Or they will be annoyed, but we don't care.
              col = 1;
            }    
            
//            mylog(`gonn replace ${this.versionGrid[row][col]} with ${this.selectedVersion}`, true);
            this.versionGrid[row][col]=this.selectedVersion
          }

        }
        else{
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
			label: `${getBookForVersion(this.selectedBook,this.selectedVersion)} ${this.selectedChapter}:${verseKey}`,
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

	async setDisplayGrid(grid: string[][], reload=true): Promise<boolean>{
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
			if (reload)
				this.loadCurrentChapter();
		}
		return changed;
	}
	addColumn(newVersion='') {
		
		const used = new Set(this.versionGrid.flat());
		const nextVer = newVersion ? newVersion : (availableBibles.find((d) => !used.has(d)) || 'WEB');
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

	

	async selectVersionBookChapter(version: string, book:string, chapter: string): Promise<boolean> {
		let changed = false;
		if (await this.selectVersion(version, false))
		 	if (await this.selectBook(book, false))
		 		changed = await this.selectChapter(chapter);
		
		return changed;
	}

	/**
	 * 
	 * @param version 
	 * @param reload 
	 * @returns {Promise<boolean>} true if a valid version was given and selectedVersion was changed.
	 */
	async selectVersion(version: string, reload=true): Promise<boolean> {
		let ret = false;
		const oldVersion = this.selectedVersion;
		const matchingVersion = availableBibles.find((ver)=>ver.toLocaleLowerCase() == version.toLocaleLowerCase());
		if (matchingVersion) {
			this.selectedVersion = matchingVersion;
			
			this.versionDropdownOpen = false;
			this.ensureVisibleContainsSelectedVersion();

			const books = getVersionBooks(matchingVersion);
			const currentCh = parseInt(this.selectedChapter, 10) || 1;
			const targetBook = getBookForVersion(this.selectedBook, matchingVersion, currentCh);

			// 1. Check reference translation using getMappedReference first
			const mapped = getMappedReference(matchingVersion, this.selectedBook, currentCh, 1);
			if (mapped && !mapped.omitted && books.includes(mapped.mappedBook)) {
				this.selectedBook = mapped.mappedBook;
				this.selectedChapter = String(mapped.mappedChapter);
				//if (reload) this.loadCurrentChapter();
				ret = true;			
				mylog("selectVersion: one!", true);
			}

			// 2. If current book is available in new version, attempt reference translation
			else if (books.includes(this.selectedBook)) {
				try {
					const translated = await translateReference(this.selectedBook, currentCh, 1, oldVersion, matchingVersion);
					if (translated && translated.chapter) {
						this.selectedChapter = String(translated.chapter);
						ret = true;
					}
				} catch (e) {
					console.warn('[ReaderState] Reference translation error:', e);					
					//return ret;
				}
				//if (reload) this.loadCurrentChapter();
				mylog("selectVersion: two!", true);
				//return ret;
			}

			// 3. Try mapped book via getBookForVersion
			
			else if (books.includes(targetBook)) {
				this.selectedBook = targetBook;
				try {
					const translated = await translateReference(this.selectedBook, currentCh, 1, oldVersion, matchingVersion);
					if (translated && translated.chapter) {
						this.selectedChapter = String(translated.chapter);
					}
				} catch (e) {
					console.warn('[ReaderState] Reference translation error:', e);
				}
				//if (reload) this.loadCurrentChapter();
				ret = true;
				mylog("selectVersion: three!", true);
				//return ret ;
			}
			else {
				this.selectedBook = books[0] || 'Gen';
				this.selectedChapter = '1';
				//if (reload) this.loadCurrentChapter();
				ret = true;
				mylog("selectVersion: four!", true);
				//return ret;
			}

		}
		if (ret && reload)
			this.loadCurrentChapter();
		return ret;
	}

	async selectBook(book: string, reload=true): Promise<boolean> {
		let ret = false;
		const validBook = getVersionBooks(this.selectedVersion).find((b)=>b.toLocaleLowerCase==book.trim().toLocaleLowerCase) ? true : false;
		mylog(`found book '${book}' in version '${this.selectedVersion}!`, true);
		if (validBook){	
			this.selectedBook = book;
			this.selectedChapter = '1';
			this.bookDropdownOpen = false;
			ret = true;
			if (reload) this.loadCurrentChapter();
		}
		return ret;
	}

	
	async selectChapter(chapter: string, reload=true): Promise<boolean> {
		let ret = false;
		this.selectedChapter = chapter;
		ret = true;
		this.chapterDropdownOpen = false;
		if (reload) this.loadCurrentChapter();
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
		const workId =
			wordObj.work_id ||
			(colVersion === 'BHS' ? 2 : colVersion === 'LXX' ? 24 : colVersion === 'SBLGNT' ? 25 : 0);
		const dictionary = colVersion === 'BHS' ? 'bdb' : 'lsj';

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

			const primaryHeadword = lexiconRow?.headword || lexData?.lemma || wordObj.normalized || wordObj.word;
			const primaryStrongs = lexiconRow?.strongs || lexData?.strongs || wordObj.strongs;

			this.activeWord = {
				...wordObj,
				...(lexData || {}),
				corpus,
				colVersion,
				work_id: workId,
				dictionary,
				lemma: primaryHeadword,
				headword: primaryHeadword,
				gloss: lexData?.gloss || '',
				strongs: primaryStrongs,
				morph: wordObj.morph,
				word: wordObj.word,
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
				lemma: wordObj.normalized || wordObj.word,
				headword: wordObj.normalized || wordObj.word,
				isLoading: false
			};
		}
	}
  
}

export const readerState = new ReaderState();

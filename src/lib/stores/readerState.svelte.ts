import { getVersionBooks, myDataSets } from '$lib/config/versions';
import { mylog } from '$lib/lemma-ui/env/env';
import { getBookFile, getMappedReference, getBookForVersion,  } from '$lib/config/bookMapping.js';
import type { HebrewDiacriticMode } from '$lib/utils/diacritics';
import { loadChapterFromDb, loadChaptersForBook } from '$lib/services/bibleDataLoader';
//import { availableBibles } from '$lib/services/bible-datasets';
import { isValidVersion, availableBibles,dataSets,getCorrectVersionName } from '$lib/config/versions'
import {page} from "$app/state";
import { getBaseurl } from '$lib/utils/ui-utils';
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
	async loadCurrentChapter(realign=true) {
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
			if(realign){
				mylog("loadCurrentChapter: realigning!", true);
				this.realignAll();
			}
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
				mylog(`realigning!`, true);
				this.realignAll();
			}
			if (reload)
				this.loadCurrentChapter();
		}
		return changed;
	}
	addColumn(newVersion='',reload=true) {
		
		const used = new Set(this.versionGrid.flat());
		const nextVer = newVersion ? newVersion : (availableBibles.find((d) => !used.has(d)) || 'WEB');
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
				mylog(`found alignment for ${rIdx}, ${cIdx}, but not version!`, true);
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
	ensureVisibleCompatibleWithSelectedVersion(reloadChapter=false){
		
		const incompatVersions=this.findIncompatibleVersions(this.selectedVersion);
		let madeChanges = false;
		incompatVersions.forEach((ver)=>{
			//console.log(`here we are working on ${ver}'`);
			//see if another in its language group is available:
			let replaced= false;
			//get this version
			const theVersionData = myDataSets.lookup(ver);
			const rowCol = this.getGridRowColIdxOfVersion(ver);
			//get set of same language versions not already displayed:
			const compatibleDatasets=this.findCompatibleVersions(ver);
			//console.log(`visisble version: ${this.visibleVersions.join(',')}`);
			const availableDatasets = new Set(availableBibles).difference(new Set(this.visibleVersions));
			const languageVersionsAvailableSet = Array.from(availableDatasets).filter((ds)=>ds?.language==theVersionData?.language);
			//console.log(`Available versions of some language: ${Array.from(languageVersionsAvailableSet).join(',')}`)
			const nextAvailableVersion = languageVersionsAvailableSet?.values().next().value?.abbrev||'';

			if (nextAvailableVersion){
				//console.log(`found next available version for ${ver}: ${nextAvailableVersion}`)
				const incompRowCol = this.versionGrid
					.map((row,rIdx)=>({index:rIdx,row: row.map((col,cIdx)=>({index:cIdx, col: col})).filter((col)=>col.col==ver)}))
						.find((row)=>row.row.length);

				if(incompRowCol){
					const rIdx = incompRowCol.index;
					const cIdx = incompRowCol.row[0].index;
					this.versionGrid[rIdx][cIdx]=nextAvailableVersion;
					replaced=true;
					madeChanges=true;
				}
			}
			else if(availableDatasets.size){
				//cannot replace with same language, let's just replace it with another available one:
				
				
				if (rowCol.length){
					const newVersion = availableBibles.values().next().value;
					if (newVersion){
						this.versionGrid[rowCol[0]][rowCol[1]]=newVersion;
						madeChanges=true;
						replaced=true;
					}
				}				
			}

			if(!replaced){ //need to replace it with SOMETHING:
				//console.log(`Have not yet replaced ${ver}...`)
				//try an unused one
				const unusedDatasets = new Set(availableBibles).difference(new Set(this.visibleVersions));
				if(unusedDatasets.size){
					const replacement = unusedDatasets.values().next().value;
					if (replacement) {
						this.versionGrid[rowCol[0]][rowCol[1]]=replacement;
						replaced=true;
						madeChanges=true;

					}
					
				}

				if(!replaced){ //anything!
					this.versionGrid[rowCol[0]][rowCol[1]]=availableBibles[0];
					replaced=true;
					madeChanges=true;

				}

			}
			
			if(!replaced){
				console.log(`could not replace ${ver}`);
			}
			
		});

		if(reloadChapter && madeChanges){
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
	async selectVersion(version: string, reload=true, realign=true): Promise<boolean> {
		let ret = false;
		const oldVersion = this.selectedVersion;
		const matchingVersion = availableBibles.find((ver)=>ver.toLocaleLowerCase() == version.toLocaleLowerCase());
		if (matchingVersion) {
			this.selectedVersion = matchingVersion;
			
			this.versionDropdownOpen = false;
			this.ensureVisibleContainsSelectedVersion();
			this.ensureVisibleCompatibleWithSelectedVersion(false);
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
//				mylog("selectVersion: one!", true);
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
//				mylog("selectVersion: two!", true);
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
//				mylog("selectVersion: three!", true);
				//return ret ;
			}
			else {
				this.selectedBook = books[0] || 'Gen';
				this.selectedChapter = '1';
				//if (reload) this.loadCurrentChapter();
				ret = true;
//				mylog("selectVersion: four!", true);
				//return ret;
			}

		}
		if (ret){
			if (realign) this.realignAll();
			if (reload)	this.loadCurrentChapter();
		} 
			
		
			
		return ret;
	}

	async selectBook(book: string, reload=true): Promise<boolean> {
		let ret = false;
		const validBook = getVersionBooks(this.selectedVersion).find((b)=>b.toLocaleLowerCase==book.trim().toLocaleLowerCase) ? true : false;
//		mylog(`found book '${book}' in version '${this.selectedVersion}!  Version books=[${getVersionBooks(this.selectedVersion).join(',')}]`, true);
		if (validBook){	
			this.selectedBook = book;
			this.selectedChapter = '1';
			this.bookDropdownOpen = false;
			ret = true;
			if (reload) this.loadCurrentChapter();
		}
		else{
//			mylog(`Did NOT find book '${book}' in version '${this.selectedVersion}! Version books=[${getVersionBooks(this.selectedVersion).join(',')}]`, true);
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
  
	

	
	generatePageStateURL(verse="1", meditate=this.meditationMode){
		const base = getBaseurl();
		const params = {
			'version': this.selectedVersion,
			'chapter':this.selectedChapter,
			'book':this.selectedBook,
			'grid':this.versionGrid.map((row)=>row.join(',')).join("|"),
			'verse':verse,
			'meditate':meditate
		}

		return base+'?'+Object.entries(params).map(([k,v])=>`${k}=${v}`).join("&");
	}
}

export const readerState = new ReaderState();

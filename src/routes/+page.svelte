<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import siteLogo from '$lib/assets/logo.png';
  import VersionButton from '$lib/components/ui/VersionButton.svelte';
  import VerseNavPill from '$lib/components/ui/VerseNavPill.svelte';
  import { formatHebrew, formatGreek, type HebrewDiacriticMode } from '$lib/utils/diacritics';
  import CopyText from '$lib/lemma-ui/components/ui/CopyText.svelte';
  let versionGrid = $state<string[][]>([
    ['BHS', 'LXX']
  ]);

  let gridAlignments = $state<(( 'left' | 'right' ) | null)[][]>([
    [null, null]
  ]);

  function getDefaultAlign(rIdx: number, cIdx: number, version: string): 'left' | 'right' {
    const totalCols = versionGrid[0]?.length || 2;
    if (totalCols === 2) {
      return cIdx === 0 ? 'right' : 'left';
    }
    return version === 'BHS' ? 'right' : 'left';
  }

  function getCellAlign(rIdx: number, cIdx: number): 'left' | 'right' {
    const override = gridAlignments[rIdx]?.[cIdx];
    if (override) return override;
    const ver = versionGrid[rIdx]?.[cIdx] || 'WEB';
    return getDefaultAlign(rIdx, cIdx, ver);
  }

  function toggleCellAlign(rIdx: number, cIdx: number) {
    const current = getCellAlign(rIdx, cIdx);
    const next = current === 'right' ? 'left' : 'right';
    gridAlignments = gridAlignments.map((row, r) => {
      if (r !== rIdx) return row;
      const newRow = [...row];
      newRow[cIdx] = next;
      return newRow;
    });
  }
  const versionGroups = [
    {
      language: 'Hebrew',
      versions: ['BHS']
    },
    {
      language: 'Greek',
      versions: ['LXX', 'SBLGNT']
    },
    {
      language: 'Latin',
      versions: ['Vulgate']
    },
    {
      language: 'English',
      versions: ['KJV', 'WEB', 'Brenton']
    }
  ];

  const allVersions = versionGroups.flatMap(g => g.versions);

  let selectedVersion = $state('BHS');
  let selectedBook = $state('Gen');
  let selectedChapter = $state('1');
  let versionDropdownOpen = $state(false);
  let gridHeaderExpanded = $state(false);

  let currentBhsBook: any = $state(null);
  let currentLxxBook: any = $state(null);
  let currentSblgntBook: any = $state(null);
  let currentWebBook: any = $state(null);
  let currentVulgateBook: any = $state(null);
  let currentKjvBook: any = $state(null);
  let currentBrentonBook: any = $state(null);

  let activeVersions = $derived<string[]>(
    Array.from(new Set([...versionGrid.flat(), selectedVersion]))
  );

  let currentBooks = $derived<Record<string, any>>({
    BHS: currentBhsBook,
    LXX: currentLxxBook,
    SBLGNT: currentSblgntBook,
    WEB: currentWebBook,
    Vulgate: currentVulgateBook,
    KJV: currentKjvBook,
    Brenton: currentBrentonBook
  });

  function formatVersionLabel(opt: string): string {
    if (opt === 'BHS') return 'Hebrew (BHS)';
    if (opt === 'LXX') return 'Greek (LXX)';
    if (opt === 'SBLGNT') return 'Greek NT (SBLGNT)';
    if (opt === 'WEB') return 'English (WEB)';
    if (opt === 'Vulgate') return 'Latin (Vulgate)';
    if (opt === 'KJV') return 'English (KJV)';
    if (opt === 'Brenton') return "Brenton's (LXX)";
    return opt;
  }

  function formatText(text: any, version: string){
    let ret = text; 
    if (version=== 'BHS') 
      ret = formatHebrew(text, hebrewMode);
    else if (version==='LXX' || version === 'SBLGNT')
      ret = formatGreek(text, greekDiacritics);
    return ret;
  }

  function addColumn() {
    const defaults = ['BHS', 'LXX', 'KJV', 'Vulgate', 'WEB', 'Brenton', 'SBLGNT'];
    const used = new Set(versionGrid.flat());
    const nextVer = defaults.find(d => !used.has(d)) || 'WEB';
    versionGrid = versionGrid.map(row => [...row, nextVer]);
    gridAlignments = gridAlignments.map(row => [...row, null]);
  }

  function removeColumn(colIndex: number) {
    if ((versionGrid[0]?.length || 0) <= 1) return;
    versionGrid = versionGrid.map(row => row.filter((_, idx) => idx !== colIndex));
    gridAlignments = gridAlignments.map(row => row.filter((_, idx) => idx !== colIndex));
  }

  function addRow() {
    const cols = versionGrid[0]?.length || 2;
    const defaults = ['KJV', 'Vulgate', 'WEB', 'Brenton', 'BHS', 'LXX', 'SBLGNT'];
    const used = new Set(versionGrid.flat());
    const unused = defaults.filter(d => !used.has(d));
    const newRow: string[] = [];
    for (let c = 0; c < cols; c++) {
      newRow.push(unused[c] || defaults[c % defaults.length] || 'WEB');
    }
    versionGrid = [...versionGrid, newRow];
    gridAlignments = [...gridAlignments, new Array(cols).fill(null)];
  }

  function removeRow(rowIndex: number) {
    if (versionGrid.length <= 1) return;
    versionGrid = versionGrid.filter((_, idx) => idx !== rowIndex);
    gridAlignments = gridAlignments.filter((_, idx) => idx !== rowIndex);
  }

  function updateCell(rIdx: number, cIdx: number, version: string) {
    versionGrid = versionGrid.map((row, r) => {
      if (r !== rIdx) return row;
      const newRow = [...row];
      newRow[cIdx] = version;
      return newRow;
    });
  }

  let hebrewMode = $state<HebrewDiacriticMode>('all');
  let greekDiacritics = $state(true);

  function cycleHebrewMode() {
    if (hebrewMode === 'all') {
      hebrewMode = 'vowels';
    } else if (hebrewMode === 'vowels') {
      hebrewMode = 'none';
    } else {
      hebrewMode = 'all';
    }
  }

  function toggleGreekDiacritics() {
    greekDiacritics = !greekDiacritics;
  }

  let bhsChapterData = $derived(currentBhsBook?.chapters?.[String(selectedChapter)] || {});
  let lxxChapterData = $derived(currentLxxBook?.chapters?.[String(selectedChapter)] || {});
  let sblgntChapterData = $derived(currentSblgntBook?.chapters?.[String(selectedChapter)] || {});
  let webChapterData = $derived(currentWebBook?.chapters?.[String(selectedChapter)] || {});
  let vulgateChapterData = $derived(currentVulgateBook?.chapters?.[String(selectedChapter)] || {});
  let alignmentData: any = $state({});

  let bhsLexemes: any = $state({});
  let lxxLexemes: any = $state({});
  let sblgntLexemes: any = $state({});
  let vulgateLexemes: any = $state({});

  let activeWord: any = $state(null);
  let chapterDropdownOpen = $state(false);
  let bookDropdownOpen = $state(false);
  let verseDropdownOpen = $state(false);

  const bhsBooks = ['Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Qoh', 'Cant', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal'];
  const lxxBooks = ['Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','1Esdr','2Esdr','Esth','Jdt','TobBA','TobS','1Mac','2Mac','3Mac','4Mac','Ps','Od','Prov','Qoh','Cant','Job','Wis','Sir','PsSol','Hos','Mic','Amos','Joel','Jonah','Obad','Nah','Hab','Zeph','Hag','Zech','Mal','Isa','Jer','Bar','EpJer','Lam','Ezek','Bel','BelTh','Dan','DanTh','Sus','SusTh'];
  const ntBooks = ['Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1_Cor', '2_Cor', 'Gal', 'Eph', 'Phil', 'Col', '1_Thess', '2_Thess', '1_Tim', '2_Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1_Pet', '2_Pet', '1_John', '2_John', '3_John', 'Jude', 'Rev'];

  const kjvBooks = [
    'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal',
    'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1_Cor', '2_Cor', 'Gal', 'Eph', 'Phil', 'Col', '1_Thess', '2_Thess', '1_Tim', '2_Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1_Pet', '2_Pet', '1_John', '2_John', '3_John', 'Jude', 'Rev',
    'Tob', 'Jdt', 'Wis', 'Sus', 'Bel', '1Mac', '2Mac', '1Esdr', 'PrMan', '2Esdr', 'AddEsth', 'Sir', 'Bar', 'PrAzar'
  ];

  const vulgateBooks = [
    'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal',
    'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1_Cor', '2_Cor', 'Gal', 'Eph', 'Phil', 'Col', '1_Thess', '2_Thess', '1_Tim', '2_Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1_Pet', '2_Pet', '1_John', '2_John', '3_John', 'Jude',
    'Tob', 'Jdt', 'Wis', 'Sir', 'Bar', '1Mac', '2Mac'
  ];

  const webBooks = [
    'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal',
    'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1_Cor', '2_Cor', 'Gal', 'Eph', 'Phil', 'Col', '1_Thess', '2_Thess', '1_Tim', '2_Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1_Pet', '2_Pet', '1_John', '2_John', '3_John', 'Jude', 'Rev',
    'Tob', 'Jdt', 'AddEsth', 'Wis', 'Sir', 'Bar', '1Mac', '2Mac', '1Esdr', '2Esdr', 'PrMan'
  ];

  const brentonBooks = [
    'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Ps', 'Prov', 'Eccl', 'Song', 'Job', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal',
    '1Esdr', '2Esdr', 'Tob', 'Jdt', 'AddEsth', 'Wis', 'Sir', 'Bar', 'EpJer', 'Sus', 'Bel', '1Mac', '2Mac', '3Mac', '4Mac', 'PrMan'
  ];

  function getVersionBooks(version: string): string[] {
    switch (version) {
      case 'BHS': return bhsBooks;
      case 'LXX': return lxxBooks;
      case 'SBLGNT': return ntBooks;
      case 'KJV': return kjvBooks;
      case 'Vulgate': return vulgateBooks;
      case 'WEB': return webBooks;
      case 'Brenton': return brentonBooks;
      default: return ntBooks;
    }
  }

  let availableBooks = $derived(getVersionBooks(selectedVersion));

  let availableChapters = $derived((() => {
    let chapters;
    if (selectedVersion === 'BHS') chapters = currentBhsBook?.chapters;
    else if (selectedVersion === 'LXX') chapters = currentLxxBook?.chapters;
    else if (selectedVersion === 'SBLGNT') chapters = currentSblgntBook?.chapters;
    else if (selectedVersion === 'WEB') chapters = currentWebBook?.chapters;
    else if (selectedVersion === 'Vulgate') chapters = currentVulgateBook?.chapters;
    else if (selectedVersion === 'KJV') chapters = currentKjvBook?.chapters;
    else if (selectedVersion === 'Brenton') chapters = currentBrentonBook?.chapters;
    if (!chapters) return [];
    return Object.keys(chapters).map(Number).sort((a,b)=>a-b);
  })());
  
    

  async function loadBookData(book: string) {
    currentBhsBook = null;
    currentLxxBook = null;
    currentSblgntBook = null;
    currentWebBook = null;
    currentVulgateBook = null;
    currentKjvBook = null;
    currentBrentonBook = null;

    // Additionally, ALWAYS fetch the selectedVersion's book even if it's not in activeColumns!
    // This ensures availableChapters will work.
    const toFetchBhs = activeVersions.includes('BHS');
    const toFetchLxx = activeVersions.includes('LXX');
    const toFetchSblgnt = activeVersions.includes('SBLGNT');
    const toFetchWeb = activeVersions.includes('WEB');
    const toFetchVulgate = activeVersions.includes('Vulgate');
    const toFetchKjv = activeVersions.includes('KJV');
    const toFetchBrenton = activeVersions.includes('Brenton');

    try {
      const fetches = [];
      if (toFetchBhs) fetches.push(fetch(`${base}/data/bhs/books/${getBookFile('BHS', book)}.json`).then(r => r.ok ? r.json() : null).then(d => currentBhsBook = d));
      if (toFetchLxx) fetches.push(fetch(`${base}/data/lxx/books/${getBookFile('LXX', book)}.json`).then(r => r.ok ? r.json() : null).then(d => currentLxxBook = d));
      if (toFetchSblgnt) fetches.push(fetch(`${base}/data/sblgnt/books/${getBookFile('SBLGNT', book)}.json`).then(r => r.ok ? r.json() : null).then(d => currentSblgntBook = d));
      if (toFetchWeb) fetches.push(fetch(`${base}/data/web/books/${getBookFile('WEB', book)}.json`).then(r => r.ok ? r.json() : null).then(d => currentWebBook = d));
      if (toFetchVulgate) fetches.push(fetch(`${base}/data/vulgate/books/${getBookFile('Vulgate', book)}.json`).then(r => r.ok ? r.json() : null).then(d => currentVulgateBook = d));
      if (toFetchKjv) fetches.push(fetch(`${base}/data/kjv/books/${getBookFile('KJV', book)}.json`).then(r => r.ok ? r.json() : null).then(d => currentKjvBook = d));
      if (toFetchBrenton) fetches.push(fetch(`${base}/data/brenton/books/${getBookFile('Brenton', book)}.json`).then(r => r.ok ? r.json() : null).then(d => currentBrentonBook = d));
      await Promise.all(fetches);
    } catch (e) {
      console.error("Error loading book data", e);
    }
  }

  onMount(async () => {
    try {
      const [alignRes, bhsLex, lxxLex, sblgntLex, vulgateLex] = await Promise.all([
        fetch(`${base}/data/tvtms_alignment.json`),
        fetch(`${base}/data/bhs/lexemes.json`),
        fetch(`${base}/data/lxx/lexemes.json`),
        fetch(`${base}/data/sblgnt/lexemes.json`),
        fetch(`${base}/data/vulgate/lexemes.json`)
      ]);
      if (alignRes.ok) alignmentData = await alignRes.json();
      if (bhsLex.ok) bhsLexemes = await bhsLex.json();
      if (lxxLex.ok) lxxLexemes = await lxxLex.json();
      if (sblgntLex.ok) sblgntLexemes = await sblgntLex.json();
      if (vulgateLex && vulgateLex.ok) vulgateLexemes = await vulgateLex.json();
    } catch (e) {
      console.error("Error loading lexemes or alignment data", e);
    }
  });

  $effect(() => {
    loadBookData(selectedBook);
    // Explicitly track selectedVersion to reload if it changes
    selectedVersion;
  });

  import Modal2 from '$lib/lemma-ui/components/ui/Modal2.svelte';
  import LemmaInfo from '$lib/lemma-ui/components/LemmaInfo.svelte';
  import { Lexeme } from '$lib/lemma-ui/Lexeme.js';
import { getBookFile, getMappedReference } from '$lib/bookMapping.js';
  import { VocabEngine } from '$lib/lemma-ui/engine/VocabEngine.js';
  import { GenericVocabDataset } from '$lib/lemma-ui/data/VocabDataset.js';

  let showLemmaModal = $state(false);
  let verseKeys = $derived((() => {
    let chapters;
    if (selectedVersion === 'BHS') chapters = currentBhsBook?.chapters?.[selectedChapter];
    else if (selectedVersion === 'LXX') chapters = currentLxxBook?.chapters?.[selectedChapter];
    else if (selectedVersion === 'SBLGNT') chapters = currentSblgntBook?.chapters?.[selectedChapter];
    else if (selectedVersion === 'WEB') chapters = currentWebBook?.chapters?.[selectedChapter];
    else if (selectedVersion === 'Vulgate') chapters = currentVulgateBook?.chapters?.[selectedChapter];
    else if (selectedVersion === 'KJV') chapters = currentKjvBook?.chapters?.[selectedChapter];
    else if (selectedVersion === 'Brenton') chapters = currentBrentonBook?.chapters?.[selectedChapter];
    
    if (!chapters) return [];
    return Object.keys(chapters).sort((a,b) => Number(a) - Number(b)).map(String);
  })());

  let kjvConcordance: any = null;

  async function getDataset(corpus: string) {
    await initDatasets();
    if (tfDataMap[corpus]) return tfDataMap[corpus];
    
    const names: Record<string, { name: string, lang: string }> = {
      kjv: { name: 'King James Version', lang: 'english' },
      web: { name: 'World English Bible', lang: 'english' },
      vulgate: { name: 'Vulgate', lang: 'latin' },
      brenton: { name: "Brenton's Septuagint", lang: 'english' }
    };
    const meta = names[corpus] || { name: corpus.toUpperCase(), lang: 'english' };
    const ds = new GenericVocabDataset(corpus, meta.name, meta.lang);
    await ds.initBooks();
    tfDataMap[corpus] = ds;
    return ds;
  }

  async function showWordInfo(wordObj: any, lexemesDict: any, corpus: string) {
    if (!wordObj || !wordObj.id) return;
    activeWord = { ...wordObj, isLoading: true, corpus };
    showLemmaModal = true;
    
    const tfData = await getDataset(corpus);
    
    // Create and fetch full lemma stats
    let lexemeInstance = new Lexeme();
    await VocabEngine.fetchLexInfo(wordObj.id, lexemeInstance, tfData, corpus);
    
    if (lexemeInstance.id && lexemeInstance.id !== -1) {
        Object.assign(lexemeInstance, wordObj);
        lexemeInstance.corpus = corpus;
        lexemeInstance._tfData = tfData;
        lexemeInstance.isLoading = false;
        activeWord = lexemeInstance;
    } else {
        // Fallback to basic dictionary entry if stats aren't found
        const lexData = lexemesDict ? lexemesDict[wordObj.id] : null;
        if (lexData) Object.assign(lexemeInstance, lexData);
        Object.assign(lexemeInstance, wordObj);
        lexemeInstance.corpus = corpus;
        lexemeInstance.lemma = lexemeInstance.lemma || (wordObj.id ? `Strongs: ${wordObj.id}` : wordObj.word);
        lexemeInstance._tfData = tfData;
        lexemeInstance.isLoading = false;
        activeWord = lexemeInstance;
    }
  }

  function scrollToVerse(verseKey: string) {
    const el = document.getElementById(`verse-${verseKey}`);
    if (el) {
      const headerOffset = 150; // Account for sticky headers
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
         top: offsetPosition,
         behavior: "smooth"
      });
    }
  }
  
  function handleVersionSelect(version: string) {
    selectedVersion = version;
    versionDropdownOpen = false;
    const books = getVersionBooks(version);
    if (books.includes(selectedBook)) {
      return;
    }
    const targetBook = getBookFile(version, selectedBook);
    if (books.includes(targetBook)) {
      selectedBook = targetBook;
      return;
    }
    selectedBook = books[0] || 'Gen';
    selectedChapter = '1';
  }

  function handleWordClick(e: Event, w: any, colVersion: string) {
    e.stopPropagation();
    const dict = colVersion === 'BHS' ? bhsLexemes : colVersion === 'LXX' ? lxxLexemes : colVersion === 'SBLGNT' ? sblgntLexemes : vulgateLexemes;
    showWordInfo(w, dict, colVersion.toLowerCase());
  }

  function closePopup() {
    showLemmaModal = false;
    activeWord = null;
    chapterDropdownOpen = false;
    bookDropdownOpen = false;
    versionDropdownOpen = false;
    verseDropdownOpen = false;
  }
</script>

<div class="min-h-screen bg-page text-ink font-sans p-3 sm:p-4 md:p-8 pt-0 sm:pt-0 md:pt-0" onclick={closePopup}>
  <header class="sticky top-0 z-30 bg-page pt-3 sm:pt-4 md:pt-8 mb-6 sm:mb-8 border-b border-rule pb-3 sm:pb-4 flex flex-row justify-between items-center gap-2 sm:gap-4 -mx-3 px-3 sm:-mx-4 sm:px-4 md:-mx-8 md:px-8">
    <div class="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
      <img
        src={siteLogo}
        alt="Polyglot Bible Reader logo"
        class="w-8 h-8 sm:w-11 sm:h-11 md:w-14 md:h-14 lg:w-16 lg:h-16 flex-shrink-0 object-contain rounded-full shadow-xs"
      />
      <div class="min-w-0">
        <h1 class="text-sm min-[360px]:text-base min-[410px]:text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight inline-flex items-center flex-wrap gap-x-1 sm:gap-x-1.5">
          <span class="truncate sm:whitespace-normal hidden sm:inline">
            <span>Polyglot Bible Reader</span>
          </span>
          <span class="inline-flex items-center flex-shrink-0">
            <VersionButton />
            <a
              href="{base}/sources-and-licenses"
              class="btn btn-circle btn-ghost btn-xs text-base-content/80 sm:btn-sm hover:bg-base-200 hover:text-base-content inline-flex items-center justify-center rounded-full p-0.5 sm:p-1 text-ink-soft hover:text-ink hover:bg-rule/50 transition-colors align-super relative -top-0.5 sm:-top-1 ml-0.5 sm:ml-1"
              title="Sources &amp; Licenses"
              aria-label="Sources &amp; Licenses"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.8"
                stroke="currentColor"
                class="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                />
              </svg>
            </a>
          </span>
        </h1>
        
      </div>
    </div>
    

    <div class="flex gap-1 sm:gap-2.5 bg-page p-1 sm:p-2.5 md:p-4 rounded shadow-xs sm:shadow items-center flex-shrink-0" onclick={(e) => e.stopPropagation()}>
    <!-- Diacritic Controls -->
    



      {#if activeVersions.includes("BHS")}
        <div class="relative">
          <label class="hidden sm:block text-xs font-bold mb-1 text-center text-ink-soft" for="hebrew-diacritics">Heb</label>
          <button
            id="hebrew-diacritics"
            type="button"
            class="font-hebrew h-[26px] min-w-[28px] sm:h-[38px] sm:min-w-[38px] px-1 sm:px-2 rounded border text-sm sm:text-lg flex items-center justify-center cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-blue-500 {hebrewMode === 'all'
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-xs font-bold'
              : hebrewMode === 'vowels'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-400 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-900 shadow-xs font-semibold'
                : 'bg-page text-ink-soft border-rule hover:bg-rule hover:text-ink font-normal'}"
            onclick={cycleHebrewMode}
            title={hebrewMode === 'all'
              ? 'Hebrew: Vowels + Cantillation (click for vowels only)'
              : hebrewMode === 'vowels'
                ? 'Hebrew: Vowels only (click for consonants only)'
                : 'Hebrew: Consonants only (click for all markings)'}
            aria-label="Toggle Hebrew diacritics"
          >
            <span>{hebrewMode === 'all' ? 'אֶ֔' : hebrewMode === 'vowels' ? 'אָ' : 'א'}</span>
          </button>
        </div>
      {/if}

      {#if activeVersions.includes("LXX") || activeVersions.includes("SBLGNT")}
      <div class="relative">
        <label class="hidden sm:block text-xs font-bold mb-1 text-center text-ink-soft" for="greek-diacritics">Grk</label>
        <button
          id="greek-diacritics"
          type="button"
          class="font-greek h-[26px] min-w-[28px] sm:h-[38px] sm:min-w-[38px] px-1 sm:px-2 rounded border text-sm sm:text-lg flex items-center justify-center cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-blue-500 {greekDiacritics
            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-xs font-bold'
            : 'bg-page text-ink-soft border-rule hover:bg-rule hover:text-ink font-normal'}"
          onclick={toggleGreekDiacritics}
          title={greekDiacritics
            ? 'Greek diacritics: On (click to disable)'
            : 'Greek diacritics: Off (click to enable)'}
          aria-label="Toggle Greek diacritics"
        >
          <span>{greekDiacritics ? 'ἀ' : 'α'}</span>
        </button>
      </div>
      {/if}
        <div class="h-6 sm:h-8 w-px bg-rule mx-0.5 sm:mx-1 self-end mb-1 hidden sm:inline"></div>
        
          
      <div class="relative">
        <label class="hidden sm:block text-sm font-bold mb-1">Version</label>
        <button 
          aria-label="Select version"
          class="border border-rule rounded p-1 sm:p-2 w-16 sm:w-20 md:w-24 text-xs sm:text-sm text-left bg-page flex justify-between items-center shadow-xs sm:shadow-sm"
          onclick={(e) => { e.stopPropagation(); closePopup(); versionDropdownOpen = !versionDropdownOpen; }}
        >
          <span class="truncate">{selectedVersion}</span>
          <span class="text-[10px] sm:text-xs text-ink-soft ml-0.5">▼</span>
        </button>
        
        {#if versionDropdownOpen}
          <button 
            type="button" 
            class="fixed inset-0 z-40 cursor-default bg-transparent border-0 p-0 m-0 w-full h-full" 
            onclick={() => versionDropdownOpen = false} 
            aria-label="Close version menu" 
            tabindex="-1"
          ></button>
          <div class="absolute top-full left-0 mt-1 bg-page border border-rule rounded-md shadow-lg z-50 overflow-hidden min-w-[7.5rem] sm:min-w-[8.5rem] w-32 py-1">
            {#each versionGroups as group, gIdx}
              {#if gIdx > 0}
                <div class="border-t border-rule my-1"></div>
              {/if}
              <div class="px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-ink-soft select-none">
                {group.language}
              </div>
              {#each group.versions as v}
                <button 
                  type="button"
                  class="w-full text-left px-3 py-1.5 text-xs sm:text-sm hover:bg-rule flex items-center justify-between cursor-pointer {v === selectedVersion ? 'bg-blue-500 text-white hover:bg-blue-600 font-semibold' : 'text-ink'}"
                  onclick={() => handleVersionSelect(v)}
                  title={formatVersionLabel(v)}
                >
                  <span>{v}</span>
                  {#if v === selectedVersion}
                    <span class="text-xs">✓</span>
                  {/if}
                </button>
              {/each}
            {/each}
          </div>
        {/if}
      </div>
      <div class="relative">
        <label class="hidden sm:block text-sm font-bold mb-1">Book</label>
        <button 
          aria-label="Select book"
          class="border border-rule rounded p-1 sm:p-2 w-[4.5rem] sm:w-28 md:w-32 text-xs sm:text-sm text-left bg-page flex justify-between items-center shadow-xs sm:shadow-sm"
          onclick={(e) => { e.stopPropagation(); bookDropdownOpen = !bookDropdownOpen; }}
        >
          <span class="truncate">{selectedBook}</span>
          <span class="text-[10px] sm:text-xs text-ink-soft ml-0.5">▼</span>
        </button>
        
        {#if bookDropdownOpen}
          <div class="fixed inset-0 bg-black/20 z-40 flex items-center justify-center p-4" onclick={() => bookDropdownOpen = false}>
            <div class="bg-page border border-rule rounded-lg shadow-xl p-4 z-50 max-h-[80vh] overflow-y-auto w-full max-w-3xl" onclick={(e) => e.stopPropagation()}>
              <h3 class="font-bold mb-4 text-lg border-b border-rule pb-2">Available Books</h3>
              <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
                {#each availableBooks as book}
                  <button 
                    class="p-2 text-center text-sm rounded hover:bg-rule {book === selectedBook ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-page border'}"
                    onclick={() => { selectedBook = book; selectedChapter = '1'; bookDropdownOpen = false; }}
                  >
                    {book}
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>

      <div class="relative">
        <label class="hidden sm:block text-sm font-bold mb-1" for="chapter">Chapter</label>
        <button 
          id="chapter"
          aria-label="Select chapter"
          class="border border-rule rounded p-1 sm:p-2 w-12 sm:w-16 md:w-20 text-xs sm:text-sm text-left bg-page flex justify-between items-center shadow-xs sm:shadow-sm"
          onclick={(e) => { e.stopPropagation(); chapterDropdownOpen = !chapterDropdownOpen; }}
        >
          <span class="truncate">{selectedChapter}</span>
          <span class="text-[10px] sm:text-xs text-ink-soft ml-0.5">▼</span>
        </button>
        
        {#if chapterDropdownOpen}
          <div class="fixed inset-0 bg-black/20 z-40 flex items-center justify-center p-4" onclick={() => chapterDropdownOpen = false}>
            <div class="bg-page border border-rule rounded-lg shadow-xl p-4 z-50 max-h-[80vh] overflow-y-auto w-full max-w-lg" onclick={(e) => e.stopPropagation()}>
              <h3 class="font-bold mb-4 text-lg border-b border-rule pb-2">{selectedBook} - Select Chapter</h3>
              <div class="grid grid-cols-5 md:grid-cols-8 gap-2">
                {#each availableChapters as ch}
                  <button 
                    class="p-2 text-center rounded hover:bg-rule {String(ch) === String(selectedChapter) ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-page border'}"
                    onclick={() => { selectedChapter = String(ch); chapterDropdownOpen = false; }}
                  >
                    {ch}
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>

      <div class="relative hidden sm:block">
        <label class="hidden sm:block text-sm font-bold mb-1" for="verse">Verse</label>
        <button 
          id="verse"
          aria-label="Select verse"
          class="border border-rule rounded p-1 sm:p-2 w-12 sm:w-16 md:w-20 text-xs sm:text-sm text-left bg-page flex justify-between items-center shadow-xs sm:shadow-sm"
          onclick={(e) => { e.stopPropagation(); verseDropdownOpen = !verseDropdownOpen; }}
        >
          <span class="truncate">v.</span>
          <span class="text-[10px] sm:text-xs text-ink-soft ml-0.5">▼</span>
        </button>
        
        {#if verseDropdownOpen}
          <div class="fixed inset-0 bg-black/20 z-40 flex items-center justify-center p-4" onclick={() => verseDropdownOpen = false}>
            <div class="bg-page border border-rule rounded-lg shadow-xl p-4 z-50 max-h-[80vh] overflow-y-auto w-full max-w-lg" onclick={(e) => e.stopPropagation()}>
              <h3 class="font-bold mb-4 text-lg border-b border-rule pb-2">{selectedBook} {selectedChapter} - Select Verse</h3>
              <div class="grid grid-cols-5 md:grid-cols-8 gap-2">
                {#each verseKeys as v}
                  <button 
                    class="p-2 text-center rounded hover:bg-rule bg-page border"
                    onclick={() => { scrollToVerse(v); verseDropdownOpen = false; }}
                  >
                    {v}
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>

    </div>

    <!-- Mobile toggle button (< sm:) -->
    <button
      type="button"
      class="sm:hidden absolute left-1/2 -translate-x-1/2 -bottom-[12px] z-40 flex items-center justify-center w-6 h-6 bg-page border border-rule rounded-full shadow-xs text-[10px] font-bold text-ink-soft hover:text-ink hover:bg-rule cursor-pointer transition-colors"
      onclick={(e) => { e.stopPropagation(); gridHeaderExpanded = !gridHeaderExpanded; }}
      title={gridHeaderExpanded ? "Collapse Layout Options" : "Expand Layout Options"}
      aria-label={gridHeaderExpanded ? "Collapse Layout Options" : "Expand Layout Options"}
    >
      {gridHeaderExpanded ? '▲' : '▼'}
    </button>
  </header>

  <main>
    <!-- Dynamic Grid Controls Header -->
    <div class="{gridHeaderExpanded ? 'flex' : 'hidden'} sm:flex flex-col gap-2 mb-4 sticky top-[57px] sm:top-[77px] md:top-[105px] bg-page pt-2 pb-2.5 border-b border-rule z-20 shadow-xs">
      <div class="flex items-center justify-between px-4 sm:px-5 text-xs font-semibold text-ink-soft">
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-link inline-block"></span>
          Verse Grid Layout: <strong class="text-ink">{versionGrid.length} {versionGrid.length === 1 ? 'Row' : 'Rows'} × {versionGrid[0]?.length || 0} {versionGrid[0]?.length === 1 ? 'Col' : 'Cols'}</strong>
        </span>
        <div class="flex items-center gap-2">
          <button 
            type="button"
            class="px-2.5 py-1 rounded border border-rule hover:bg-rule active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-medium text-ink transition-transform"
            onclick={addColumn}
            title="Add a parallel column"
          >
            <span class="font-bold">+</span> Add Column
          </button>
          <button 
            type="button"
            class="px-2.5 py-1 rounded border border-rule hover:bg-rule active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-medium text-ink transition-transform"
            onclick={addRow}
            title="Add a parallel row"
          >
            <span class="font-bold">+</span> Add Row
          </button>
        </div>
      </div>

      {#each versionGrid as row, rIdx}
        <div class="px-4 sm:px-5 border-x border-transparent">
          {#if versionGrid.length > 1}
            <div class="flex items-center justify-between text-[11px] font-semibold text-ink-soft mb-1 px-0.5">
              <span>Row {rIdx + 1}</span>
              <button 
                type="button"
                class="text-ink-soft hover:text-red-500 text-xs cursor-pointer flex items-center gap-1 hover:underline font-normal"
                onclick={() => removeRow(rIdx)}
                title="Remove row {rIdx + 1}"
                aria-label="Remove row {rIdx + 1}"
              >
                ✕ Remove Row
              </button>
            </div>
          {/if}
          <div class="grid gap-6 verse-grid" style="grid-template-columns: repeat({row.length > 0 ? row.length : 1}, minmax(0, 1fr))">
            {#each row as cellVersion, cIdx}
              {@const align = getCellAlign(rIdx, cIdx)}
              <div class="relative flex items-center justify-center gap-1.5 bg-page border border-rule/60 rounded-md px-3 py-1.5 group hover:border-link transition-colors shadow-xs">
                <select 
                  class="font-bold text-sm bg-transparent cursor-pointer appearance-none text-center focus:outline-none text-ink truncate"
                  value={cellVersion}
                  onchange={(e) => updateCell(rIdx, cIdx, e.currentTarget.value)}
                  aria-label="Select translation for Row {rIdx + 1}, Column {cIdx + 1}"
                >
                  {#each versionGroups as group}
                    <optgroup label={group.language}>
                      {#each group.versions as opt}
                        <option value={opt}>{formatVersionLabel(opt)}</option>
                      {/each}
                    </optgroup>
                  {/each}
                </select>
                <button
                  type="button"
                  class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all cursor-pointer shrink-0 shadow-2xs {align === 'right' ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-page text-ink-soft border-rule hover:bg-rule hover:text-ink'}"
                  onclick={() => toggleCellAlign(rIdx, cIdx)}
                  title="Text alignment: {align === 'right' ? 'Right-aligned' : 'Left-aligned'} (click to toggle)"
                  aria-label="Toggle text alignment for Row {rIdx + 1}, Column {cIdx + 1}"
                >
                  {align === 'right' ? 'R' : 'L'}
                </button>
                {#if rIdx === 0 && row.length > 1}
                  <button 
                    type="button"
                    class="text-ink-soft hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity absolute right-1.5 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                    onclick={() => removeColumn(cIdx)}
                    title="Remove column {cIdx + 1}"
                    aria-label="Remove column {cIdx + 1}"
                  >✕</button>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <!-- Dynamic Grid Verse Cards -->
    <div class="flex flex-col gap-5 max-w-full mx-auto">
      {#if verseKeys.length === 0}
         <p class="text-center text-ink-soft py-10">Loading or chapter not found.</p>
      {/if}

      {#each verseKeys as v}
        <div id="verse-{v}" class="flex flex-col gap-4 bg-page p-4 sm:p-5 rounded-lg shadow-sm border border-rule transition-colors hover:shadow-md">
          {#each versionGrid as row, rIdx}
            {#if rIdx > 0}
              <div class="border-t border-rule/50 my-1"></div>
            {/if}
            <div class="grid gap-6 verse-grid" style="grid-template-columns: repeat({row.length > 0 ? row.length : 1}, minmax(0, 1fr))">
              {#each row as colVersion, cIdx}
                {@const align = getCellAlign(rIdx, cIdx)}
                {@const mapped = getMappedReference(colVersion, selectedBook, String(selectedChapter), v)}
                {@const mChap = mapped.mappedChapter}
                {@const mVerse = mapped.mappedVerse}
                {@const bookData = currentBooks[colVersion]}
                {@const vData = {
                  exists: !!(bookData?.chapters?.[mChap]?.[mVerse]),
                  omitted: !(bookData?.chapters?.[mChap]?.[mVerse]),
                  label: `${mapped.mappedBook} ${mChap}:${mVerse}`,
                  isDivergent: mChap !== String(selectedChapter) || mVerse !== v,
                  verseData: bookData?.chapters?.[mChap]?.[mVerse]
                }}
                {@const unformattedVerseText = vData?.omitted ? '' : (vData?.verseData?.words?.length ? vData.verseData.words.reduce((acc: string, w: any) => acc + w.word + (w.trailer ?? ' '), '') : (vData?.verseData?.text || ''))}
                {@const formattedVerseText = formatText(unformattedVerseText, colVersion)}
              
                <div class="flex flex-col {cIdx !== 0 ? 'border-t border-rule/40 pt-3.5 sm:border-0 sm:pt-0' : ''} {align === 'right' ? 'items-end text-right' : 'items-start text-left'}">
                  <div class="text-xs font-bold mb-1.5 flex items-center gap-1.5 {align === 'right' ? 'self-end text-right' : 'self-start text-left'} {vData?.isDivergent ? 'text-amber-600 dark:text-amber-400' : 'text-ink-soft'}">
                      <span>{vData?.label}</span>
                      <span class="px-1.5 py-0.2 rounded text-[10px] bg-rule/50 font-medium">({colVersion})</span>
 
                  </div>
                  <div class="{colVersion === 'BHS' ? 'text-2xl' : 'text-xl'} {align === 'right' ? 'text-right' : 'text-left'} leading-snug w-full" dir={colVersion === 'BHS' ? 'rtl' : 'ltr'}>
                     {#if vData?.omitted}
                        <span class="text-sm italic text-ink-soft font-sans" dir="ltr">[Not found in this version.]</span>
                     {:else if vData?.verseData?.words}
                        {#each vData.verseData.words as w}
                           {#if colVersion === 'WEB' || colVersion === 'Vulgate' || colVersion === 'Brenton'}
                           {@const text=w.word}
                             <span class="font-sans inline">{text}{w.trailer ?? ' '}</span>
                           {:else}
                            {@const text=formatText(w.word,colVersion)}
                             <button type="button" class="{colVersion === 'BHS' ? 'font-hebrew' : colVersion === 'Vulgate' ? 'font-sans' : 'font-greek'} cursor-pointer hover:bg-rule rounded focus:outline-none inline" 
                             onclick={(e) => handleWordClick(e, w, colVersion)}>{text}</button>{w.trailer ?? ' '}
                           {/if}
                        {/each}
                     {:else if vData?.verseData?.text}
                      {@const text=formatText(vData.verseData.text,colVersion)}
                        <span class="{colVersion === 'BHS' ? 'font-hebrew' : colVersion === 'Vulgate' || colVersion === 'WEB' ? 'font-sans' : 'font-greek'}">
                           {text}
                        </span>
                     {:else}
                        <span class="text-sm italic text-ink-soft font-sans">[Verse text not available]</span>
                     {/if}
                          {#if vData?.verseData?.text}
                      
                        <span dir="ltr"><CopyText linkText="" copyText={formattedVerseText}/></span>
                      
                     {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/each}
        </div>
      {/each}
    </div>

    <!-- Open Source & Licensing Banner -->
    <div class="mt-12 mb-8 mx-auto max-w-3xl border border-rule bg-page p-6 text-center rounded-lg shadow-sm sm:p-8">
      <h3 class="mb-2 text-lg font-bold">Open Source &amp; Open Data</h3>
      <p class="mx-auto mb-4 max-w-2xl text-sm text-ink-soft">
        Polyglot Bible Reader is built on open-source code (<a
          href="https://www.gnu.org/licenses/agpl-3.0.html"
          target="_blank"
          rel="noopener noreferrer"
          class="text-link underline font-semibold hover:opacity-80">AGPL-3.0</a
        >) and variously open-licensed Biblical datasets (<a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-link underline font-semibold hover:opacity-80">CC BY-SA 4.0</a
        > and <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer" class="text-link underline font-semibold hover:opacity-80">CC BY-NC 4.0 (BHS)</a>).
      </p>
      <div>
        <a href="{base}/sources-and-licenses" class="inline-flex items-center gap-2 border border-rule px-4 py-2 rounded text-sm font-medium hover:bg-rule transition-colors">
          <span>View Full Sources &amp; Licensing Framework</span>
          <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </div>
    
    <VerseNavPill verses={verseKeys} />
  </main>
</div>

<script module>
  // Lazy load the datasets so they don't break SSR or bloat the main thread initially
  let TfBhsDataset: any, TfLxxDataset: any, TfSblgntDataset: any;
  let tfDataMap: Record<string, any> = {};
  
  async function initDatasets() {
    if (tfDataMap.bhs) return;
    try {
      const bhsMod = await import('$lib/lemma-ui/bhs/bhsDataset.js');
      const lxxMod = await import('$lib/lemma-ui/lxx/lxxDataset.js');
      const sblMod = await import('$lib/lemma-ui/sblgnt/sblgntDataset.js');
      TfBhsDataset = bhsMod.default || bhsMod.BhsVocabDataset || bhsMod.TfBhsDataset;
      TfLxxDataset = lxxMod.default || lxxMod.TfLxxDataset;
      TfSblgntDataset = sblMod.default || sblMod.TfSblgntDataset;
      
      tfDataMap.bhs = new TfBhsDataset();
      tfDataMap.lxx = new TfLxxDataset();
      tfDataMap.sblgnt = new TfSblgntDataset();
    } catch (e) {
      console.error("Failed to load dataset classes:", e);
    }
  }
</script>


<Modal2 bind:showModal={showLemmaModal} onclose={closePopup}>
  {#if activeWord}
    {#if activeWord._tfData}
       <LemmaInfo tfData={activeWord._tfData} lemma={activeWord} />
    {:else}
       <div class="py-12 text-center text-ink-soft">
         <span class="inline-block w-8 h-8 border-4 border-link border-t-transparent rounded-full animate-spin"></span>
         <p class="mt-4 font-semibold">Loading linguistic data...</p>
       </div>
    {/if}
  {/if}
</Modal2>

<style>
  @media (max-width: 639px) {
    :global(.verse-grid) {
      grid-template-columns: 1fr !important;
    }
  }
</style>


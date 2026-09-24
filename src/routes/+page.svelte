<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import siteLogo from '$lib/assets/logo.png';
  import VersionButton from '$lib/components/ui/VersionButton.svelte';
  import { formatHebrew, formatGreek, type HebrewDiacriticMode } from '$lib/utils/diacritics';

  let selectedVersion = $state<'BHS' | 'LXX' | 'SBLGNT'>('BHS');
  let selectedBook = $state('Gen');
  let selectedChapter = $state('1');
  let versionDropdownOpen = $state(false);

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

  let currentBhsBook: any = $state(null);
  let currentLxxBook: any = $state(null);
  let currentSblgntBook: any = $state(null);

  let bhsChapterData = $derived(currentBhsBook?.chapters?.[String(selectedChapter)] || {});
  let lxxChapterData = $derived(currentLxxBook?.chapters?.[String(selectedChapter)] || {});
  let sblgntChapterData = $derived(currentSblgntBook?.chapters?.[String(selectedChapter)] || {});
  let alignmentData: any = $state({});

  let lxxChapterHeader = $derived.by(() => {
    if (selectedVersion !== 'BHS' || !verseKeys.length || !alignmentData) return '';
    const mappedChapters = new Set<string>();
    for (const v of verseKeys) {
      const key = `${selectedBook} ${selectedChapter}:${v}`;
      if (alignmentData && key in alignmentData) {
        const target = alignmentData[key];
        if (target) mappedChapters.add(String(target.chapter));
      } else {
        mappedChapters.add(String(selectedChapter));
      }
    }
    const chList = Array.from(mappedChapters).sort((a, b) => Number(a) - Number(b));
    if (chList.length === 1 && chList[0] !== String(selectedChapter)) {
      return ` (ch. ${chList[0]})`;
    } else if (chList.length > 1) {
      return ` (ch. ${chList.join(', ')})`;
    }
    return '';
  });

  let bhsChapterHeader = $derived.by(() => {
    if (selectedVersion !== 'LXX' || !verseKeys.length || !alignmentData) return '';
    const mappedChapters = new Set<string>();
    for (const v of verseKeys) {
       let foundKey = Object.keys(alignmentData).find(k => {
           const val = alignmentData[k];
           return k.startsWith(selectedBook + ' ') && val && String(val.chapter) === String(selectedChapter) && String(val.verse) === String(v);
       });
       if (foundKey) {
           const parts = foundKey.split(' ')[1].split(':');
           mappedChapters.add(parts[0]);
       } else {
           mappedChapters.add(String(selectedChapter));
       }
    }
    const chList = Array.from(mappedChapters).sort((a, b) => Number(a) - Number(b));
    if (chList.length === 1 && chList[0] !== String(selectedChapter)) {
      return ` (ch. ${chList[0]})`;
    } else if (chList.length > 1) {
      return ` (ch. ${chList.join(', ')})`;
    }
    return '';
  });

  function getLxxVerse(v: string) {
    if (!currentLxxBook?.chapters) return null;
    const key = `${selectedBook} ${selectedChapter}:${v}`;
    let ch = String(selectedChapter);
    let vs = v;
    let isDivergent = false;

    if (alignmentData && key in alignmentData) {
      const target = alignmentData[key];
      if (target === null) {
        return {
          exists: false,
          omitted: true,
          label: `${selectedBook} [omitted in LXX]`,
          isDivergent: true,
          verseData: null
        };
      }
      ch = String(target.chapter);
      vs = String(target.verse);
      isDivergent = ch !== String(selectedChapter) || vs !== v;
    }

    const verseData = currentLxxBook.chapters?.[ch]?.[vs] || null;
    return {
      exists: !!verseData,
      omitted: false,
      label: `${selectedBook} ${ch}:${vs}`,
      isDivergent,
      verseData
    };
  }

  function getBhsVerse(v: string) {
    if (!currentBhsBook?.chapters) return null;
    let ch = String(selectedChapter);
    let vs = v;
    let isDivergent = false;

    if (alignmentData) {
       let foundKey = Object.keys(alignmentData).find(k => {
           const val = alignmentData[k];
           return k.startsWith(selectedBook + ' ') && val && String(val.chapter) === String(selectedChapter) && String(val.verse) === String(v);
       });
       if (foundKey) {
           const parts = foundKey.split(' ')[1].split(':');
           ch = parts[0];
           vs = parts[1];
           isDivergent = true;
       }
    }
    
    const verseData = currentBhsBook.chapters?.[ch]?.[vs] || null;
    return {
       exists: !!verseData,
       omitted: !verseData,
       label: `${selectedBook} ${ch}:${vs}`,
       isDivergent,
       verseData
    };
  }
  
  let bhsLexemes: any = $state({});
  let lxxLexemes: any = $state({});
  let sblgntLexemes: any = $state({});

  let activeWord: any = $state(null);
  let chapterDropdownOpen = $state(false);
  let bookDropdownOpen = $state(false);

  const bhsBooks = ['Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Qoh', 'Cant', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal'];
  const lxxBooks = ['Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','1Esdr','2Esdr','Esth','Jdt','TobBA','TobS','1Mac','2Mac','3Mac','4Mac','Ps','Od','Prov','Qoh','Cant','Job','Wis','Sir','PsSol','Hos','Mic','Amos','Joel','Jonah','Obad','Nah','Hab','Zeph','Hag','Zech','Mal','Isa','Jer','Bar','EpJer','Lam','Ezek','Bel','BelTh','Dan','DanTh','Sus','SusTh'];
  const ntBooks = ['Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1_Cor', '2_Cor', 'Gal', 'Eph', 'Phil', 'Col', '1_Thess', '2_Thess', '1_Tim', '2_Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1_Pet', '2_Pet', '1_John', '2_John', '3_John', 'Jude', 'Rev'];

  let availableBooks = $derived(selectedVersion === 'BHS' ? bhsBooks : selectedVersion === 'LXX' ? lxxBooks : ntBooks);

  let availableChapters = $derived(
    selectedVersion === 'BHS' && currentBhsBook 
      ? Object.keys(currentBhsBook.chapters).map(Number).sort((a,b)=>a-b)
      : selectedVersion === 'LXX' && currentLxxBook
        ? Object.keys(currentLxxBook.chapters).map(Number).sort((a,b)=>a-b)
        : selectedVersion === 'SBLGNT' && currentSblgntBook 
          ? Object.keys(currentSblgntBook.chapters).map(Number).sort((a,b)=>a-b)
          : []
  );
  
  function handleVersionSelect(version: 'BHS' | 'LXX' | 'SBLGNT') {
    selectedVersion = version;
    versionDropdownOpen = false;
    const allowed = version === 'BHS' ? bhsBooks : version === 'LXX' ? lxxBooks : ntBooks;
    if (!allowed.includes(selectedBook)) {
      selectedBook = allowed[0];
      selectedChapter = '1';
    } else {
      selectedChapter = '1'; // Or reset to 1 on version change for simplicity
    }
  }

  async function loadBookData(book: string) {
    currentBhsBook = null;
    currentLxxBook = null;
    currentSblgntBook = null;

    try {
      if (bhsBooks.includes(book) || lxxBooks.includes(book)) {
        const fetches = [];
        if (bhsBooks.includes(book)) fetches.push(fetch(`/data/bhs/books/${book}.json`).then(r => r.ok ? r.json() : null).then(d => currentBhsBook = d));
        if (lxxBooks.includes(book)) fetches.push(fetch(`/data/lxx/books/${book}.json`).then(r => r.ok ? r.json() : null).then(d => currentLxxBook = d));
        await Promise.all(fetches);
      }
      if (ntBooks.includes(book)) {
        const ntRes = await fetch(`/data/sblgnt/books/${book}.json`);
        if (ntRes.ok) currentSblgntBook = await ntRes.json();
      }
    } catch (e) {
      console.error("Error loading book data", e);
    }
  }

  onMount(async () => {
    try {
      const [alignRes, bhsLex, lxxLex, sblgntLex] = await Promise.all([
        fetch('/data/tvtms_alignment.json'),
        fetch('/data/bhs/lexemes.json'),
        fetch('/data/lxx/lexemes.json'),
        fetch('/data/sblgnt/lexemes.json')
      ]);
      if (alignRes.ok) alignmentData = await alignRes.json();
      if (bhsLex.ok) bhsLexemes = await bhsLex.json();
      if (lxxLex.ok) lxxLexemes = await lxxLex.json();
      if (sblgntLex.ok) sblgntLexemes = await sblgntLex.json();
    } catch (e) {
      console.error("Error loading lexemes or alignment data", e);
    }
  });

  $effect(() => {
    loadBookData(selectedBook);
  });

  import Modal2 from '@biblical-data/svelte-lemma-ui/components/ui/Modal2.svelte';
  import LemmaInfo from '@biblical-data/svelte-lemma-ui/components/LemmaInfo.svelte';
  import { Lexeme } from '@biblical-data/svelte-lemma-ui/Lexeme.js';
  import { VocabEngine } from '@biblical-data/svelte-lemma-ui/engine/VocabEngine.js';

  let showLemmaModal = $state(false);
  let verseKeys = $derived(
    selectedVersion === 'BHS' 
      ? Object.keys(bhsChapterData || {}).sort((a,b) => parseInt(a) - parseInt(b))
      : selectedVersion === 'LXX'
        ? Object.keys(lxxChapterData || {}).sort((a,b) => parseInt(a) - parseInt(b))
        : Object.keys(sblgntChapterData || {}).sort((a,b) => parseInt(a) - parseInt(b))
  );

  async function showWordInfo(wordObj: any, lexemesDict: any, corpus: string) {
    if (!wordObj || !wordObj.id) return;
    const baseLex = lexemesDict ? lexemesDict[wordObj.id] : {};
    activeWord = { ...baseLex, ...wordObj, isLoading: true };
    showLemmaModal = true;
    
    // Ensure dataset classes are loaded
    await initDatasets();
    const tfData = tfDataMap[corpus];
    
    // Create and fetch full lemma stats
    let lexemeInstance = new Lexeme();
    await VocabEngine.fetchLexInfo(wordObj.id, lexemeInstance, tfData);
    
    if (lexemeInstance.id) {
        // Keep wordObj properties (e.g. word, trailer) so the template can still use activeWord.word
        Object.assign(lexemeInstance, wordObj);
        lexemeInstance._tfData = tfData;
        lexemeInstance.isLoading = false;
        activeWord = lexemeInstance;
    } else {
        // Fallback to basic dictionary entry if stats aren't found
        const lexData = lexemesDict[wordObj.id];
        Object.assign(lexemeInstance, lexData);
        Object.assign(lexemeInstance, wordObj);
        lexemeInstance._tfData = tfData;
        lexemeInstance.isLoading = false;
        activeWord = lexemeInstance;
    }
  }

  function closePopup() {
    showLemmaModal = false;
    activeWord = null;
    chapterDropdownOpen = false;
    bookDropdownOpen = false;
    versionDropdownOpen = false;
  }
</script>

<div class="min-h-screen bg-page text-ink font-sans p-3 sm:p-4 md:p-8" onclick={closePopup}>
  <header class="mb-6 sm:mb-8 border-b border-rule pb-3 sm:pb-4 flex flex-row justify-between items-center gap-2 sm:gap-4">
    <div class="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
      <img
        src={siteLogo}
        alt="Polyglot Ancient Text Reader logo"
        class="w-8 h-8 sm:w-11 sm:h-11 md:w-14 md:h-14 lg:w-16 lg:h-16 flex-shrink-0 object-contain rounded-full shadow-xs"
      />
      <div class="min-w-0">
        <h1 class="text-sm min-[360px]:text-base min-[410px]:text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight inline-flex items-center flex-wrap gap-x-1 sm:gap-x-1.5">
          <span class="truncate sm:whitespace-normal">
            <span class="sm:hidden">Polyglot Reader</span>
            <span class="hidden sm:inline">Polyglot Ancient Text Reader</span>
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
        <p class="hidden sm:block text-ink-soft mt-1 text-sm sm:text-base">BHS | LXX | SBLGNT</p>
      </div>
    </div>
    

    <div class="flex gap-1 sm:gap-2.5 bg-page p-1 sm:p-2.5 md:p-4 rounded shadow-xs sm:shadow items-center flex-shrink-0" onclick={(e) => e.stopPropagation()}>
    <!-- Diacritic Controls -->
    



      {#if selectedVersion === 'BHS' || selectedVersion === 'LXX'}
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
        <div class="h-6 sm:h-8 w-px bg-rule mx-0.5 sm:mx-1 self-end mb-1 hidden sm:inline"></div>
              <!-- Version Dropdown -->
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
          <div class="absolute top-full left-0 mt-1 bg-page border border-rule rounded shadow-lg z-50 overflow-hidden w-24">
            {#each ['BHS', 'LXX', 'SBLGNT'] as v}
              <button 
                class="w-full text-left px-3 py-2 text-sm hover:bg-rule {v === selectedVersion ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}"
                onclick={() => handleVersionSelect(v as 'BHS' | 'LXX' | 'SBLGNT')}
              >
                {v}
              </button>
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
              <h3 class="font-bold mb-4 text-lg border-b border-rule pb-2">Available Books ({selectedVersion})</h3>
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

      
    </div>
  </header>

  <main>
    {#if selectedVersion === 'BHS' || selectedVersion === 'LXX'}
      <div class="hidden md:grid md:grid-cols-2 gap-6 mb-4 sticky top-0 bg-page pt-2 pb-2 border-b border-rule z-10">
        <h2 class="text-xl font-bold text-center">Hebrew (BHS){selectedVersion === 'LXX' ? bhsChapterHeader : ''}</h2>
        <h2 class="text-xl font-bold text-center">Greek (LXX){selectedVersion === 'BHS' ? lxxChapterHeader : ''}</h2>
      </div>
      
      <div class="flex flex-col gap-4">
        {#if Object.keys(selectedVersion === 'BHS' ? bhsChapterData : lxxChapterData).length === 0}
          <p class="text-center text-ink-soft py-10">Loading or chapter not found.</p>
        {/if}
        {#each verseKeys as v}
          {@const lxxInfo = selectedVersion === 'BHS' ? getLxxVerse(v) : {
             exists: !!lxxChapterData[v],
             omitted: !lxxChapterData[v],
             label: `${selectedBook} ${selectedChapter}:${v}`,
             isDivergent: false,
             verseData: lxxChapterData[v] || null
          }}
          {@const bhsInfo = selectedVersion === 'LXX' ? getBhsVerse(v) : {
             exists: !!bhsChapterData[v],
             omitted: !bhsChapterData[v],
             label: `${selectedBook} ${selectedChapter}:${v}`,
             isDivergent: false,
             verseData: bhsChapterData[v] || null
          }}
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-page p-4 rounded shadow-sm border border-rule hover:bg-rule transition-colors relative">
            <!-- BHS Column -->
            <div class="flex flex-col items-end">
              {#if bhsInfo}
                <div class="text-xs font-bold mb-1 self-center md:self-end text-center md:text-right {bhsInfo.isDivergent ? 'text-amber-600 dark:text-amber-400' : 'text-ink-soft'}">
                  {bhsInfo.label} <span class="md:hidden">(BHS)</span>
                </div>
                <div class="text-right text-2xl leading-snug" dir="rtl">
                  {#if bhsInfo.omitted}
                    <span class="text-sm italic text-ink-soft font-sans">[No corresponding text in BHS]</span>
                  {:else if bhsInfo.verseData?.words}
                    {#each bhsInfo.verseData.words as w}
                      <button type="button" class="font-hebrew cursor-pointer hover:bg-rule rounded focus:outline-none inline" onclick={(e) => { e.stopPropagation(); showWordInfo(w, bhsLexemes, 'bhs'); }}>{formatHebrew(w.word, hebrewMode)}</button>{w.trailer ?? ' '}
                    {/each}
                  {:else if bhsInfo.verseData?.text}
                    <span class="font-hebrew">{formatHebrew(bhsInfo.verseData.text, hebrewMode)}</span>
                  {:else}
                    <span class="text-sm italic text-ink-soft font-sans">[Verse text not available]</span>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- LXX Column -->
            <div class="flex flex-col items-start">
              <div class="md:hidden w-[90%] self-center border-t border-rule opacity-50 h-0 my-0 -translate-y-3"></div>
              {#if lxxInfo}
                <div class="text-xs font-bold mb-1 self-center md:self-start text-center md:text-left {lxxInfo.isDivergent ? 'text-amber-600 dark:text-amber-400' : 'text-ink-soft'}">
                  {lxxInfo.label} <span class="md:hidden">(LXX)</span>
                </div>
                <div class="text-xl leading-snug">
                  {#if lxxInfo.omitted}
                    <span class="text-sm italic text-ink-soft">[No corresponding text in Septuagint]</span>
                  {:else if lxxInfo.verseData?.words}
                    {#each lxxInfo.verseData.words as w}
                      <button type="button" class="font-greek cursor-pointer hover:bg-rule rounded focus:outline-none inline" onclick={(e) => { e.stopPropagation(); showWordInfo(w, lxxLexemes, 'lxx'); }}>{formatGreek(w.word, greekDiacritics)}</button>{w.trailer ?? ' '}
                    {/each}
                  {:else if lxxInfo.verseData?.text}
                    <span class="font-greek">{formatGreek(lxxInfo.verseData.text, greekDiacritics)}</span>
                  {:else}
                    <span class="text-sm italic text-ink-soft">[Verse text not available]</span>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>

    {:else if selectedVersion === 'SBLGNT'}
      <div class="hidden md:grid grid-cols-1 gap-6 mb-4 sticky top-0 bg-page pt-2 pb-2 border-b border-rule z-10">
        <h2 class="text-xl font-bold text-center">Greek NT (SBLGNT)</h2>
      </div>
      
      <div class="flex flex-col gap-4 max-w-4xl mx-auto">
        {#if Object.keys(sblgntChapterData).length === 0}
          <p class="text-center text-ink-soft py-10">Loading or chapter not found.</p>
        {/if}
        {#each verseKeys as v}
          <div class="bg-page p-4 rounded shadow-sm border border-rule hover:bg-rule transition-colors">
            <div class="flex flex-col items-start">
              <div class="text-xs text-ink-soft font-bold mb-1 self-center md:self-start text-center md:text-left">{selectedBook} {selectedChapter}:{v} <span class="md:hidden">(SBLGNT)</span></div>
              <div class="text-xl leading-snug">
                {#if sblgntChapterData[v]?.words}
                  {#each sblgntChapterData[v].words as w}
                    <button type="button" class="font-greek cursor-pointer hover:bg-rule rounded focus:outline-none inline" onclick={(e) => { e.stopPropagation(); showWordInfo(w, sblgntLexemes, 'sblgnt'); }}>{formatGreek(w.word, greekDiacritics)}</button>{w.trailer ?? ' '}
                  {/each}
                {:else}
                  <span class="font-greek">{formatGreek(sblgntChapterData[v]?.text || '', greekDiacritics)}</span>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Open Source & Licensing Banner -->
    <div class="mt-12 mb-8 mx-auto max-w-3xl border border-rule bg-page p-6 text-center rounded-lg shadow-sm sm:p-8">
      <h3 class="mb-2 text-lg font-bold">Open Source &amp; Open Data</h3>
      <p class="mx-auto mb-4 max-w-2xl text-sm text-ink-soft">
        Polyglot Ancient Text Reader is built on open-source code (<a
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
  </main>
</div>

<script module>
  // Lazy load the datasets so they don't break SSR or bloat the main thread initially
  let TfBhsDataset: any, TfLxxDataset: any, TfSblgntDataset: any;
  let tfDataMap: Record<string, any> = {};
  
  async function initDatasets() {
    if (tfDataMap.bhs) return;
    try {
      const bhsMod = await import('@biblical-data/svelte-lemma-ui/bhs/bhsDataset.js');
      const lxxMod = await import('@biblical-data/svelte-lemma-ui/lxx/lxxDataset.js');
      const sblMod = await import('@biblical-data/svelte-lemma-ui/sblgnt/sblgntDataset.js');
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
    {#if activeWord.isLoading}
      <div class="py-16 text-center flex flex-col items-center justify-center gap-3">
        <span class="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
        <p class="text-base font-medium text-gray-700">Loading lemma data for <strong class="{activeWord.word?.match(/[\u0590-\u05FF]/) ? 'font-hebrew text-xl' : 'font-greek text-xl'}">{activeWord.word}</strong>...</p>
      </div>
    {:else if activeWord._tfData}
      <LemmaInfo tfData={activeWord._tfData} lemma={activeWord} />
    {:else}
      <div class="py-12 text-center text-gray-500">
        <p>Lexicon data unavailable for this word.</p>
      </div>
    {/if}
  {/if}
</Modal2>

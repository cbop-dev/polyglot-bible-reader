<script lang="ts">
  import { onMount } from 'svelte';

  let selectedBook = $state('Gen');
  let selectedChapter = $state('1');

  let currentBhsBook: any = $state(null);
  let currentLxxBook: any = $state(null);
  let currentSblgntBook: any = $state(null);

  let bhsChapterData = $derived(currentBhsBook?.chapters?.[String(selectedChapter)] || {});
  let lxxChapterData = $derived.by(() => {
    if (!currentLxxBook) return {};
    let lookupChapter = String(selectedChapter);
    if (selectedBook === 'Jer' && String(selectedChapter) === '30') lookupChapter = '37';
    return currentLxxBook.chapters?.[lookupChapter] || {};
  });
  let sblgntChapterData = $derived(currentSblgntBook?.chapters?.[String(selectedChapter)] || {});
  let alignmentData: any = $state({});
  
  let bhsLexemes: any = $state({});
  let lxxLexemes: any = $state({});
  let sblgntLexemes: any = $state({});

  let activeWord: any = $state(null);
  let chapterDropdownOpen = $state(false);
  let bookDropdownOpen = $state(false);

  const otBooks = ['Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Qoh', 'Cant', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal'];
  const ntBooks = ['Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1_Cor', '2_Cor', 'Gal', 'Eph', 'Phil', 'Col', '1_Thess', '2_Thess', '1_Tim', '2_Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1_Pet', '2_Pet', '1_John', '2_John', '3_John', 'Jude', 'Rev'];

  let isOT = $derived(otBooks.includes(selectedBook));
  let isNT = $derived(ntBooks.includes(selectedBook));

  let availableChapters = $derived(
    isOT && currentBhsBook 
      ? Object.keys(currentBhsBook.chapters).map(Number).sort((a,b)=>a-b)
      : isNT && currentSblgntBook 
        ? Object.keys(currentSblgntBook.chapters).map(Number).sort((a,b)=>a-b)
        : []
  );

  async function loadBookData(book: string) {
    currentBhsBook = null;
    currentLxxBook = null;
    currentSblgntBook = null;

    try {
      if (otBooks.includes(book)) {
        const [bhsRes, lxxRes] = await Promise.all([
          fetch(`/data/bhs/books/${book}.json`),
          fetch(`/data/lxx/books/${book}.json`)
        ]);
        if (bhsRes.ok) currentBhsBook = await bhsRes.json();
        if (lxxRes.ok) currentLxxBook = await lxxRes.json();
      } else if (ntBooks.includes(book)) {
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
  let verseKeys = $derived(Object.keys(isOT ? bhsChapterData : sblgntChapterData).sort((a,b) => parseInt(a) - parseInt(b)));

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
  }
</script>

<div class="min-h-screen bg-page text-ink font-sans p-4 md:p-8" onclick={closePopup}>
  <header class="mb-8 border-b border-rule pb-4 flex flex-col md:flex-row justify-between items-center gap-4">
    <div>
      <h1 class="text-3xl font-bold">Polyglot Ancient Text Reader</h1>
      <p class="text-ink-soft mt-2">BHS | LXX | SBLGNT</p>
    </div>
    
    <div class="flex gap-4 bg-page p-4 rounded shadow" onclick={(e) => e.stopPropagation()}>
      <div class="relative">
        <label class="block text-sm font-bold mb-1">Book</label>
        <button 
          class="border border-rule rounded p-2 w-32 text-left bg-page flex justify-between items-center shadow-sm"
          onclick={(e) => { e.stopPropagation(); bookDropdownOpen = !bookDropdownOpen; }}
        >
          {selectedBook}
          <span class="text-xs text-ink-soft">▼</span>
        </button>
        
        {#if bookDropdownOpen}
          <div class="fixed inset-0 bg-black/20 z-40 flex items-center justify-center p-4" onclick={() => bookDropdownOpen = false}>
            <div class="bg-page border border-rule rounded-lg shadow-xl p-4 z-50 max-h-[80vh] overflow-y-auto w-full max-w-3xl" onclick={(e) => e.stopPropagation()}>
              <h3 class="font-bold mb-4 text-lg border-b border-rule pb-2">Old Testament</h3>
              <div class="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
                {#each otBooks as book}
                  <button 
                    class="p-2 text-center text-sm rounded hover:bg-rule {book === selectedBook ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-page border'}"
                    onclick={() => { selectedBook = book; selectedChapter = '1'; bookDropdownOpen = false; }}
                  >
                    {book}
                  </button>
                {/each}
              </div>
              
              <h3 class="font-bold mb-4 text-lg border-b border-rule pb-2">New Testament</h3>
              <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
                {#each ntBooks as book}
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
        <label class="block text-sm font-bold mb-1" for="chapter">Chapter</label>
        <button 
          id="chapter"
          class="border border-rule rounded p-2 w-20 text-left bg-page flex justify-between items-center shadow-sm"
          onclick={(e) => { e.stopPropagation(); chapterDropdownOpen = !chapterDropdownOpen; }}
        >
          {selectedChapter}
          <span class="text-xs text-ink-soft">▼</span>
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
    {#if isOT}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 sticky top-0 bg-page pt-2 pb-2 border-b border-rule z-10">
        <h2 class="text-xl font-bold text-center">Hebrew (BHS)</h2>
        <h2 class="text-xl font-bold text-center">Greek (LXX)</h2>
      </div>
      
      <div class="flex flex-col gap-4">
        {#if Object.keys(bhsChapterData).length === 0}
          <p class="text-center text-ink-soft py-10">Loading or chapter not found.</p>
        {/if}
        {#each verseKeys as v}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-page p-4 rounded shadow-sm border border-rule hover:bg-rule transition-colors relative">
            <!-- BHS Column -->
            <div class="flex flex-col items-end">
              <div class="text-xs text-ink-soft font-bold mb-1">{selectedBook} {selectedChapter}:{v}</div>
              <div class="text-right text-2xl leading-snug" dir="rtl">
                {#if bhsChapterData[v]?.words}
                  {#each bhsChapterData[v].words as w}
                    <button type="button" class="font-hebrew cursor-pointer hover:bg-rule rounded focus:outline-none inline" onclick={(e) => { e.stopPropagation(); showWordInfo(w, bhsLexemes, 'bhs'); }}>{w.word}</button>{w.trailer ?? ' '}
                  {/each}
                {:else}
                  <span class="font-hebrew">{bhsChapterData[v]?.text || ''}</span>
                {/if}
              </div>
            </div>

            <!-- LXX Column -->
            <div class="flex flex-col items-start">
              {#if selectedBook === 'Jer' && String(selectedChapter) === '30'}
                 <div class="text-xs text-red-400 font-bold mb-1">{selectedBook} 37:{v}</div>
              {:else}
                 <div class="text-xs text-ink-soft font-bold mb-1">{selectedBook} {selectedChapter}:{v}</div>
              {/if}
              <div class="text-xl leading-snug">
                {#if lxxChapterData[v]?.words}
                  {#each lxxChapterData[v].words as w}
                    <button type="button" class="font-greek cursor-pointer hover:bg-rule rounded focus:outline-none inline" onclick={(e) => { e.stopPropagation(); showWordInfo(w, lxxLexemes, 'lxx'); }}>{w.word}</button>{w.trailer ?? ' '}
                  {/each}
                {:else}
                  <span class="font-greek">{lxxChapterData[v]?.text || ''}</span>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>

    {:else if isNT}
      <div class="grid grid-cols-1 gap-6 mb-4 sticky top-0 bg-page pt-2 pb-2 border-b border-rule z-10">
        <h2 class="text-xl font-bold text-center">Greek NT (SBLGNT)</h2>
      </div>
      
      <div class="flex flex-col gap-4 max-w-4xl mx-auto">
        {#if Object.keys(sblgntChapterData).length === 0}
          <p class="text-center text-ink-soft py-10">Loading or chapter not found.</p>
        {/if}
        {#each verseKeys as v}
          <div class="bg-page p-4 rounded shadow-sm border border-rule hover:bg-rule transition-colors">
            <div class="flex flex-col items-start">
              <div class="text-xs text-ink-soft font-bold mb-1">{selectedBook} {selectedChapter}:{v}</div>
              <div class="text-xl leading-snug">
                {#if sblgntChapterData[v]?.words}
                  {#each sblgntChapterData[v].words as w}
                    <button type="button" class="font-greek cursor-pointer hover:bg-rule rounded focus:outline-none inline" onclick={(e) => { e.stopPropagation(); showWordInfo(w, sblgntLexemes, 'sblgnt'); }}>{w.word}</button>{w.trailer ?? ' '}
                  {/each}
                {:else}
                  <span class="font-greek">{sblgntChapterData[v]?.text || ''}</span>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
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

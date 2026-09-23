<script lang="ts">
  import { onMount } from 'svelte';

  let selectedBook = $state('Gen');
  let selectedChapter = $state('1');

  let bhsChapterData = $state({});
  let lxxChapterData = $state({});
  let sblgntChapterData = $state({});
  let alignmentData = $state({});
  
  let bhsLexemes = $state({});
  let lxxLexemes = $state({});
  let sblgntLexemes = $state({});

  let activeWord = $state(null);

  const otBooks = ['Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Qoh', 'Cant', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal'];
  const ntBooks = ['Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1_Cor', '2_Cor', 'Gal', 'Eph', 'Phil', 'Col', '1_Thess', '2_Thess', '1_Tim', '2_Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1_Pet', '2_Pet', '1_John', '2_John', '3_John', 'Jude', 'Rev'];

  let isOT = $derived(otBooks.includes(selectedBook));
  let isNT = $derived(ntBooks.includes(selectedBook));

  async function loadData(book: string, chapter: string) {
    bhsChapterData = {};
    lxxChapterData = {};
    sblgntChapterData = {};

    try {
      if (otBooks.includes(book)) {
        const bhsRes = await fetch(`/data/bhs/books/${book}.json`);
        if (bhsRes.ok) {
          const bhsBook = await bhsRes.json();
          bhsChapterData = bhsBook.chapters[String(chapter)] || {};
        }

        const lxxRes = await fetch(`/data/lxx/books/${book}.json`);
        if (lxxRes.ok) {
          const lxxBook = await lxxRes.json();
          let lookupChapter = String(chapter);
          if (book === 'Jer' && String(chapter) === '30') lookupChapter = '37';
          lxxChapterData = lxxBook.chapters[lookupChapter] || {};
        }
      } else if (ntBooks.includes(book)) {
        const ntRes = await fetch(`/data/sblgnt/books/${book}.json`);
        if (ntRes.ok) {
          const ntBook = await ntRes.json();
          sblgntChapterData = ntBook.chapters[String(chapter)] || {};
        }
      }
    } catch (e) {
      console.error("Error loading chapter data", e);
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
    loadData(selectedBook, selectedChapter);
  });

  let verseKeys = $derived(Object.keys(isOT ? bhsChapterData : sblgntChapterData).sort((a,b) => parseInt(a) - parseInt(b)));

  function showWordInfo(wordObj: any, lexemesDict: any) {
    if (!wordObj || !wordObj.id) return;
    const lexData = lexemesDict[wordObj.id];
    if (lexData) {
      activeWord = { ...wordObj, ...lexData };
    }
  }

  function closePopup() {
    activeWord = null;
  }
</script>

<div class="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8" onclick={closePopup}>
  <header class="mb-8 border-b pb-4 flex flex-col md:flex-row justify-between items-center gap-4">
    <div>
      <h1 class="text-3xl font-bold">Polyglot Ancient Text Reader</h1>
      <p class="text-gray-600 mt-2">BHS | LXX | SBLGNT</p>
    </div>
    
    <div class="flex gap-4 bg-white p-4 rounded shadow" onclick={(e) => e.stopPropagation()}>
      <div>
        <label class="block text-sm font-bold mb-1" for="book">Book</label>
        <select id="book" class="border rounded p-2" bind:value={selectedBook} onchange={() => selectedChapter = '1'}>
          <optgroup label="Old Testament">
            {#each otBooks as book}
              <option value={book}>{book}</option>
            {/each}
          </optgroup>
          <optgroup label="New Testament">
            {#each ntBooks as book}
              <option value={book}>{book}</option>
            {/each}
          </optgroup>
        </select>
      </div>
      <div>
        <label class="block text-sm font-bold mb-1" for="chapter">Chapter</label>
        <input id="chapter" type="number" min="1" class="border rounded p-2 w-20" bind:value={selectedChapter} />
      </div>
    </div>
  </header>

  <main>
    {#if isOT}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 sticky top-0 bg-gray-50 pt-2 pb-2 border-b z-10">
        <h2 class="text-xl font-bold text-center">Hebrew (BHS)</h2>
        <h2 class="text-xl font-bold text-center">Greek (LXX)</h2>
      </div>
      
      <div class="flex flex-col gap-4">
        {#if Object.keys(bhsChapterData).length === 0}
          <p class="text-center text-gray-500 py-10">Loading or chapter not found.</p>
        {/if}
        {#each verseKeys as v}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded shadow-sm border hover:bg-gray-100 transition-colors relative">
            <!-- BHS Column -->
            <div class="flex flex-col items-end">
              <div class="text-xs text-gray-400 font-bold mb-1">{selectedBook} {selectedChapter}:{v}</div>
              <div class="text-right text-2xl leading-snug" dir="rtl">
                {#if bhsChapterData[v]?.words}
                  {#each bhsChapterData[v].words as w}
                    <button type="button" class="font-hebrew cursor-pointer hover:bg-blue-100 rounded focus:outline-none inline" onclick={(e) => { e.stopPropagation(); showWordInfo(w, bhsLexemes); }}>{w.word}</button>{w.trailer ?? ' '}
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
                 <div class="text-xs text-gray-400 font-bold mb-1">{selectedBook} {selectedChapter}:{v}</div>
              {/if}
              <div class="text-xl leading-snug">
                {#if lxxChapterData[v]?.words}
                  {#each lxxChapterData[v].words as w}
                    <button type="button" class="font-greek cursor-pointer hover:bg-blue-100 rounded focus:outline-none inline" onclick={(e) => { e.stopPropagation(); showWordInfo(w, lxxLexemes); }}>{w.word}</button>{w.trailer ?? ' '}
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
      <div class="grid grid-cols-1 gap-6 mb-4 sticky top-0 bg-gray-50 pt-2 pb-2 border-b z-10">
        <h2 class="text-xl font-bold text-center">Greek NT (SBLGNT)</h2>
      </div>
      
      <div class="flex flex-col gap-4 max-w-4xl mx-auto">
        {#if Object.keys(sblgntChapterData).length === 0}
          <p class="text-center text-gray-500 py-10">Loading or chapter not found.</p>
        {/if}
        {#each verseKeys as v}
          <div class="bg-white p-4 rounded shadow-sm border hover:bg-gray-100 transition-colors">
            <div class="flex flex-col items-start">
              <div class="text-xs text-gray-400 font-bold mb-1">{selectedBook} {selectedChapter}:{v}</div>
              <div class="text-xl leading-snug">
                {#if sblgntChapterData[v]?.words}
                  {#each sblgntChapterData[v].words as w}
                    <button type="button" class="font-greek cursor-pointer hover:bg-blue-100 rounded focus:outline-none inline" onclick={(e) => { e.stopPropagation(); showWordInfo(w, sblgntLexemes); }}>{w.word}</button>{w.trailer ?? ' '}
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

{#if activeWord}
  <div class="fixed bottom-4 right-4 bg-white border-2 border-blue-500 rounded-lg shadow-xl p-4 w-64 z-50 animate-fade-in pointer-events-auto">
    <div class="flex justify-between items-start mb-2">
      <h3 class="font-bold text-lg {activeWord.word.match(/[\u0590-\u05FF]/) ? 'font-hebrew text-right w-full' : 'font-greek'}">{activeWord.lemma || activeWord.word}</h3>
      <button class="text-gray-400 hover:text-black absolute top-2 right-2" onclick={closePopup}>✕</button>
    </div>
    
    <div class="text-sm">
      <p><strong class="text-gray-600">Gloss:</strong> {activeWord.gloss || 'Unknown'}</p>
      {#if activeWord.strongs}
        <p><strong class="text-gray-600">Strongs:</strong> {activeWord.strongs}</p>
      {/if}
      {#if activeWord.pos}
        <p><strong class="text-gray-600">POS code:</strong> {activeWord.pos}</p>
      {/if}
    </div>
  </div>
{/if}

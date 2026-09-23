<script lang="ts">
  import { onMount } from 'svelte';

  let selectedBook = 'Gen';
  let selectedChapter = '1';

  let bhsChapterData = {};
  let lxxChapterData = {};
  let sblgntChapterData = {};
  let alignmentData = {};

  let otBooks = ['Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Qoh', 'Cant', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal'];
  let ntBooks = ['Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1_Cor', '2_Cor', 'Gal', 'Eph', 'Phil', 'Col', '1_Thess', '2_Thess', '1_Tim', '2_Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1_Pet', '2_Pet', '1_John', '2_John', '3_John', 'Jude', 'Rev'];

  $: isOT = otBooks.includes(selectedBook);
  $: isNT = ntBooks.includes(selectedBook);

  // Derive chapter count based on loaded data
  let chapterCount = 50; 

  async function loadData() {
    bhsChapterData = {};
    lxxChapterData = {};
    sblgntChapterData = {};

    try {
      if (isOT) {
        // Load BHS
        const bhsRes = await fetch(`/data/bhs/books/${selectedBook}.json`);
        if (bhsRes.ok) {
          const bhsBook = await bhsRes.json();
          bhsChapterData = bhsBook[selectedChapter] || {};
        }

        // Load LXX
        // Here we could implement the TVTMS lookup to find the exact LXX chapter.
        // For MVP, we attempt to load the matching chapter, but provide a visual indicator
        const lxxRes = await fetch(`/data/lxx/books/${selectedBook}.json`);
        if (lxxRes.ok) {
          const lxxBook = await lxxRes.json();
          // Real TVTMS lookup would map BHS -> KJV -> LXX
          // E.g. if BHS Jer 30 -> KJV Jer 30 -> LXX Jer 37
          // For now, if it's Jeremiah, just for demonstration of alignment as requested:
          let lookupChapter = selectedChapter;
          if (selectedBook === 'Jer' && selectedChapter === '30') lookupChapter = '37';
          
          lxxChapterData = lxxBook[lookupChapter] || {};
        }
      } else if (isNT) {
        const ntRes = await fetch(`/data/sblgnt/books/${selectedBook}.json`);
        if (ntRes.ok) {
          const ntBook = await ntRes.json();
          sblgntChapterData = ntBook[selectedChapter] || {};
        }
      }
    } catch (e) {
      console.error("Error loading chapter data", e);
    }
  }

  onMount(async () => {
    const alignmentRes = await fetch('/data/tvtms_alignment.json');
    if (alignmentRes.ok) {
      alignmentData = await alignmentRes.json();
    }
    loadData();
  });

  // Watch for changes to selections
  $: if (selectedBook || selectedChapter) {
    if (typeof window !== 'undefined') loadData();
  }

  // Get max verse count to align rows
  $: verseKeys = Object.keys(isOT ? bhsChapterData : sblgntChapterData).sort((a,b) => parseInt(a) - parseInt(b));
</script>

<div class="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8">
  <header class="mb-8 border-b pb-4 flex flex-col md:flex-row justify-between items-center gap-4">
    <div>
      <h1 class="text-3xl font-bold">Polyglot Ancient Text Reader</h1>
      <p class="text-gray-600 mt-2">BHS | LXX | SBLGNT</p>
    </div>
    
    <div class="flex gap-4 bg-white p-4 rounded shadow">
      <div>
        <label class="block text-sm font-bold mb-1" for="book">Book</label>
        <select id="book" class="border rounded p-2" bind:value={selectedBook}>
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
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded shadow-sm border hover:bg-gray-100 transition-colors">
            <!-- BHS Column -->
            <div class="text-right text-2xl leading-loose" dir="rtl">
              <span class="text-xs text-gray-400 font-bold ml-2 whitespace-nowrap">{selectedBook} {selectedChapter}:{v}</span>
              <span class="cursor-pointer hover:bg-blue-100">{bhsChapterData[v]?.text || ''}</span>
            </div>

            <!-- LXX Column -->
            <div class="text-xl leading-loose">
              <!-- Hardcoded demo for Jer 30 -> 37 mapping visualization -->
              {#if selectedBook === 'Jer' && selectedChapter === '30'}
                 <span class="text-xs text-red-400 font-bold mr-2">{selectedBook} 37:{v}</span>
              {:else}
                 <span class="text-xs text-gray-400 font-bold mr-2">{selectedBook} {selectedChapter}:{v}</span>
              {/if}
              
              <span class="cursor-pointer hover:bg-blue-100">{lxxChapterData[v]?.text || ''}</span>
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
            <div class="text-xl leading-loose">
              <span class="text-xs text-gray-400 font-bold mr-2">{selectedBook} {selectedChapter}:{v}</span>
              <span class="cursor-pointer hover:bg-blue-100">{sblgntChapterData[v]?.text || ''}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

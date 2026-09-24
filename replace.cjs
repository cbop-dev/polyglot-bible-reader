const fs = require('fs');
const content = fs.readFileSync('src/routes/+page.svelte', 'utf-8');

let newContent = content.replace(
  "let selectedBook = $state('Gen');\n  let selectedChapter = $state('1');",
  "let selectedVersion = $state<'BHS' | 'LXX' | 'SBLGNT'>('BHS');\n  let selectedBook = $state('Gen');\n  let selectedChapter = $state('1');\n  let versionDropdownOpen = $state(false);"
);

newContent = newContent.replace(
  "let bhsChapterData = $derived(currentBhsBook?.chapters?.[String(selectedChapter)] || {});\n  let sblgntChapterData = $derived(currentSblgntBook?.chapters?.[String(selectedChapter)] || {});\n  let alignmentData: any = $state({});",
  "let bhsChapterData = $derived(currentBhsBook?.chapters?.[String(selectedChapter)] || {});\n  let lxxChapterData = $derived(currentLxxBook?.chapters?.[String(selectedChapter)] || {});\n  let sblgntChapterData = $derived(currentSblgntBook?.chapters?.[String(selectedChapter)] || {});\n  let alignmentData: any = $state({});"
);

const lxxHeaderMatch = `  let lxxChapterHeader = $derived.by(() => {
    if (!isOT || !verseKeys.length || !alignmentData) return '';
    const mappedChapters = new Set<string>();
    for (const v of verseKeys) {
      const key = \`\${selectedBook} \${selectedChapter}:\${v}\`;
      if (alignmentData && key in alignmentData) {
        const target = alignmentData[key];
        if (target) mappedChapters.add(String(target.chapter));
      } else {
        mappedChapters.add(String(selectedChapter));
      }
    }
    const chList = Array.from(mappedChapters).sort((a, b) => Number(a) - Number(b));
    if (chList.length === 1 && chList[0] !== String(selectedChapter)) {
      return \` (ch. \${chList[0]})\`;
    } else if (chList.length > 1) {
      return \` (ch. \${chList.join(', ')})\`;
    }
    return '';
  });`;

const newLxxHeader = `  let lxxChapterHeader = $derived.by(() => {
    if (selectedVersion !== 'BHS' || !verseKeys.length || !alignmentData) return '';
    const mappedChapters = new Set<string>();
    for (const v of verseKeys) {
      const key = \`\${selectedBook} \${selectedChapter}:\${v}\`;
      if (alignmentData && key in alignmentData) {
        const target = alignmentData[key];
        if (target) mappedChapters.add(String(target.chapter));
      } else {
        mappedChapters.add(String(selectedChapter));
      }
    }
    const chList = Array.from(mappedChapters).sort((a, b) => Number(a) - Number(b));
    if (chList.length === 1 && chList[0] !== String(selectedChapter)) {
      return \` (ch. \${chList[0]})\`;
    } else if (chList.length > 1) {
      return \` (ch. \${chList.join(', ')})\`;
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
      return \` (ch. \${chList[0]})\`;
    } else if (chList.length > 1) {
      return \` (ch. \${chList.join(', ')})\`;
    }
    return '';
  });`;

newContent = newContent.replace(lxxHeaderMatch, newLxxHeader);

const getLxxVerseMatch = `  function getLxxVerse(v: string) {
    if (!currentLxxBook?.chapters) return null;
    const key = \`\${selectedBook} \${selectedChapter}:\${v}\`;
    let ch = String(selectedChapter);
    let vs = v;
    let isDivergent = false;

    if (alignmentData && key in alignmentData) {
      const target = alignmentData[key];
      if (target === null) {
        return {
          exists: false,
          omitted: true,
          label: \`\${selectedBook} [omitted in LXX]\`,
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
      label: \`\${selectedBook} \${ch}:\${vs}\`,
      isDivergent,
      verseData
    };
  }`;

const newGetVerses = getLxxVerseMatch + `\n\n  function getBhsVerse(v: string) {
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
       label: \`\${selectedBook} \${ch}:\${vs}\`,
       isDivergent,
       verseData
    };
  }`;

newContent = newContent.replace(getLxxVerseMatch, newGetVerses);

const booksConstMatch = `  const otBooks = ['Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Qoh', 'Cant', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal'];
  const ntBooks = ['Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1_Cor', '2_Cor', 'Gal', 'Eph', 'Phil', 'Col', '1_Thess', '2_Thess', '1_Tim', '2_Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1_Pet', '2_Pet', '1_John', '2_John', '3_John', 'Jude', 'Rev'];

  let isOT = $derived(otBooks.includes(selectedBook));
  let isNT = $derived(ntBooks.includes(selectedBook));

  let availableChapters = $derived(
    isOT && currentBhsBook 
      ? Object.keys(currentBhsBook.chapters).map(Number).sort((a,b)=>a-b)
      : isNT && currentSblgntBook 
        ? Object.keys(currentSblgntBook.chapters).map(Number).sort((a,b)=>a-b)
        : []
  );`;

const newBooksConst = `  const bhsBooks = ['Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Qoh', 'Cant', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal'];
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
  }`;

newContent = newContent.replace(booksConstMatch, newBooksConst);

const loadBookDataMatch = `      if (otBooks.includes(book)) {
        const [bhsRes, lxxRes] = await Promise.all([
          fetch(\`/data/bhs/books/\${book}.json\`),
          fetch(\`/data/lxx/books/\${book}.json\`)
        ]);
        if (bhsRes.ok) currentBhsBook = await bhsRes.json();
        if (lxxRes.ok) currentLxxBook = await lxxRes.json();
      } else if (ntBooks.includes(book)) {
        const ntRes = await fetch(\`/data/sblgnt/books/\${book}.json\`);
        if (ntRes.ok) currentSblgntBook = await ntRes.json();
      }`;

const newLoadBookData = `      if (bhsBooks.includes(book) || lxxBooks.includes(book)) {
        const fetches = [];
        if (bhsBooks.includes(book)) fetches.push(fetch(\`/data/bhs/books/\${book}.json\`).then(r => r.ok ? r.json() : null).then(d => currentBhsBook = d));
        if (lxxBooks.includes(book)) fetches.push(fetch(\`/data/lxx/books/\${book}.json\`).then(r => r.ok ? r.json() : null).then(d => currentLxxBook = d));
        await Promise.all(fetches);
      }
      if (ntBooks.includes(book)) {
        const ntRes = await fetch(\`/data/sblgnt/books/\${book}.json\`);
        if (ntRes.ok) currentSblgntBook = await ntRes.json();
      }`;
      
newContent = newContent.replace(loadBookDataMatch, newLoadBookData);


const verseKeysMatch = `  let showLemmaModal = $state(false);
  let verseKeys = $derived(Object.keys(isOT ? bhsChapterData : sblgntChapterData).sort((a,b) => parseInt(a) - parseInt(b)));`;

const newVerseKeys = `  let showLemmaModal = $state(false);
  let verseKeys = $derived(
    selectedVersion === 'BHS' 
      ? Object.keys(bhsChapterData || {}).sort((a,b) => parseInt(a) - parseInt(b))
      : selectedVersion === 'LXX'
        ? Object.keys(lxxChapterData || {}).sort((a,b) => parseInt(a) - parseInt(b))
        : Object.keys(sblgntChapterData || {}).sort((a,b) => parseInt(a) - parseInt(b))
  );`;

newContent = newContent.replace(verseKeysMatch, newVerseKeys);


// Fix header:
newContent = newContent.replace(
  "closePopup() {\n    showLemmaModal = false;\n    activeWord = null;\n    chapterDropdownOpen = false;\n  }",
  "closePopup() {\n    showLemmaModal = false;\n    activeWord = null;\n    chapterDropdownOpen = false;\n    bookDropdownOpen = false;\n    versionDropdownOpen = false;\n  }"
);

const controlsMatch = `      {#if isOT}
        <div class="relative">
          <label class="hidden sm:block text-xs font-bold mb-1 text-center text-ink-soft" for="hebrew-diacritics">Heb</label>`;

const newControls = `      <!-- Version Dropdown -->
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
                onclick={() => handleVersionSelect(v)}
              >
                {v}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      {#if selectedVersion === 'BHS' || selectedVersion === 'LXX'}
        <div class="relative">
          <label class="hidden sm:block text-xs font-bold mb-1 text-center text-ink-soft" for="hebrew-diacritics">Heb</label>`;

newContent = newContent.replace(controlsMatch, newControls);

const bookDropdownMatch = `        {#if bookDropdownOpen}
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
        {/if}`;

const newBookDropdown = `        {#if bookDropdownOpen}
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
        {/if}`;

newContent = newContent.replace(bookDropdownMatch, newBookDropdown);


// Main Content replacements
const mainOTMatch = `  <main>
    {#if isOT}`;
const mainNewOTMatch = `  <main>
    {#if selectedVersion === 'BHS' || selectedVersion === 'LXX'}`;

newContent = newContent.replace(mainOTMatch, mainNewOTMatch);

const isNTMatch = `    {:else if isNT}`;
const newIsNTMatch = `    {:else if selectedVersion === 'SBLGNT'}`;
newContent = newContent.replace(isNTMatch, newIsNTMatch);

const headersOT = `        <h2 class="text-xl font-bold text-center">Hebrew (BHS)</h2>
        <h2 class="text-xl font-bold text-center">Greek (LXX){lxxChapterHeader}</h2>`;
const newHeadersOT = `        <h2 class="text-xl font-bold text-center">Hebrew (BHS){selectedVersion === 'LXX' ? bhsChapterHeader : ''}</h2>
        <h2 class="text-xl font-bold text-center">Greek (LXX){selectedVersion === 'BHS' ? lxxChapterHeader : ''}</h2>`;
newContent = newContent.replace(headersOT, newHeadersOT);

const emptyBhsCheck = `        {#if Object.keys(bhsChapterData).length === 0}
          <p class="text-center text-ink-soft py-10">Loading or chapter not found.</p>
        {/if}`;
const newEmptyBhsCheck = `        {#if Object.keys(selectedVersion === 'BHS' ? bhsChapterData : lxxChapterData).length === 0}
          <p class="text-center text-ink-soft py-10">Loading or chapter not found.</p>
        {/if}`;
newContent = newContent.replace(emptyBhsCheck, newEmptyBhsCheck);

const eachOTMatch = `        {#each verseKeys as v}
          {@const lxxInfo = getLxxVerse(v)}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-page p-4 rounded shadow-sm border border-rule hover:bg-rule transition-colors relative">
            <!-- BHS Column -->
            <div class="flex flex-col items-end">
              <div class="text-xs text-ink-soft font-bold mb-1 self-center md:self-end text-center md:text-right">{selectedBook} {selectedChapter}:{v} <span class="md:hidden">(BHS)</span></div>
              <div class="text-right text-2xl leading-snug" dir="rtl">
                {#if bhsChapterData[v]?.words}
                  {#each bhsChapterData[v].words as w}
                    <button type="button" class="font-hebrew cursor-pointer hover:bg-rule rounded focus:outline-none inline" onclick={(e) => { e.stopPropagation(); showWordInfo(w, bhsLexemes, 'bhs'); }}>{formatHebrew(w.word, hebrewMode)}</button>{w.trailer ?? ' '}
                  {/each}
                {:else}
                  <span class="font-hebrew">{formatHebrew(bhsChapterData[v]?.text || '', hebrewMode)}</span>
                {/if}
              </div>
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
        {/each}`;

const newEachOT = `        {#each verseKeys as v}
          {@const lxxInfo = selectedVersion === 'BHS' ? getLxxVerse(v) : {
             exists: !!lxxChapterData[v],
             omitted: !lxxChapterData[v],
             label: \`\${selectedBook} \${selectedChapter}:\${v}\`,
             isDivergent: false,
             verseData: lxxChapterData[v] || null
          }}
          {@const bhsInfo = selectedVersion === 'LXX' ? getBhsVerse(v) : {
             exists: !!bhsChapterData[v],
             omitted: !bhsChapterData[v],
             label: \`\${selectedBook} \${selectedChapter}:\${v}\`,
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
        {/each}`;

newContent = newContent.replace(eachOTMatch, newEachOT);

fs.writeFileSync('src/routes/+page.svelte', newContent);
console.log("Replaced successfully!");

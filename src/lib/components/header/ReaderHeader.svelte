<script lang="ts">

  import { resolve } from '$app/paths';
  import siteLogo from '$lib/assets/logo.png';
  import prayerWhiteSvg from '$lib/assets/prayer-white.svg';
  import prayerBlackSvg from '$lib/assets/prayer-black.svg';
  import prayerOutlineSvg from '$lib/assets/prayer-outline.svg';
  import VersionButton from '$lib/components/ui/VersionButton.svelte';
  import { versionGroups, formatVersionLabel,getVersionLanguage } from '$lib/config/versions';
  import { readerState } from '$lib/stores/readerState.svelte';
  //import gridIcon from '$env/static/public'
  import { expandRefs } from '$lib/utils/bible-utils';
  import GridButtonReactive from '../ui/grid-button-reactive.svelte';
  import Icon from '../ui/Icon.svelte';
  import { theme,size } from '$lib/stores/ThemeObserver.svelte';
  let displayedLanguages: string[]=$derived(Array.from(new Set(readerState.visibleVersions.map((v)=>getVersionLanguage(v)))));
  //$inspect('readerState.visibleVersions',readerState.visibleVersions);

  //$inspect('reader.showGridHeader', readerState.showGridHeader);
  $effect(()=>{
    if (readerState.meditationMode){
      readerState.gridHeaderExpanded=false;
    }
  })
</script>

<header id="site-header" 
class="sticky top-0 z-30 bg-page pt-1 pt-0 sm:pt-1 md:pt-4 mb-3 sm:mb-5 border-b border-rule pb-1 sm:pb-2 flex 
flex-wrap sm:flex-nowrap sm:flex-row justify-between items-center 
gap-2 sm:gap-4 -mx-3 px-1 sm:-mx-4 sm:px-4 md:-mx-8 md:px-3">


  
  <!-- top left of header: Logo/title, version, info-->
  <div class="float-left flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
    <a href={resolve('/')} class="" target="_blank"  >
    <img
      src={siteLogo}
      alt="Polyglot Bible Reader logo"
      class="w-8 h-8 sm:w-11 sm:h-11 {readerState.meditationMode ? '' :' md:w-14 md:h-14 lg:w-16 lg:h-16'} flex-shrink-0 object-contain rounded-full shadow-xs"
    /></a>
    {#if !readerState.meditationMode}
    <div class="min-w-0">
      <h1 class="text-sm min-[360px]:text-base min-[410px]:text-lg sm:text-2xl md:text-2xl lg:text-4xl font-bold tracking-tight inline-flex items-center flex-wrap gap-x-1 sm:gap-x-1.5">
        <span class="truncate sm:whitespace-normal hidden sm:inline">
          <span class="hidden md:inline">Polyglot</span> Bible Reader
        </span>
        
        <span class="{readerState.gridHeaderExpanded? '' : 'hidden'} sm:inline-flex items-center flex-shrink-0">
          <VersionButton />
        </span>
        <span class=" sm:inline-flex items-center flex-shrink-0">
          <a
            href="{resolve('/')}sources-and-licenses"
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
     {/if}
  </div>
 

      
    <!--Meditation Mode button!-->
  <div class="{readerState.meditationMode ? 'absolute left-1/2 -translate-x-1/2 -translate-y-1 sm:-translate-y-1':''}">
      <div class="relative ml-1">
      <label class="hidden {readerState.meditationMode? '': 'lg:block'} text-xs font-bold mb-1 text-center text-ink-soft" for="meditation-mode-button">Med.</label>
      <button
        id="meditation-mode-button"
        type="button"
        class=" h-[26px] min-w-[24px] sm:h-[32px] sm:min-w-[32px] px-1 sm:px-2 rounded border text-sm sm:text-md flex items-center justify-center cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-blue-500 
        {readerState.meditationMode
          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-xs font-bold'
          : 'bg-page text-ink-soft border-rule hover:bg-rule hover:text-ink font-normal'}"
        onclick={() => readerState.meditationMode =  !readerState.meditationMode}
        title={readerState.meditationMode
          ? 'Meditation Mode: On (click to disable)'
          : 'Meditation Mode: Off (click to enable)'}
        aria-label="Toggle Meditation Mode"
      >
        <Icon svg={readerState.meditationMode || theme.value == 'dark' ? prayerWhiteSvg :  prayerOutlineSvg } width={20} classes={[]}/>
      </button>
    </div>
  </div>

<!-- show book / chapter in meditation mode-->
{#if readerState.meditationMode}
<div class="absolute right-1"><h2 class="inline block text-md/1 sm:text-lg/1 leading-0 font-bold ">{readerState.selectedBook} {readerState.selectedChapter}</h2>
  {#if size.current!='base'} <br class="leading-0"/><span class="text-xs leading-0">({readerState.visibleVersions.join('/') })</span>{/if}
</div>
{/if}
  <!-- Right side: diacritics, version, book, chapter, and verse buttson-->
  <div id="header-book-chapter-verse-selector" class="{readerState.meditationMode ? '':'flex gap-1'} sm:gap-2.5 bg-page p-1 sm:p-2.5  rounded shadow-xs sm:shadow items-center flex-shrink-0 break-all" onclick={(e) => e.stopPropagation()}>
    

    {#if !readerState.meditationMode}
    <!-- Diacritic Controls -->
     <div class="sm:flex flex-row flex-nowrap sm:relative {readerState.showGridHeader ? 'flex' : 'hidden'} ">
     
    
      {#if displayedLanguages.includes("Hebrew")}
      <div class="{readerState.visibleVersions.includes("BHS") ? 'relative' : 'hidden'}">
        <label class="hidden lg:block text-xs font-bold mb-1 text-center text-ink-soft" for="hebrew-diacritics">Heb</label>
        <button
          id="hebrew-diacritics"
          type="button"
          class="font-hebrew h-[26px] min-w-[28px] sm:h-[38px] sm:min-w-[38px] px-1 sm:px-2 rounded border text-sm sm:text-lg flex items-center justify-center cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-blue-500 {readerState.hebrewMode === 'all'
            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-xs font-bold'
            : readerState.hebrewMode === 'vowels'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-400 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-900 shadow-xs font-semibold'
              : 'bg-page text-ink-soft border-rule hover:bg-rule hover:text-ink font-normal'}"
          onclick={() => readerState.cycleHebrewMode()}
          title={readerState.hebrewMode === 'all'
            ? 'Hebrew: Vowels + Cantillation (click for vowels only)'
            : readerState.hebrewMode === 'vowels'
              ? 'Hebrew: Vowels only (click for consonants only)'
              : 'Hebrew: Consonants only (click for all markings)'}
          aria-label="Toggle Hebrew diacritics"
        >
          <span>{readerState.hebrewMode === 'all' ? 'אֶ֔' : readerState.hebrewMode === 'vowels' ? 'אָ' : 'א'}</span>
        </button>
      </div>
      {/if}
    

      {#if displayedLanguages.includes("Greek")}
      <div class="relative ml-1">
        <label class="hidden lg:block text-xs font-bold mb-1 text-center text-ink-soft" for="greek-diacritics">Grk</label>
        <button
          id="greek-diacritics"
          type="button"
          class="font-greek h-[26px] min-w-[28px] sm:h-[38px] sm:min-w-[38px] px-1 sm:px-2 rounded border text-sm sm:text-lg flex items-center justify-center cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-blue-500 {readerState.greekDiacritics
            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-xs font-bold'
            : 'bg-page text-ink-soft border-rule hover:bg-rule hover:text-ink font-normal'}"
          onclick={() => readerState.toggleGreekDiacritics()}
          title={readerState.greekDiacritics
            ? 'Greek diacritics: On (click to disable)'
            : 'Greek diacritics: Off (click to enable)'}
          aria-label="Toggle Greek diacritics"
        >
          <span>{readerState.greekDiacritics ? 'ἀ' : 'α'}</span>
        </button>
      </div>
      {/if}
      {#if displayedLanguages.includes("Hebrew") ||displayedLanguages.includes("Greek") }
        <div class="relativeh-6 sm:h-8 w-px bg-rule mx-0.5 sm:mx-1 self-end mb-1 hidden sm:inline"></div>
      {/if}
      </div>
    
    
    <!-- Version Dropdown -->
    <div class="relative">
      <label class="hidden  text-sm font-bold mb-1 lg:block">Version</label>
      <button 
        aria-label="Select version"
        class="border border-rule rounded p-1 sm:p-2 w-16 sm:w-20 md:w-24 text-xs sm:text-sm text-left bg-page flex justify-between items-center shadow-xs sm:shadow-sm cursor-pointer"
        onclick={(e) => {  e.stopPropagation(); const prev = readerState.versionDropdownOpen; readerState.closeAllPopups(); readerState.versionDropdownOpen = !prev; }}
      >
        <span class="truncate">{readerState.selectedVersion}</span>
        {#if readerState.isLoading}
          <span class="w-3 h-3 border-2 border-link border-t-transparent rounded-full animate-spin ml-0.5 shrink-0" aria-label="Loading"></span>
        {:else}
          <span class="text-[10px] sm:text-xs text-ink-soft ml-0.5">▼</span>
        {/if}
      </button>
      
      {#if readerState.versionDropdownOpen}
        <button 
          type="button" 
          class="fixed inset-0 z-40 cursor-default bg-transparent border-0 p-0 m-0 w-full h-full" 
          onclick={() => readerState.versionDropdownOpen = false} 
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
                class="w-full text-left px-3 py-1.5 text-xs sm:text-sm hover:bg-rule flex items-center justify-between cursor-pointer {v === readerState.selectedVersion ? 'bg-blue-500 text-white hover:bg-blue-600 font-semibold' : 'text-ink'}"
                onclick={() => readerState.selectVersion(v)}
                title={formatVersionLabel(v)}
              >
                <span>{v}</span>
                {#if v === readerState.selectedVersion}
                  <span class="text-xs">✓</span>
                {/if}
              </button>
            {/each}
          {/each}
        </div>
      {/if}
    </div>

    <!-- Book Selector Button & Modal -->
    <div class="relative">
      <label class="hidden lg:block text-sm font-bold mb-1">Book</label>
      <button 
        aria-label="Select book"
        class="border border-rule rounded p-1 sm:p-2 w-[4.5rem] sm:w-28 lg:w-32 text-xs sm:text-sm text-left bg-page flex justify-between items-center shadow-xs sm:shadow-sm cursor-pointer"
        onclick={(e) => { e.stopPropagation(); const prev = readerState.bookDropdownOpen; readerState.closeAllPopups(); readerState.bookDropdownOpen = !prev; }}
      >
        <span class="truncate">{readerState.selectedBook}</span>
        <span class="text-[10px] sm:text-xs text-ink-soft ml-0.5">▼</span>
      </button>
      
      {#if readerState.bookDropdownOpen}
        <div class="fixed inset-0 bg-black/20 z-40 flex items-center justify-center p-4" onclick={() => readerState.bookDropdownOpen = false}>
          <div class="bg-page border border-rule rounded-lg shadow-xl p-4 z-50 max-h-[80vh] overflow-y-auto w-full max-w-3xl" onclick={(e) => e.stopPropagation()}>
            <h3 class="font-bold mb-4 text-lg border-b border-rule pb-2">Available Books ({readerState.selectedVersion})</h3>
            <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
              {#each readerState.availableBooks as book}
                <button 
                  class="p-2 text-center text-sm rounded hover:bg-rule cursor-pointer {book === readerState.selectedBook ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-page border'}"
                  onclick={() => readerState.selectBook(book)}
                >
                  {book}
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Chapter Selector Button & Modal -->
    <div class="relative">
      <label class="hidden lg:block text-sm font-bold mb-1" for="chapter">Chapter</label>
      <button 
        id="chapter"
        aria-label="Select chapter"
        class="border border-rule rounded p-1 sm:p-2 w-12 sm:w-15 lg:w-20 text-xs sm:text-sm text-left bg-page flex justify-between items-center shadow-xs sm:shadow-sm cursor-pointer"
        onclick={(e) => { e.stopPropagation(); const prev = readerState.chapterDropdownOpen; readerState.closeAllPopups(); readerState.chapterDropdownOpen = !prev; }}
      >
        <span class="truncate">{readerState.selectedChapter}</span>
        <span class="text-[10px] sm:text-xs text-ink-soft ml-0.5">▼</span>
      </button>
      
      {#if readerState.chapterDropdownOpen}
        <div class="fixed inset-0 bg-black/20 z-40 flex items-center justify-center p-4" onclick={() => readerState.chapterDropdownOpen = false}>
          <div class="bg-page border border-rule rounded-lg shadow-xl p-4 z-50 max-h-[80vh] overflow-y-auto w-full max-w-lg" onclick={(e) => e.stopPropagation()}>
            <h3 class="font-bold mb-4 text-lg border-b border-rule pb-2">{readerState.selectedBook} - Select Chapter</h3>
            <div class="grid grid-cols-5 md:grid-cols-8 gap-2">
              {#each readerState.availableChapters as ch}
                <button 
                  class="p-2 text-center rounded hover:bg-rule cursor-pointer {String(ch) === String(readerState.selectedChapter) ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-page border'}"
                  onclick={() => readerState.selectChapter(String(ch))}
                >
                  {ch}
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Verse Selector Button & Modal (Desktop) -->
    <div class="relative hidden sm:block">
      <label class="hidden lg:block text-sm font-bold mb-1" for="verse">Verse</label>
      <button 
        id="verse"
        aria-label="Select verse"
        class="border border-rule rounded p-1 sm:p-2 w-6 sm:w-12  text-xs sm:text-sm text-left bg-page flex justify-between items-center shadow-xs sm:shadow-sm cursor-pointer"
        onclick={(e) => { e.stopPropagation(); const prev = readerState.verseDropdownOpen; readerState.closeAllPopups(); readerState.verseDropdownOpen = !prev; }}
      >
        <span class="truncate">v.</span>
        <span class="text-[10px] sm:text-xs text-ink-soft ml-0.5">▼</span>
      </button>
      
      {#if readerState.verseDropdownOpen}
        <div class="fixed inset-0 bg-black/20 z-40 flex items-center justify-center p-4" onclick={() => readerState.verseDropdownOpen = false}>
          <div class="bg-page border border-rule rounded-lg shadow-xl p-4 z-50 max-h-[80vh] overflow-y-auto w-full max-w-lg" onclick={(e) => e.stopPropagation()}>
            <h3 class="font-bold mb-4 text-lg border-b border-rule pb-2">{readerState.selectedBook} {readerState.selectedChapter} - Select Verse</h3>
            <div class="grid grid-cols-5 md:grid-cols-8 gap-2">
              {#each readerState.verseKeys as v}
                <button 
                  class="p-2 text-center rounded hover:bg-rule bg-page border cursor-pointer"
                  onclick={() => { readerState.scrollToVerse(v); readerState.verseDropdownOpen = false; }}
                >
                  {v}
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>
    {/if}
  </div>
  
  <!-- Expand header button-->
   
  <button
    type="button"
    class="absolute left-1/2 -translate-x-1/2 {readerState.showGridHeader ? '-bottom-6' :'-bottom-3'} z-40 
    flex items-center justify-center w-6 h-6 bg-page border border-rule rounded-full 
     font-bold hover:text-ink text-gray-500  transition-colors hover:cursor-pointer "
    onclick={(e) => { /*e.stopPropagation();*/ readerState.gridHeaderExpanded = !readerState.gridHeaderExpanded; }}
    title={readerState.showGridHeader ? "Collapse Layout Options" : "Expand Layout Options"}
    aria-label={readerState.showGridHeader ? "Collapse Layout Options" : "Expand Layout Options"}
  >
  
    {#if readerState.gridHeaderExpanded}<span class="text-xl">▲</span>{:else }<GridButtonReactive />{/if}
  </button>
  
</header>

<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import VerseNavPill from '$lib/components/ui/VerseNavPill.svelte';
  import ReaderHeader from '$lib/components/header/ReaderHeader.svelte';
  import GridHeader from '$lib/components/grid/GridHeader.svelte';
  import VerseCard from '$lib/components/grid/VerseCard.svelte';
  import LemmaModal from '$lib/components/lexicon/LemmaModal.svelte';
  import { readerState } from '$lib/stores/readerState.svelte';
  import { myDataSets } from '$lib/bookMapping';
  /** @type {import('./$types').PageProps} */
	
  import { page } from '$app/state';
  import { mylog } from '$lib/lemma-ui/env/env';

  
  onMount(async () => {
    readerState.initStaticData();
    const myParams = {
      version:page.url.searchParams.get('version'),
      book:page.url.searchParams.get('book'),
      chapter:page.url.searchParams.get('chapter'),
      verse:page.url.searchParams.get('verse')
    };
 
    
    /*const version = page.url.searchParams.get('version') && myDataSets.lookup(page.params.version) ? page.params.version : 'BHS';
    const book = page.params?.book ? page.params.book : '';
    const chapter = page.params?.chapter ? page.params.chapter : '';
    const verse = page.params?.verse ? page.params.verse : '';*/

//    mylog(`page onMount params: ${Object.values(myParams).join(',')}`, true);
    readerState.closeAllPopups();
    if (myParams.book) readerState.selectBook(myParams.book);
    if (myParams.chapter) readerState.selectChapter(myParams.chapter);
    readerState.loadCurrentChapter().then(()=>{
      if (myParams.verse) {
              readerState.scrollToVerse(myParams.verse);
          
      }
    });
    
  });

  function reloadChapter(){
    
    
    
  };
  $inspect('params: ', page.params);
</script>
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (because of reasons) -->
<div
  class="min-h-screen bg-page text-ink font-sans p-3 sm:p-4 md:p-8 pt-0 sm:pt-0 md:pt-0"
  onclick={() => readerState.closeAllPopups()}
>
  <ReaderHeader />

  <main>

    {#key readerState.selectedBook &&  readerState.selectedChapter && readerState.activeVersions }
    <GridHeader/>
   

    <!-- Dynamic Grid Verse Cards -->
    <div class="flex flex-col gap-5 max-w-full mx-auto">
      {#if readerState.isLoading }
       <span class="inline self-center w-8 h-8 border-4 border-link border-t-transparent rounded-full animate-spin m-3"></span>
        <p class="text-center text-ink-soft py-10">Loading Book and Chapter...</p>
      {:else}
      
        {#each readerState.verseKeys as v (v)}
          <VerseCard verseKey={v} />
        {/each}
      {/if}
    </div>
  {/key}
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
    
    <VerseNavPill verses={readerState.verseKeys} />
  </main>
</div>
{#if readerState.activeWord}
{#key  readerState }
<LemmaModal />
{/key}
{/if}

<style>
  @media (max-width: 639px) {
    :global(.verse-grid) {
      grid-template-columns: 1fr !important;
    }
  }
</style>

<script lang="ts">


import { resolve } from '$app/paths';
import VerseNavPill from '$lib/components/ui/VerseNavPill.svelte';
import ReaderHeader from '$lib/components/header/ReaderHeader.svelte';
import GridHeader from '$lib/components/grid/GridHeader.svelte';
import VerseCard from '$lib/components/grid/VerseCard.svelte';
import LemmaModal from '$lib/components/lexicon/LemmaModal.svelte';
import { readerState } from '$lib/stores/readerState.svelte';
import { myDataSets } from '$lib/config/versions';
import { page } from '$app/state';
import { mylog } from '$lib/lemma-ui/env/env';
import { onMount } from 'svelte';

    
let {
    version='',
    book='',
    chapter='',
    verse='',
    grid=[],
    meditate=''

} : {version: string, book: string,chapter: string, verse: string, grid: string[][], meditate:boolean} = $props();




onMount(()=>{    
    readerState.closeAllPopups();
    if(version){
        
        readerState.selectVersion(version, false);
        
    }
    if(grid.length){
        readerState.setDisplayGrid(grid);
//        mylog(`PolyglotReader, got/set grid array! [${grid.flat().join(',')}]`, true);
        if(!readerState.visibleVersions.includes(readerState.selectedVersion)){
            readerState.selectVersion(readerState.visibleVersions[0]);
        }
    }
        
            

    if (book) readerState.selectBook(book, false);
    if (chapter) readerState.selectChapter(chapter, false);
    
    readerState.loadCurrentChapter().then(()=>{
        if (verse) {
                readerState.scrollToVerse(verse);   
        }
    });
    if(meditate){
        readerState.meditationMode=true;
    }

});

function reloadChapter(){



};

const hotkeys={
    'm':()=>{readerState.meditationMode=!readerState.meditationMode}

};


	function onkeydown(event, ignoreCtrl = true) {
		//mylog(`SynHome onkeydown=${event}`,true);
		if ((!event.ctrlKey || !ignoreCtrl) && readerState.hotkeysEnabled) {
			const key = event.key;
			if (Object.keys(hotkeys).includes(key)) {
				hotkeys[key]();
			} 
		}
	}
$inspect('versions grid:', readerState.versionGrid);
//$inspect('params: ', page.params);
</script>

	
	
	<svelte:window {onkeydown} />
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (because of reasons) -->
<div id="polyglot-reader-container"
class="min-h-screen bg-page text-ink font-sans p-3 sm:p-4 md:p-8 pt-0 sm:pt-0 md:pt-0 {readerState.meditationMode ? 'meditate':''}"
onclick={() => readerState.closeAllPopups()}
>
<ReaderHeader />

<main>

{#key readerState.selectedBook &&  readerState.selectedChapter && readerState.activeVersions }
<GridHeader/>


<!-- Dynamic Grid Verse Cards -->
<div class="relative flex flex-col gap-1 max-w-full mx-auto {readerState.versionGrid[0].length==1 ?'lg:max-w-1/2':''}">
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
 {#if !readerState.meditationMode}
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
    <a href="{resolve("/")}sources-and-licenses" class="inline-flex items-center gap-2 border border-rule px-4 py-2 rounded text-sm font-medium hover:bg-rule transition-colors">
        <span>View Full Sources &amp; Licensing Framework</span>
        <span aria-hidden="true">&rarr;</span>
    </a>
    </div>
</div>

<VerseNavPill verses={readerState.verseKeys} />
{/if}
</main>
</div>
{#if readerState.activeWord}
{#key  readerState }
<LemmaModal />
{/key}
{/if}

<style>
@reference 'tailwindcss';
@media (max-width: 639px) {
:global(div.verse-card:not(.meditate) .verse-grid)  {
    grid-template-columns: 1fr !important;
}
}

#polyglot-reader-container.meditate{
    @apply sm:max-w-3/4 md:max-w-2/3 lg:max-w-1/2 text-center m-auto;
}
</style>

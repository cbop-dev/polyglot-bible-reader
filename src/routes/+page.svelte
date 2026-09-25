<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import VerseNavPill from '$lib/components/ui/VerseNavPill.svelte';
  import ReaderHeader from '$lib/components/header/ReaderHeader.svelte';
  import GridHeader from '$lib/components/grid/GridHeader.svelte';
  import VerseCard from '$lib/components/grid/VerseCard.svelte';
  import LemmaModal from '$lib/components/lexicon/LemmaModal.svelte';
  import { readerState } from '$lib/stores/readerState.svelte';

  onMount(() => {
    readerState.initStaticData();
  });

  $effect(() => {
    // Explicitly track book and versions to reactively reload when modified
    const book = readerState.selectedBook;
    const _versions = readerState.activeVersions;
    readerState.loadCurrentBooks();
  });
</script>

<div
  class="min-h-screen bg-page text-ink font-sans p-3 sm:p-4 md:p-8 pt-0 sm:pt-0 md:pt-0"
  onclick={() => readerState.closeAllPopups()}
>
  <ReaderHeader />

  <main>
    <GridHeader />

    <!-- Dynamic Grid Verse Cards -->
    <div class="flex flex-col gap-5 max-w-full mx-auto">
      {#if readerState.verseKeys.length === 0}
        <p class="text-center text-ink-soft py-10">Loading or chapter not found.</p>
      {/if}

      {#each readerState.verseKeys as v (v)}
        <VerseCard verseKey={v} />
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
    
    <VerseNavPill verses={readerState.verseKeys} />
  </main>
</div>

<LemmaModal />

<style>
  @media (max-width: 639px) {
    :global(.verse-grid) {
      grid-template-columns: 1fr !important;
    }
  }
</style>

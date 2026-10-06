<script lang="ts">
  import Modal2 from '$lib/lemma-ui/components/ui/Modal2.svelte';
  import LemmaInfo from '$lib/lemma-ui/components/LemmaInfo.svelte';
  import { readerState } from '$lib/stores/readerState.svelte';
</script>

<Modal2 bind:showModal={readerState.showLemmaModal} onclose={() => readerState.closeAllPopups()}>
  {#if readerState.activeWord}
    {#if !readerState.activeWord.isLoading}
      {#key (readerState.activeWord.lemma || readerState.activeWord.word) + '_' + readerState.activeWord.corpus}
        <LemmaInfo lemma={readerState.activeWord} />
      {/key}
    {:else}
      <div class="py-12 text-center text-ink-soft">
        <span class="inline-block w-8 h-8 border-4 border-link border-t-transparent rounded-full animate-spin"></span>
        <p class="mt-4 font-semibold">Loading linguistic data...</p>
      </div>
    {/if}
  {/if}
</Modal2>

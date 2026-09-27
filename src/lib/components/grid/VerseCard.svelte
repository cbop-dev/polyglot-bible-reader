<script lang="ts">
  import CopyText from '$lib/lemma-ui/components/ui/CopyText.svelte';
  import { readerState } from '$lib/stores/readerState.svelte';
  import { formatVerseText } from '$lib/services/bibleDataLoader';
  import { dataSets, myDataSets } from '$lib/bookMapping';
  let { verseKey }: { verseKey: string } = $props();
</script>

<div id="verse-{verseKey}" class="flex flex-col gap-4 bg-page p-4 sm:p-5 rounded-lg shadow-sm border border-rule transition-colors hover:shadow-md">
  {#each readerState.versionGrid as row, rIdx}
    {#if rIdx > 0}
      <div class="border-t border-rule/50 my-1"></div>
    {/if}
    <div class="grid gap-6 verse-grid" style="grid-template-columns: repeat({row.length > 0 ? row.length : 1}, minmax(0, 1fr))">
      {#each row as colVersion, cIdx}
        {@const align = readerState.getCellAlign(rIdx, cIdx)}
        {@const vData = readerState.getVerseData(verseKey, colVersion)}
        {@const unformattedVerseText = vData?.omitted
          ? ''
          : (vData?.verseData?.words?.length
              ? vData.verseData.words.reduce((acc: string, w: any) => acc + w.word + (w.trailer ?? ' '), '')
              : (vData?.verseData?.text || ''))}
        {@const formattedVerseText = formatVerseText(
          unformattedVerseText,
          colVersion,
          readerState.hebrewMode,
          readerState.greekDiacritics
        )}

        <div class="flex flex-col {cIdx !== 0 ? 'border-t border-rule/40 pt-3.5 sm:border-0 sm:pt-0' : ''} {align === 'right' ? 'items-end text-right' : 'items-start text-left'}">
          <div class="text-xs font-bold mb-1.5 flex items-center gap-1.5 {align === 'right' ? 'self-end text-right' : 'self-start text-left'} {vData?.isDivergent ? 'text-amber-600 dark:text-amber-400' : 'text-ink-soft'}">
            <span>{vData?.label}</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] bg-rule/50 font-medium">({colVersion})</span>
          </div>
          <div class="{colVersion === 'BHS' ? 'text-2xl' : 'text-xl'} {align === 'right' ? 'text-right' : 'text-left'} leading-snug w-full" dir={colVersion === 'BHS' ? 'rtl' : 'ltr'}>
            {#if vData?.omitted}
              <span class="text-sm italic text-ink-soft font-sans" dir="ltr">[Not found in this version.]</span>
            {:else if vData?.verseData?.words}
              {#each vData.verseData.words as w}
                {#if !myDataSets.lookup(colVersion)?.lemmaInfoEnabled}
                  {@const text = w.word}
                  <span class="bible-font inline">{text}{w.trailer ?? ' '}</span>
                {:else}
                  {@const text = formatVerseText(w.word, colVersion, readerState.hebrewMode, readerState.greekDiacritics)}
                  <button
                    type="button"
                    class="{colVersion === 'BHS' ? 'font-hebrew' : colVersion === 'Vulgate' ? 'font-sans' : 'font-greek'} cursor-pointer hover:bg-rule rounded focus:outline-none inline"
                    onclick={(e) => { e.stopPropagation(); readerState.inspectWord(w, colVersion); }}
                  >{text}</button>{w.trailer ?? ' '}
                {/if}
              {/each}
            {:else if vData?.verseData?.text}
              {@const text = formatVerseText(vData.verseData.text, colVersion, readerState.hebrewMode, readerState.greekDiacritics)}
              <span class="{colVersion === 'BHS' ? 'font-hebrew' : colVersion === 'Vulgate' || colVersion === 'WEB' ? 'font-sans' : 'font-greek'}">
                {text}
              </span>
            {:else}
              <span class="text-sm italic text-ink-soft font-sans">[Verse text not available]</span>
            {/if}
            {#if vData?.verseData?.text}
              <span dir="ltr"><CopyText linkText="" copyText={formattedVerseText} /></span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/each}
</div>
<style>
  
</style>
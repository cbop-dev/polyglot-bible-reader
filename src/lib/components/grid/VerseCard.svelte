<script lang="ts">
  import CopyText from '$lib/lemma-ui/components/ui/CopyText.svelte';
  import { readerState } from '$lib/stores/readerState.svelte';
  import { formatVerseText } from '$lib/services/bibleDataLoader';
  import { dataSets, myDataSets } from '$lib/bookMapping';
  import { size,theme } from '$lib/stores/ThemeObserver.svelte';
  import { findTopmostDiv } from '$lib/utils/ui-utils';
  import Icon from '../ui/Icon.svelte';
  import shareSvg from '$lib/assets/share-this.svg';
  import linkSvg from '$lib/assets/link-336.svg';
    import { get } from 'svelte/store';
  let { verseKey }: { verseKey: string } = $props();
  function getTopMostVerse():string{
    const topDiv = findTopmostDiv(".verse-card");
    let verse = "1";
    if (topDiv && topDiv.id){
        const idNum = topDiv.id.replace("verse-","");
        if (typeof Number(idNum)==='number')
          verse = String(idNum);
    }
    return verse;
  }

  function getURL(verse="1"){
    return readerState.generatePageStateURL(verse);
  }
</script>

<div id="verse-{verseKey}" class="relative verse-card bg-page border-rule border-t-rule border-t-2 border-b-rule border-b-2 text-xs ">
  <div class="absolute right-1 top-1"><CopyText svgIcon={linkSvg} height={20}
  tooltip="Copy URL to share this page!"
  btnCssClass={(theme.value=='dark' ? 'bg-white/40 hover:bg-white': 'bg-gray-500/30 hover:bg-blue-500/30')+" "} 
  
  getTextFunc={()=>{return getURL(verseKey)}} /></div>
  {#each readerState.versionGrid as row, rIdx}
    {#if rIdx > 0}
     <hr class="verse-separator-hr"/>
    {/if}
    
    <div class="grid gap-6 verse-grid {rIdx>0 && false ? 'border-t-1 border-rule' :''}"
    style="grid-template-columns: repeat({row.length > 0 ? row.length : 1}, minmax(0, 1fr))"
    >
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

        <div class="flex flex-col px-1.5 pt-1  {align === 'right' ? 'items-end text-right' : 'items-start text-left'} 
        {row.length > 1 && size.current !='base' ? (align=='right' && cIdx==0)  ?'pr-0': cIdx==row.length-1 ? 'pl-0': '': ''} ">
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
  @reference 'tailwindcss';
  
  :root[data-theme='dark'] .verse-card {
       --tw-shadow-color: rgba(255,255,255, 40%);
  }

    :root[data-theme='light'] .verse-card {
       --tw-shadow-color: rgba(0,0,0, 40%);
  }
  .verse-card{
    /*--tw-shadow-color: blue; /*rgba(blue, 100%);*/
    @apply flex flex-col gap-4  pb-1 pt-2  sm:pt-3 rounded-lg shadow-[3px_3px_5px]  transition-colors hover:drop-shadow-2xl ;
  }

  .verse-separator-hr {
    
    
    border-color: color-mix(in srgb, var(--color-ink-soft) 20%, transparent 50%);
    
    @apply w-2/3  m-auto;
  }

  .verse-grid span{
    font-family: 'Ezra SIL', 'Charis SIL', "Gentium Plus", serif;
  }
</style>
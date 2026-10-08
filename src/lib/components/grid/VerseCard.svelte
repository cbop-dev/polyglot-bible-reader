<script lang="ts">
  import CopyText from '$lib/lemma-ui/components/ui/CopyText.svelte';
  import { readerState } from '$lib/stores/readerState.svelte';
  import { formatVerseText } from '$lib/services/bibleDataLoader';
  import { dataSets, getCorrectVersionName, myDataSets } from '$lib/config/versions';
  import { size,theme } from '$lib/stores/ThemeObserver.svelte';
  import { findTopmostDiv } from '$lib/utils/ui-utils';
  import Icon from '../ui/Icon.svelte';
  import shareSvg from '$lib/assets/share-this.svg';
  import linkSvg from '$lib/assets/link-336.svg';
  import LinkIcon from '$lib/lemma-ui/components/ui/icons/LinkIcon.svelte';
    import { get } from 'svelte/store';
    import { read } from '$app/server';
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
  function getLangFontClass(lang=''){
      const theDefault = 'font-latin';
      if (lang === 'Hebrew')
         return 'font-hebrew';
      else if (lang === 'Latin')
         return 'font-latin';
      else if (lang=== 'Greek')
         return 'font-greek';
      else if (lang==='English')
        return 'font-english';
      else
        return theDefault;
  }
</script>

<div id="verse-{verseKey}" class="relative verse-card bg-page text-xs 
{readerState.meditationMode ? 'meditate':'border-rule border-t-rule border-t-2 border-b-rule border-b-2'}">
  
  {#each readerState.versionGrid as row, rIdx}
    {#if rIdx > 0}
     <hr class="verse-separator-hr"/>
    {/if}
    
    <div class="grid sm:gap-6 verse-grid "
    style="grid-template-columns: repeat({row.length > 0  ? (size.current != 'base' ? row.length: Math.min(row.length,2)) : 1}, minmax(0, 1fr))"
    >
      {#each row as colVersion, cIdx}
        {@const theVersion=myDataSets.lookup(getCorrectVersionName(colVersion) ?? '')}
        {@const lang=theVersion?.language}
        {@const langClass=getLangFontClass(lang)}
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
        {#if true || !readerState.meditationMode}
        <div class="flex flex-col px-1.5 pt-1  {align === 'right' ? 'items-end text-right' : 'items-start text-left'} 
        {row.length > 1 && size.current !='base' ? (align=='right' && cIdx==0)  ?'pr-0': cIdx==row.length-1 ? 'pl-0': '': ''} ">
          
          {#if !readerState.meditationMode}
          <div class="text-xs font-bold mb-1.5 flex items-center gap-1.5 {align === 'right' ? 'self-end text-right' : 'self-start text-left'} 
          {vData?.isDivergent ? 'text-amber-600 dark:text-amber-400' : 'text-ink-soft'}">
            <span>{vData?.label}</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] bg-rule/50 font-medium">({colVersion})</span>
            <CopyText  height={10}
  tooltip="Copy URL sharing/bookmarking this verse and view"
  btnCssClass={(theme.value=='dark' ? 'bg-white/10 hover:bg-white/60': 'bg-gray-500/10 hover:bg-blue-500/30')+" "} 
  getTextFunc={()=>{return getURL(verseKey)}}>
  <LinkIcon --strokecolor={theme.value=='dark'?'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} height={8} width={10} /></CopyText>
          </div>
          {/if}
          <div class="{colVersion === 'BHS' ? 'text-2xl' : 'text-xl'} {align === 'right' ? 'text-right' : 'text-left'} leading-snug w-full" dir={colVersion === 'BHS' ? 'rtl' : 'ltr'}>
            {#if vData?.omitted}
              <span class="text-sm italic text-ink-soft font-sans" dir="ltr">[Not found in this version.]</span>
            {:else if vData?.verseData?.words || vData?.verseData?.text}
              {#if readerState.meditationMode}<CopyText tooltip={"Copy URL sharing/bookmarking this verse and view"} btnCssClass={'align-super'} btnSizeCssClass='' showButton={false} supressCopiedMsg={true} copyText={readerState.generatePageStateURL(verseKey)}><span class="text-xs font-greek">{verseKey} </span></CopyText>{/if}
              {#if vData?.verseData?.words}
                {#each vData.verseData.words as w,wIdx}{#if w.indent}<br />
                    <span class="inline-block pl-5" aria-hidden="true"></span>{/if}{#if !myDataSets.lookup(colVersion)?.lemmaInfoEnabled}{@const text = w.word}<span class="bible-font inline">{text}{w.trailer ?? ''}</span>{:else}{@const text = formatVerseText(w.word, colVersion, readerState.hebrewMode, readerState.greekDiacritics)}<span aria-label="Lexeme info" 
                      class="{langClass} 
                      {readerState.meditationMode? '': 'cursor-pointer hover:bg-rule'} rounded focus:outline-none inline"
                      onclick={(e) => { if (!readerState.meditationMode) {e.stopPropagation(); readerState.inspectWord(w, colVersion);} }}
                    >{text}</span>{#if (w.trailer ?? ' ')}{w.trailer ?? ' '}{/if}{/if}{#if w.para_break}<span class="block mt-2"></span>{/if}{/each}{:else if vData?.verseData?.text}
                {@const text = formatVerseText(vData.verseData.text, colVersion, readerState.hebrewMode, readerState.greekDiacritics)}
                <span class="{langClass} whitespace-pre-line">
                  {text}
                </span>
            {/if}
            {:else}
              <span class="text-sm italic text-ink-soft font-sans">[Verse text not available]</span>
            {/if}
            {#if !readerState.meditationMode}
            {#if vData?.verseData?.text}
              <span dir="ltr"><CopyText linkText="" copyText={formattedVerseText} /> </span>
            {/if}
            {/if}
          </div>
        </div>
      {:else}
        
      {/if}
      {/each}
    </div>
  {/each}
</div>
<style>
  @reference 'tailwindcss';
  
  :root[data-theme='dark'] .verse-card {
       --tw-shadow-color: rgba(255,255,255, 30%);
  }

    :root[data-theme='light'] .verse-card {
       --tw-shadow-color: rgba(0,0,0, 30%);
  }
  .verse-card:not(.meditate){
    /*--tw-shadow-color: blue; /*rgba(blue, 100%);*/
    @apply flex flex-col gap-4  pb-1 pt-2  sm:pt-3 rounded-lg shadow-[2px_2px_3px]  transition-colors hover:drop-shadow-xl ;
  }

   .verse-card.meditate{
    
    
  }

  .verse-card.meditate .verse-separator-hr {
    display:none;
  }

   .verse-separator-hr {
    
    
    border-color: color-mix(in srgb, var(--color-ink-soft) 20%, transparent 50%);
    
    @apply w-2/3  m-auto;
  }

  .verse-grid:not(.meditate){

  }
 .verse-card.meditate{
      @apply pb-1;
      border-bottom: 1px solid color-mix(in srgb, var(--color-ink-soft, 'black') 30%, transparent 50%);

    }
  .verse-grid span{
    /*font-family: 'Ezra SIL', 'Charis SIL', "Gentium Plus", serif;*/
  }
 
  .verse-grid{
    @apply text-xl;
  }
</style>
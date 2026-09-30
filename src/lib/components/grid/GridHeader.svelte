<script lang="ts">
  import { versionGroups, formatVersionLabel } from '$lib/config/versions';
  import { readerState } from '$lib/stores/readerState.svelte';
    import { onMount } from 'svelte';
    import { size } from '$lib/stores/ThemeObserver.svelte';
  onMount(()=>{readerState.loadCurrentChapter()});
</script>
{#snippet notBase(text:string)}
{#if size.current!='base'}
{text}
{/if}
{/snippet}

<div id="grid-header"
class="{readerState.gridHeaderExpanded ? 'flex pt-5' : 'hidden pt-2'} flex-col gap-2 mb-4 sticky top-10 sm:top-20 md:top-25 lg:top-27
pb-2.5 border-b border-rule z-20 shadow-xs">
  <div class="flex items-center justify-between px-4 sm:px-5 text-xs font-semibold text-ink-soft">
    <span class="flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-link inline-block"></span>
      {@render notBase('Verse Grid ')}Layout: <strong class="text-ink">{readerState.versionGrid.length} 
        {size.current != 'base' ? (readerState.versionGrid.length === 1 ? ('Row') : ('Rows')): ''} × 
        {readerState.versionGrid[0]?.length || 0} {size.current!='base' ? (readerState.versionGrid[0]?.length === 1 ? 'Col' : 'Cols') : '' }</strong>
    </span>
    <div class="flex items-center gap-2">
      <button 
        type="button"
        class="px-2.5 py-1 rounded border border-rule hover:bg-rule active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-medium text-ink transition-transform"
        onclick={() => readerState.addColumn()}
        title="Add a parallel column"
      >
        <span class="font-bold">+</span>{@render notBase('Add')} Col{@render notBase('umn')}
      </button>
      <button 
        type="button"
        class="px-2.5 py-1 rounded border border-rule hover:bg-rule active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-medium text-ink transition-transform"
        onclick={() => readerState.addRow()}
        title="Add a parallel row"
      >
        <span class="font-bold">+</span>{@render notBase('Add')} Row
      </button>
    </div>
  </div>

  {#if readerState.versionGrid[0].length > 1}
    {@const row1 = readerState.versionGrid[0]}
     <div class="grid gap-6" style="grid-template-columns: repeat({row1.length > 0 ? (size.current == 'base' ? 3 : row1.length) : 1}, minmax(0, 1fr))">
        {#each row1 as colVersion, cIdx}
        <div class="relative flex gap-0">
              <button 
                type="button"
                class="text-ink-soft self-center center text-center
                 hover:text-red-500 text-xs group-hover:opacity-100 
                 transition-opacity m-auto p-0.5 rounded hover:bg-red-50 my-0 dark:hover:bg-red-950/30"
                onclick={() => readerState.removeColumn(cIdx)}
                title="Remove column {cIdx + 1}"
                aria-label="Remove column {cIdx + 1}"
              >✕<span class="hidden sm:inline">&nbsp; Remove </span>  Col<span class="hidden sm:inline">umn</span> {cIdx+1}</button>
            </div>
        {/each}
     </div>     
        {/if}
  {#each readerState.versionGrid as row, rIdx}
    <div class="px-4 sm:px-5 border-x border-transparent">
      {#if readerState.versionGrid.length > 1}
      
        <div class="flex items-center justify-between text-[11px] font-semibold text-ink-soft mb-1 px-0.5">
        
          <span>Row {rIdx + 1}</span>
          <button 
            type="button"
            class="text-ink-soft hover:text-red-500 text-xs cursor-pointer flex items-center gap-1 hover:underline font-normal"
            onclick={() => readerState.removeRow(rIdx)}
            title="Remove row {rIdx + 1}"
            aria-label="Remove row {rIdx + 1}"
          >
            ✕<span class="hidden sm:inline"> Remove</span> Row {rIdx+1}
          </button>
        </div>
      {/if}
      <div class="grid gap-6 verse-grid" style="grid-template-columns: repeat({row.length > 0 ? row.length : 1}, minmax(0, 1fr))">
        
        {#each row as cellVersion, cIdx}
          {@const align = readerState.getCellAlign(rIdx, cIdx)}
          
          <div class="relative flex items-center justify-center gap-1.5 bg-page border border-rule/60 rounded-md px-3 py-1.5 
          group hover:border-link transition-colors shadow-xs">
           
            <select 
              class="font-bold text-sm bg-page text-ink cursor-pointer appearance-none text-center focus:outline-none text-ink truncate w-full min-w-0 truncate "
              value={cellVersion}
              onchange={(e) => readerState.updateCell(rIdx, cIdx, e.currentTarget.value)}
              aria-label="Select translation for Row {rIdx + 1}, Column {cIdx + 1}"
            >
              {#each versionGroups as group}
                <optgroup label={group.language} class="underline text-left">
                  {#each group.versions as opt}
                    <option class="text-left " value={opt}>{formatVersionLabel(opt, size.current=='base')}</option>
                  {/each}
                </optgroup>
              {/each}
            </select>
            <button
              type="button"
              class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all cursor-pointer shrink-0 shadow-2xs {align === 'right' ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-page text-ink-soft border-rule hover:bg-rule hover:text-ink'}"
              onclick={() => readerState.toggleCellAlign(rIdx, cIdx)}
              title="Text alignment: {align === 'right' ? 'Right-aligned' : 'Left-aligned'} (click to toggle)"
              aria-label="Toggle text alignment for Row {rIdx + 1}, Column {cIdx + 1}"
            >
              {align === 'right' ? 'R' : 'L'}
            </button>
            
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>
<style>


  :root[data-theme='light'] {
      --bgblend: black;
  }

  :root[data-theme='dark'] {
      --bgblend: white;
  }
   #grid-header{ 
    background-color: color-mix(in srgb, var(--bg-content, white) 90%, 
          color-mix(in srgb, var(--bgblend) 75%, transparent 20%) 10%); 
    box-shadow: 2px 2px 10px color-mix(in srgb, var(--bgblend) 30%, transparent 80%);
    
  }
  
  
</style>
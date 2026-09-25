<script lang="ts">
  import { versionGroups, formatVersionLabel } from '$lib/config/versions';
  import { readerState } from '$lib/stores/readerState.svelte';
</script>

<div class="{readerState.gridHeaderExpanded ? 'flex' : 'hidden'} sm:flex flex-col gap-2 mb-4 sticky top-[57px] sm:top-[77px] md:top-[105px] bg-page pt-2 pb-2.5 border-b border-rule z-20 shadow-xs">
  <div class="flex items-center justify-between px-4 sm:px-5 text-xs font-semibold text-ink-soft">
    <span class="flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-link inline-block"></span>
      Verse Grid Layout: <strong class="text-ink">{readerState.versionGrid.length} {readerState.versionGrid.length === 1 ? 'Row' : 'Rows'} × {readerState.versionGrid[0]?.length || 0} {readerState.versionGrid[0]?.length === 1 ? 'Col' : 'Cols'}</strong>
    </span>
    <div class="flex items-center gap-2">
      <button 
        type="button"
        class="px-2.5 py-1 rounded border border-rule hover:bg-rule active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-medium text-ink transition-transform"
        onclick={() => readerState.addColumn()}
        title="Add a parallel column"
      >
        <span class="font-bold">+</span> Add Column
      </button>
      <button 
        type="button"
        class="px-2.5 py-1 rounded border border-rule hover:bg-rule active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-medium text-ink transition-transform"
        onclick={() => readerState.addRow()}
        title="Add a parallel row"
      >
        <span class="font-bold">+</span> Add Row
      </button>
    </div>
  </div>

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
            ✕ Remove Row
          </button>
        </div>
      {/if}
      <div class="grid gap-6 verse-grid" style="grid-template-columns: repeat({row.length > 0 ? row.length : 1}, minmax(0, 1fr))">
        {#each row as cellVersion, cIdx}
          {@const align = readerState.getCellAlign(rIdx, cIdx)}
          <div class="relative flex items-center justify-center gap-1.5 bg-page border border-rule/60 rounded-md px-3 py-1.5 group hover:border-link transition-colors shadow-xs">
            <select 
              class="font-bold text-sm bg-transparent cursor-pointer appearance-none text-center focus:outline-none text-ink truncate"
              value={cellVersion}
              onchange={(e) => readerState.updateCell(rIdx, cIdx, e.currentTarget.value)}
              aria-label="Select translation for Row {rIdx + 1}, Column {cIdx + 1}"
            >
              {#each versionGroups as group}
                <optgroup label={group.language}>
                  {#each group.versions as opt}
                    <option value={opt}>{formatVersionLabel(opt)}</option>
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
            {#if rIdx === 0 && row.length > 1}
              <button 
                type="button"
                class="text-ink-soft hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity absolute right-1.5 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                onclick={() => readerState.removeColumn(cIdx)}
                title="Remove column {cIdx + 1}"
                aria-label="Remove column {cIdx + 1}"
              >✕</button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

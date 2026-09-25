<script>
  let {
    headings = ['Tab 1', 'Tab 2', 'Tab 3'],
    selectedTabIndex = $bindable(0),
    classes = ['']
  } = $props();

  function setTab(index) {
    selectedTabIndex = index;
  }
</script>

<div role="tablist" class="inline-flex items-center justify-center p-1 rounded-xl bg-rule/30 border border-rule/50 gap-1 {classes.join(' ')}">
  {#each headings as tab, index}
    <button
      type="button"
      role="tab"
      aria-selected={index === selectedTabIndex}
      class="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer {index === selectedTabIndex ? 'bg-page text-ink shadow-sm border border-rule/50' : 'text-ink-soft hover:text-ink hover:bg-rule/20'}"
      onclick={() => setTab(index)}
    >
      {tab}
    </button>
  {/each}
</div>

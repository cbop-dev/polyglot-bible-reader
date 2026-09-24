<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let {
    verses = []
  }: {
    verses?: string[];
  } = $props();

  let currentVerseIdx = $state(0);
  let activeVerseLabel = $state(verses[0] || '1');
  let dropdownOpen = $state(false);
  let isCollapsed = $state(true);

  let observer: IntersectionObserver | null = null;
  let pillContainerEl: HTMLElement | null = null;

  onMount(() => {
    setupObserver();

    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('polyglot-navpill-collapsed');
      if (saved === 'false') {
        isCollapsed = false;
      } else {
        isCollapsed = true;
      }
    }

    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownOpen && pillContainerEl && !pillContainerEl.contains(e.target as Node)) {
        dropdownOpen = false;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dropdownOpen) {
          dropdownOpen = false;
        }
      }
    };

    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  onDestroy(() => {
    if (observer) observer.disconnect();
  });

  $effect(() => {
    if (verses && verses.length > 0) {
      if (typeof window !== 'undefined') {
        setTimeout(() => setupObserver(), 100);
      }
    }
  });

  function setupObserver() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    if (observer) observer.disconnect();

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const verse = id.replace('verse-', '');
            const idx = verses.indexOf(verse);
            if (idx !== -1) {
              currentVerseIdx = idx;
              activeVerseLabel = verses[idx];
            }
          }
        }
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0.05 }
    );

    verses.forEach(v => {
      const el = document.getElementById(`verse-${v}`);
      if (el && observer) observer.observe(el);
    });
  }

  function scrollToVerse(idx: number) {
    if (idx < 0 || idx >= verses.length) return;
    currentVerseIdx = idx;
    dropdownOpen = false;
    const v = verses[idx];
    activeVerseLabel = v;
    const el = document.getElementById(`verse-${v}`);
    if (el) {
      const headerOffset = 150;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
         top: offsetPosition,
         behavior: "smooth"
      });
    }
  }

  function goFirst() { scrollToVerse(0); }
  function goPrev() { scrollToVerse(Math.max(0, currentVerseIdx - 1)); }
  function goNext() { scrollToVerse(Math.min(verses.length - 1, currentVerseIdx + 1)); }
  function goLast() { scrollToVerse(verses.length - 1); }

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
      dropdownOpen = false;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('polyglot-navpill-collapsed', String(isCollapsed));
    }
  }
</script>

{#if verses && verses.length > 0}
  <div
    class="nav-pill-container"
    class:collapsed={isCollapsed}
    bind:this={pillContainerEl}
    role="navigation"
    aria-label="Verse navigation"
  >
    {#if isCollapsed}
      <button
        type="button"
        class="pill-expand-btn"
        onclick={toggleCollapse}
        title="Show verse navigation bar"
        aria-label="Show verse navigation bar"
        aria-expanded="false"
      >
        <svg class="hamburger-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
          <line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
      </button>
    {:else}
      {#if dropdownOpen}
        <div class="verse-dropdown-popup" role="menu" aria-label="Select verse block">
          <div class="verse-popup-header">
            <span>Jump to Verse</span>
            <button type="button" class="popup-close-btn" onclick={() => (dropdownOpen = false)} aria-label="Close">✕</button>
          </div>
          <div class="verse-grid">
            {#each verses as v, vIdx (vIdx)}
              <button
                type="button"
                class="verse-item-btn"
                class:active={vIdx === currentVerseIdx}
                onclick={() => scrollToVerse(vIdx)}
                title={`Jump to Verse ${v}`}
              >
                v. {v}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <button
        type="button"
        class="pill-btn pill-toggle-btn"
        onclick={toggleCollapse}
        title="Hide verse navigation bar"
        aria-label="Hide verse navigation bar"
        aria-expanded="true"
      >
        <svg class="caret-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>

      <div class="pill-divider" aria-hidden="true"></div>

      <button
        class="pill-btn"
        onclick={goFirst}
        disabled={currentVerseIdx <= 0}
        title={`First Verse (v. ${verses[0] || '1'})`}
        aria-label="First Verse"
      >
        ⏮
      </button>

      <button
        class="pill-btn"
        onclick={goPrev}
        disabled={currentVerseIdx <= 0}
        title="Previous Verse"
        aria-label="Previous Verse"
      >
        ◀
      </button>

      <button
        type="button"
        class="pill-badge"
        onclick={() => (dropdownOpen = !dropdownOpen)}
        title={`Current Verse: v. ${activeVerseLabel}. Click to select verse.`}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
      >
        <span>v. {activeVerseLabel}</span><span class="pill-badge-arrow"> ▾</span>
      </button>

      <button
        class="pill-btn"
        onclick={goNext}
        disabled={currentVerseIdx >= verses.length - 1}
        title="Next Verse"
        aria-label="Next Verse"
      >
        ▶
      </button>

      <button
        class="pill-btn"
        onclick={goLast}
        disabled={currentVerseIdx >= verses.length - 1}
        title={`Last Verse (v. ${verses[verses.length - 1] || ''})`}
        aria-label="Last Verse"
      >
        ⏭
      </button>
    {/if}
  </div>
{/if}

<style>
  .nav-pill-container {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1200;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: var(--col-bg, #f5f6f2);
    border: 1px solid var(--border, #d4d8d3);
    border-radius: 30px;
    padding: 0.35rem 0.6rem;
    box-shadow: var(--popup-shadow, 0 8px 24px rgba(0, 0, 0, 0.2));
    backdrop-filter: blur(8px);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .nav-pill-container.collapsed {
    bottom: 0.85rem;
    left: 1rem;
    transform: translateX(0);
    padding: 0.2rem;
    border-radius: 50%;
    gap: 0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  }

  .pill-expand-btn {
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    font-size: 0.85rem;
    color: var(--accent, #1f6f7a);
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.15s ease;
  }

  .pill-expand-btn:hover {
    color: #ffffff;
    background: var(--accent, #1f6f7a);
  }

  .caret-icon,
  .hamburger-icon {
    display: block;
    pointer-events: none;
  }

  .pill-divider {
    width: 1px;
    height: 16px;
    background: var(--border, #d4d8d3);
    margin: 0 0.1rem;
  }

  .pill-toggle-btn {
    font-size: 0.7rem;
    line-height: 1;
  }

  .pill-btn {
    background: transparent;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    color: var(--text-mid, #545b5c);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pill-btn:hover:not(:disabled) {
    background: var(--accent, #1f6f7a);
    color: #ffffff;
  }

  .pill-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .pill-badge {
    font-family: var(--font-ui, system-ui, sans-serif);
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--accent, #1f6f7a);
    padding: 0.25rem 0.65rem;
    background: var(--page-bg, #eceee7);
    border: 1px solid var(--border, #d4d8d3);
    border-radius: 12px;
    min-width: 50px;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    justify-content: center;
    white-space: nowrap;
  }

  .pill-badge:hover {
    background: var(--accent, #1f6f7a);
    color: #ffffff;
    border-color: var(--accent, #1f6f7a);
  }

  @media (max-width: 600px) {
    .pill-badge-arrow {
      display: none;
    }
  }

  .verse-dropdown-popup {
    position: absolute;
    bottom: calc(100% + 0.6rem);
    left: 50%;
    transform: translateX(-50%);
    background: var(--col-bg, #f5f6f2);
    border: 1px solid var(--border, #d4d8d3);
    border-radius: 12px;
    padding: 0.6rem 0.75rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    width: 280px;
    max-width: 90vw;
    z-index: 1300;
  }

  .verse-popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-mid, #545b5c);
    padding-bottom: 0.4rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--border, #d4d8d3);
  }

  .popup-close-btn {
    background: none;
    border: none;
    font-size: 0.95rem;
    cursor: pointer;
    color: var(--text-mid, #545b5c);
    padding: 0 0.2rem;
  }

  .verse-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.4rem;
    max-height: 240px;
    overflow-y: auto;
    padding-right: 0.2rem;
  }

  .verse-item-btn {
    padding: 0.35rem 0.2rem;
    background: var(--page-bg, #eceee7);
    border: 1px solid var(--border, #d4d8d3);
    border-radius: 6px;
    font-family: var(--font-ui, system-ui, sans-serif);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-mid, #545b5c);
    cursor: pointer;
    text-align: center;
    transition: all 0.12s ease;
  }

  .verse-item-btn:hover {
    color: var(--accent, #1f6f7a);
    border-color: var(--accent, #1f6f7a);
  }

  .verse-item-btn.active {
    background: var(--accent, #1f6f7a);
    color: #ffffff;
    border-color: var(--accent, #1f6f7a);
  }
</style>

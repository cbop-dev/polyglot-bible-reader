<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  let { children, isOpen, onClose } = $props();
  
  let panelWidth = $state(400); // initial width
  let isDragging = false;

  function startDrag(e: MouseEvent) {
    isDragging = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }

  function doDrag(e: MouseEvent) {
    if (!isDragging) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 300 && newWidth < window.innerWidth - 100) {
      panelWidth = newWidth;
    }
  }

  function stopDrag() {
    isDragging = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }

  onMount(() => {
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
  });

  onDestroy(() => {
    window.removeEventListener('mousemove', doDrag);
    window.removeEventListener('mouseup', stopDrag);
  });
</script>

{#if isOpen}
  <!-- Overlay (optional, currently invisible but could block clicks if wanted, for now just allow background interaction) -->
  
  <!-- Panel -->
  <div 
    class="fixed top-0 right-0 h-full bg-page shadow-2xl border-l border-rule z-60 flex overflow-hidden animate-slide-in"
    style="width: {panelWidth}px;"
  >
    <!-- Resize Handle -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      class="w-2 cursor-ew-resize hover:bg-blue-500/50 bg-rule transition-colors h-full flex items-center justify-center"
      onmousedown={startDrag}
    >
      <div class="w-1 h-8 bg-ink/20 rounded"></div>
    </div>
    
    <!-- Content Area -->
    <div class="flex-1 h-full overflow-y-auto relative">
      <button 
        class="absolute top-4 right-4 text-ink-soft hover:text-ink z-10 p-2 bg-page/80 backdrop-blur rounded-full shadow-sm border border-rule" 
        onclick={onClose}
        aria-label="Close Panel"
      >
        ✕
      </button>
      
      <div class="p-6">
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  .animate-slide-in {
    animation: slideIn 0.2s ease-out forwards;
  }
</style>

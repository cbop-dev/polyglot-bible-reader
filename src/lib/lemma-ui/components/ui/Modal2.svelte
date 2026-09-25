<script>
let {
    showModal = $bindable(),
    title='',
    onclose=()=>{}, 
    children,
    max = $bindable(false)
} = $props();

// 1. Create a reference to the dialog element
let dialog;
let isMaximized = $state(false);

$effect(() => {
    isMaximized = Boolean(max);
});

function toggleMaximize() {
    isMaximized = !isMaximized;
    max = isMaximized;
}

// 2. React to showModal changes and use the native API
$effect(() => {
    if (dialog) {
        if (showModal && !dialog.open) {
            dialog.showModal();
        } else if (!showModal && dialog.open) {
            dialog.close();
        }
    }
});
</script>

<dialog 
    bind:this={dialog}
    onclose={() => { showModal = false; onclose(); }}
    oncancel={() => (showModal = false)}
    onclick={(e) => { if (e.target === dialog) showModal = false; }}
    class="custom-modal" 
>
    {#if showModal}
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
        <div 
            class="modal-box {isMaximized ? 'is-maximized' : ''}"
            onclick={(e) => e.stopPropagation()}
        >
            <div class="modal-header-actions absolute top-4 right-4 flex items-center gap-2 z-20">
                <!-- Maximize / Minimize Button -->
                <button
                    type="button"
                    class="modal-icon-btn w-8 h-8 rounded-full border border-rule text-ink shadow-xs transition-all flex items-center justify-center cursor-pointer"
                    onclick={(e) => { e.stopPropagation(); toggleMaximize(); }}
                    title={isMaximized ? "Restore window size" : "Maximize window"}
                    aria-label={isMaximized ? "Restore window size" : "Maximize window"}
                >
                    {#if isMaximized}
                        <!-- Minimize / Restore icon: inward arrows -->
                        <svg width="16" height="16" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="4 14 10 14 10 20" />
                            <polyline points="20 10 14 10 14 4" />
                            <line x1="14" y1="10" x2="21" y2="3" />
                            <line x1="10" y1="14" x2="3" y2="21" />
                        </svg>
                    {:else}
                        <!-- Maximize icon: outward arrows -->
                        <svg width="16" height="16" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="15 3 21 3 21 9" />
                            <polyline points="9 21 3 21 3 15" />
                            <line x1="21" y1="3" x2="14" y2="10" />
                            <line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                    {/if}
                </button>

                <!-- Close Button -->
                <button
                    type="button"
                    class="modal-icon-btn w-8 h-8 rounded-full border border-rule text-ink shadow-xs transition-all flex items-center justify-center cursor-pointer"
                    onclick={() => { showModal = false; }}
                    title="Close"
                    aria-label="Close"
                >
                    <svg width="16" height="16" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            <div class="block items-center text-center px-10">
                {#if title}
                    <h1 class="text-xl font-bold mb-2">{title}</h1>
                    <hr class="border-rule my-2 opacity-50" />
                {/if}
            </div>

            <div class="modal-body">
                {@render children()}
            </div>
            
            <div class="modal-footer border-t border-rule/50 mt-0.5 pt-0.5 sm:mt-2 sm:pt-2 text-center shrink-0">
                <button 
                    type="button" 
                    class="px-6 py-1.5 text-sm font-semibold rounded-lg bg-rule/40 hover:bg-rule border border-rule text-ink transition-colors cursor-pointer" 
                    onclick={() => { showModal = false; }}
                >
                    Close
                </button>
            </div>
        </div>
    {/if}
</dialog>

<style>
    @reference 'tailwindcss';
    dialog.custom-modal {
        display: none !important;
    }

    dialog.custom-modal[open] {
        display: flex !important;
        align-items: center;
        justify-content: center;
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        max-width: 100vw;
        max-height: 100vh;
        margin: 0;
        padding: 0;
        background-color: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        border: 0;
        outline: none;
        z-index: 9999;
    }

    dialog.custom-modal::backdrop {
        background-color: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
    }

    .modal-box {
        position: relative;
        background-color: var(--color-page, #ffffff);
        color: var(--color-ink, #000000);
        border: 1px solid var(--color-rule, rgba(128, 128, 128, 0.3));
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
        border-radius: 1rem;
        /*padding: 1.5rem;*/
        @apply p-0.5 m-0 sm:p-1 sm:m-1 md:p-2 md:p-2;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        width: 92vw;
        max-width: 48rem;
        height: auto;
        max-height: 88vh;
        box-sizing: border-box;
        transition: width 0.15s ease, max-width 0.15s ease, height 0.15s ease, max-height 0.15s ease;
    }

    .modal-box.is-maximized {
        width: 96vw !important;
        max-width: 96vw !important;
        height: 95vh !important;
        max-height: 95vh !important;
        @apply p-0.5 m-0;
    }

    .modal-body {
        flex: 1 1 auto;
        width: 100%;
        min-height: 0;
        overflow-y: auto;
    }

    .modal-header-actions {
        position: absolute;
        top: 1rem;
        right: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 50;
    }
    .modal-icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        min-width: 32px;
        max-width: 32px;
        height: 32px;
        min-height: 32px;
        max-height: 32px;
        padding: 0;
        margin: 0;
        border-radius: 9999px;
        border: 1px solid var(--color-rule, rgba(128, 128, 128, 0.3));
        background-color: color-mix(in srgb, var(--color-rule, #888888) 35%, var(--color-page, #ffffff));
        color: var(--color-ink, #000000);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        outline: none;
        flex-shrink: 0;
        transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
    }
    .modal-icon-btn:hover {
        background-color: var(--color-rule, rgba(128, 128, 128, 0.5));
        color: var(--color-ink, #000000);
    }
    .modal-icon-btn:active {
        transform: scale(0.92);
    }
    .modal-icon-btn svg {
        width: 16px;
        height: 16px;
        min-width: 16px;
        min-height: 16px;
        stroke: currentColor;
        stroke-width: 2.25;
        fill: none;
        display: block;
        flex-shrink: 0;
    }
</style>

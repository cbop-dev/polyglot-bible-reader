<script lang='ts'>
    import { mylog } from "$lib/lemma-ui/env/env";
    import Icon from "./icons/Icon.svelte";
    let {
        copyText = '',
        getTextFunc = null,
        tooltip = 'Copy to clipboard',
        linkText = '',
        showButton = true,
        btnSizeCssClass = 'px-2 py-0.5 text-xs',
        btnCssClass= '',
        width = 14,
        height = 14,
        svgIcon=null,
        children=null,
        supressCopiedMsg=false
    } = $props();

    let copied = $state(false);

    async function copyToClipboard(e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        let theText = copyText;
        if (getTextFunc) {
//            mylog(`gonna call getTextfun()_...`, true);
            try {
                theText = typeof getTextFunc === 'function' ? getTextFunc() : getTextFunc;
                mylog(`called getTextfun->'${theText}'`)
            } catch (err) {
//                mylog("HMMM. error!", true);
                console.error("Error evaluating getTextFunc:", err);
            }
        }
        if (!theText && Number(theText) !== 0) return;
        theText = String(theText);

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(theText);
            } else {
                const ta = document.createElement('textarea');
                ta.value = theText;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                ta.style.top = '-9999px';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            copied = true;
            setTimeout(() => { copied = false; }, 2000);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    }
</script>

<button 
    type="button"
    title={copied ? "Copied!" : tooltip} 
    onclick={copyToClipboard} 
    class="inline-flex items-center gap-1 rounded-md font-sans transition-colors cursor-pointer border border-rule/50 bg-rule/30 hover:bg-rule/70 text-ink {btnSizeCssClass} {btnCssClass}"
>
    {#if copied && !supressCopiedMsg}
        <svg class="w-3.5 h-3.5 text-green-600 stroke-current" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
        <span class="text-xs font-bold text-green-700">Copied!</span>
    {:else}
        {#if linkText}
            <span>{linkText}</span>
        {/if}
        {#if showButton &&!svgIcon && !children}
            <svg class="w-3.5 h-3.5 stroke-current opacity-80" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
        
        {:else if children}
            {@render children()}
        {:else}
        
        <Icon svg={svgIcon} {width} {height}/>
        {/if}
    {/if}
</button>
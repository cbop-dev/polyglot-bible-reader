<script>
    import { onMount } from "svelte";
    import Button from "./ui/Button.svelte";
    import { Utils } from "$lib/utils/utils.js";
    import { getVerseText } from "$lib/services/dbClient.ts";

    let {
        workUnitId,
        ref = '',
        lang = 'greek',
        showRefTitle = true,
    } = $props();

    let ready = $state(false);
    let text = $state('');

    onMount(async () => {
        if (workUnitId) {
            text = (await getVerseText(workUnitId)) || '';
        }
        ready = true;
    });
</script>

{#if !ready}
    <div class="py-4 text-center">
        <span class="inline-block w-6 h-6 border-2 border-link border-t-transparent rounded-full animate-spin"></span>
    </div>
{:else}
    <div class="block">
        {#if showRefTitle && ref} 
            <h2 class="text-lg font-bold mb-2">{ref}</h2>
        {/if}

        <p class="{lang === 'hebrew' ? 'hebrew font-hebrew text-2xl' : 'greek font-greek text-xl'} text-center py-2 text-ink leading-relaxed" dir={lang === 'hebrew' ? 'rtl' : 'ltr'}>{text}</p>
        <div class="text-center mt-2">
            <Button
                buttonColors="btn btn-secondary"
                buttonStyle="m-1 p-1"
                toggled={() => { Utils.copyToClipboard(ref ? `${ref}: ${text}` : text); }}
                buttonText="Copy"
            />
        </div>
    </div>
{/if}

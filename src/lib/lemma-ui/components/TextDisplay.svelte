<script>
    import { onMount } from "svelte";
    import { VocabDataset } from "../data/VocabDataset.js";
    import Button from "./ui/Button.svelte";
    import { Utils } from "$lib/utils/utils.js";
    import { VocabEngine } from "../engine/VocabEngine.js";
    let {
        /**
         * @type {VocabDataset} tfData
        */
        tfData,
        /**
         * @type {number} sectionID
        */
        sectionID,
        ref,
        showRefTitle=true,
    } = $props();
    let ready = $state(false);

    let  responseObj= $state('');

    onMount(async ()=>{
        responseObj=await VocabEngine.fetchText(sectionID,tfData.dbAbbrev);
        ready = true;
    })

</script>

{#if !ready}
Loading...<span class="loading loading-spinner loading-lg"></span>
{:else}
    <div class="block" >
    {#if showRefTitle} 
        <h2>{ref}</h2>
    {/if}

    <p class="greek text-2xl text-center">{responseObj.text}</p>
    <Button  buttonColors="btn btn-secondary" buttonStyle="m-1 p-1 mt-0 mb-0 p-0" 
    toggled={()=>{Utils.copyToClipboard(ref+": " + responseObj.text)}} buttonText="Copy" /> 
    </div>

{/if}


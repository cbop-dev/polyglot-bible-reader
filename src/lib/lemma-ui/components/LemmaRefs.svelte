<script>
	import { VocabDataset, TfDataset } from '../data/VocabDataset.js';
	import { onMount, tick } from 'svelte';
	import { Utils } from '$lib/utils/utils.js';
	import Button from './ui/Button.svelte';
	import ModalButton from './ui/ModalButton.svelte';
	import { LexQuery, LexQueryFilter } from './LexQuery.svelte.js';
	import Icon from '../components/ui/icons/Icon.svelte';
	import TextsDisplay from './TextsDisplay.svelte';
	import { VocabEngine, TF } from '../engine/VocabEngine.js';
	import BookOpenSvg from '../components/ui/icons/book-open.svg';
	import Modal2 from './ui/Modal2.svelte';
	import * as BibleUtils from '$lib/utils/bible-utils.js';
	import OptionButton from './ui/OptionButton.svelte';
	import CopyText from './ui/CopyText.svelte';

	/**
	 * @type {{
	 *  tfData:VocabDataset,
	 *  lexId:number,
	 *  lemma:string,
	 *  link:boolean,
	 *  lexRefQuery:LexQuery,
	 *  sections:number[]|null
	 * }}
	 */
	let {
		tfData,
		lexId,
		lemma,
		link = false,
		lexRefQuery = new LexQuery(),
		/**
		 * @type {null|number[]} sections
		 */
		sections = null
	} = $props();

	let wereReady = $state(lexRefQuery?.ready || false);

	let refsString = $derived(
		lexRefQuery?.response && lexRefQuery?.response['refs']
			? lexRefQuery.response['refs'].map((ref) => BibleUtils.standaradizeBibleRef(ref))
			: []
	);

	onMount(async () => {
		if (!lexRefQuery.ready) {
			await VocabEngine.fetchRefs(lexId, sections, lexRefQuery, tfData.dbAbbrev);
			await tick();
		}
		wereReady = lexRefQuery.ready;
	});
</script>

<h2>
	{#if !sections || sections.length == 0}All{/if}
	{#if lexRefQuery.ready && lexRefQuery.response && lexRefQuery.response['refs']}
		{lexRefQuery.response['refs'].length}
	{/if} verses with {lemma}
	{#if sections && sections.length > 0}in section(s){:else}in {tfData.abbrev}{/if}:
</h2>
<div class="rounded-xl bg-rule/20 border border-rule/50 p-4 shadow-sm text-ink my-2">
	{#if !lexRefQuery.ready || !wereReady}
		<div class="py-6 text-center flex flex-col items-center justify-center gap-2">
			<span class="inline-block w-7 h-7 border-3 border-link border-t-transparent rounded-full animate-spin"></span>
			<span class="text-xs text-ink-soft font-medium">Retrieving biblical instances...</span>
		</div>
	{:else if wereReady && lexRefQuery.ready == true}
		{#if lexRefQuery.response && lexRefQuery.response['refs']}
			<div class="flex justify-end mb-3">
				<CopyText 
					tooltip="Copy all references to clipboard" 
					linkText="Copy References"
					copyText={tfData?.booksDict ? tfData.booksDict.combineRefs(lexRefQuery.response['refs'] || []) : (lexRefQuery.response['refs'] || []).join('; ')} 
				/>
			</div>
			<TextsDisplay
				{tfData}
				lexID={lexId}
				sectionIDs={lexRefQuery.response['nodes']}
				refs={refsString}
			/>
		{/if}
	{:else}
		<i class="text-ink-soft">Lemma info will show here.</i>
	{/if}
</div>
<div class="float-right"></div>



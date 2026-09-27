
<script>
/**
 * NB: this component should probably be re-drawn when lemma info changes, i.e., surrounded in {#key lemma}..{/key}
*/
	import { getLexiconEntry } from '$lib/services/dbClient';
	import { onMount, untrack } from 'svelte';

	/**
	 * @typedef BDBEntryProps
	 * @property {any} lemma - Lexeme object or string
	 * @property {string} [lang='hebrew']
	 * @property {string} [dbAbbrev='bhs']
	 * @property {boolean} [autoOpen=false]
	 */
	/** @type {BDBEntryProps} */
	let { lemma, lang = 'hebrew', dbAbbrev = 'bhs', autoOpen = false } = $props();

	let isOpen = $state(autoOpen);
	let loading = $state(false);
	/** @type {{ headword?: string, strongs?: string, matchType?: string, def?: string } | null} */
	let entry = $state(null);
	let hasSearched = $state(false);
	let prevWordKey = $state('');

	let lemmaText = $derived(
		typeof lemma === 'string' ? lemma : lemma?.headword || lemma?.lemma || lemma?.word || ''
	);
	let strongsCode = $derived(
		typeof lemma === 'object' ? lemma?.strongs || lemma?.strongs_number || '' : ''
	);
	let plainText = $derived(
		typeof lemma === 'object' ? lemma?.plain || '' : ''
	);

	/**
	 * Asynchronously fetch the BDB entry without blocking the main thread or modal render
	 */
	async function fetchBdb() {
		const target = lemmaText;
		const targetStrongs = strongsCode;

		if ((lang !== 'hebrew' && dbAbbrev !== 'bhs') || (!target && !targetStrongs)) {
			loading = false;
			entry = null;
			hasSearched = false;
			return;
		}

		loading = true;
		try {
			const res = await getLexiconEntry('bdb', target, targetStrongs);
			entry = res
				? {
						headword: res.headword,
						strongs: res.strongs,
						matchType: res.match_type,
						def: res.definition
				  }
				: null;
			hasSearched = true;
		} catch (err) {
			console.error('Error loading BDB entry:', err);
			entry = null;
			hasSearched = true;
		} finally {
			loading = false;
		}
	}

	function handleToggle(e) {
		isOpen = e.currentTarget.open;
		if (isOpen && !entry && !loading && !hasSearched) {
			fetchBdb();
		}
	}

	// When lemma/strongs changes, reset state
	function resetEntry(){
		const target = lemmaText;
		const targetStrongs = strongsCode;
		const wordKey = `${targetStrongs || ''}_${target}`;
		if (wordKey !== prevWordKey) {
			prevWordKey = wordKey;
			isOpen = autoOpen;
			hasSearched = false;
			entry = null;
			loading = false;
			if (isOpen && (target || targetStrongs)) {
				untrack(() => {
					fetchBdb();
				});
			}
		}
	};

	let formattedDef = $derived(
		entry?.def ? entry.def : ''
	);

	onMount(()=>{resetEntry()});
</script>

{#if lang === 'hebrew' || dbAbbrev === 'bhs'}
	<div class="bdb-container my-3 text-left">
		<details
			class="group border border-rule bg-page rounded-xl shadow-xs overflow-hidden transition-colors"
			bind:open={isOpen}
			ontoggle={handleToggle}
		>
			<summary
				class="list-none [&::-webkit-details-marker]:hidden font-medium py-3 px-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-rule/30 transition-colors"
			>
				<div class="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
					<span
						class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-serif tracking-wider uppercase bg-link/10 text-link border border-link/25"
					>
						BDB
					</span>
					<span class="font-semibold text-sm text-ink">
						Brown-Driver-Briggs Lexicon
					</span>
					{#if loading}
						<span class="inline-block w-3.5 h-3.5 border-2 border-link border-t-transparent rounded-full animate-spin ml-1" title="Loading entry..."></span>
					{:else if hasSearched && entry}
						<span class="hebrew font-hebrew text-lg font-bold text-link ml-1" dir="rtl">
							{entry.headword}
						</span>
						{#if entry.strongs}
							<span class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-rule/50 text-ink-soft border border-rule">
								{entry.strongs}
							</span>
						{/if}
					{/if}
				</div>

				<div class="text-ink-soft shrink-0">
					<svg
						class="w-4 h-4 transition-transform duration-200"
						class:rotate-180={isOpen}
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			</summary>

			<div class="px-4 pb-4 pt-2 border-t border-rule/60">
				{#if !isOpen}
					<!-- Empty when closed -->
				{:else if loading}
					<div class="py-8 text-center text-sm text-ink-soft flex items-center justify-center gap-3">
						<span class="inline-block w-5 h-5 border-2 border-link border-t-transparent rounded-full animate-spin"></span>
						<span class="font-medium">Loading BDB entry...</span>
					</div>
				{:else if entry}
					<div class="bdb-entry-body">
						<div class="bdb-text leading-relaxed text-sm md:text-[15px] max-h-96 overflow-y-auto pr-2 custom-scrollbar text-ink">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html formattedDef}
						</div>
					</div>
				{:else}
					<div class="py-4 text-xs text-ink-soft text-center bg-rule/20 rounded-lg border border-rule/40 my-1">
						<p>No direct BDB entry found for <strong class="hebrew font-hebrew text-base text-ink" dir="rtl">{lemmaText}</strong>{strongsCode ? ` (${strongsCode})` : ''}.</p>
					</div>
				{/if}
			</div>
		</details>
	</div>
{/if}

<style>
	.bdb-container details {
		border: 1px solid var(--color-rule, rgba(128, 128, 128, 0.3));
		background-color: var(--color-page, #ffffff);
		border-radius: 0.75rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
		overflow: hidden;
	}

	.bdb-container summary {
		list-style: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		cursor: pointer;
		user-select: none;
	}

	.bdb-container summary::-webkit-details-marker {
		display: none;
	}

	:global(.bdb-text) {
		font-family: "Gentium Plus", "Charis SIL", "SBL BibLit", "Cardo", Georgia, serif;
		line-height: 1.7;
		color: var(--color-ink);
		word-break: break-word;
	}

	:global(.bdb-text strong),
	:global(.bdb-text b) {
		color: var(--color-link);
		font-weight: 700;
	}

	:global(.bdb-text heb),
	:global(.bdb-text .hebrew) {
		direction: rtl;
		display: inline-block;
		font-family: "Ezra SIL", serif;
		font-size: 1.18em;
		color: var(--color-ink);
	}

	:global(.bdb-text a) {
		color: var(--color-link);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.05);
		border-radius: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
	}
</style>

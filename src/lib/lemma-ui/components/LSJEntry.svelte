<script>
	import { getLexiconEntry, normalizeGreek } from '$lib/services/dbClient';
	import { onMount, untrack } from 'svelte';
    import { mylog } from '../env/env';

	/**
	 * @typedef LSJEntryProps
	 * @property {any} lemma - Lexeme object or string
	 * @property {string} [lang='greek']
	 * @property {string} [dbAbbrev='lxx']
	 * @property {boolean} [autoOpen=false]
	 */
	/** @type {LSJEntryProps} */
	let { lemma, lang = 'greek', dbAbbrev = 'lxx', autoOpen = false } = $props();

	$effect(()=>{
		//const _ = lemma;
		//resetEntry();
	})
	let isOpen = $state(autoOpen);
	let loading = $state(false);
	
	let isProper = $state(false);
	let hasSearched = $state(false);
	let prevWordKey = $state('');

	let lemmaText = $derived(
		typeof lemma === 'string' ? lemma : lemma?.lemma || lemma?.word || ''
	);
	let strongsCode = $derived(
		typeof lemma === 'object' ? lemma?.strongs || lemma?.strongs_number || '' : ''
	);
	let plainText = $derived(
		typeof lemma === 'object' ? lemma?.plain || '' : ''
	);

	/** @type {{ headword?: string, lsjIndex?: string, matchType?: string, def?: string } | null} */
	let fetchedEntry = $state(null);

	//let entry = $state(null);
	/** @type {{ headword?: string, lsjIndex?: string, matchType?: string, def?: string } | null} entry
	*/
	let entry = $derived(isOpen && fetchedEntry ? fetchedEntry : null);

	/**
	 * Asynchronously fetch the LSJ entry without blocking the main thread or modal render
	 * @returns  {Promise<{ headword?: string, lsjIndex?: string, matchType?: string, def?: string } | null>}
	 */
	async function fetchLsj() {
		
		if (!fetchedEntry || normalizeGreek(entry?.headword ?? '') != normalizeGreek(lemmaText)){

			const target = lemmaText;
			const targetStrongs = strongsCode;

			if (lang !== 'greek' || (!target && !targetStrongs)) {
				loading = false;
				
				isProper = false;
				hasSearched = false;
				
			}
			else {
				loading = true;
				try {
//					mylog(`fecthing lsj entry for ${lemmaText}`, true);
					let lexEntry = await getLexiconEntry('lsj', target, targetStrongs);
					fetchedEntry = lexEntry
						? {
								headword: lexEntry.headword,
								lsjIndex: lexEntry.lsj_index,
								matchType: lexEntry.match_type,
								def: lexEntry.definition
						}
						: null;
					isProper = false;
					hasSearched = true;

					
				} catch (err) {
					console.error('Error loading LSJ entry:', err);
					
					hasSearched = true;
				} finally {
					loading = false;
					//fetchedEntry=null;
				}
			}
		}
		
	}

	function handleToggle(e) {
		isOpen = e.currentTarget.open;
		if (isOpen && !entry && !loading && !hasSearched) {
			fetchLsj();
		}
	}

	// When lemma/strongs changes, reset state
	function resetEntry(){
		fetchedEntry=null;
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
					//fetchLsj();
				});
			}
		}
	};

	/**
	 * Formats markdown from LSJ CEX edition into readable HTML
	 * @param {string} raw
	 * @returns {string}
	 */
	function formatLsjMarkdown(raw) {
		if (!raw) return '';

		// If the content is already formatted HTML (from STEPBible TFLSJ)
		if (/<[a-z][\s\S]*>/i.test(raw)) {
			let html = raw;
			html = html.replace(/<Level[1-4]>/gi, '<span class="lsj-sense-badge font-mono text-xs px-1.5 py-0.5 rounded bg-rule/50 text-ink font-bold mx-0.5 border border-rule">');
			html = html.replace(/<\/Level[1-4]>/gi, '</span>');
			return html;
		}

		let html = raw
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong class="lsj-strong font-semibold text-link">$1</strong>');
		html = html.replace(/\*([^*\n]+?)\*/g, '<em class="lsj-em italic opacity-90">$1</em>');
		html = html.replace(/`([^`\n]+?)`/g, '<span class="lsj-sense-badge font-mono text-xs px-1.5 py-0.5 rounded bg-rule/50 text-ink font-bold mx-0.5 border border-rule">$1</span>');
		html = html.replace(/;\s*(`[A-Z](\.[I|V|X]+)?`|[A-Z]\.[I|V|X]+|[I|V|X]+\.)\s*/g, ';<br/><span class="inline-block mt-2 mb-1"></span>$1 ');

		return html;
	}

	let formattedDef = $derived(
		entry?.def ? formatLsjMarkdown(entry.def) : ''
	);

	let cleanHeadword = $derived(
		entry?.headword ? normalizeGreek(entry.headword) : ''
	);

	let logeionUrl = $derived(
		cleanHeadword ? `https://logeion.uchicago.edu/${encodeURIComponent(entry.headword)}` : ''
	);

	let matchTypeBadge = $derived.by(() => {
		if (!entry?.matchType) return '';
		switch (entry.matchType) {
			case 'deponent_to_active':
				return 'Deponent → Active';
			case 'koine_phonetic':
				return 'Koine Form';
			case 'manual_override':
				return 'Headword Mapping';
			case 'variation':
				return 'Phonetic Variant';
			case 'neuter_adjective':
				return 'Neuter → Headword';
			default:
				return '';
		}
	});
	onMount(()=>{
//		mylog('LSJReset()!', true);
		resetEntry()});
</script>

{#if lang === 'greek'}
	<div class="lsj-container my-3 text-left">
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
						LSJ
					</span>
					<span class="font-semibold text-sm text-ink">
						Liddell-Scott-Jones Lexicon
					</span>
					{#if loading}
						<span class="inline-block w-3.5 h-3.5 border-2 border-link border-t-transparent rounded-full animate-spin ml-1" title="Loading entry..."></span>
					{:else if hasSearched && entry}
						<span class="greek font-greek text-base font-bold text-link ml-1">
							{entry.headword}
						</span>
						{#if matchTypeBadge}
							<span class="text-[11px] font-medium px-1.5 py-0.5 rounded bg-rule/50 text-ink-soft border border-rule">
								{matchTypeBadge}
							</span>
						{/if}
					{:else if hasSearched && isProper}
						<span class="text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
							Proper Name
						</span>
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
						<span class="font-medium">Loading LSJ entry...</span>
					</div>
				{:else if entry}
					<div class="lsj-entry-body">
						<!-- Metadata bar -->
						<div class="flex items-center justify-between pb-2 mb-3 border-b border-rule/50 text-xs text-ink-soft">
							<div class="flex items-center gap-2">
								<span class="font-semibold text-ink">Entry: {entry.lsjIndex}</span>
								{#if entry.headword !== lemmaText}
									<span>(Lemma: <strong class="greek font-greek font-semibold text-ink">{lemmaText}</strong>)</span>
								{/if}
							</div>
							{#if logeionUrl}
								<div class="flex items-center gap-3">
									<a
										href={logeionUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="text-link hover:underline inline-flex items-center gap-1 font-medium"
										title="Lookup on University of Chicago Logeion"
									>
										Logeion ↗
									</a>
								</div>
							{/if}
						</div>

						<!-- Lexicon definition -->
						<div class="lsj-text font-serif leading-relaxed text-sm md:text-[15px] max-h-96 overflow-y-auto pr-2 custom-scrollbar text-ink">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html formattedDef}
						</div>
					</div>
				{:else if isProper}
					<div class="p-3 my-2 rounded-lg bg-rule/30 border border-rule text-xs text-ink-soft">
						<strong class="font-semibold block mb-1 text-ink">Proper Noun / Semitic Transliteration</strong>
						<p>
							<strong class="greek font-greek text-sm text-ink">{lemmaText}</strong> is a proper personal or geographic name (often transliterated from Hebrew/Aramaic). Classical Greek lexica (LSJ) typically omit Semitic proper names.
						</p>
					</div>
				{:else}
					<div class="py-4 text-xs text-ink-soft text-center bg-rule/20 rounded-lg border border-rule/40 my-1">
						<p>No direct classical LSJ entry found for <strong class="greek font-greek text-sm text-ink">{lemmaText}</strong>.</p>
						{#if lemmaText}
							<div class="mt-3 flex justify-center">
								<a
									href="https://logeion.uchicago.edu/{encodeURIComponent(lemmaText)}"
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-link text-link hover:bg-link hover:text-white text-xs font-semibold transition-colors"
								>
									Search Logeion ↗
								</a>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</details>
	</div>
{/if}

<style>
	.lsj-container details {
		border: 1px solid var(--color-rule, rgba(128, 128, 128, 0.3));
		background-color: var(--color-page, #ffffff);
		border-radius: 0.75rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
		overflow: hidden;
	}

	.lsj-container summary {
		list-style: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		cursor: pointer;
		user-select: none;
	}

	.lsj-container summary::-webkit-details-marker {
		display: none;
	}

	:global(.lsj-text) {
		font-family: "Gentium Plus", "Charis SIL", "SBL BibLit", "Cardo", Georgia, serif;
		line-height: 1.7;
		color: var(--color-ink);
		word-break: break-word;
	}

	:global(.lsj-text strong),
	:global(.lsj-text b) {
		color: var(--color-link);
		font-weight: 700;
	}

	:global(.lsj-text em),
	:global(.lsj-text i) {
		font-style: italic;
		opacity: 0.9;
	}

	:global(.lsj-text greek),
	:global(.lsj-text .greek) {
		font-family: "Gentium Plus", "Charis SIL", "SBL BibLit", serif;
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

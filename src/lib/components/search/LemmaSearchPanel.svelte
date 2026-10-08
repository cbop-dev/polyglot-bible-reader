<script lang="ts">
	import { onMount } from 'svelte';
	import { readerState } from '$lib/stores/readerState.svelte';
	import {
		resolveSearchCorpus,
		getCorpusLanguage,
		getCorpusLemmas,
		filterLemmas,
		type SupportedSearchCorpus,
		type CorpusLemmaItem,
		type LemmaFilterResult
	} from '$lib/services/lemmaSearchService';
	import { transliterate } from '$lib/utils/transliteration';

	// The three supported original language texts
	const SEARCH_OPTIONS: { id: SupportedSearchCorpus; label: string; lang: 'hebrew' | 'greek'; defaultVersion: string }[] = [
		{ id: 'wlc', label: 'BHS (Hebrew)', lang: 'hebrew', defaultVersion: 'BHS' },
		{ id: 'ognt', label: 'OpenGNT (Greek)', lang: 'greek', defaultVersion: 'OpenGNT' },
		{ id: 'swete_lxx', label: 'LXX (Septuagint)', lang: 'greek', defaultVersion: 'LXX' }
	];

	// Active search corpus
	let activeCorpus = $state<SupportedSearchCorpus>('ognt');

	// Raw input typed by user
	let rawInput = $state('');

	// Currently loaded lemmas for the active corpus
	let corpusLemmas = $state<CorpusLemmaItem[]>([]);
	let isLoadingLemmas = $state(false);

	// Determine initial corpus from readerState.selectedVersion if compatible
	onMount(() => {
		const matched = resolveSearchCorpus(readerState.selectedVersion);
		if (matched) {
			activeCorpus = matched;
		}
		loadLemmasForCorpus(activeCorpus);
	});

	// Re-load lemmas when corpus changes
	async function setCorpus(corpus: SupportedSearchCorpus) {
		activeCorpus = corpus;
		await loadLemmasForCorpus(corpus);
	}

	async function loadLemmasForCorpus(corpus: SupportedSearchCorpus) {
		isLoadingLemmas = true;
		try {
			corpusLemmas = await getCorpusLemmas(corpus);
		} catch (err) {
			console.error(`[LemmaSearchPanel] Error loading lemmas for ${corpus}:`, err);
		} finally {
			isLoadingLemmas = false;
		}
	}

	const activeLang = $derived(getCorpusLanguage(activeCorpus));

	// Real-time converted string
	const convertedQuery = $derived(transliterate(rawInput.trim(), activeLang));

	// Filtered lemma matches
	const filterResult = $derived<LemmaFilterResult>(
		filterLemmas(corpusLemmas, convertedQuery, activeLang, 60)
	);

	// Top most frequent lemmas for empty state preview
	const topLemmas = $derived<CorpusLemmaItem[]>(
		corpusLemmas.slice(0, 24)
	);

	function getVersionLabelForCorpus(corpus: SupportedSearchCorpus): string {
		const opt = SEARCH_OPTIONS.find((o) => o.id === corpus);
		return opt ? opt.defaultVersion : 'OpenGNT';
	}

	function handleSelectLemma(item: CorpusLemmaItem) {
		const colVersion = getVersionLabelForCorpus(activeCorpus);
		readerState.inspectWord(
			{
				lemma: item.lemma,
				strongs: item.strongs,
				total_count: item.total_count,
				total: item.total_count
			},
			colVersion
		);
	}

	let inputElement = $state<HTMLInputElement | null>(null);

	function autofocus(node: HTMLElement) {
		requestAnimationFrame(() => {
			node.focus();
			if (node instanceof HTMLInputElement) {
				node.select();
			}
		});
		const timer = setTimeout(() => {
			node.focus();
		}, 60);
		return {
			destroy() {
				clearTimeout(timer);
			}
		};
	}

	function clearInput() {
		rawInput = '';
		inputElement?.focus();
	}
</script>

<div class="max-w-full sm:flex sm:flex-col h-full text-ink">
	<!-- Panel Header -->
	<div class="sm:mb-4">
		<h2 class="text-xl font-bold sm:flex items-center gap-2 mb-1">
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-link" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			Lexeme Search
		</h2>
		<p class="text-xs text-ink-soft">
			Search lemmas in original Hebrew and Greek biblical corpora with real-time Latin transliteration.
		</p>
	</div>

	<!-- Version Selector Pills -->
	<div class="sm:flex gap-1.5 p-1 bg-rule/30 rounded-lg mb-4">
		{#each SEARCH_OPTIONS as opt}
			<button
				type="button"
				class="flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors
				{activeCorpus === opt.id 
					? 'bg-page text-ink shadow-sm font-bold border border-rule' 
					: 'text-ink-soft hover:text-ink hover:bg-rule/50'}"
				onclick={() => { setCorpus(opt.id); inputElement?.focus(); }}
			>
				{opt.label}
			</button>
		{/each}
	</div>

	<!-- Search Input Container -->
	<div class="relative mb-2">
		<input
			bind:this={inputElement}
			use:autofocus
			type="text"
			bind:value={rawInput}
			placeholder={activeLang === 'hebrew' ? "Type in Latin (e.g. 'adm', 'br>jyt')..." : "Type in Latin (e.g. 'logos', 'qeos')..."}
			class="w-full pl-3 pr-8 py-2 text-sm bg-page border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-link text-ink placeholder:text-ink-soft/60"
			autocomplete="off"
			autocorrect="off"
			autocapitalize="off"
			spellcheck="false"
		/>
		{#if rawInput}
			<button
				type="button"
				class="absolute right-2.5 top-2.5 text-xs text-ink-soft hover:text-ink p-0.5 rounded-full"
				onclick={clearInput}
				aria-label="Clear input"
			>
				✕
			</button>
		{/if}
	</div>

	<!-- Live Converted Script Preview -->
	{#if convertedQuery}
		<div class="flex items-center gap-2 mb-3 px-2 py-1.5 bg-rule/20 rounded-md text-xs border border-rule/50">
			<span class="text-ink-soft font-mono">Script:</span>
			<span class="{activeLang === 'hebrew' ? 'font-hebrew text-base' : 'font-greek text-base'} font-bold text-link" dir={activeLang === 'hebrew' ? 'rtl' : 'ltr'}>
				{convertedQuery}
			</span>
			<span class="ml-auto text-[11px] text-ink-soft">
				{filterResult.totalFound} matching
			</span>
		</div>
	{:else}
		<!-- Transliteration Guide Badge -->
		<div class="mb-3 text-[11px] text-ink-soft leading-relaxed px-1">
			{#if activeLang === 'hebrew'}
				Latin to Hebrew: <span class="font-mono font-medium">b</span>&rarr;ב, <span class="font-mono font-medium">j</span>&rarr;ש, <span class="font-mono font-medium">m</span>&rarr;מ/ם, <span class="font-mono font-medium">br>jyt</span>&rarr;בראשית
			{:else}
				Latin to Greek: <span class="font-mono font-medium">logos</span>&rarr;λογος, <span class="font-mono font-medium">q</span>&rarr;θ, <span class="font-mono font-medium">x</span>&rarr;ξ, <span class="font-mono font-medium">c</span>&rarr;χ, <span class="font-mono font-medium">w</span>&rarr;ω
			{/if}
		</div>
	{/if}

	<!-- Results List Area -->
	<div class="flex-1 overflow-y-auto pr-1">
		{#if isLoadingLemmas}
			<div class="py-12 text-center text-ink-soft">
				<span class="inline-block w-6 h-6 border-2 border-link border-t-transparent rounded-full animate-spin"></span>
				<p class="mt-2 text-xs">Loading corpus lemmas...</p>
			</div>
		{:else if rawInput && filterResult.totalFound === 0}
			<div class="py-10 text-center text-ink-soft text-sm">
				<p>No lemmas found matching "<span class="font-bold text-ink">{convertedQuery}</span>".</p>
				<p class="text-xs mt-1 text-ink-soft/80">Try entering fewer characters or alternate spelling.</p>
			</div>
		{:else if rawInput}
			<!-- Best Matches (Prefix) -->
			{#if filterResult.bestMatches.length > 0}
				<div class="mb-4">
					<div class="text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-2">
						Best Matches ({filterResult.bestMatches.length})
					</div>
					<div class="flex flex-wrap gap-1.5" dir={activeLang === 'hebrew' ? 'rtl' : 'ltr'}>
						{#each filterResult.bestMatches as item}
							<button
								type="button"
								class="px-2.5 py-1 bg-surface hover:bg-rule/60 border border-rule rounded-md text-sm transition-all hover:scale-[1.02] flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
								onclick={() => handleSelectLemma(item)}
								title="View lexicon entry for {item.lemma}"
							>
								<span class="{activeLang === 'hebrew' ? 'font-hebrew text-base' : 'font-greek text-base'} font-bold">
									{item.lemma}
								</span>
								<span class="text-[10px] px-1 py-0.2 rounded bg-rule/50 text-ink-soft font-sans font-medium">
									{item.total_count}
								</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Other Matches (Substring) -->
			{#if filterResult.otherMatches.length > 0}
				<div class="mb-4">
					<div class="text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-2">
						Other Matches ({filterResult.otherMatches.length})
					</div>
					<div class="flex flex-wrap gap-1.5" dir={activeLang === 'hebrew' ? 'rtl' : 'ltr'}>
						{#each filterResult.otherMatches as item}
							<button
								type="button"
								class="px-2 py-0.5 bg-surface/80 hover:bg-rule/50 border border-rule/70 rounded-md text-xs transition-all hover:scale-[1.02] flex items-center gap-1 cursor-pointer active:scale-95"
								onclick={() => handleSelectLemma(item)}
								title="View lexicon entry for {item.lemma}"
							>
								<span class="{activeLang === 'hebrew' ? 'font-hebrew text-sm' : 'font-greek text-sm'} font-semibold">
									{item.lemma}
								</span>
								<span class="text-[10px] text-ink-soft font-sans">
									{item.total_count}
								</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<!-- Empty State / Frequent Words Preview -->
			<div class="mt-1">
				<div class="text-[11px] font-bold text-ink-soft uppercase tracking-wider mb-2">
					Frequent Lemmas in this Corpus
				</div>
				<div class="flex flex-wrap gap-1.5" dir={activeLang === 'hebrew' ? 'rtl' : 'ltr'}>
					{#each topLemmas as item}
						<button
							type="button"
							class="px-2 py-1 bg-surface hover:bg-rule/60 border border-rule rounded-md text-xs transition-all hover:scale-[1.02] flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
							onclick={() => handleSelectLemma(item)}
							title="View lexicon entry for {item.lemma}"
						>
							<span class="{activeLang === 'hebrew' ? 'font-hebrew text-sm' : 'font-greek text-sm'} font-bold">
								{item.lemma}
							</span>
							<span class="text-[10px] px-1 py-0.2 rounded bg-rule/50 text-ink-soft font-sans font-medium">
								{item.total_count}
							</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

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
	import {
		highlightStore,
		HIGHLIGHT_PALETTE,
		type HighlightedLemma
	} from '$lib/stores/highlightStore.svelte';

	// The three supported original language texts
	const SEARCH_OPTIONS: { id: SupportedSearchCorpus; label: string; lang: 'hebrew' | 'greek'; defaultVersion: string }[] = [
		{ id: 'wlc', label: 'BHS (Hebrew)', lang: 'hebrew', defaultVersion: 'BHS' },
		{ id: 'ognt', label: 'OpenGNT (Greek)', lang: 'greek', defaultVersion: 'OpenGNT' },
		{ id: 'swete_lxx', label: 'LXX (Septuagint)', lang: 'greek', defaultVersion: 'LXX' }
	];

	// Active tab: 'search' | 'highlights'
	let activeTab = $state<'search' | 'highlights'>('search');

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

	function inspectHighlight(item: HighlightedLemma) {
		const colVersion = item.lang === 'hebrew' ? 'BHS' : 'OpenGNT';
		readerState.inspectWord(
			{
				lemma: item.lemma,
				strongs: item.strongs
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
	<div class="sm:mb-3">
		<h2 class="text-xl font-bold sm:flex items-center gap-2 mb-1">
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-link" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			Lexemes & Highlighting
		</h2>
		<p class="text-xs text-ink-soft">
			Search and highlight original Hebrew and Greek biblical lexemes with real-time transliteration.
		</p>
	</div>

	<!-- Mode Switcher Tabs -->
	<div class="flex items-center gap-1 border-b border-rule pb-2 mb-3">
		<button
			type="button"
			class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer
			{activeTab === 'search' ? 'bg-rule/60 text-ink font-bold' : 'text-ink-soft hover:text-ink hover:bg-rule/30'}"
			onclick={() => { activeTab = 'search'; inputElement?.focus(); }}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			Search Lexemes
		</button>
		<button
			type="button"
			class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer
			{activeTab === 'highlights' ? 'bg-rule/60 text-ink font-bold' : 'text-ink-soft hover:text-ink hover:bg-rule/30'}"
			onclick={() => { activeTab = 'highlights'; }}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
			</svg>
			Highlights
			{#if highlightStore.items.length > 0}
				<span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-link text-white">
					{highlightStore.items.length}
				</span>
			{/if}
		</button>
	</div>

	{#if activeTab === 'search'}
		<!-- Version Selector Pills -->
		<div class="sm:flex gap-1.5 p-1 bg-rule/30 rounded-lg mb-3">
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
								{@const hl = highlightStore.getHighlight(item.lemma, item.strongs, activeLang)}
								<div
									class="px-2 py-0.5 rounded-md text-sm transition-all border flex items-center gap-1.5 shadow-xs"
									style={hl ? `background-color: ${hl.color}20; border-color: ${hl.color};` : 'background-color: var(--color-surface, #fff); border-color: var(--color-rule, #ccc);'}
								>
									<button
										type="button"
										class="cursor-pointer flex items-center gap-1 hover:text-link"
										onclick={() => handleSelectLemma(item)}
										title="Inspect {item.lemma}"
									>
										<span class="{activeLang === 'hebrew' ? 'font-hebrew text-base' : 'font-greek text-base'} font-bold">
											{item.lemma}
										</span>
										<span class="text-[10px] px-1 py-0.2 rounded bg-rule/50 text-ink-soft font-sans font-medium">
											{item.total_count}
										</span>
									</button>
									<button
										type="button"
										class="p-0.5 rounded hover:bg-rule/40 cursor-pointer transition-colors"
										style={hl ? `color: ${hl.color};` : 'color: var(--color-ink-soft, #888);'}
										onclick={(e) => {
											e.stopPropagation();
											highlightStore.toggleLemma(item.lemma, item.strongs, activeLang);
										}}
										title={hl ? 'Remove highlight' : 'Highlight across reader'}
										aria-label={hl ? 'Remove highlight' : 'Highlight across reader'}
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill={hl ? "currentColor" : "none"} stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
										</svg>
									</button>
								</div>
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
								{@const hl = highlightStore.getHighlight(item.lemma, item.strongs, activeLang)}
								<div
									class="px-2 py-0.5 rounded-md text-xs transition-all border flex items-center gap-1 shadow-xs"
									style={hl ? `background-color: ${hl.color}20; border-color: ${hl.color};` : 'background-color: var(--color-surface, #fff); border-color: var(--color-rule, #ccc);'}
								>
									<button
										type="button"
										class="cursor-pointer flex items-center gap-1 hover:text-link"
										onclick={() => handleSelectLemma(item)}
										title="Inspect {item.lemma}"
									>
										<span class="{activeLang === 'hebrew' ? 'font-hebrew text-sm' : 'font-greek text-sm'} font-semibold">
											{item.lemma}
										</span>
										<span class="text-[10px] text-ink-soft font-sans">
											{item.total_count}
										</span>
									</button>
									<button
										type="button"
										class="p-0.5 rounded hover:bg-rule/40 cursor-pointer transition-colors"
										style={hl ? `color: ${hl.color};` : 'color: var(--color-ink-soft, #888);'}
										onclick={(e) => {
											e.stopPropagation();
											highlightStore.toggleLemma(item.lemma, item.strongs, activeLang);
										}}
										title={hl ? 'Remove highlight' : 'Highlight across reader'}
										aria-label={hl ? 'Remove highlight' : 'Highlight across reader'}
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill={hl ? "currentColor" : "none"} stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
										</svg>
									</button>
								</div>
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
							{@const hl = highlightStore.getHighlight(item.lemma, item.strongs, activeLang)}
							<div
								class="px-2 py-0.5 rounded-md text-xs transition-all border flex items-center gap-1 shadow-xs"
								style={hl ? `background-color: ${hl.color}20; border-color: ${hl.color};` : 'background-color: var(--color-surface, #fff); border-color: var(--color-rule, #ccc);'}
							>
								<button
									type="button"
									class="cursor-pointer flex items-center gap-1.5 hover:text-link"
									onclick={() => handleSelectLemma(item)}
									title="Inspect {item.lemma}"
								>
									<span class="{activeLang === 'hebrew' ? 'font-hebrew text-sm' : 'font-greek text-sm'} font-bold">
										{item.lemma}
									</span>
									<span class="text-[10px] px-1 py-0.2 rounded bg-rule/50 text-ink-soft font-sans font-medium">
										{item.total_count}
									</span>
								</button>
								<button
									type="button"
									class="p-0.5 rounded hover:bg-rule/40 cursor-pointer transition-colors"
									style={hl ? `color: ${hl.color};` : 'color: var(--color-ink-soft, #888);'}
									onclick={(e) => {
										e.stopPropagation();
										highlightStore.toggleLemma(item.lemma, item.strongs, activeLang);
									}}
									title={hl ? 'Remove highlight' : 'Highlight across reader'}
									aria-label={hl ? 'Remove highlight' : 'Highlight across reader'}
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill={hl ? "currentColor" : "none"} stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
									</svg>
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Highlights Tab Content -->
		<div class="flex-1 overflow-y-auto pr-1">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-ink-soft uppercase tracking-wider">
					Active Highlights ({highlightStore.items.length})
				</span>
				{#if highlightStore.items.length > 0}
					<button
						type="button"
						class="text-xs text-red-500 hover:text-red-700 hover:underline cursor-pointer font-medium"
						onclick={() => highlightStore.clearAll()}
					>
						Clear All
					</button>
				{/if}
			</div>

			{#if highlightStore.items.length === 0}
				<div class="py-12 text-center text-ink-soft text-sm px-4">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mx-auto text-ink-soft/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
					</svg>
					<p class="font-semibold text-ink">No active highlights</p>
					<p class="text-xs mt-1 text-ink-soft">
						Highlight lemmas from search results or click words in the reader to highlight them across the text.
					</p>
				</div>
			{:else}
				<div class="flex flex-col gap-2.5">
					{#each highlightStore.items as item (item.id)}
						<div
							class="p-2.5 rounded-lg border bg-surface/70 flex flex-col gap-2 shadow-xs transition-colors"
							style="border-color: {item.color}80;"
						>
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2 min-w-0">
									<span class="w-3.5 h-3.5 rounded-full flex-shrink-0" style="background-color: {item.color};"></span>
									<button
										type="button"
										class="cursor-pointer text-left hover:text-link truncate {item.lang === 'hebrew' ? 'font-hebrew text-lg' : 'font-greek text-lg'} font-bold"
										dir={item.lang === 'hebrew' ? 'rtl' : 'ltr'}
										onclick={() => inspectHighlight(item)}
										title="Inspect {item.lemma}"
									>
										{item.lemma}
									</button>
									<span class="text-[10px] px-1.5 py-0.5 rounded bg-rule/50 text-ink-soft font-sans font-semibold uppercase">
										{item.lang}
									</span>
									{#if item.strongs}
										<span class="text-[10px] px-1.5 py-0.5 rounded bg-rule/40 text-ink-soft font-mono">
											{item.strongs}
										</span>
									{/if}
								</div>

								<div class="flex items-center gap-1 flex-shrink-0">
									<button
										type="button"
										class="p-1 rounded text-ink-soft hover:text-ink hover:bg-rule/40 cursor-pointer"
										onclick={() => inspectHighlight(item)}
										title="Inspect lemma"
										aria-label="Inspect lemma"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
										</svg>
									</button>
									<button
										type="button"
										class="p-1 rounded text-ink-soft hover:text-red-500 hover:bg-rule/40 cursor-pointer"
										onclick={() => highlightStore.removeLemma(item.id)}
										title="Remove highlight"
										aria-label="Remove highlight"
									>
										✕
									</button>
								</div>
							</div>

							<!-- Color palette picker swatches -->
							<div class="flex items-center gap-1.5 pt-1 border-t border-rule/30 flex-wrap">
								{#each HIGHLIGHT_PALETTE as p}
									<button
										type="button"
										class="w-3.5 h-3.5 rounded-full cursor-pointer transition-transform hover:scale-130 {item.colorIndex === p.id ? 'ring-2 ring-offset-1 ring-link scale-110' : 'opacity-70 hover:opacity-100'}"
										style="background-color: {p.hex};"
										onclick={() => highlightStore.setColor(item.id, p.id)}
										title="{p.name}"
										aria-label="{p.name}"
									></button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

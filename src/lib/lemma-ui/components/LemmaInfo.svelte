<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import * as StringUtils from '$lib/utils/string-utils.js';
	import Icon from './ui/icons/Icon.svelte';
	import BarsSvg from './ui/icons/colorful-bar-chart.svg';
	import BookOpenSvg from './ui/icons/book-open.svg';
	import BookSvg from './ui/icons/book.svg';
	import OptionButton from './ui/OptionButton.svelte';
	import Tabs from './ui/Tabs2.svelte';
	import BarChart from './ui/BarChart.svelte';
	import PieChart from './ui/PieChart.svelte';
	import LSJEntry from './LSJEntry.svelte';
	import BDBEntry from './BDBEntry.svelte';
	import TextsDisplay from './TextsDisplay.svelte';
	import CopyText from './ui/CopyText.svelte';
	import { formatMorphBadges, parseHebrewMorphSegments } from '$lib/utils/morph-utils.js';
	import {
		getWordFrequencyByBook,
		getConcordance,
		getLemmaTotalCount,
		getCorpusTotalWords,
		getCorpusBookWords,
		type BookFrequency,
		type ConcordanceOccurrence
	} from '$lib/services/dbClient';
	import {
		calcTotalFrequency,
		calcFreqRatio,
		floatRound,
		LemmaSectionStats,
		sortBookFrequencies,
		type ChartSortOption
	} from '$lib/utils/lex-stats';
	import { readerState } from '$lib/stores/readerState.svelte';
    import { mylog } from '../env/env';

	let { lemma }: { lemma: any } = $props();

	let selectedSegment = $state('stem');
	let totalCount = $state<number | null>(lemma?.total_count ?? lemma?.total ?? null);
	let showStats = $state(false);
	let showReferences = $state(false);
	let isFetchingStats = $state(false);
	let isFetchingReferences = $state(false);
	let selectedStatsTab = $state(0);
	const statsTabs = ['Basic Stats', 'Small Charts', 'Large Charts / Table'];

	let chartOptionIndex = $state(0);
	const chartOptions = ['Lemma Count', 'Frequency (per 1k)', 'Data Table'];
	let chartSortOption = $state<ChartSortOption>('canonical');

	let chosenBook = $state(readerState.selectedBook || '');
	let corpusWordsTotal = $state(0);
	let sectionBookWords = $state(0);

	let bookFrequencies = $state<BookFrequency[]>([]);
	let concordanceOccurrences = $state<ConcordanceOccurrence[]>([]);
		const currentLemmaData = $derived.by(() => {
		if (selectedSegment.startsWith('prefix-') && parsedHebrewMorph) {
			const idx = parseInt(selectedSegment.replace('prefix-', ''), 10);
			const p = parsedHebrewMorph.prefixes[idx];
			if (p) {
				return {
					lemma: p.headword,
					headword: p.headword,
					key: p.key,
					word: p.prefix,
					gloss: p.gloss,
					pos: p.name,
					strongs: p.strongs,
					corpus: lemma?.corpus || 'bhs',
					colVersion: lemma?.colVersion || 'BHS',
					dictionary: 'bdb',
					work_id: lemma?.work_id || 2,
					morph: p.code
				};
			}
		}
		return lemma;
	});
	const isHebrew = $derived(
		lemma?.corpus === 'bhs' || lemma?.colVersion === 'BHS' || lemma?.dictionary === 'bdb'
	);
	const lang = $derived(isHebrew ? 'hebrew' : 'greek');
	const corpusLabel = $derived(
		lemma?.colVersion || (isHebrew ? 'BHS' : (lemma?.corpus === 'ognt' || lemma?.corpus === 'sblgnt' || lemma?.corpus === 'opengnt') ? 'OpenGNT' : 'LXX')
	);

	// Reset segment and stats when active word changes
	function resetLemma() {
		selectedSegment = 'stem';
		bookFrequencies = [];
		concordanceOccurrences = [];
		totalCount = lemma?.total_count ?? lemma?.total ?? null;
		chosenBook = readerState.selectedBook || '';
		corpusWordsTotal = 0;
		sectionBookWords = 0;
	}

	function switchSegment(segmentId: string){
		selectedSegment = segmentId;
		// Reset stats when switching between prefix and stem segments
		bookFrequencies = [];
		showReferences = false;
		concordanceOccurrences = [];
		showStats = false;
		totalCount = null;
		chosenBook = readerState.selectedBook || '';
		corpusWordsTotal = 0;
		sectionBookWords = 0;
	}

	const parsedHebrewMorph = $derived.by(() => {
		if (!isHebrew || !lemma?.morph) return null;
		return parseHebrewMorphSegments(lemma.morph);
	});

	const lookupKey = $derived(currentLemmaData?.normalized || currentLemmaData?.plain || currentLemmaData?.lemma || currentLemmaData?.word || '');

	const totalOccurrences = $derived(
		totalCount !== null && totalCount !== undefined
			? totalCount
			: (bookFrequencies.reduce((sum, f) => sum + f.count, 0) || currentLemmaData?.total_count || currentLemmaData?.total || 0)
	);

	$effect(() => {
		const data = currentLemmaData;
		const workId = data?.work_id || lemma?.work_id;
		const key = lookupKey;
		const strongs = data?.strongs;

		if (selectedSegment === 'stem' && (lemma?.total_count !== undefined || lemma?.total !== undefined)) {
			totalCount = lemma?.total_count ?? lemma?.total ?? 0;
			return;
		}

		if (workId) {
			getLemmaTotalCount(workId, key, strongs)
				.then((cnt) => {
					totalCount = cnt;
				})
				.catch((err) => {
					console.warn('[LemmaInfo] Error loading total_count:', err);
				});
		}
	});

	async function loadStats() {
		if (bookFrequencies.length > 0 && corpusWordsTotal > 0) return;
		isFetchingStats = true;
		try {
			const workId = currentLemmaData?.work_id || lemma?.work_id;
			const corpusId = lemma?.corpus || (isHebrew ? 'wlc' : (lemma?.colVersion === 'LXX' ? 'swete_lxx' : (lemma?.corpus === 'ognt' ? 'ognt' : 'swete_lxx')));
			const [freqs, totalW] = await Promise.all([
				getWordFrequencyByBook(workId, lookupKey, currentLemmaData?.strongs),
				getCorpusTotalWords(corpusId)
			]);
			bookFrequencies = freqs;
			corpusWordsTotal = totalW;
			if (freqs && freqs.length > 0) {
				const sum = freqs.reduce((acc, f) => acc + f.count, 0);
				if (sum > 0) totalCount = sum;
			}
			if (!chosenBook && freqs.length > 0) {
				chosenBook = freqs[0].sbl_abbreviation || freqs[0].title;
			}
		} catch (err) {
			console.warn('[LemmaInfo] Error loading frequencies:', err);
		} finally {
			isFetchingStats = false;
		}
	}

	async function loadConcordance() {
		if (concordanceOccurrences.length > 0 || isFetchingReferences) return;
		isFetchingReferences = true;
		try {
			const workId = currentLemmaData?.work_id || lemma?.work_id;
			const occs = await getConcordance(workId, lookupKey, 0, currentLemmaData?.strongs);
			concordanceOccurrences = occs;
			if (occs && occs.length > 0 && (!totalCount || totalCount === 0)) {
				totalCount = occs.length;
			}
		} catch (err) {
			console.warn('[LemmaInfo] Error loading concordance:', err);
		} finally {
			isFetchingReferences = false;
		}
	}

	// Update sectionBookWords whenever chosenBook changes
	$effect(() => {
		const target = chosenBook;
		if (!target) return;
		const corpusId = lemma?.corpus || (isHebrew ? 'wlc' : (lemma?.colVersion === 'LXX' ? 'swete_lxx' : (lemma?.corpus === 'ognt' ? 'ognt' : 'swete_lxx')));
		const match = bookFrequencies.find(
			(b) => b.sbl_abbreviation === target || b.title === target
		);
		if (match?.book_words) {
			sectionBookWords = match.book_words;
		} else {
			getCorpusBookWords(corpusId, target).then((w) => {
				sectionBookWords = w;
			});
		}
	});

	const selectedBookFrequency = $derived.by(() => {
		if (!chosenBook || bookFrequencies.length === 0) return null;
		const clean = chosenBook.trim().toUpperCase();
		return (
			bookFrequencies.find(
				(b) => b.sbl_abbreviation?.toUpperCase() === clean || b.title?.toUpperCase() === clean
			) || null
		);
	});

	const sectionLexCount = $derived(selectedBookFrequency?.count ?? 0);

	const sectionStats = $derived.by(() => {
		return new LemmaSectionStats(
			sectionLexCount,
			totalOccurrences,
			sectionBookWords,
			corpusWordsTotal
		);
	});

	const activeBookDisplay = $derived(
		selectedBookFrequency?.title || chosenBook || 'Selected Book'
	);

	// Large Charts & Tables derived data
	const sortedFrequenciesForCount = $derived.by(() => {
		return sortBookFrequencies(bookFrequencies, chartSortOption, 'count');
	});

	const sortedFrequenciesForFreq = $derived.by(() => {
		return sortBookFrequencies(bookFrequencies, chartSortOption, 'freq');
	});

	const countChartData = $derived.by(() => {
		if (sortedFrequenciesForCount.length === 0) return null;
		return {
			labels: sortedFrequenciesForCount.map((f) => f.sbl_abbreviation || f.title),
			nums: sortedFrequenciesForCount.map((f) => f.count)
		};
	});

	const freqChartData = $derived.by(() => {
		if (sortedFrequenciesForFreq.length === 0) return null;
		return {
			labels: sortedFrequenciesForFreq.map((f) => f.sbl_abbreviation || f.title),
			nums: sortedFrequenciesForFreq.map((f) => floatRound((1000 * f.count) / (f.book_words || 1), 3))
		};
	});

	// Native Table Sorting & Pagination
	let sortKey = $state<'title' | 'count' | 'freq' | 'ratio'>('count');
	let sortAsc = $state(false);
	let currentPage = $state(1);
	const pageSize = 15;

	function toggleSort(key: 'title' | 'count' | 'freq' | 'ratio') {
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			sortAsc = key === 'title';
		}
		currentPage = 1;
	}

	const processedRows = $derived.by(() => {
		const avgFreq = sectionStats.freq.corpus;
		const rows = bookFrequencies.map((f) => {
			const freq = floatRound((1000 * f.count) / (f.book_words || 1), 3);
			const ratio = avgFreq > 0 ? floatRound(freq / avgFreq, 2) : 0;
			return {
				title: f.title,
				count: f.count,
				freq,
				ratio
			};
		});

		return rows.sort((a, b) => {
			const cmp = sortKey === 'title' ? a.title.localeCompare(b.title) : a[sortKey] - b[sortKey];
			return sortAsc ? cmp : -cmp;
		});
	});

	const totalPages = $derived(Math.ceil(processedRows.length / pageSize) || 1);
	const paginatedRows = $derived(
		processedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	// Small Charts derived data
	const pieChartData = $derived.by(() => {
		if (!sectionStats) return null;
		return {
			labels: [activeBookDisplay, `Rest of ${corpusLabel}`],
			nums: [sectionStats.lexCounts.section, sectionStats.lexCounts.rest]
		};
	});

	const ratioBarChartData = $derived.by(() => {
		if (!sectionStats) return null;
		return {
			labels: [activeBookDisplay, `Rest of ${corpusLabel}`],
			nums: [floatRound(sectionStats.freq.section, 3), floatRound(sectionStats.freq.rest, 3)]
		};
	});

	function navigateToOccurrence(displayLabel: string) {
		if (!displayLabel) return;
		const parts = displayLabel.trim().split(' ');
		if (parts.length >= 2) {
			const bookPart = parts.slice(0, -1).join(' ');
			const cvPart = parts[parts.length - 1];
			const [ch, v] = cvPart.split(':');
			readerState.navigateToReference(bookPart, ch || '1', v);
		}
	}

	/*$effect(()=>{
		const _ = selectedSegment;
		
	})*/

	onMount(()=>{
		resetLemma();
	});

	//$inspect('lemma', lemma)
</script>

<div class="items-center text-center">
	<!-- 1. Header with Lemma, Copy button, Gloss, POS, Strong's -->
	<div class="flex items-center justify-center gap-2 mb-2">
		<h1 class="text-3xl {isHebrew ? 'hebrew font-hebrew text-4xl' : 'greek font-greek'} font-bold text-ink">
			{currentLemmaData?.headword || currentLemmaData?.lemma || currentLemmaData?.word || ''}
		</h1>

		<CopyText copyText={currentLemmaData?.gloss ? `${currentLemmaData.headword || currentLemmaData.lemma || currentLemmaData.word} (${currentLemmaData.gloss})` : (currentLemmaData?.headword || currentLemmaData.lemma || currentLemmaData.word || '')} tooltip="Copy lemma" />
	</div>

	<div class="text-sm font-medium text-ink-soft mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
		{#if currentLemmaData?.gloss}
			<span><strong class="text-ink">Gloss:</strong> {currentLemmaData.gloss}</span>
		{/if}
		{#if currentLemmaData?.pos}
			<span class="text-rule opacity-60">•</span>
			<span><strong class="text-ink">POS:</strong> {currentLemmaData.pos}</span>
		{/if}
		{#if currentLemmaData?.strongs}
			<span class="text-rule opacity-60">•</span>
			<span><strong class="text-ink">Strong's:</strong> {currentLemmaData.strongs}</span>
		{/if}
		<span class="text-rule opacity-60">•</span>
		<span class="italic text-xs opacity-75">Corpus: {corpusLabel}</span>
	</div>

	<!-- Morpheme breakdown buttons for compound Hebrew words -->
	{#if parsedHebrewMorph && parsedHebrewMorph.prefixes.length > 0}
		<div class="flex items-center justify-center gap-2 mb-3">
			<span class="text-xs font-semibold uppercase text-ink-soft tracking-wider">Morphemes:</span>
			<div class="inline-flex rounded-lg p-0.5 bg-rule/30 border border-rule/50">
				{#each parsedHebrewMorph.prefixes as prefix, pIdx}
					{@const isSelected = selectedSegment === `prefix-${pIdx}`}
					<button
						type="button"
						class="px-2.5 py-1 text-xs rounded-md transition-colors font-medium flex items-center gap-1.5 cursor-pointer {isSelected ? 'bg-link text-white shadow-xs' : 'text-ink hover:bg-rule/40'}"
						onclick={() => {switchSegment(`prefix-${pIdx}`)}}
					>
						<span class="hebrew font-hebrew text-sm" dir="rtl">{prefix.prefix}</span>
						<span class="opacity-90">({prefix.name})</span>
					</button>
				{/each}
				<button
					type="button"
					class="px-2.5 py-1 text-xs rounded-md transition-colors font-medium flex items-center gap-1.5 cursor-pointer {selectedSegment === 'stem' ? 'bg-link text-white shadow-xs' : 'text-ink hover:bg-rule/40'}"
					onclick={() => switchSegment('stem')}
				>
					<span class="hebrew font-hebrew text-sm" dir="rtl">{lemma?.headword || lemma?.lemma || lemma?.word}</span>
					<span class="opacity-90">(Stem)</span>
				</button>
			</div>
		</div>
	{/if}

	<!-- 2. Inflected form and parse badges -->
	{#if currentLemmaData?.word || currentLemmaData?.morph}
		<div class="max-w-xl w-full mx-auto mb-3 px-3 py-2 rounded-lg border border-rule/70 bg-page shadow-xs text-center flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
			{#if currentLemmaData?.word}
				<div class="flex items-center gap-1.5">
					<span class="text-xs uppercase tracking-wide text-ink-soft font-semibold">Inflected:</span>
					<span class="{isHebrew ? 'hebrew font-hebrew text-2xl' : 'greek font-greek text-xl'} font-semibold text-ink">
						{currentLemmaData?.word}
					</span>
				</div>
			{/if}
			{#if currentLemmaData?.word && currentLemmaData?.morph}
				<span class="hidden sm:inline text-rule opacity-60">•</span>
			{/if}
			{#if currentLemmaData?.morph}
				{@const badges = formatMorphBadges(currentLemmaData?.morph, lang)}
				<div class="flex items-center gap-1.5 flex-wrap justify-center">
					<span class="text-xs uppercase tracking-wide text-ink-soft font-semibold">Parse:</span>
					{#each badges as badge}
						<span class="px-2 py-0.5 text-xs rounded-md bg-link/10 text-link border border-link/25 font-medium">
							{badge}
						</span>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- 3. Unabridged Dictionary Entry (BDB or LSJ) -->
	<div class="max-w-xl mx-auto px-2">
		{#if isHebrew}
			<BDBEntry lemma={currentLemmaData} lang="hebrew" dbAbbrev="bhs" autoOpen={false} />
		{:else}
			<LSJEntry lemma={currentLemmaData} lang="greek" dbAbbrev={currentLemmaData?.corpus || 'lxx'} autoOpen={false} />
		{/if}
	</div>

	<!-- 4. Action Buttons (Stats & Concordance) -->
	<div class="my-3 flex flex-wrap items-center justify-center gap-2">
		<OptionButton
			bind:selected={showStats}
			buttonText=""
			customClickHandler={() => {
				showReferences = false;
				if (showStats) loadStats();
			}}
		>
			<Icon svg={BarsSvg} />Stats & Charts
		</OptionButton>

		<OptionButton
			bind:selected={showReferences}
			buttonText=""
			customClickHandler={() => {
				showStats = false;
				if (showReferences) loadConcordance();
			}}
		>
			{#if isFetchingReferences}
				<span class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
			{:else if showReferences}
				<Icon svg={BookOpenSvg} />
			{:else}
				<Icon svg={BookSvg} />
			{/if}
			See {totalOccurrences} Occurrences
		</OptionButton>
	</div>

	<!-- 5. Stats & Charts Panel -->
	{#if showStats}
		<hr class="my-4 border-rule opacity-60" />
		<div class="max-w-2xl mx-auto text-center">
			<h2 class="text-xl font-bold pb-1 text-ink text-center">Stats and Charts</h2>
			<span class="block text-center text-xs text-ink-soft opacity-70 mb-2 italic">
				Advanced lexeme distribution and comparative frequencies across {corpusLabel}
			</span>

			<Tabs headings={statsTabs} bind:selectedTabIndex={selectedStatsTab} classes={['my-2']} />

			{#if isFetchingStats}
				<div class="py-8 text-center flex flex-col items-center justify-center gap-2">
					<span class="inline-block w-8 h-8 border-4 border-link border-t-transparent rounded-full animate-spin"></span>
					<span class="text-sm text-ink-soft font-medium">Loading corpus and book statistics...</span>
				</div>
			{:else if bookFrequencies.length === 0}
				<div class="py-6 text-center text-sm text-ink-soft">
					No frequency distribution records found for this lemma.
				</div>
			{:else}
				<!-- Book Selector Dropdown (visible in Basic Stats and Small Charts) -->
				{#if selectedStatsTab === 0 || selectedStatsTab === 1}
					<div class="my-3 flex items-center justify-center gap-2">
						<span class="text-xs font-semibold text-ink-soft uppercase tracking-wider">Book:</span>
						<select
							bind:value={chosenBook}
							class="border border-rule bg-page text-ink rounded-lg px-2.5 py-1 text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-link/30 cursor-pointer"
						>
							{#if chosenBook && !bookFrequencies.some((b) => b.sbl_abbreviation === chosenBook || b.title === chosenBook)}
								<option value={chosenBook}>{chosenBook} (Reading View - 0 occurrences)</option>
							{/if}
							{#each bookFrequencies as b}
								<option value={b.sbl_abbreviation || b.title}>{b.title} ({b.count})</option>
							{/each}
						</select>
					</div>
				{/if}

				{#if selectedStatsTab === 0}
					<!-- Tab 0: Basic Stats -->
					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 my-4">
						<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs text-center">
							<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Section Word Count</div>
							<div class="text-2xl font-bold text-link my-1">{sectionStats.lexCounts.section}</div>
							<div class="text-xs text-ink-soft opacity-80">Total in {activeBookDisplay}</div>
						</div>

						<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs text-center">
							<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Rest of {corpusLabel} Count</div>
							<div class="text-2xl font-bold text-link my-1">{sectionStats.lexCounts.rest}</div>
							<div class="text-xs text-ink-soft opacity-80">Excluding {activeBookDisplay}</div>
						</div>

						<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs text-center">
							<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Section Frequency</div>
							<div class="text-2xl font-bold text-link my-1">{sectionStats.freq.section.toFixed(3)}</div>
							<div class="text-xs text-ink-soft opacity-80">Per 1,000 words in {activeBookDisplay}</div>
						</div>

						<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs text-center">
							<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Rest of {corpusLabel} Freq</div>
							<div class="text-2xl font-bold text-link my-1">{sectionStats.freq.rest.toFixed(3)}</div>
							<div class="text-xs text-ink-soft opacity-80">Per 1,000 words</div>
						</div>

						<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs text-center">
							<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">% of {corpusLabel} Use</div>
							<div class="text-2xl font-bold text-link my-1">{sectionStats.percentageUse.toFixed(1)}%</div>
							<div class="text-xs text-ink-soft opacity-80">{activeBookDisplay}'s share of total</div>
						</div>

						<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs text-center">
							<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">{corpusLabel} Count</div>
							<div class="text-2xl font-bold text-link my-1">{totalOccurrences}</div>
							<div class="text-xs text-ink-soft opacity-80">Total across entire corpus</div>
						</div>

						<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs text-center sm:col-span-2 md:col-span-3">
							<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Average {corpusLabel} Frequency</div>
							<div class="text-2xl font-bold text-link my-1">{sectionStats.freq.corpus.toFixed(3)}</div>
							<div class="text-xs text-ink-soft opacity-80">
								Per 1,000 words in entire corpus ({corpusWordsTotal > 0 ? corpusWordsTotal.toLocaleString() : '—'} words)
							</div>
						</div>
					</div>

				{:else if selectedStatsTab === 1}
					<!-- Tab 1: Small Charts -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
						<!-- Pie Chart: Section vs Rest of Corpus -->
						<div class="p-4 rounded-xl border border-rule bg-page shadow-xs flex flex-col items-center">
							<h3 class="text-sm font-semibold text-ink mb-1">{activeBookDisplay} vs. {corpusLabel} Count</h3>
							<div class="my-2 max-w-[220px] w-full">
								{#if pieChartData}
									{#key chosenBook + sectionStats.lexCounts.section}
										<PieChart pieData={pieChartData} />
									{/key}
								{/if}
							</div>
							<div class="text-xl font-bold text-link mt-1">{sectionStats.percentageUse.toFixed(1)}%</div>
							<p class="text-xs text-ink-soft opacity-80 mt-0.5">
								{activeBookDisplay}'s share of {corpusLabel}'s total use of this word
							</p>
						</div>

						<!-- Frequency Ratio Bar Chart -->
						<div class="p-4 rounded-xl border border-rule bg-page shadow-xs flex flex-col items-center">
							<h3 class="text-sm font-semibold text-ink mb-1">{activeBookDisplay} vs. Rest of {corpusLabel}: Freq Ratio</h3>
							<div class="my-2 w-full max-w-[280px]">
								{#if ratioBarChartData}
									{#key chosenBook + sectionStats.freqRatio}
										<BarChart
											barData={ratioBarChartData}
											yAxisLabel="Frequency (#/1000)"
											corpusAbbrev={corpusLabel}
										/>
									{/key}
								{/if}
							</div>
							<div class="text-xl font-bold text-link mt-1">{floatRound(sectionStats.freqRatio, 2)}x</div>
							<p class="text-xs text-ink-soft opacity-80 mt-0.5">
								(1.0 = same frequency; 2.0 = 2x more; 0.5 = half as frequent)
							</p>
						</div>
					</div>

				{:else if selectedStatsTab === 2}
					<!-- Tab 2: Large Charts / Table -->
					<div class="mt-2 mb-4 text-center">
						<div class="flex flex-wrap items-center justify-center gap-3 mb-3">
							<select
								bind:value={chartOptionIndex}
								class="border border-rule bg-page text-ink rounded-lg px-3 py-1.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-link/30 inline-block self-center text-center cursor-pointer"
							>
								{#each chartOptions as name, index}
									<option value={index}>{name}</option>
								{/each}
							</select>

							{#if chartOptionIndex === 0 || chartOptionIndex === 1}
								<div class="inline-flex items-center gap-1.5 text-xs text-ink-soft">
									<label for="chart-sort-select" class="font-medium">Sort by:</label>
									<select
										id="chart-sort-select"
										bind:value={chartSortOption}
										class="border border-rule bg-page text-ink rounded-lg px-2.5 py-1.5 text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-link/30 cursor-pointer"
									>
										<option value="canonical">Canonical Book Order</option>
										<option value="value-desc">Data Value (Highest First)</option>
										<option value="value-asc">Data Value (Lowest First)</option>
									</select>
								</div>
							{/if}
						</div>

						{#if chartOptionIndex === 0 && countChartData}
							<div class="my-3">
								{#key `${chartSortOption}-${countChartData.labels.join(',')}`}
									<BarChart barData={countChartData} horizontal={true} corpusAbbrev={corpusLabel} />
								{/key}
							</div>
						{:else if chartOptionIndex === 1 && freqChartData}
							<div class="my-3">
								<p class="text-xs text-ink-soft opacity-80 italic mb-2">
									Normalized frequency per 1,000 words in each biblical book
								</p>
								{#key `${chartSortOption}-${freqChartData.labels.join(',')}`}
									<BarChart
										barData={freqChartData}
										horizontal={true}
										yAxisLabel="Frequency (#/1000)"
										corpusAbbrev={corpusLabel}
									/>
								{/key}
							</div>
						{:else if chartOptionIndex === 2 && processedRows.length > 0}
							<div class="my-3 text-left">
								<div class="overflow-x-auto rounded-xl border border-rule bg-page shadow-xs">
									<table class="w-full text-left text-sm border-collapse">
										<thead class="bg-base-200/60 border-b border-rule text-xs font-semibold uppercase tracking-wider text-ink-soft select-none">
											<tr>
												<th class="py-2.5 px-3.5 cursor-pointer hover:text-link transition-colors" onclick={() => toggleSort('title')}>
													Book {sortKey === 'title' ? (sortAsc ? '▲' : '▼') : ''}
												</th>
												<th class="py-2.5 px-3.5 text-right cursor-pointer hover:text-link transition-colors" onclick={() => toggleSort('count')}>
													Count {sortKey === 'count' ? (sortAsc ? '▲' : '▼') : ''}
												</th>
												<th class="py-2.5 px-3.5 text-right cursor-pointer hover:text-link transition-colors" onclick={() => toggleSort('freq')}>
													Freq (#/1k) {sortKey === 'freq' ? (sortAsc ? '▲' : '▼') : ''}
												</th>
												<th class="py-2.5 px-3.5 text-right cursor-pointer hover:text-link transition-colors" onclick={() => toggleSort('ratio')}>
													Freq Ratio {sortKey === 'ratio' ? (sortAsc ? '▲' : '▼') : ''}
												</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-rule/30">
											{#each paginatedRows as row}
												<tr class="hover:bg-base-200/40 transition-colors">
													<td class="py-2.5 px-3.5 font-medium text-ink">{row.title}</td>
													<td class="py-2.5 px-3.5 text-right text-ink font-semibold">{row.count}</td>
													<td class="py-2.5 px-3.5 text-right text-ink-soft">{row.freq.toFixed(3)}</td>
													<td class="py-2.5 px-3.5 text-right text-link font-medium">{row.ratio > 0 ? `${row.ratio.toFixed(2)}x` : '-'}</td>
												</tr>
											{/each}
										</tbody>
									</table>

									{#if totalPages > 1}
										<div class="flex items-center justify-between px-3.5 py-2.5 border-t border-rule bg-base-200/30 text-xs text-ink-soft">
											<span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, processedRows.length)} of {processedRows.length} books</span>
											<div class="flex items-center gap-1.5">
												<button
													type="button"
													disabled={currentPage === 1}
													onclick={() => currentPage--}
													class="px-2.5 py-1 rounded border border-rule bg-page text-ink hover:bg-base-200/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
												>Prev</button>
												<span class="px-2 font-medium">{currentPage} / {totalPages}</span>
												<button
													type="button"
													disabled={currentPage === totalPages}
													onclick={() => currentPage++}
													class="px-2.5 py-1 rounded border border-rule bg-page text-ink hover:bg-base-200/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
												>Next</button>
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	<!-- 6. Concordance References Panel -->
	{#if showReferences}
		<hr class="my-4 border-rule opacity-60" />
		<div class="max-w-2xl mx-auto text-left">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-xl font-bold text-ink">Concordance Instances</h2>
				<span class="text-xs font-medium text-ink-soft">
					{concordanceOccurrences.length} verse references loaded
				</span>
			</div>

			{#if isFetchingReferences}
				<div class="py-8 text-center flex flex-col items-center justify-center gap-2">
					<span class="inline-block w-8 h-8 border-4 border-link border-t-transparent rounded-full animate-spin"></span>
					<span class="text-sm text-ink-soft font-medium">Querying SQLite for concordance references...</span>
				</div>
			{:else if concordanceOccurrences.length === 0}
				<div class="py-6 text-center text-sm text-ink-soft">
					No verse occurrences found for this lemma.
				</div>
			{:else}
				{#key concordanceOccurrences}
				<TextsDisplay
					occurrences={concordanceOccurrences}
					lang={lang}
					dbAbbrev={isHebrew ? 'bhs' : 'lxx'}
				/>
				{/key}
			{/if}
		</div>
	{/if}
</div>
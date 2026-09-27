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
	import Grid from 'gridjs-svelte';
	import LSJEntry from './LSJEntry.svelte';
	import BDBEntry from './BDBEntry.svelte';
	import TextsDisplay from './TextsDisplay.svelte';
	import CopyText from './ui/CopyText.svelte';
	import { formatMorphBadges, parseHebrewMorphSegments } from '$lib/utils/morph-utils.js';
	import {
		getWordFrequencyByBook,
		getConcordance,
		type BookFrequency,
		type ConcordanceOccurrence
	} from '$lib/services/dbClient';
	import { readerState } from '$lib/stores/readerState.svelte';
    import { mylog } from '../env/env';

	let { lemma }: { lemma: any } = $props();

	let selectedSegment = $state('stem');
	let showStats = $state(false);
	let showReferences = $state(false);
	let isFetchingStats = $state(false);
	let isFetchingReferences = $state(false);
	let selectedStatsTab = $state(0);
	let chartOptionIndex = $state(0);
	const chartOptions = ['Bar Chart', 'Pie Chart', 'Data Table'];

	let bookFrequencies = $state<BookFrequency[]>([]);
	let concordanceOccurrences = $state<ConcordanceOccurrence[]>([]);

	const isHebrew = $derived(
		lemma?.corpus === 'bhs' || lemma?.colVersion === 'BHS' || lemma?.dictionary === 'bdb'
	);
	const lang = $derived(isHebrew ? 'hebrew' : 'greek');
	const corpusLabel = $derived(
		lemma?.colVersion || (isHebrew ? 'BHS' : lemma?.corpus === 'sblgnt' ? 'SBLGNT' : 'LXX')
	);

	// Reset segment and stats when active word changes
	function resetLemma() {
		
		selectedSegment = 'stem';
		bookFrequencies = [];
		concordanceOccurrences = [];
	}

	function switchSegment(segmentId: string){
		selectedSegment = segmentId;
			// Reset stats when switching between prefix and stem segments
		bookFrequencies = [];
		showReferences=false;
		concordanceOccurrences = [];
		showStats=false;
	}


	const parsedHebrewMorph = $derived.by(() => {
		if (!isHebrew || !lemma?.morph) return null;
		return parseHebrewMorphSegments(lemma.morph);
	});

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

	const totalOccurrences = $derived(
		bookFrequencies.reduce((sum, f) => sum + f.count, 0) || currentLemmaData?.total || 0
	);

	const lookupKey = $derived(currentLemmaData?.normalized || currentLemmaData?.plain || currentLemmaData?.lemma || currentLemmaData?.word || '');

	async function loadStats() {
		if (bookFrequencies.length > 0 || isFetchingStats) return;
		isFetchingStats = true;
		try {
			const workId = currentLemmaData?.work_id || lemma?.work_id;
			const freqs = await getWordFrequencyByBook(workId, lookupKey, currentLemmaData?.strongs);
			bookFrequencies = freqs;
		} catch (err) {
			console.warn('[LemmaInfo] Error loading frequencies:', err);
		} finally {
			isFetchingStats = false;
		}
	}

	async function loadConcordance() {
		mylog("loadConcordance()", true);
		if (concordanceOccurrences.length > 0 || isFetchingReferences) return;
		isFetchingReferences = true;
		try {
			const workId = currentLemmaData?.work_id || lemma?.work_id;
			const occs = await getConcordance(workId, lookupKey, 0, currentLemmaData?.strongs);
			concordanceOccurrences = occs;
		} catch (err) {
			console.warn('[LemmaInfo] Error loading concordance:', err);
		} finally {
			isFetchingReferences = false;
		}
	}

	const chartData = $derived.by(() => {
		if (bookFrequencies.length === 0) return null;
		return {
			labels: bookFrequencies.map((f) => f.sbl_abbreviation || f.title),
			nums: bookFrequencies.map((f) => f.count)
		};
	});

	const tableData = $derived.by(() => {
		if (bookFrequencies.length === 0) return null;
		return {
			columns: ['Book', 'Occurrences', 'Share (%)'],
			data: bookFrequencies.map((f) => [
				f.title,
				f.count,
				totalOccurrences > 0 ? ((100 * f.count) / totalOccurrences).toFixed(1) + '%' : '-'
			])
		};
	});

	const statsTabs = ['Distribution & Charts', 'Basic Summary'];

	function navigateToOccurrence(displayLabel: string) {
		if (!displayLabel) return;
		const parts = displayLabel.trim().split(' ');
		if (parts.length >= 2) {
			const bookPart = parts.slice(0, -1).join(' ');
			const cvPart = parts[parts.length - 1];
			const [ch, v] = cvPart.split(':');
			readerState.closeAllPopups();
			readerState.selectBook(bookPart);
			if (ch) readerState.selectChapter(ch);
			if (v) {
				setTimeout(() => {
					readerState.scrollToVerse(v);
				}, 200);
			}
		}
	}
	onMount(()=>{
		resetLemma();
	});

	$inspect('lemma', lemma)
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
					onclick={() => selectedSegment = 'stem'}
				>
					<span class="hebrew font-hebrew text-sm" dir="rtl">{lemma?.headword || lemma?.lemma || lemma?.word}</span>
					<span class="opacity-90">(Stem)</span>
				</button>
			</div>
		</div>
	{/if}

	<!-- 2. Inflected form and parse badges -->
	{#if lemma?.word || lemma?.morph}
		<div class="max-w-xl w-full mx-auto mb-3 px-3 py-2 rounded-lg border border-rule/70 bg-page shadow-xs text-center flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
			{#if lemma?.word}
				<div class="flex items-center gap-1.5">
					<span class="text-xs uppercase tracking-wide text-ink-soft font-semibold">Inflected:</span>
					<span class="{isHebrew ? 'hebrew font-hebrew text-2xl' : 'greek font-greek text-xl'} font-semibold text-ink">
						{lemma.word}
					</span>
				</div>
			{/if}
			{#if lemma?.word && lemma?.morph}
				<span class="hidden sm:inline text-rule opacity-60">•</span>
			{/if}
			{#if lemma?.morph}
				{@const badges = formatMorphBadges(lemma.morph, lang)}
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
			<LSJEntry lemma={currentLemmaData} lang="greek" dbAbbrev={lemma?.corpus || 'lxx'} autoOpen={false} />
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
			See {lemma.total ?? ''} Occurrences
		</OptionButton>
	</div>

	<!-- 5. Stats & Charts Panel -->
	{#if showStats}
		<hr class="my-4 border-rule opacity-60" />
		<div class="max-w-2xl mx-auto text-center">
			<h2 class="text-xl font-bold pb-1 text-ink text-center">Frequency Distribution</h2>

			<Tabs headings={statsTabs} bind:selectedTabIndex={selectedStatsTab} classes={['my-2']} />

			{#if isFetchingStats}
				<div class="py-8 text-center flex flex-col items-center justify-center gap-2">
					<span class="inline-block w-8 h-8 border-4 border-link border-t-transparent rounded-full animate-spin"></span>
					<span class="text-sm text-ink-soft font-medium">Querying SQLite for book frequencies...</span>
				</div>
			{:else if bookFrequencies.length === 0}
				<div class="py-6 text-center text-sm text-ink-soft">
					No frequency distribution records found for this lemma.
				</div>
			{:else if selectedStatsTab === 0}
				<!-- Distribution & Charts -->
				<div class="mt-2 mb-4 text-center">
					<select
						bind:value={chartOptionIndex}
						class="border border-rule bg-page text-ink rounded-lg px-3 py-1.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-link/30 inline-block self-center text-center cursor-pointer"
					>
						{#each chartOptions as name, index}
							<option value={index}>{name}</option>
						{/each}
					</select>

					{#if chartOptionIndex === 0 && chartData}
						<div class="my-3">
							<BarChart barData={chartData} horizontal={true} corpusAbbrev={corpusLabel} />
						</div>
					{:else if chartOptionIndex === 1 && chartData}
						<div class="my-3 max-w-md mx-auto">
							<PieChart pieData={chartData} title="Distribution by Book" />
						</div>
					{:else if chartOptionIndex === 2 && tableData}
						<div class="my-3 text-left">
							<Grid
								data={tableData.data}
								sort={true}
								columns={tableData.columns}
								pagination={{ limit: 15 }}
							/>
						</div>
					{/if}
				</div>
			{:else if selectedStatsTab === 1}
				<!-- Basic Summary -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
					<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs">
						<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Total Occurrences</div>
						<div class="text-2xl font-bold text-link my-1">{totalOccurrences}</div>
						<div class="text-xs text-ink-soft opacity-80">Across {corpusLabel}</div>
					</div>
					<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs">
						<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Top Book</div>
						<div class="text-2xl font-bold text-link my-1">{bookFrequencies[0]?.sbl_abbreviation || '-'}</div>
						<div class="text-xs text-ink-soft opacity-80">{bookFrequencies[0]?.count || 0} occurrences</div>
					</div>
					<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs">
						<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Books with Word</div>
						<div class="text-2xl font-bold text-link my-1">{bookFrequencies.length}</div>
						<div class="text-xs text-ink-soft opacity-80">Distinct biblical books</div>
					</div>
				</div>
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

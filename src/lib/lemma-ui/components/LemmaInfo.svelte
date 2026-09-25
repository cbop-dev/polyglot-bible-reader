<!--- 
NB: this module has been made to not be (very) reactive to the properties sent to it by the parent, because the data charts do not react well to dynamic changes. 
THUS: any instance used by the parent should be destroyed and re-rendered when the lemma or sections properties change. 
That is, the <LemmaInfo> tag should be surrounded by tags such as : {#key lemma ... } {/key} 

-->
<script>
	import { VocabDataset, TfDataset } from '../data/VocabDataset.js';
	import { Lexeme, LemmaSectionStats } from '../Lexeme.js';
	import * as BibleUtils from '$lib/utils/bible-utils.js';
	import * as StringUtils from '$lib/utils/string-utils.js';
	import Icon from '../components/ui/icons/Icon.svelte';
	import BarsSvg from '../components/ui/icons/colorful-bar-chart.svg';
	import BookOpenSvg from '../components/ui/icons/book-open.svg';
	import BookSvg from '../components/ui/icons/book.svg';
	//import { getQueriesForElement, queryAllByAltText } from "@storybook/test";
	import OptionButton from './ui/OptionButton.svelte';
	import LemmaRefs from './LemmaRefs.svelte';
	import { onMount } from 'svelte';
	import { innerWidth } from 'svelte/reactivity/window';
	import Button from '../components/ui/Button.svelte';
	import Tabs from '../components/ui/Tabs2.svelte';
	import BarChart from './ui/BarChart.svelte';
	import PieChart from './ui/PieChart.svelte';
	import { LexQuery } from './LexQuery.svelte';
	import { untrack } from 'svelte';
	import { VocabEngine, TF } from '../engine/VocabEngine.js';
	

	import Grid from 'gridjs-svelte';
	import { mylog } from "../env/env.js"
	import Loading from './ui/Loading.svelte';
	import LSJEntry from './LSJEntry.svelte';
	import BDBEntry from './BDBEntry.svelte';
	import CopyText from './ui/CopyText.svelte';
	import { formatMorphBadges } from '$lib/utils/morph-utils.js';

	/**
	 * @typedef LemmaInfoProps
	 * @property {Lexeme} lemma
	 * @property {TfDataset} tfData
	 * @property {LexQuery} corpusRefsQuery
	 * @property {LexQuery} sectionRefsQuery
	 * @property {number} [sectionWords=0]
	 * @property {number[]} [sections=[]]
	 *
	 */
	/**
	 * @type {LemmaInfoProps} props
	 */
	let {
		tfData,
		/**
		 * @type {Lexeme} lemma
		 **/
		lemma,
		//sectionWords = 0,
		corpusRefsQuery = new LexQuery(),
		sectionRefsQuery = new LexQuery(),
		sections = [],
		//bookId=0,//optional
	} = $props();
	
	
	let showReferences = $state(false);
	let showSectionReferences = $state(false);
	let isFetchingReferences = $state(false);
	let selectedMainTab=$state(0);
	let selectedStatsTab = $state(0);
	let bookIdSelectOption = $state(0);
	let chosenBookId = $state(0);
	let sectionStats=$derived(
		chosenBookId 
			? (lemma.stats.bookStats[chosenBookId] || lemma.stats.bookStats[String(chosenBookId)] || new LemmaSectionStats()) 
			: lemma.stats.querySectionStats
	);
	let sectionWords = $derived(sectionStats?.words?.section);
	//let userSelectedSections=$derived(chosenBookId ? [chosenBookId] : sections);
	//todo make use of chosenBookId;
	let userSelectedSections=$derived(
		 sectionRefsQuery?.sections?.length ? [...sectionRefsQuery.sections] 
		 : 
			sections.length ?
				sections	
			:
				[]
	);

	let theLemma=$state(lemma.copy());
	/**
	 *
	 * @param text {string}
	 */
	function copyToClipboard(text) {
		navigator.clipboard.writeText(text);
	}

	function lemmaDetailsClick() {}

	//let corpusRefsQuery = $state(new LexQuery());
	//let sectionRefsQuery = $state(new LexQuery());

	let showStats = $state(false);
	function floatRound(float, decimals = 3) {
		const factor = Math.pow(10, decimals);
		return Math.round(float * factor) / factor;
	}

	$effect(()=>{
		if (!showStats){
			selectedStatsTab = 0;		
			
			
		}
		if (!tabs[selectedStatsTab].includes("Large")){
			lemmaBookCountChartOptionIndex=lemmaBookCountChartOptions.length-1;
		}

	})


	/**
	 * @type {{nums: number[], labels: string[]}|null}
	 */
	let lemmaBookCountsChartData = $derived.by(() => {
		if (corpusRefsQuery.ready && corpusRefsQuery?.results?.bookCounts) {
			return untrack(()=>{
				return {
				nums: Object.values(corpusRefsQuery.results.bookCounts),
				labels: Object.keys(corpusRefsQuery.results.bookCounts)?.map(
					(id) => tfData?.booksDict?.books?.[Number(id)]?.abbrev || id
				)
			}});
		} else {
			return null;
		}
	});
	let lemmaCorpusFreq = $derived(lemma.stats.totalFreq); 

	let lemmaBookCountChartOptionIndex = $state(0);
	let lemmaBookCountChartOptions = ['Lemma Count', 'Frequency', 'Data Table'];

	let lemmaBookFreqChartData = $derived.by(() => {
		if (corpusRefsQuery.ready && corpusRefsQuery.results.bookCounts) {
			return  untrack(()=>{
				return {
				nums: Object.entries(corpusRefsQuery.results.bookCounts).map(
					([id, count]) => (1000 * count) / (tfData?.booksDict?.books?.[Number(id)]?.words || 1)
				),
				labels: Object.keys(corpusRefsQuery.results.bookCounts).map(
					(id) => tfData?.booksDict?.books?.[Number(id)]?.abbrev || id
				)
			}});
		} else {
			return null;
		}
	});

	let lemmaBookTable = $derived.by(() => {
		if (!lemmaBookCountsChartData || !lemmaBookFreqChartData) return null;
		else {
			mylog('generating lemmaBookTable rows...');
			return untrack(()=>{
				return {
				data: lemmaBookCountsChartData.nums.map((count, index) => [
					lemmaBookCountsChartData.labels[index],
					count,
					floatRound(lemmaBookFreqChartData.nums[index].toFixed(3), 3),
					floatRound(lemmaBookFreqChartData.nums[index] / lemma.stats.totalFreq, 3)
				]),
				columns: ['Book', 'Count', 'Freq', 'Freq ratio']
			}});

			//dummy data to test
			/*return {
            data: [
                ["Jack", 2, 3.5],
                ["Jill", 4, 6.5],
                ["George", 9, 0.5],
            ],
            columns: ["Book", "Count", "Freq"] 
       }*/
		}
	});
	$effect(() => {
		if (innerWidth.current) {
			//Bar Chart resizing can cause a recursive loop that crashes the browser window.  :-(
			// Change tabs! BUT, we need to use untrack to avoid causing yet ANOTHER recursive loop!
			selectedStatsTab = untrack(() => (tabs[selectedStatsTab].includes("Large") ? 0 : selectedStatsTab));
		}
	});
	

	function populateBookStats() {
		if (!corpusRefsQuery?.results?.bookCounts || !tfData) return;
		const totalCorpusWords = tfData.lexStats?.totalWords || 1;
		const totalCorpusCount = lemma.stats.total || 0;
		for (const [key, count] of Object.entries(corpusRefsQuery.results.bookCounts)) {
			const numKey = Number(key);
			const bKey = !isNaN(numKey) ? numKey : key;
			const bookWords = tfData.booksDict?.books?.[bKey]?.words || tfData.booksDict?.books?.[key]?.words || 1;
			lemma.stats.addAndCalcBookSectionStatsIfNeeded('book', bKey, count, bookWords, totalCorpusCount, totalCorpusWords, true);
		}
		// Trigger reactivity in Svelte
		lemma.stats.bookStats = { ...lemma.stats.bookStats };
	}

	$effect(() => {
		if (corpusRefsQuery.ready && corpusRefsQuery.results?.bookCounts) {
			populateBookStats();
		}
	});

	let availableBookIds = $derived.by(() => {
		const source = (corpusRefsQuery?.results?.bookCounts && Object.keys(corpusRefsQuery.results.bookCounts).length > 0)
			? corpusRefsQuery.results.bookCounts
			: (lemma.stats.bookStats || {});
		return Object.keys(source).sort((a, b) => {
			const na = Number(a), nb = Number(b);
			if (!isNaN(na) && !isNaN(nb)) return na - nb;
			return String(a).localeCompare(String(b));
		});
	});

	async function handleSeeReferencesClick() {
		mylog("handleSeeReferencesClick() begun...", true);
		showStats = false;
		showSectionReferences = false;
		
		if (!showReferences) {
			mylog("!showReferences -- stopping!", true);
			return;
		}
		else if (!corpusRefsQuery.ready && (lemma?.id != null && lemma?.id !== '' && lemma?.id !== -1)) {
			isFetchingReferences = true;
			// Yield a tick/timeout so the browser renders the loading spinner
			await new Promise(r => setTimeout(r, 20));
			mylog("handleSeeReferencesClick(): about to try fetchingh.", true);
			try {
				await VocabEngine.fetchRefs(lemma.id, null, corpusRefsQuery, tfData?.dbAbbrev || 'lxx');
				populateBookStats();
				mylog("handleSeeReferencesClick(): populatedbooksStats() called and finished.", true)
			} finally {
				isFetchingReferences = false;
				corpusRefsQuery.ready=true;
			}
		}
		else{
			mylog(`handleSeeReferencesClick did nothing 'cause !corpusRefsQuery.ready && (lemma?.id != null && lemma?.id !== '' && lemma?.id !== -1) was false`, true);
		}
	}

	onMount(() => {
		if (sectionRefsQuery && !sectionRefsQuery.ready && (lemma?.id != null && lemma?.id !== '' && lemma?.id !== -1)) {
			VocabEngine.fetchRefs(lemma.id, userSelectedSections, sectionRefsQuery, tfData?.dbAbbrev || 'lxx');
		}
		if (corpusRefsQuery && !corpusRefsQuery.ready && (lemma?.id != null && lemma?.id !== '' && lemma?.id !== -1)) {
			VocabEngine.fetchRefs(lemma.id, null, corpusRefsQuery, tfData?.dbAbbrev || 'lxx').then(() => {
				populateBookStats();
			});
		}
	});

	let zoomCharts = $state(false);
	let querySectionRef = $derived(
		tfData.booksDict.combineRefs(userSelectedSections.length ? userSelectedSections.map((sId) => tfData.booksDict.getRef(sId)) : [])
	);
	let sectionRef = $derived(
		chosenBookId
			? tfData.booksDict.getRef(chosenBookId)
			: tfData.booksDict.combineRefs(userSelectedSections.length ? userSelectedSections.map((sId) => tfData.booksDict.getRef(sId)) : [])
	);

	const tabs = true || userSelectedSections.length || chosenBookId
		? ['Basic Stats', 'Small Charts', 'Large Charts/Table']
		: ['Basic Stats', 'Large Charts/Table'];
	//$inspect('bookcounts chart data:', lemmaBookCountsChartData);
	//$inspect("tfData.lexStats.totalWords=",tfData.lexStats.totalWords);
	//$inspect("corpusRefsQuery:", corpusRefsQuery);
	//mylog("WHAT HEREHE!",true)
	//$inspect(`lemma.bookStats(len=${Object.keys(lemma.stats.bookStats).length})`,lemma.stats.bookStats);
	//$inspect("userSelectedSections=",userSelectedSections);
	$inspect("showReferences", showReferences);
</script>

<div class="items-center text-center">
	<div class="flex items-center justify-center gap-2 mb-2">
		<h1 class="text-3xl {tfData?.lang === 'hebrew' || tfData?.dbAbbrev === 'bhs' ? 'hebrew font-hebrew text-4xl' : 'greek font-greek'} font-bold text-ink">{lemma.lemma}</h1>
		<CopyText copyText={lemma.gloss ? `${lemma.lemma} (${lemma.gloss})` : lemma.lemma} tooltip="Copy lemma" />
	</div>

	<div class="text-sm font-medium text-ink-soft mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
		<span><strong class="text-ink">Gloss:</strong> {lemma.gloss}</span>
		<span class="text-rule opacity-60">•</span>
		<span><strong class="text-ink">POS:</strong> {lemma.posEnums.map((p) => (Lexeme.getPosFromEnum(p)?.desc || tfData?.posDict?.[p]?.desc || 'Unspecified')).join(', ')}</span>
		{#if lemma.strongs}
			<span class="text-rule opacity-60">•</span>
			<span><strong class="text-ink">Strongs:</strong> {lemma.strongs}</span>
		{/if}
		<span class="text-rule opacity-60">•</span>
		<span class="italic text-xs opacity-75">ID: {lemma.id}</span>
	</div>

	{#if lemma.word || lemma.morph}
		<div class="max-w-xl w-full mx-auto mb-3 px-3 py-2 rounded-lg border border-rule/70 bg-page shadow-xs text-center flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
			{#if lemma.word}
				<div class="flex items-center gap-1.5">
					<span class="text-xs uppercase tracking-wide text-ink-soft font-semibold">Inflected:</span>
					<span class="{tfData?.lang === 'hebrew' || tfData?.dbAbbrev === 'bhs' ? 'hebrew font-hebrew text-2xl' : 'greek font-greek text-xl'} font-semibold text-ink">
						{lemma.word}
					</span>
				</div>
			{/if}
			{#if lemma.word && lemma.morph}
				<span class="hidden sm:inline text-rule opacity-60">•</span>
			{/if}
			{#if lemma.morph}
				{@const badges = formatMorphBadges(lemma.morph, tfData?.lang || (tfData?.dbAbbrev === 'bhs' ? 'hebrew' : 'greek'))}
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

	{#if tfData?.lang === 'greek' || (tfData?.dbAbbrev !== 'bhs' && tfData?.lang !== 'hebrew')}
		<div class="max-w-xl mx-auto px-2">
			<LSJEntry {lemma} lang={tfData?.lang || 'greek'} dbAbbrev={tfData?.dbAbbrev || 'lxx'} />
		</div>
	{:else if tfData?.dbAbbrev === 'bhs' || tfData?.lang === 'hebrew'}
		<div class="max-w-xl mx-auto px-2">
			<BDBEntry {lemma} lang={tfData?.lang || 'hebrew'} dbAbbrev={tfData?.dbAbbrev || 'bhs'} />
		</div>
	{/if}

	<div class="my-3 flex flex-wrap items-center justify-center gap-2">
		<OptionButton bind:selected={showStats} buttonText=""
		customClickHandler={()=>{
			showSectionReferences=false; 
			showReferences=false;
			if (!corpusRefsQuery.ready && (lemma?.id != null && lemma?.id !== '' && lemma?.id !== -1)) {
				VocabEngine.fetchRefs(lemma.id, null, corpusRefsQuery, tfData?.dbAbbrev || 'lxx').then(() => {
					populateBookStats();
				});
			}
		}}>
			<Icon svg={BarsSvg} />Stats!
		</OptionButton>
		{#if !chosenBookId && userSelectedSections && userSelectedSections.length > 0}
			<OptionButton
				buttonText=""
				bind:selected={showSectionReferences}
				customClickHandler={()=>{showStats=false; showReferences=false;}}
			>
			{#if showSectionReferences}
				<Icon svg={BookOpenSvg} />	
			{:else}
				<Icon svg={BookSvg} />
			{/if}
			See {lemma.stats.querySectionStats.lexCounts.section} Instance{#if lemma.stats.querySectionStats.lexCounts.section > 1}s{/if}. in {sectionRef}
		</OptionButton>
		{/if}
		<OptionButton
			buttonText=""
			bind:selected={showReferences}
			customClickHandler={handleSeeReferencesClick}
		>
			{#if isFetchingReferences || (showReferences && !corpusRefsQuery.ready)}
				<span class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
			{:else if showReferences}
				<Icon svg={BookOpenSvg} />	
			{:else}
				<Icon svg={BookSvg} />
			{/if}See {lemma.stats.total} {StringUtils.capitalize(tfData.abbrev)} instance{#if lemma.stats.total > 1}s{/if}.
		</OptionButton>
	</div>
	{#if showStats}
		
		<hr class="my-4 border-rule opacity-60" />
		<div class="max-w-2xl mx-auto">
			<h2 class="text-xl font-bold pb-1 text-ink">Stats and Charts</h2>
			<span
				class="greek block text-xs opacity-75 mb-1"
				title="τί τὸ σοφώτατον; ἀριθμός· δεύτερον δὲ τὸ τοῖς πράγμασι τὰ ὀνόματα τιθέμενον. In Pythagoras, 'Testimonia, Part C: Attributed Doctrines (D)', LCL 527:118-119"
			>"What is the wisest? Number. The second is what gives things their names." &ndash;Pythagoras</span
			>
			<span
				class="block text-center text-xs opacity-60 mb-3"
				title="Twain, Mark. 'Chapters from My Autobiography: XX.' The North American Review 185, no. 618 (1907): 465–74. http://www.jstor.org/stable/25105919."
			>"There are three kinds of lies: lies, d*mned lies, and statistics." &ndash;Mark Twain</span
			>

			<Tabs
				headings={tabs}
				bind:selectedTabIndex={selectedStatsTab}
				classes={['my-2']}
			/>
			<h3 class="text-sm font-semibold text-ink-soft mt-3 mb-2">
				Lemma Stats for <span class="{tfData?.lang === 'hebrew' || tfData?.dbAbbrev === 'bhs' ? 'hebrew font-hebrew text-lg' : 'greek font-greek text-base'} font-bold text-ink">{lemma.lemma}</span>
				{#if chosenBookId || userSelectedSections.length > 0} in {sectionRef} / {/if}
				{tfData?.abbrev || tfData?.dbAbbrev}
			</h3>
			
			{#if !tabs[selectedStatsTab].includes("Large")}
				<div class="my-3 flex items-center justify-center gap-2">
					<select bind:value={bookIdSelectOption} class="border border-rule bg-page text-ink rounded-lg px-3 py-1.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-link/30 cursor-pointer">
						{#if userSelectedSections.length && querySectionRef}
							<option value={0}>{querySectionRef}</option>
						{/if}
						{#if availableBookIds.length === 0}
							<option value={0} disabled>Loading books...</option>
						{:else}
							{#each availableBookIds as bId}
								{@const bInfo = tfData?.booksDict?.books?.[bId] || tfData?.booksDict?.books?.[String(bId)]}
								{#if bInfo?.abbrev || bInfo?.name}
									<option value={isNaN(Number(bId)) ? bId : Number(bId)}>{bInfo.abbrev || bInfo.name}</option>
								{/if}
							{/each}
						{/if}
					</select>
					<Button
						buttonText="Go!"
						buttonColors="bg-link text-white hover:opacity-90 px-3.5 py-1.5 text-sm font-semibold rounded-lg cursor-pointer"
						toggled={() => {
							chosenBookId = Number(bookIdSelectOption);
							if (chosenBookId && !lemma.stats.bookStats[chosenBookId]) {
								populateBookStats();
							}
						}}
					></Button>
				</div>
			{/if}

			{#if tabs[selectedStatsTab].includes("Basic")}
				{#key userSelectedSections.length && selectedStatsTab && chosenBookId}
					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 my-4 text-left">
						{#if chosenBookId || userSelectedSections.length > 0}
							<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs">
								<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Section Word Count</div>
								<div class="text-2xl font-bold text-link my-1">{sectionStats.lexCounts.section}</div>
								<div class="text-xs text-ink-soft opacity-80">Total instances in {sectionRef}</div>
							</div>

							<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs">
								<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Rest of {tfData.abbrev} Count</div>
								<div class="text-2xl font-bold text-link my-1">{sectionStats.lexCounts.rest}</div>
								<div class="text-xs text-ink-soft opacity-80">Instances excluding {sectionRef}</div>
							</div>

							{#if sectionStats.freq?.section}
								<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs">
									<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Section Frequency</div>
									<div class="text-2xl font-bold text-link my-1">{sectionStats.freq.section.toFixed(3)}</div>
									<div class="text-xs text-ink-soft opacity-80">Per 1,000 words in {sectionRef}</div>
								</div>
							{/if}

							<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs">
								<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Rest of {tfData.abbrev} Freq</div>
								<div class="text-2xl font-bold text-link my-1">{sectionStats.freq.rest.toFixed(3)}</div>
								<div class="text-xs text-ink-soft opacity-80">Per 1,000 words excluding {sectionRef}</div>
							</div>

							<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs">
								<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Share of Corpus</div>
								<div class="text-2xl font-bold text-link my-1">
									{((100 * sectionStats.lexCounts.section) / lemma.stats.total).toFixed(1)}%
								</div>
								<div class="text-xs text-ink-soft opacity-80">{sectionRef}'s share of total use</div>
							</div>
						{/if}

						<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs">
							<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Total {tfData.abbrev} Count</div>
							<div class="text-2xl font-bold text-link my-1">{lemma.stats.total}</div>
							<div class="text-xs text-ink-soft opacity-80">Total occurrences across corpus</div>
						</div>

						<div class="p-3.5 rounded-xl border border-rule bg-page shadow-xs">
							<div class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Average Frequency</div>
							<div class="text-2xl font-bold text-link my-1">{lemma.stats.totalFreq.toFixed(3)}</div>
							<div class="text-xs text-ink-soft opacity-80">Occurrences per 1,000 words</div>
						</div>
					</div>
				{/key}
			{/if}

			{#if tabs[selectedStatsTab].includes("Large")}
				<hr class="my-4 border-rule opacity-60" />
				<h2 class="text-lg font-bold text-ink mb-2">Use by Book:</h2>
				{#key lemmaBookCountsChartData && lemmaBookCountChartOptionIndex}
					{#if lemmaBookCountsChartData}
						<div class="mt-2 mb-4">
							<select
								name="lemmaBookCountChartOption"
								id="lemmaBookCountChartOption"
								bind:value={lemmaBookCountChartOptionIndex}
								class="border border-rule bg-page text-ink rounded-lg px-3 py-1.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-link/30 inline-block self-center text-center align-top cursor-pointer"
							>
								{#each lemmaBookCountChartOptions as name, index}
									<option value={index}>{name}</option>
								{/each}
							</select>
							<div class="italic text-xs text-ink-soft my-1.5">
								{#if lemmaBookCountChartOptionIndex == 0}
									"# per book"
								{:else if lemmaBookCountChartOptionIndex == 1}
									"per 1000 words"
								{/if}
							</div>

							{#if lemmaBookCountChartOptionIndex == 0}
								<div id="lemma-info-corpus-book-counts-chart" class="my-3">
									<BarChart barData={lemmaBookCountsChartData} horizontal={true} corpusAbbrev={tfData.abbrev}/>
								</div>
							{:else if lemmaBookCountChartOptionIndex == 1}
								<div id="lemma-info-corpus-book-counts-chart" class="my-3">
									<BarChart barData={lemmaBookFreqChartData} horizontal={true} corpusAbbrev={tfData.abbrev}/>
								</div>
							{:else if lemmaBookCountChartOptionIndex == 2 && lemmaBookTable?.data}
								{#key lemmaBookCountChartOptionIndex && showStats}
									<Grid
										data={lemmaBookTable.data}
										sort={true}
										columns={lemmaBookTable.columns}
										pagination={{ limit: 50 }}
										style={"td{'font-family':'SBL BibLit'}"}
									/>
								{/key}
							{/if}
						</div>
					{:else}
						<div class="py-8 text-center flex flex-col items-center justify-center gap-2">
							<span class="inline-block w-8 h-8 border-4 border-link border-t-transparent rounded-full animate-spin"></span>
							<span class="text-sm text-ink-soft font-medium">Loading chart data...</span>
						</div>
					{/if}
				{/key}
			{/if}

			{#if tabs[selectedStatsTab].includes("Small")}
				<div class="flex flex-wrap items-center justify-center gap-4 my-4">
					{#if chosenBookId || userSelectedSections.length > 0}
						<div class="p-4 rounded-xl border border-rule bg-page shadow-xs max-w-sm w-full text-center">
							<h3 class="font-bold text-sm text-ink mb-2">{sectionRef} vs. {StringUtils.capitalize(tfData.abbrev)} Lemma Count</h3>
							<div class="text-xs text-ink-soft mb-2">% of {StringUtils.capitalize(tfData.abbrev)}'s Total</div>
							{#key lemma && sectionStats}
								<PieChart pieData={{ nums: [sectionStats.lexCounts.section, lemma.stats.total - sectionStats.lexCounts.section] }} />
							{/key}
							<div class="text-2xl font-bold text-link my-2">{((100 * sectionStats.lexCounts.section) / lemma.stats.total).toFixed(2)}%</div>
							<div class="text-xs text-ink-soft opacity-80">
								This section's share of {StringUtils.capitalize(tfData.abbrev)}'s total use of this word.
							</div>
						</div>
					{/if}

					{#if sectionStats.freqRatio && sections}
						<div class="p-4 rounded-xl border border-rule bg-page shadow-xs max-w-sm w-full text-center">
							<h3 class="font-bold text-sm text-ink mb-2">{sectionRef} vs. Rest of {StringUtils.capitalize(tfData.abbrev)}: Frequency Ratio</h3>
							<div class="text-xs text-ink-soft mb-2">How much more/less does this section use this lemma?</div>
							{#key sectionStats && tfData && sectionRef}
								<BarChart
									barData={{ nums: [floatRound(sectionStats.freq.section.toFixed(3),3), 
											floatRound(sectionStats.freq.rest.toFixed(3), 3)],
											labels:[sectionRef,`Rest of ${tfData.abbrev}`]
											}}
									yAxisLabel="Frequency (#/1000)"
									corpusAbbrev={tfData.abbrev}
								/>
							{/key}
							<div class="text-2xl font-bold text-link my-2">{floatRound(sectionStats.freqRatio,3)}</div>
							<div class="text-xs text-ink-soft opacity-80">(1.0=same; 2.0=2x; 0.5=half)</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if showSectionReferences}
		<hr class="my-4 border-rule opacity-60" />
		{#if !sectionRefsQuery?.ready}
			<div class="my-6 p-6 bg-rule/15 rounded-xl border border-rule/50 text-center flex flex-col items-center justify-center gap-3">
				<span class="inline-block w-8 h-8 border-4 border-link border-t-transparent rounded-full animate-spin"></span>
				<p class="text-sm font-semibold text-ink">Loading section instances...</p>
			</div>
		{:else}
			<LemmaRefs
				{tfData}
				lexId={lemma.id}
				lemma={lemma.lemma}
				{sections}
				lexRefQuery={sectionRefsQuery}
			/>
		{/if}
	{/if}
	{#if showReferences}
		<hr class="my-4 border-rule opacity-60" />
		{#if !corpusRefsQuery?.ready || isFetchingReferences}
			<div class="my-6 p-8 bg-rule/15 rounded-xl border border-rule/50 text-center flex flex-col items-center justify-center gap-3">
				<span class="inline-block w-9 h-9 border-4 border-link border-t-transparent rounded-full animate-spin"></span>
				<p class="text-sm font-semibold text-ink">Loading biblical instances...</p>
				<p class="text-xs text-ink-soft">Retrieving concordance for <strong class="text-ink">{lemma.lemma}</strong> in {tfData?.abbrev?.toUpperCase() || ''}...</p>
			</div>
		{:else }
			<LemmaRefs {tfData} lexId={lemma.id} lemma={lemma.lemma} lexRefQuery={corpusRefsQuery} />
		{/if}
	{/if}

	<div></div>
</div>

<style>
	@import 'https://cdn.jsdelivr.net/npm/gridjs/dist/theme/mermaid.min.css';

	:global(.gridjs-container) {
		color: var(--color-ink, inherit) !important;
	}
	:global(.gridjs-wrapper) {
		background-color: var(--color-page, transparent) !important;
		border-color: var(--color-rule, rgba(0, 0, 0, 0.15)) !important;
	}
	:global(.gridjs-table) {
		background-color: var(--color-page, transparent) !important;
		color: var(--color-ink, inherit) !important;
	}
	:global(.gridjs-th) {
		background-color: color-mix(in srgb, var(--color-rule, #888888) 25%, var(--color-page, #ffffff)) !important;
		color: var(--color-ink, inherit) !important;
		border-color: var(--color-rule, rgba(0, 0, 0, 0.15)) !important;
	}
	:global(.gridjs-td) {
		background-color: var(--color-page, transparent) !important;
		color: var(--color-ink, inherit) !important;
		border-color: var(--color-rule, rgba(0, 0, 0, 0.1)) !important;
	}
	:global(.gridjs-tr:hover td) {
		background-color: color-mix(in srgb, var(--color-rule, #888888) 15%, var(--color-page, #ffffff)) !important;
	}
	:global(.gridjs-footer) {
		background-color: color-mix(in srgb, var(--color-rule, #888888) 20%, var(--color-page, #ffffff)) !important;
		color: var(--color-ink, inherit) !important;
		border-color: var(--color-rule, rgba(0, 0, 0, 0.15)) !important;
	}
	:global(.gridjs-pagination button) {
		background-color: var(--color-page, transparent) !important;
		color: var(--color-ink, inherit) !important;
		border-color: var(--color-rule, rgba(0, 0, 0, 0.2)) !important;
	}
	:global(.gridjs-pagination button:disabled) {
		opacity: 0.35 !important;
	}
</style>

<script>
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { APP_REPO } from '$lib/config/version';
	let { data } = $props();
	

</script>

<svelte:head>
	<title>Sources & Licenses | Polyglot Bible Reader</title>
</svelte:head>

<div class="licenses-navigation max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-12" >
	<!-- Navigation -->
	<div>
		<a href="{base}/" class="inline-flex items-center gap-2 border border-rule px-3 py-1.5 rounded text-sm hover:bg-rule transition-colors">
			<span aria-hidden="true">&larr;</span> Back to Polyglot Reader
		</a>
	</div>

	<!-- Title Section -->
	<header class="space-y-4 border-b border-rule pb-6">
		<h1 class="text-3xl md:text-4xl font-bold">Sources &amp; Licenses</h1>
		<p class="text-lg text-ink-soft">
			Licensing framework, upstream source attributions, and copyright notices for the <strong>Polyglot Bible Reader</strong>.
		</p>
	</header>

	<!-- Licensing Framework Overview Cards -->
	<div class="grid gap-6 md:grid-cols-2">
		<!-- AGPL Code Card -->
		<div class="flex flex-col justify-between border border-rule bg-page p-6 rounded-lg shadow-sm">
			<div>
				<div class="mb-4 flex items-center justify-between gap-3">
					<h2 class="text-xl font-bold">Application Code &amp; Markup</h2>
					<span class="border border-rule px-2.5 py-1 rounded font-mono text-xs font-semibold bg-rule/50">GNU AGPL v3.0</span>
				</div>
				<p class="mb-3 text-sm opacity-90">
					The application source code, UI components, reading layouts, scripts, and stylesheets are licensed under the
					<a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" class="text-link underline hover:opacity-80">GNU Affero General Public License v3.0 (AGPL-3.0)</a>.
				</p>
				<ul class="mb-4 list-inside list-disc space-y-1 text-xs text-ink-soft">
					<li>Free to run, study, modify, and redistribute.</li>
					<li>Network copyleft: modified versions hosted over a network must provide complete corresponding source code.</li>
					<li>Provided without warranty of any kind.</li>
				</ul>
			</div>
			<div class="flex flex-wrap gap-2 border-t border-rule pt-4 text-xs">
				<a href={APP_REPO} target="_blank" rel="noopener noreferrer" class="border border-rule px-2.5 py-1 rounded hover:bg-rule transition-colors">
					View GitHub Repository
				</a>
				<a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" class="border border-rule px-2.5 py-1 rounded hover:bg-rule transition-colors">
					View AGPL-3.0 License
				</a>
			</div>
		</div>

		<!-- CC BY-SA & CC BY-NC Data Card -->
		<div class="flex flex-col justify-between border border-rule bg-page p-6 rounded-lg shadow-sm">
			<div>
				<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
					<h2 class="text-xl font-bold">Curated Datasets &amp; Static Indexes</h2>
					<div class="flex flex-wrap gap-1.5 font-mono text-xs font-semibold">
						<span class="border border-rule px-2.5 py-1 rounded bg-rule/50">ISC (OpenScriptorium)</span>
						<span class="border border-rule px-2.5 py-1 rounded bg-rule/50"><a href="#lsj-note">Public Domain<sup>*</sup></a></span>
						<span class="border border-rule px-2.5 py-1 rounded bg-rule/50">CC BY-SA 4.0</span>
						<span class="border border-rule px-2.5 py-1 rounded bg-rule/50">CC BY-NC 4.0</span>
					</div>
				</div>
				<p class="mb-3 text-sm opacity-90">
					Some Biblical text datasets (KJV, WEB, Vulgate), chapter data, and alignments, and concordance databases were obtained from the
					<a href="https://github.com/OpenScriptorium" target="_blank" rel="noopener noreferrer" class="text-link underline hover:opacity-80">Openscriptorium.org GitHub project database</a>
					(licensed under the <a href="https://opensource.org/licenses/ISC" target="_blank" rel="noopener noreferrer" class="text-link underline hover:opacity-80">ISC License</a>).
					The Latin Vulgate, King James Version (KJV), World English Bible (WEB), Swete Septuagint, and classical lexica are in the <strong>Public Domain</strong>.
					Scholarly morphological datasets and versification tables are licensed under CC BY-SA 4.0 or CC BY-NC 4.0 (<strong>Commercial use prohibited for BHS and TVTMS</strong>).
				</p>
				<ul class="mb-4 list-inside list-disc space-y-1 text-xs text-ink-soft">
					<li><strong>OpenScriptorium Database:</strong> Core text databases provided under the permissive ISC License.</li>
					<li><strong>Public Domain Translations:</strong> Latin Vulgate, King James Version (KJV), and World English Bible (WEB) are fully public domain worldwide.</li>
					<li><strong>Non-Commercial Restriction:</strong> BHS and TVTMS data are strictly restricted to non-commercial usage.</li>
				</ul>
			</div>
			<div class="flex flex-wrap gap-2 border-t border-rule pt-4 text-xs">
				<a href="https://openscriptorium.org" target="_blank" rel="noopener noreferrer" class="border border-rule px-2.5 py-1 rounded hover:bg-rule transition-colors">
					OpenScriptorium.org
				</a>
				<a href="https://opensource.org/licenses/ISC" target="_blank" rel="noopener noreferrer" class="border border-rule px-2.5 py-1 rounded hover:bg-rule transition-colors">
					View ISC License
				</a>
				<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" class="border border-rule px-2.5 py-1 rounded hover:bg-rule transition-colors">
					View CC BY-SA 4.0 Deed
				</a>
				<a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer" class="border border-rule px-2.5 py-1 rounded hover:bg-rule transition-colors">
					View CC BY-NC 4.0 Deed
				</a>
			</div>
		</div>
	</div>

	<!-- Upstream Sources and Attributions Section -->
	<section class="space-y-6">
		<h2 class="text-2xl font-semibold border-b border-rule pb-2">Underlying Datasets &amp; Attributions</h2>
		<p class="text-sm text-ink-soft">
			The developer(s) is(are) grateful to the digital humanities projects whose open-licensed datasets make this work possible:
		</p>
		
		<div class="space-y-6">
			<!-- Openscriptorium.org Database -->
			<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-2">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<h3 class="text-lg font-bold">Openscriptorium.org Project Database</h3>
					<span class="font-mono text-xs border border-rule px-2 py-0.5 rounded">
						<a href="https://opensource.org/licenses/ISC" target="_blank" rel="noopener noreferrer" class="text-link underline">ISC License</a>
					</span>
				</div>
				<p class="text-sm opacity-90">
					Some Biblical text datasets (KJV, WEB, Vulgate), chapter data, and alignments, and concordance databases were obtained from the
					<a href="https://openscriptorium.org" target="_blank" rel="noopener noreferrer" class="text-link underline hover:opacity-80">Openscriptorium.org</a>
					GitHub project database.
				</p>
				<p class="text-xs text-ink-soft">
					Source repository: <a href="https://github.com/OpenScriptorium" target="_blank" rel="noopener noreferrer" class="text-link underline">OpenScriptorium on GitHub</a>.
					Licensed under the <a href="https://opensource.org/licenses/ISC" target="_blank" rel="noopener noreferrer" class="text-link underline">ISC License</a>.
				</p>
			</div>

			<!-- Latin Vulgate (Vulgate) -->
			<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-2">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<h3 class="text-lg font-bold">Latin Vulgate (Biblia Sacra Vulgata)</h3>
					<span class="font-mono text-xs border border-rule px-2 py-0.5 rounded">Public Domain</span>
				</div>
				<p class="text-sm opacity-90">
					Saint Jerome's ancient Latin translation (completed c. 405 A.D.) and the Sixto-Clementine Vulgate (1592). The text is in the <strong>Public Domain worldwide</strong>.
					Dataset sourced from the OpenScriptorium project database.
				</p>
			</div>

			<!-- King James Version (KJV) -->
			<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-2">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<h3 class="text-lg font-bold">King James Version (KJV)</h3>
					<span class="font-mono text-xs border border-rule px-2 py-0.5 rounded">Public Domain</span>
				</div>
				<p class="text-sm opacity-90">
					The King James Version (Authorized Version) of 1611. The biblical text is unencumbered and in the <strong>Public Domain worldwide</strong>.
					Dataset sourced from the OpenScriptorium project database.
				</p>
			</div>

			<!-- World English Bible (WEB) -->
			<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-2">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<h3 class="text-lg font-bold">World English Bible (WEB)</h3>
					<span class="font-mono text-xs border border-rule px-2 py-0.5 rounded">Public Domain</span>
				</div>
				<p class="text-sm opacity-90">
					A modern English translation produced by Rainbow Missions, Inc. and Michael Paul Johnson, translated directly from the original biblical languages. The editors have explicitly and irrevocably dedicated the entire work to the <strong>Public Domain worldwide</strong>.
					Dataset sourced from the OpenScriptorium project database.
				</p>
				<p>
					<a href="https://worldenglish.bible" target="_blank" rel="noopener noreferrer" class="text-link text-xs underline hover:opacity-80">View World English Bible Website</a>
				</p>
			</div>

			<!-- BHS Hebrew Bible / ETCBC -->
			<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-2">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<h3 class="text-lg font-bold">Biblia Hebraica Stuttgartensia Amstelodamensis (BHS / ETCBC)</h3>
					<span class="font-mono text-xs border border-rule px-2 py-0.5 rounded">
						<a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer" class="text-link underline">CC BY-NC 4.0</a>
					</span>
				</div>
				<p class="text-sm opacity-90">
					Hebrew Bible text, morphology, and syntactic data developed by the
					<a href="https://etcbc.nl" target="_blank" rel="noopener noreferrer" class="text-link underline hover:opacity-80">Eep Talstra Centre for Bible and Computer</a>
					(Vrije Universiteit Amsterdam).
				</p>
				<p class="text-xs text-ink-soft">
					Source repository: <a href="https://github.com/ETCBC/bhsa" target="_blank" rel="noopener noreferrer" class="text-link underline">ETCBC/bhsa on GitHub</a>.
					Licensed under Creative Commons Attribution-NonCommercial 4.0 International (<a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer" class="text-link underline">CC BY-NC 4.0</a>). <strong>Commercial use is strictly prohibited.</strong>
				</p>
			</div>

			<!-- Eliran Wong's BHS-morphology -->
			<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-2">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<h3 class="text-lg font-bold">Eliran Wong's BHS-morphology</h3>
					<span class="font-mono text-xs border border-rule px-2 py-0.5 rounded">
						<a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer" class="text-link underline">CC BY-NC 4.0</a>
					</span>
				</div>
				<p class="text-sm opacity-90">
					Hebrew Bible morphology data package and format alignments curated by Eliran Wong.
				</p>
				<p class="text-xs text-ink-soft">
					Source repository: <a href="https://github.com/eliranwong/BHS-morphology" target="_blank" rel="noopener noreferrer" class="text-link underline">eliranwong/BHS-morphology on GitHub</a>.
					Licensed under Creative Commons Attribution-NonCommercial 4.0 International (<a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer" class="text-link underline">CC BY-NC 4.0</a>). <strong>Commercial use is strictly prohibited.</strong>
				</p>
			</div>

			<!-- Septuagint (LXX) - Swete -->
			<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-2">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<h3 class="text-lg font-bold">Henry Barclay Swete Septuagint Edition (1887–1912, reprint 1930)</h3>
					<span class="font-mono text-xs border border-rule px-2 py-0.5 rounded">Public Domain</span>
				</div>
				<p class="text-sm opacity-90">
					Base text: Henry Barclay Swete, <em>The Old Testament in Greek according to the Septuagint</em> (Cambridge University Press, 3 vols., 1887–1912, reprint 1930; author died 1917). Public domain worldwide. Digital transcription curated by Eliran Wong and collaborators (<a href="https://github.com/eliranwong/LXX-Swete-1930" target="_blank" rel="noopener noreferrer" class="text-link underline">eliranwong/LXX-Swete-1930</a>).
				</p>
			</div>

			<!-- SBL Greek New Testament (SBLGNT) -->
			<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-2">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<h3 class="text-lg font-bold">The Greek New Testament: SBL Edition (SBLGNT) &amp; MorphGNT</h3>
					<span class="font-mono text-xs border border-rule px-2 py-0.5 rounded">CC BY 4.0</span>
				</div>
				<p class="text-sm opacity-90">
					Edited by Michael W. Holmes in collaboration with the Society of Biblical Literature and Logos Bible Software (2010), licensed under CC BY 4.0. Morphological parsing provided by James Tauber's <a href="https://github.com/morphgnt" target="_blank" rel="noopener noreferrer" class="text-link underline">MorphGNT project</a> (CC BY 4.0).
				</p>
				<p>
					<a href="https://sblgnt.com/license/" target="_blank" rel="noopener noreferrer" class="text-link text-xs underline hover:opacity-80">View SBLGNT License Agreement</a>
				</p>
			</div>

			<!-- STEPBible TVTMS -->
			<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-2">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<h3 class="text-lg font-bold">STEPBible Tyndale Versification Mapping System (TVTMS)</h3>
					<span class="font-mono text-xs border border-rule px-2 py-0.5 rounded">
						<a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer" class="text-link underline">CC BY-NC 4.0</a>
					</span>
				</div>
				<p class="text-sm opacity-90">
					Used for aligning differing chapter and verse numberings across the Hebrew, Greek, and modern traditions. Provided by STEPBible.org and Tyndale House, Cambridge (<a href="https://github.com/STEPBible/STEPBible-Data" target="_blank" rel="noopener noreferrer" class="text-link underline">STEPBible-Data</a>). Licensed under <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer" class="text-link underline">CC BY-NC 4.0</a>. <strong>Commercial use prohibited.</strong>
				</p>
			</div>

			<!-- Lexica & Dictionaries -->
			<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-2">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<h3 class="text-lg font-bold">Lexica &amp; Dictionaries (LSJ &amp; BDB)</h3>
					<span class="font-mono text-xs border border-rule px-2 py-0.5 rounded">Public Domain<sup>*</sup></span>
				</div>
				<p class="text-sm opacity-90">
					Liddell-Scott-Jones (LSJ) &amp; Middle Liddell Greek-English Lexicon (Oxford: Clarendon Press, 1940; Perseus Digital Library &amp; Logeion) and 
					Brown-Driver-Briggs (BDB) Hebrew and English Lexicon (1906). 
					Both works are (at least treated as) in the public domain. </p>
					
				<p id="lsj-note" class="text-sm opacity-90"><sup>*</sup>Though the LSJ was published 1940, <a href="https://logeion.uchicago.edu/about" target="_blank" rel="noopener noreferrer" class="text-link underline" >
						University of Chicago's <i>Logeion</i> project treats it as public domain (emphasis added)</a>:
				</p>
					<blockquote class="text-sm opacity-90 border-l-4 border-gray-500 italic my-8 pl-4 md:pl-8 py-4 mx-4">
						For <u>full-text searches</u> of the dictionaries (where <u>in LSJ</u> do we find reference to Xenophon's Anabasis, where is λόγος used in any entry, 
						not just in the entry for λόγος), use the links in the list of sources below. 
						<u>Full-text search is only possible for the reference works that are fully in the public domain.</u></blockquote>
				
			</div>
		</div>
	</section>

	<section class="space-y-6">
		<h2 class="text-2xl font-semibold border-b border-rule pb-2">Code &amp; Open Source Tools</h2>
		
		<div class="space-y-4">
			<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-2">
				<h3 class="text-lg font-bold">OpenScriptorium Reading Theme Architecture</h3>
				<p class="text-sm opacity-90">
					The reading theme interpolation logic and slider UI components were adapted from the <a href="https://github.com/OpenScriptorium/OpenScriptorium" target="_blank" rel="noopener noreferrer" class="text-link underline hover:opacity-80">OpenScriptorium</a> project.
				</p>
				<p class="text-xs text-ink-soft">Licensed under the <a href="https://opensource.org/licenses/ISC" target="_blank" rel="noopener noreferrer" class="text-link underline">ISC License</a>.</p>
			</div>

			<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-2">
				<h3 class="text-lg font-bold">Svelte &amp; SvelteKit</h3>
				<p class="text-xs text-ink-soft">Licensed under the MIT License.</p>
			</div>

			<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-2">
				<h3 class="text-lg font-bold">Tailwind CSS</h3>
				<p class="text-xs text-ink-soft">Licensed under the MIT License.</p>
			</div>
		</div>
	</section>

	<section id="ai-attribution" class="space-y-6 scroll-mt-20">
		<h2 class="text-2xl font-semibold border-b border-rule pb-2">AI Attribution</h2>
		<div class="border border-rule bg-page p-5 rounded-lg shadow-sm space-y-3 opacity-90 text-sm">
			<p>
				This project was built with the assistance of artificial intelligence. Specifically, AI tools were utilized for architectural planning, code generation (including porting UI components), and dataset pipeline processing.
			</p>
			<ul class="list-disc list-inside space-y-1 ml-2 text-ink-soft">
				<li><strong><a href="https://antigravity.google/product/antigravity-2" class="link" rel="noopener noreferrer">Google Antigravity 2.0</a></strong></li>
				<li><strong>Google Gemini Models</strong></li>
				<li><strong>Anthropic's Sonnet Models</strong></li>
			</ul>
		</div>
	</section>

	<!-- Copyright Notice -->
	<footer class="border-t border-rule pt-6 text-center text-xs text-ink-soft">
		Web application &copy; Fr. Christopher Brannan, O.P., 2026. All rights reserved for original creative works where not otherwise licensed above.
	</footer>
</div>
<style>
	:root[data-theme="dark"] div.border{
		background-color: rgba(255,255,255,0.05);
	}
	:root[data-theme="light"] div.border{
		background-color: rgba(0,0,0,0.1);
	}
</style>
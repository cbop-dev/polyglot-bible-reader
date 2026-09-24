<svelte:head>
	<title>Sources & Licenses | Polyglot Bible Reader</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-12">
	<header class="space-y-4">
		<h1 class="text-3xl md:text-4xl font-bold">Sources & Licenses</h1>
		<p class="text-lg opacity-80">
			This project builds upon the work of scholars, open-source developers, and data curators. We are grateful for their contributions.
		</p>
	</header>

	<section class="space-y-6">
		<h2 class="text-2xl font-semibold border-b border-rule pb-2">Application License</h2>
		<div class="space-y-3 opacity-90">
			<p><strong>Polyglot Bible Reader</strong></p>
			<p>&copy; 2026 Fr. Christopher Brannan, O.P.</p>
			<p>
				The source code for this web application is licensed under the 
				<a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" class="text-link underline decoration-dotted hover:opacity-80">GNU Affero General Public License v3.0 (AGPL-3.0)</a>.
			</p>
			<p class="text-sm italic">
				Note: The biblical data and texts distributed with this application retain their respective licenses (see below).
			</p>
		</div>
	</section>

	<section class="space-y-6">
		<h2 class="text-2xl font-semibold border-b border-rule pb-2">Biblical Datasets & Texts</h2>
		
		<div class="space-y-8">
			<div class="space-y-2">
				<h3 class="text-xl font-medium">SBL Greek New Testament (SBLGNT)</h3>
				<p class="opacity-90">
					Copyright &copy; 2010 Society of Biblical Literature and Logos Bible Software.<br>
					The SBLGNT is freely available for use under the terms of the SBLGNT End-User License Agreement.
				</p>
				<p>
					<a href="https://sblgnt.com/license/" target="_blank" rel="noopener noreferrer" class="text-link text-sm underline hover:opacity-80">View SBLGNT License</a>
				</p>
			</div>

			<div class="space-y-2">
				<h3 class="text-xl font-medium">Septuagint (LXX) - Swete's Edition</h3>
				<p class="opacity-90">
					Based on the Old Testament in Greek according to the Septuagint, edited by Henry Barclay Swete. 
					The underlying text is in the public domain. Lemmatization and morphological data may be subject to Creative Commons licenses depending on the specific pipeline dataset used.
				</p>
			</div>

			<div class="space-y-2">
				<h3 class="text-xl font-medium">Biblia Hebraica Stuttgartensia (BHS) / Hebrew Bible</h3>
				<p class="opacity-90">
					Hebrew text data used in this reader is derived from open scholarly datasets (such as the ETCBC/BHSA or Westminster Leningrad Codex). 
				</p>
			</div>

			<div class="space-y-2">
				<h3 class="text-xl font-medium">STEPBible Tyndale Versification Mapping System (TVTMS)</h3>
				<p class="opacity-90">
					Used for aligning differing chapter and verse numberings across the Hebrew, Greek, and other traditions.<br>
					Provided by STEPBible.org and Tyndale House, Cambridge. Licensed under a 
					<a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer" class="text-link underline hover:opacity-80">Creative Commons Attribution-NonCommercial 4.0 International License</a>.
				</p>
			</div>
		</div>
	</section>

	<section class="space-y-6">
		<h2 class="text-2xl font-semibold border-b border-rule pb-2">Code & Open Source Tools</h2>
		
		<div class="space-y-6">
			<div class="space-y-2">
				<h3 class="text-xl font-medium">OpenScriptorium Theme Slider</h3>
				<p class="opacity-90">
					The reading theme interpolation logic and slider UI components were adapted from the <a href="https://github.com/OpenScriptorium/OpenScriptorium" class="text-link underline hover:opacity-80">OpenScriptorium</a> project.
				</p>
				<p class="text-sm opacity-80">Licensed under the ISC License.</p>
			</div>

			<div class="space-y-2">
				<h3 class="text-xl font-medium">Svelte & SvelteKit</h3>
				<p class="text-sm opacity-80">Licensed under the MIT License.</p>
			</div>

			<div class="space-y-2">
				<h3 class="text-xl font-medium">Tailwind CSS</h3>
				<p class="text-sm opacity-80">Licensed under the MIT License.</p>
			</div>
		</div>
	</section>

	<section id="ai-attribution" class="space-y-6 scroll-mt-20">
		<h2 class="text-2xl font-semibold border-b border-rule pb-2">AI Attribution</h2>
		<div class="space-y-3 opacity-90">
			<p>
				This project was built with the assistance of artificial intelligence. Specifically, AI tools were utilized for architectural planning, code generation (including porting UI components), and dataset pipeline processing.
			</p>
			<ul class="list-disc list-inside space-y-1 ml-2">
				<li><strong>Google Antigravity 2.0</strong></li>
				<li><strong>Google Gemini Models</strong></li>
			</ul>
		</div>
	</section>
</div>


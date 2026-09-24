<script>
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { APP_REPO } from '$lib/config/version';
	import ThemeSlider from './ThemeSlider.svelte';

	let isCollapsed = $state(false);
	let userToggled = false;

	onMount(() => {
		const isSmallScreen = window.innerWidth < 768;
		const saved = localStorage.getItem('polyglot-footer-collapsed');
		if (saved !== null) {
			isCollapsed = saved === 'true';
			userToggled = true;
		} else {
			isCollapsed = isSmallScreen;
		}

		const handleResize = () => {
			if (!userToggled) {
				isCollapsed = window.innerWidth < 768;
			}
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

	function toggleCollapse() {
		userToggled = true;
		isCollapsed = !isCollapsed;
		try {
			localStorage.setItem('polyglot-footer-collapsed', String(isCollapsed));
		} catch {}
	}
</script>

<!-- Fixed Footer Bar Container (clips horizontal slide without viewport overflow) -->
<div class="fixed bottom-0 left-0 right-0 z-40 pointer-events-none overflow-hidden">
	<div
		id="page-footer-div"
		class="pointer-events-auto border-t border-base-300 backdrop-blur-md transition-transform duration-300 ease-in-out {isCollapsed
			? 'translate-x-full'
			: 'translate-x-0'}"
	>
		<footer
			id="footer-panel"
			class="relative py-2 px-4 pr-12 sm:pr-14 text-xs max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4"
		>
			<!-- Left: Copyright & License links -->
			<div class="footer-links text-center md:text-left space-x-1 sm:space-x-1.5 opacity-85">
				<span>Web app © Fr. Christopher Brannan, O.P., 2026.</span>
				<span class="opacity-40">|</span>
				<span>Code: <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" class="link">AGPL v3</a></span>
				<span class="opacity-40">•</span>
				<span>Data: <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" class="link">CC BY-SA 4.0</a>
				/ <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer" class="link">BY-NC 4.0</a>
				</span>
				<span class="opacity-40">|</span>
				<a href="{base}/sources-and-licenses" class="link font-semibold">Sources &amp; Licenses</a>
				<span class="opacity-40">•</span>
				<span>AI-assisted with <a href="{base}/sources-and-licenses#ai-attribution" class="link">Antigravity 2.0 &amp; Gemini</a></span>
				<span class="opacity-40">•</span>
				<a href="{APP_REPO}" target="_blank" rel="noopener noreferrer" class="link">GitHub</a>
			</div>


			<!-- Right: Sliding scale reading theme selector -->
			<div class="theme-control shrink-0">
				<ThemeSlider />
			</div>
		</footer>
	</div>
</div>

<!-- Persistent Arrow Toggle Button docked on the far right of the screen -->
<div class="fixed bottom-1.5 sm:bottom-2 right-2 sm:right-3 z-50">
	<button
		type="button"
		class="footer-arrow-btn"
		onclick={toggleCollapse}
		title={isCollapsed ? 'Expand footer (reading theme & links)' : 'Collapse footer to the right'}
		aria-label={isCollapsed ? 'Expand footer' : 'Collapse footer'}
		aria-expanded={!isCollapsed}
	>
		{#if isCollapsed}
			<!-- Pointing LEFT when collapsed (default on smaller screens; click to expand) -->
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="m15 18-6-6 6-6" />
			</svg>
		{:else}
			<!-- Pointing RIGHT when expanded (click to collapse to the right) -->
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="m9 18 6-6-6-6" />
			</svg>
		{/if}
	</button>
</div>

<style>
	#page-footer-div {
		background: color-mix(in srgb, var(--color-page, var(--bg-content, canvas)) 85%, transparent);
	}

	#footer-panel a.link {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.footer-arrow-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-page, var(--bg-content, canvas)) 90%, transparent);
		border: 1px solid var(--border-theme, rgba(128, 128, 128, 0.35));
		color: var(--color-ink, currentColor);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		cursor: pointer;
		transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
	}

	.footer-arrow-btn:hover {
		transform: scale(1.1);
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
	}

	.footer-arrow-btn:active {
		transform: scale(0.92);
	}
</style>

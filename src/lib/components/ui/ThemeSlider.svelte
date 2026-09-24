<script>
	import { onMount } from 'svelte';
	import {
		applyReadingTheme,
		initReadingTheme,
		saveReadingTheme,
		getThemeLabel
	} from '$lib/theme/readingTheme';

	let sliderValue = $state(25);
	let lastSide = $state('light');
	let cliffLockUntil = 0;
	let rafPending = false;
	let pendingValue = null;

	onMount(() => {
		sliderValue = initReadingTheme();
		lastSide = sliderValue >= 50 ? 'dark' : 'light';
	});

	function handleInput(event) {
		const val = parseInt(event.target.value, 10);
		sliderValue = val;
		pendingValue = val;

		if (rafPending) return;
		rafPending = true;
		requestAnimationFrame(() => commit());
	}

	function commit() {
		rafPending = false;
		if (pendingValue == null) return;
		const val = pendingValue;

		const newSide = val >= 50 ? 'dark' : 'light';
		const now = performance.now();

		// Cliff debounce: prevent rapid strobing when hovering right on 49/50
		if (newSide !== lastSide && now < cliffLockUntil) {
			sliderValue = lastSide === 'light' ? 49 : 50;
			return;
		}

		if (newSide !== lastSide) {
			cliffLockUntil = now + 250;
			lastSide = newSide;
		}

		applyReadingTheme(val);
		saveReadingTheme(val);
	}
</script>

<div class="theme-slider-wrapper inline-flex items-center gap-2 px-2 py-1 text-xs select-none">
	<!-- Sun Icon / Light Label -->
	<span class="inline-flex items-center gap-1 opacity-75 font-medium" title="Light reading modes">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.8"
			stroke="currentColor"
			class="w-3.5 h-3.5"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
			/>
		</svg>
		<span class="hidden sm:inline">Light</span>
	</span>

	<!-- Range Slider -->
	<div class="relative flex items-center">
		<input
			type="range"
			min="0"
			max="100"
			step="1"
			value={sliderValue}
			oninput={handleInput}
			class="range range-xs w-24 sm:w-32 cursor-pointer"
			aria-label="Adjust reading theme from light to dark"
			aria-valuetext={getThemeLabel(sliderValue)}
			title="Theme: {getThemeLabel(sliderValue)} ({sliderValue}%)"
		/>
	</div>

	<!-- Moon Icon / Dark Label -->
	<span class="inline-flex items-center gap-1 opacity-75 font-medium" title="Dark reading modes">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.8"
			stroke="currentColor"
			class="w-3.5 h-3.5"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
			/>
		</svg>
		<span class="hidden sm:inline">Dark</span>
	</span>

	<!-- Current Mode Tooltip / Badge (optional subtle indicator) -->
	<span class="text-[10px] opacity-60 font-mono hidden md:inline ml-0.5">
		{getThemeLabel(sliderValue)}
	</span>
</div>

<style>
	.theme-slider-wrapper input[type='range'] {
		accent-color: var(--color-link, #1f6f7a);
	}
</style>

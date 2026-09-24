<script>
	import { onMount } from 'svelte';
	import {
		applyReadingTheme,
		initReadingTheme,
		initReadingWarmth,
		saveReadingTheme,
		saveReadingWarmth,
		getThemeLabel
	} from '$lib/theme/readingTheme';

	let sliderValue = $state(25);
	let warmthValue = $state(50);
	let lastSide = $state('light');
	let cliffLockUntil = 0;
	let rafPending = false;

	onMount(() => {
		sliderValue = initReadingTheme();
		warmthValue = initReadingWarmth();
		lastSide = sliderValue >= 50 ? 'dark' : 'light';
	});

	function handleInput(event) {
		sliderValue = parseInt(event.target.value, 10);
		scheduleCommit();
	}

	function handleWarmthInput(event) {
		warmthValue = parseInt(event.target.value, 10);
		scheduleCommit();
	}

	function setExtreme(val) {
		sliderValue = val;
		scheduleCommit();
	}

	function setWarmthExtreme(val) {
		warmthValue = val;
		scheduleCommit();
	}

	function scheduleCommit() {
		if (rafPending) return;
		rafPending = true;
		requestAnimationFrame(() => {
			rafPending = false;
			commitValues();
		});
	}

	function commitValues() {
		const newSide = sliderValue >= 50 ? 'dark' : 'light';
		const now = performance.now();

		if (newSide !== lastSide && now < cliffLockUntil) {
			sliderValue = lastSide === 'light' ? 49 : 50;
		} else {
			if (newSide !== lastSide) {
				cliffLockUntil = now + 250;
				lastSide = newSide;
			}
		}

		applyReadingTheme(sliderValue, warmthValue);
		saveReadingTheme(sliderValue);
		saveReadingWarmth(warmthValue);
	}
</script>

<div class="flex flex-col gap-1 items-center">
	<!-- Light/Dark Slider -->
	<div class="theme-slider-wrapper inline-flex items-center gap-2 px-2 py-1 text-xs select-none">
		<!-- Sun Icon / Light Label -->
		<button type="button" class="w-16 justify-end inline-flex items-center gap-1 opacity-75 font-medium hover:opacity-100 transition-opacity cursor-pointer" title="Light reading modes" onclick={() => setExtreme(0)}>
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
		</button>

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
		<button type="button" class="w-16 justify-start inline-flex items-center gap-1 opacity-75 font-medium hover:opacity-100 transition-opacity cursor-pointer" title="Dark reading modes" onclick={() => setExtreme(100)}>
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
		</button>

		<!-- Current Mode Tooltip / Badge (optional subtle indicator) -->
		<span class="text-[10px] opacity-60 font-mono hidden md:inline ml-0.5 min-w-[100px]">
			{getThemeLabel(sliderValue)}
		</span>
	</div>

	<!-- Warmth Slider -->
	<div class="theme-slider-wrapper inline-flex items-center gap-2 px-2 py-1 text-xs select-none mt-[-4px]">
		<!-- Snowflake Icon / Cool Label -->
		<button type="button" class="w-16 justify-end inline-flex items-center gap-1 opacity-75 font-medium hover:opacity-100 transition-opacity cursor-pointer" style="color: var(--color-link)" title="Cooler tones" onclick={() => setWarmthExtreme(0)}>
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 2v20M17 5l-5 5-5-5M17 19l-5-5-5 5M2 12h20M5 7l5 5-5 5M19 7l-5 5 5 5" />
			</svg>
			<span class="hidden sm:inline">Cool</span>
		</button>

		<!-- Range Slider -->
		<div class="relative flex items-center">
			<input
				type="range"
				min="0"
				max="100"
				step="1"
				value={warmthValue}
				oninput={handleWarmthInput}
				class="range range-xs w-24 sm:w-32 cursor-pointer"
				aria-label="Adjust reading theme warmth"
				title="Warmth: {warmthValue}%"
			/>
		</div>

		<!-- Flame Icon / Warm Label -->
		<button type="button" class="w-16 justify-start inline-flex items-center gap-1 opacity-75 font-medium hover:opacity-100 transition-opacity cursor-pointer text-orange-600 dark:text-orange-400" title="Warmer tones" onclick={() => setWarmthExtreme(100)}>
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.601 8.983 8.983 0 0112 11.25a8.983 8.983 0 003.362-6.036z" />
			</svg>
			<span class="hidden sm:inline">Warm</span>
		</button>
		
		<span class="text-[10px] opacity-0 font-mono hidden md:inline ml-0.5 pointer-events-none select-none min-w-[100px]">
			<!-- Invisible spacer to match the top row's label width -->
		</span>
	</div>
</div>

<style>
	.theme-slider-wrapper input[type='range'] {
		accent-color: var(--color-link, #1f6f7a);
	}
</style>

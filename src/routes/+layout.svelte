<script lang="ts">
	import './layout.css';
	import '../app.css';
	import favicon from '$lib/assets/favicon.png';
	import Footer from '$lib/components/ui/Footer.svelte';
	import { readerState } from '$lib/stores/readerState.svelte';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href={favicon} />
	<link rel="icon" href="/favicon.ico" sizes="any" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</svelte:head>

<div class="min-h-screen flex flex-col">
	<main class="flex-grow">
		{@render children()}
	</main>
	{#if !readerState.meditationMode}
	<Footer />
	{/if}
</div>

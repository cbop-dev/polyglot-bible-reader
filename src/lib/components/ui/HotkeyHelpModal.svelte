<script lang="ts">
	import Modal2 from '$lib/lemma-ui/components/ui/Modal2.svelte';
	import { readerState } from '$lib/stores/readerState.svelte';
	import { READER_HOTKEYS, type HotkeyAction } from '$lib/config/hotkeys';
    import { mylog } from '$lib/lemma-ui/env/env';

	const categories = ['Navigation', 'View', 'General'] as const;

	function getCategoryActions(cat: string): HotkeyAction[] {
		return READER_HOTKEYS.filter((action) => action.category === cat);
	}

	function formatKey(key: string): string {
		switch (key) {
			case 'ArrowLeft':
				return '←';
			case 'ArrowRight':
				return '→';
			case 'ArrowUp':
				return '↑';
			case 'ArrowDown':
				return '↓';
			case 'Escape':
				return 'Esc';
			default:
				return key;
		}
	}
</script>

<Modal2
	bind:showModal={readerState.showHotkeyHelp}
	title="Keyboard Shortcuts"
	onclose={() => {
		//mylog(`closing hotkey modal!`, true);
		readerState.showHotkeyHelp = false;
	}}
>
	<div class="p-4 sm:p-6 text-ink">
		<div class="flex items-center gap-2 mb-4 pb-2 border-b border-rule">
			<span class="text-xl font-bold">Keyboard Shortcuts</span>
		</div>

		<div class="space-y-6">
			{#each categories as category}
				{@const actions = getCategoryActions(category)}
				{#if actions.length > 0}
					<div>
						<h3 class="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
							{category}
						</h3>
						<div class="bg-base-200/50 rounded-lg border border-rule divide-y divide-rule/50">
							{#each actions as action}
								<div class="flex items-center justify-between px-3 py-2 text-sm">
									<div>
										<span class="font-medium">{action.name}</span>
										<p class="text-xs text-ink-soft">{action.description}</p>
									</div>
									<div class="flex items-center gap-1.5 ml-4 flex-shrink-0">
										{#each action.keys as key}
											<kbd
												class="inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 text-xs font-mono font-medium bg-page border border-rule rounded shadow-xs text-ink"
											>
												{formatKey(key)}
											</kbd>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</div>

		<div class="mt-6 pt-3 border-t border-rule text-xs text-ink-soft text-center">
			Press <kbd class="px-1 py-0.5 font-mono text-xs bg-page border border-rule rounded">Esc</kbd> to close this dialog at any time.
		</div>
	</div>
</Modal2>

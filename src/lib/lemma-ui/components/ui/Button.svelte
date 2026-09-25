<script>
	let {
		buttonText = 'Button',
		buttonSubtext = '',
		buttonStyle = '',
		buttonColors = 'bg-link text-white hover:opacity-90',
		style = '',
		textSize = 'text-sm',
		toggled = () => {},
		tooltip = '',
		ready = true,
		children = null
	} = $props();
</script>

<button
	type="button"
	onclick={toggled}
	disabled={!ready}
	title={tooltip}
	class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-sm transition-all duration-150 cursor-pointer shadow-xs border border-transparent {textSize} {buttonStyle} {buttonColors} {style} {!ready ? 'opacity-50 cursor-not-allowed' : ''}"
>
	{#if buttonText}
		<span>{buttonText}</span>
	{/if}
	{@render children?.()}
	{#if buttonSubtext.length > 0}	
		<hr class="m-0 p-0 border-current opacity-30"/><p class="m-0 italic text-xs font-light">{buttonSubtext}</p>
	{/if}
</button>

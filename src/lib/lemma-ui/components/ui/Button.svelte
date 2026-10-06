<script>
	let {
		buttonText = 'Button',
		buttonSubtext = '',
		buttonStyle = '',
		buttonSize='gap-1.5 px-3 py-1.5 ',
		buttonColors = 'bg-link text-white bg-blue-500 hover:opacity-90',
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
	class="inline-flex items-center justify-center 
		rounded-lg font-semibold text-sm transition-all duration-150 
		cursor-pointer shadow-xs border border-transparent 
		{textSize} {buttonColors} {buttonSize} {buttonStyle}  {style} 
		{!ready ? 'opacity-50 cursor-not-allowed' : ''}
		
		"
>
	{#if buttonText}
		<span>{buttonText}</span>
	{/if}
	{@render children?.()}
	{#if buttonSubtext.length > 0}	
		<hr class="m-0 p-0 border-current opacity-30"/><p class="m-0 italic text-xs font-light">{buttonSubtext}</p>
	{/if}
</button>

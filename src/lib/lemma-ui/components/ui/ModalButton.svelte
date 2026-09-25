<script>
	import Button from "./Button.svelte";

	let { buttonText, title='', description='', header=null, children=null, buttonStyle=null} = $props();

	let dialog = $state(); // HTMLDialogElement
	let showModal = $state(false);

	$effect(() => {
		if (showModal) dialog.showModal();
        else dialog.close();
	});
    let scrollHeight =$state();
	let modalHeight =$state();
	let box;
	$effect(()=>{if (showModal) box.scrollIntoView()});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<Button {buttonText} buttonStyle={buttonStyle ? buttonStyle : 'btn btn-ghost font-normal'} buttonColors='' toggled={()=>{showModal = true;}} />

<dialog
	bind:this={dialog} bind:clientHeight={modalHeight}
	onclose={() => (showModal = false)}
	onclick={(e) => { if (e.target === dialog) dialog.close(); }}
	
	>
	
	<div bind:this={box} bind:clientHeight={scrollHeight} >
		<form method="dialog">
			<button class="btn px-2 py-1 text-sm btn-circle btn-ghost absolute right-2 top-2" onclick={()=>{showModal=false}}>✕</button>
		</form>
		{#if title || description}
			{#if title}
			<h1>{title}</h1>
			{/if}
			{#if description}
			{description}
			{/if}
		<hr/>
		{/if}
		
		{@render header?.()}
		<hr />
		{@render children?.()}
		<hr />
		<!-- svelte-ignore a11y_autofocus -->
		<div class="items-center flex">
			{#if scrollHeight > modalHeight+1} <button class="btn inline m-auto" autofocus onclick={() => box.scrollIntoView()}>Back to Top</button>{/if}
			<button class="btn inline m-auto" autofocus onclick={() => dialog.close()}>Close</button>
        </div>
	</div>
</dialog>

<style>
	dialog {
		/*max-width: 32em;*/
		border-radius: 0.2em;
		border: none;
		padding: 0;
	}
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.3);
	}
	dialog > div {
		padding: 1em;
	}
	dialog[open] {
		animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes zoom {
		from {
			transform: scale(0.95);
		}
		to {
			transform: scale(1);
		}
	}
	dialog[open]::backdrop {
		animation: fade 0.2s ease-out;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	button {
		display: block;
	}
</style>

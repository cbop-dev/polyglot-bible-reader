<script lang="ts">
import gridButtonBlack from '$lib/assets/grid-black.svg';
import gridButtonWhite from '$lib/assets/grid-white.svg';
    import { onMount } from 'svelte';
import Icon from './Icon.svelte';


import { theme,size } from '$lib/stores/ThemeObserver.svelte';






//let docStyle=$state(document.documentElement.style);
let isDark=$derived(theme.value=='dark');
//let darkTheme = $derived(document.documentElement.attributes['data-theme']=='dark');

//$inspect(isDark);
//console.log("Reactive button1!");
</script>

<div class="inline {isDark? 'bg-gray-800': 'bg-gray-200'} opacity-70 hover:opacity-100" ><Icon svg={isDark? gridButtonWhite :  gridButtonBlack } 
scale={size.current=='base'? 0.6:1}
classes={[ (theme.value=='dark'? 'hover:bg-black': 'hover:bg-white')]}
/></div>
<!--<div class="inline sm:hidden"><Icon svg={isDark? gridButtonWhite :  gridButtonBlack} scale={0.6}/></div>-->



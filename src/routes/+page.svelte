<script lang="ts">
import PolylotReader from '$lib/components/PolyglotReader.svelte';
	
import { page } from '$app/state';
import { mylog } from '$lib/lemma-ui/env/env';

  
const version = page.url.searchParams.get('version') ?? '';
const book = page.url.searchParams.get('book')?? '';
const chapter = page.url.searchParams.get('chapter')?? '';
const verse = page.url.searchParams.get('verse')?? '';
const grid=page.url.searchParams.get('grid') ?? '';//versions in the display grid
const meditate=page.url.searchParams.get('meditate') ?? '';
const gridArray: string[][]=[];
if (grid){
    
    const rows = grid.split("|");//row divider
    rows.forEach((row)=>{
        
        const cols = row.trim().split(',');
        gridArray.push(cols);
    });
//    mylog(`site, got a grid! param='${grid}'; gridArray=[${gridArray.flat().join(",")}]`, true);
  }
</script>
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (because of reasons) -->
<PolylotReader {version} {book} {chapter} {verse} grid={gridArray} {meditate}/>
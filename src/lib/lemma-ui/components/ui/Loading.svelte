<script>
    /**
     * @type {{title:string,
     * message:string[]}}
     */
    let {
        title="Loading...",
        message=["וְקֹויֵ יְהוָה יַחֲלִיפוּ כֹחַ",
                "οἱ δὲ ὑπομένοντες τὸν θεὸν ἀλλάξουσιν ἰσχύν",
                "Those who wait for the Lord will renew their strength",
                "Isa 40:31"]
    } =$props();
</script>
<h3>{title}</h3>
        <div class="flex-wrap">
        {#each message as line}   
            <div class="flex-3 text-center greek text-lg">{line}</div>
        {/each}
        </div>
    <div class="flex justify-center my-4">
        <span class="inline-block w-8 h-8 border-4 border-link border-t-transparent rounded-full animate-spin"></span>
    </div>  
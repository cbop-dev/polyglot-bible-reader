<script>
    import * as bibleUtils from '$lib/utils/bible-utils.js';
    import Modal2 from "./ui/Modal2.svelte";
    import CopyText from "./ui/CopyText.svelte";
    import ArrowUp from "./ui/icons/arrow-up.svelte";
    import { jumpToDiv } from "$lib/utils/ui-utils.js";
    import { getVerseText } from "$lib/services/dbClient.ts";
    import { readerState } from "$lib/stores/readerState.svelte.ts";

    let {
        title = '',
        description = '',
        occurrences = [],
        refs = [],
        sectionIDs = [],
        lang = 'greek',
        dbAbbrev = 'lxx'
    } = $props();

    let showText = $state(false);
    let chosenRefIdx = $state(-1);
    /** @type {Record<number, string>} */
    let textsFetched = $state({});

    // Normalize input into unified list of { ref: string, workUnitId: number }
    let normalizedOccurrences = $derived.by(() => {
        if (occurrences && occurrences.length > 0) {
            return occurrences.map((occ, idx) => ({
                ref: occ.ref_label || occ.display_label || (refs && refs[idx]) || '',
                workUnitId: occ.work_unit_id || (sectionIDs && sectionIDs[idx]) || 0
            }));
        }
        if (refs && refs.length > 0) {
            return refs.map((ref, idx) => ({
                ref,
                workUnitId: (sectionIDs && sectionIDs[idx]) || 0
            }));
        }
        return [];
    });

    /**
     * Precompute grouped books, index offsets, and combined range strings in a fast single pass
     */
    let groupedBookEntries = $derived.by(() => {
        let currentBook = '';
        const bookMap = new Map();

        for (let i = 0; i < normalizedOccurrences.length; i++) {
            const item = normalizedOccurrences[i];
            const bCv = bibleUtils.getBookChapVerseFromRef(item.ref);
            if (bCv.book) {
                currentBook = bCv.book;
            } else {
                bCv.book = currentBook;
            }

            let list = bookMap.get(bCv.book);
            if (!list) {
                list = [];
                bookMap.set(bCv.book, list);
            }
            list.push({ bCv, origIndex: i, item });
        }

        let offset = 0;
        const result = [];
        for (const [book, bookRefs] of bookMap.entries()) {
            const currentOffset = offset;
            offset += bookRefs.length;
            const refStrings = bookRefs.map((r) => bCvToString(r.bCv));
            result.push({
                book,
                bookRefs,
                indexOffset: currentOffset,
                combinedRefs: bibleUtils.combineRefs(refStrings) || refStrings.join('; ')
            });
        }
        return result;
    });

    let books = $derived(groupedBookEntries.map((e) => e.book));

    function bCvToString(bcv, omitBook = false) {
        if (!bcv) return '';
        let ret = (bcv.chap || '1') + ":" + (bcv.v || '1');
        if (!omitBook) {
            ret = (bcv.book ? bcv.book.replaceAll(" ", "") + " " : '') + ret;
        }
        return ret;
    }

    async function fetchText() {
        if (chosenRefIdx >= 0) {
            if (!textsFetched[chosenRefIdx]) {
                const item = normalizedOccurrences[chosenRefIdx];
                if (item && item.workUnitId) {
                    const body = await getVerseText(item.workUnitId);
                    if (body) {
                        textsFetched[chosenRefIdx] = body;
                    }
                }
            }
        }
    }

    function navigateToOccurrence(displayLabel) {
        if (!displayLabel) return;
        const parts = displayLabel.trim().split(' ');
        if (parts.length >= 2) {
            const bookPart = parts.slice(0, -1).join(' ');
            const cvPart = parts[parts.length - 1];
            const [ch, v] = cvPart.split(':');
            showText = false;
            readerState.closeAllPopups();
            readerState.selectBook(bookPart);
            if (ch) readerState.selectChapter(ch);
            if (v) {
                setTimeout(() => {
                    readerState.scrollToVerse(v);
                }, 200);
            }
        }
    }
</script>

<div class="inline" id="refs-top"></div>
{#if title && title.length}
    <h1 class="text-xl font-bold text-ink mb-1">{title}</h1>
{/if}
{#if description}
    <h2 class="text-sm text-ink-soft mb-3">{description}</h2>
{/if}

<div class="mb-4 p-3 rounded-lg bg-page border border-rule text-center shadow-xs">
    <div class="italic text-sm font-semibold text-ink-soft mb-2">
        💡 Click on a verse to see the text!
    </div>
    <div class="text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
        Jump to book:
    </div>
    <div class="flex flex-wrap items-center justify-center gap-1.5">
        {#each books as book}
            <button
                type="button"
                class="book-jump-btn"
                onclick={() => jumpToDiv(book.replaceAll(" ", "_"))}
            >
                {book}
            </button>
        {/each}
    </div>
</div>

<div class="w-full">
{#each groupedBookEntries as { book, bookRefs, combinedRefs }}
    <div id={book.replaceAll(" ","_")} class="relative bg-rule/30 text-ink font-bold px-3 py-1.5 rounded-lg my-2 flex items-center justify-center border border-rule/50">
        <span class="text-center font-bold tracking-wide">{book}</span>
        <div class="absolute right-2 flex items-center gap-1.5">
            <a href="#refs-top" onclick={()=>jumpToDiv("refs-top")} class="text-ink/70 hover:text-ink transition-colors p-1" title="Jump to top"><ArrowUp width={15} height={15}/></a>
            <CopyText copyText={combinedRefs}
                btnSizeCssClass="btn-xs font-bold"
                btnCssClass="bg-page hover:bg-rule text-ink border border-rule" 
                tooltip="Copy {book} references"
                width={15}
                height={15}
            />
        </div>
    </div>        
    <div class="text-center py-1">
    {#each bookRefs as refObj}
        <button 
            type="button" 
            class="inline-block px-2.5 py-1 m-0.5 text-xs font-mono rounded-md bg-page text-ink hover:bg-link hover:text-white border border-rule hover:border-link transition-all cursor-pointer shadow-2xs"
            onclick={() => { chosenRefIdx = refObj.origIndex; fetchText(); showText = true; }}
        >
            {bCvToString(refObj.bCv, true)}
        </button>
    {/each}
    </div>
{/each}
</div>

<Modal2 bind:showModal={showText} max={true}>
    {#if chosenRefIdx >= 0}
        {@const currentItem = normalizedOccurrences[chosenRefIdx]}
        {@const theRef = currentItem?.ref || ''}
        {@const theText = textsFetched[chosenRefIdx]}

        {#if !theText}
            <div class="py-12 text-center flex flex-col items-center justify-center gap-3">
                <span class="inline-block w-8 h-8 border-4 border-link border-t-transparent rounded-full animate-spin"></span>
                <p class="text-sm font-semibold text-ink">Loading verse text...</p>
            </div>
        {:else}
            <div class="block text-center py-2">
                <h2 class="text-xl font-bold text-ink mb-2">{theRef}</h2>
                <p class="{lang === 'hebrew' || dbAbbrev === 'bhs' ? 'hebrew font-hebrew text-3xl' : 'greek font-greek text-2xl'} py-4 text-ink leading-relaxed max-w-2xl mx-auto" dir={lang === 'hebrew' || dbAbbrev === 'bhs' ? 'rtl' : 'ltr'}>{theText}</p>
                <div class="mt-4 flex items-center justify-center gap-3">
                    <CopyText copyText={theRef + ": " + theText} tooltip="Copy verse reference and text" linkText="Copy Verse" />
                    <button
                        type="button"
                        class="px-3 py-1 text-xs font-bold text-ink bg-page border border-rule hover:bg-rule rounded-md shadow-xs cursor-pointer transition-colors"
                        onclick={() => navigateToOccurrence(theRef)}
                    >
                        Go to Verse
                    </button>
                </div>
            </div>
        {/if}
    {/if}
</Modal2>

<style>
    .book-jump-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.25rem 0.65rem;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 0.375rem;
        border: 1px solid var(--color-rule, rgba(128, 128, 128, 0.3));
        background-color: var(--color-page, #ffffff);
        color: var(--color-ink, #000000);
        cursor: pointer;
        transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .book-jump-btn:hover {
        background-color: var(--color-link, #2563eb);
        color: #ffffff;
        border-color: var(--color-link, #2563eb);
        transform: translateY(-1px);
    }

    .book-jump-btn:active {
        transform: translateY(0);
    }
</style>

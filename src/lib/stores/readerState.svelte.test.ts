import { describe, it, expect, vi } from 'vitest';
import { ReaderState, readerState } from './readerState.svelte';
import * as dbClient from '$lib/services/dbClient';
import * as bibleDataLoader from '$lib/services/bibleDataLoader';

describe('findIncompatibleVersions', ()=>{
    it('check if finds ot versions (BHS, Brenton, LXX) when given nt (SBLGNT) version', ()=>{
        const rs = new ReaderState();
        const incomp = rs.findIncompatibleVersions('SBLGNT');
        expect(incomp.length).toEqual(2);
        expect(incomp.includes('BHS')).toBe(true);
        expect(incomp.includes('LXX')).toBe(true);

        rs.addColumn('Brenton', false);
        rs.addColumn('Vulgate', false);
        rs.addColumn('WEB', false);
        const incomp2 =  rs.findIncompatibleVersions('SBLGNT');
        expect(incomp2.length).toEqual(3);
        const toFind = ['BHS', 'Brenton', 'LXX'];
        const notToFind=['Vulgate', 'WEB'];
        toFind.forEach((v)=>{
            expect(incomp2.includes(v)).toBe(true);
        });

        notToFind.forEach((v)=>{
            expect(incomp2.includes(v)).toBe(false);
        })
    });


    it('check if finds only nt versions (SBLGNT alias -> OpenGNT) when given ot (LXX) version', ()=>{
        const rs = new ReaderState();
        ['SBLGNT', 'KJV'].forEach((v)=>rs.addColumn(v,false));
        
        const incomp = rs.findIncompatibleVersions('LXX');
        expect(incomp.length).toEqual(1);

        const notToFind = ['BHS', 'LXX', 'KJV'];
        const toFind=['OpenGNT'];
        toFind.forEach((v)=>{
            expect(incomp.includes(v)).toBe(true);
        });

        notToFind.forEach((v)=>{
            expect(incomp.includes(v)).toBe(false);
        });
    });

    it('check if finds nothing when checked against bogus or complete bible versions', ()=>{
        const rs = new ReaderState();
        ['SBLGNT', 'KJV'].forEach((v)=>rs.addColumn(v,false));
        
        const incomp1 = rs.findIncompatibleVersions('nothing');
        expect(incomp1.length).toEqual(0);
        
        const incomp = rs.findIncompatibleVersions('Vulgate');
        expect(incomp.length).toEqual(0);

    });
      


});



describe('ensureVisibleCompatibleWithSelectedVersion', ()=>{
    it('adjust versions (BHS, Brenton, LXX) when selecting nt (SBLGNT alias -> OpenGNT) version', async ()=>{
        const rs = new ReaderState();
        expect(rs.selectedBook).toBe('Gen');
        await rs.selectVersion('SBLGNT', false);
        rs.ensureVisibleCompatibleWithSelectedVersion(false);
    
        const toFind = ['OpenGNT'];
        const notToFind=['BHS', 'Brenton', 'LXX'];
        toFind.forEach((v)=>{
            expect(rs.visibleVersions.includes(v)).toBe(true);
        });

        notToFind.forEach((v)=>{
            expect(rs.visibleVersions.includes(v)).toBe(false);
        });

        // Automatically changes to an available NT book
        console.log('DEBUG: rs.versionGrid:', JSON.stringify(rs.versionGrid));
        console.log('DEBUG: rs.activeVersions:', JSON.stringify(rs.activeVersions));
        expect(rs.selectedBook).toBe('Matt');
        expect(rs.selectedChapter).toBe('1');
    });

});

				
//
describe('getGridRowColIdxOfVersion', ()=>{
    it('check getGridRowColIdxOfVersion', ()=>{
        const rs = new ReaderState();
        
        const rowCol = rs.getGridRowColIdxOfVersion('LXX');
        expect(rowCol[0]).toEqual(0);
        expect(rowCol[1]).toEqual(1);
    });

});

describe('realign cell', ()=>{
    it('try realigning cell automatically: rtl Vulate->ltr', async ()=>{
        const rs = new ReaderState();
        
        rs.updateCell(0,0,"Vulgate", false,false);
        expect(rs.getCellAlign(0,0)).toEqual("right");
        rs.realignCell(0,0);
        expect(rs.getCellAlign(0,0)).toEqual("left");
        rs.updateCell(0,0,"BHS", false,false);
        expect(rs.getCellAlign(0,0)).toEqual("left");
        rs.realignAll();
        expect(rs.getCellAlign(0,0)).toEqual("right");
        await rs.selectVersion('SBLGNT', false);
        expect(rs.versionGrid[0][0]).toEqual("KJV");
        
        expect(rs.gridAlignments[0][0]).toEqual("left");
    });

    it('immediately loads Matt 1 verses without omitted state when switching to OpenGNT from landing state', async () => {
        vi.spyOn(dbClient, 'getBookChapters').mockResolvedValue([1, 2, 3]);
        vi.spyOn(dbClient, 'getChapterVerses').mockImplementation(async (book, chapter, versions) => {
            if (book === 'Matt' || book === 'MAT') {
                return [
                    {
                        base_cref_id: 1,
                        ord: 1001,
                        hierarchy: '1,1',
                        base_label: 'Matt 1:1',
                        version: 'KJV',
                        work_unit_id: 101,
                        verse_label: '1:1',
                        body: 'The book of the generation of Jesus Christ...',
                        words: []
                    },
                    {
                        base_cref_id: 1,
                        ord: 1001,
                        hierarchy: '1,1',
                        base_label: 'Matt 1:1',
                        version: 'OpenGNT',
                        work_unit_id: 201,
                        verse_label: '1:1',
                        body: 'Βίβλος γενέσεως Ἰησοῦ Χριστοῦ...',
                        words: []
                    }
                ];
            }
            return [];
        });

        const rs = new ReaderState();
        expect(rs.selectedVersion).toBe('BHS');
        expect(rs.selectedBook).toBe('Gen');
        expect(rs.selectedChapter).toBe('1');
        expect(rs.versionGrid).toEqual([['BHS', 'LXX']]);

        // Select OpenGNT with reload=true (default)
        await rs.selectVersion('OpenGNT');

        expect(rs.selectedVersion).toBe('OpenGNT');
        expect(rs.selectedBook).toBe('Matt');
        expect(rs.selectedChapter).toBe('1');
        expect(rs.versionGrid).toEqual([['KJV', 'OpenGNT']]);

        const opengntVerse = rs.getVerseData('1', 'OpenGNT');
        expect(opengntVerse.exists).toBe(true);
        expect(opengntVerse.omitted).toBe(false);
        expect(opengntVerse.verseData?.body || opengntVerse.verseData?.text).toBe('Βίβλος γενέσεως Ἰησοῦ Χριστοῦ...');

        const kjvVerse = rs.getVerseData('1', 'KJV');
        expect(kjvVerse.exists).toBe(true);
        expect(kjvVerse.omitted).toBe(false);
    });

    it('inspectWord resolves Hebrew lemma gloss from database or token fallback', async () => {
        const rs = new ReaderState();
        vi.spyOn(dbClient, 'getLemma').mockResolvedValue({
            id: 1,
            corpus: 'bdb',
            lex_id: 1,
            lemma: 'רֵאשִׁית',
            gloss: 'beginning',
            pos: null,
            strongs: 'H7225',
            beta: '',
            plain: 'ראשית',
            total: 51
        });
        vi.spyOn(dbClient, 'getLexiconEntry').mockResolvedValue({
            id: 1,
            dictionary: 'bdb',
            strongs: 'H7225',
            headword: 'רֵאשִׁית',
            consonant_key: 'ראשית',
            transliteration: '',
            gloss: 'beginning',
            definition: 'beginning'
        });

        await rs.inspectWord(
            {
                word: 'בְּרֵאשִׁית',
                normalized: 'בראשית',
                lemma: 'רֵאשִׁית',
                strongs: 'H7225',
                morph: 'Prep-b',
                gloss: 'beginning'
            },
            'BHS'
        );

        expect(rs.showLemmaModal).toBe(true);
        expect(rs.activeWord).toBeDefined();
        expect(rs.activeWord?.lemma).toBe('רֵאשִׁית');
        expect(rs.activeWord?.gloss).toBe('beginning');
        expect(rs.activeWord?.strongs).toBe('H7225');
    });

    it('inspectWord falls back to token gloss when lexData gloss is empty', async () => {
        const rs = new ReaderState();
        vi.spyOn(dbClient, 'getLemma').mockResolvedValue({
            id: 2,
            corpus: 'bdb',
            lex_id: 2,
            lemma: 'אָדָם',
            gloss: '',
            pos: null,
            strongs: 'H120',
            beta: '',
            plain: 'אדם',
            total: 562
        });
        vi.spyOn(dbClient, 'getLexiconEntry').mockResolvedValue(null);

        await rs.inspectWord(
            {
                word: 'אָדָם',
                normalized: 'אדם',
                lemma: 'אָדָם',
                strongs: 'H120',
                morph: 'N-ms',
                gloss: 'human, mankind'
            },
            'BHS'
        );

        expect(rs.showLemmaModal).toBe(true);
        expect(rs.activeWord).toBeDefined();
        expect(rs.activeWord?.gloss).toBe('human, mankind');
    });

    it('immediately activates selected version, closes dropdown, and sets loading state before async lookup resolves', async () => {
        let resolveChapters: (val: any) => void;
        let resolveVerses: (val: any) => void;
        const pendingChapters = new Promise((resolve) => {
            resolveChapters = resolve;
        });
        const pendingVerses = new Promise((resolve) => {
            resolveVerses = resolve;
        });

        vi.spyOn(dbClient, 'getBookChapters').mockImplementation(() => pendingChapters as any);
        vi.spyOn(dbClient, 'getChapterVerses').mockImplementation(() => pendingVerses as any);

        const rs = new ReaderState();
        rs.versionDropdownOpen = true;

        // Kick off selectVersion without awaiting immediately
        const selectPromise = rs.selectVersion('Vulgate');

        // Immediately after invocation:
        expect(rs.selectedVersion).toBe('Vulgate');
        expect(rs.versionDropdownOpen).toBe(false);
        expect(rs.isLoading).toBe(true);
        expect(rs.loadingMessage).toBe('Loading Vulgate...');

        // Now resolve the async calls
        resolveChapters!([1, 2]);
        resolveVerses!([]);
        await selectPromise;

        expect(rs.isLoading).toBe(false);
        expect(rs.loadingMessage).toBe('Loading Book and Chapter...');
    });

    it('normalizes book identifiers in selectBook (e.g. 2PE -> 2_Pet in OpenGNT)', async () => {
        const rs = new ReaderState();
        await rs.selectVersion('OpenGNT', false);

        // USFM code '2PE'
        const ok1 = await rs.selectBook('2PE', false);
        expect(ok1).toBe(true);
        expect(rs.selectedBook).toBe('2_Pet');

        // Full title '2 Peter'
        const ok2 = await rs.selectBook('2 Peter', false);
        expect(ok2).toBe(true);
        expect(rs.selectedBook).toBe('2_Pet');

        // Version-specific book naming: ECC -> Qoh in BHS vs Eccl in KJV
        await rs.selectVersion('BHS', false);
        const okBhs = await rs.selectBook('ECC', false);
        expect(okBhs).toBe(true);
        expect(rs.selectedBook).toBe('Qoh');

        await rs.selectVersion('KJV', false);
        const okKjv = await rs.selectBook('ECC', false);
        expect(okKjv).toBe(true);
        expect(rs.selectedBook).toBe('Eccl');
    });

    it('smoothly navigates to reference using navigateToReference without double-loading', async () => {
        const rs = new ReaderState();
        await rs.selectVersion('OpenGNT', false);

        const ok = await rs.navigateToReference('2PE', '2', '15');
        expect(ok).toBe(true);
        expect(rs.selectedBook).toBe('2_Pet');
        expect(rs.selectedChapter).toBe('2');
    });

    it('defaults Sirach to Chapter 0 in LXX and Chapter 1 in Vulgate/KJV without falsy coercion', async () => {
        const rs = new ReaderState();

        // In LXX, Sirach begins at Chapter 0 (Prologue)
        await rs.selectVersion('LXX', false);
        const okLxx = await rs.selectBook('Sir', false);
        expect(okLxx).toBe(true);
        expect(rs.selectedChapter).toBe('0');
        expect(rs.availableChapters[0]).toBe(0);

        // Switching primary version to Vulgate (which lacks Chapter 0) safely resets to Chapter 1
        await rs.selectVersion('Vulgate', false);
        expect(rs.selectedBook).toBe('Sir');
        expect(rs.selectedChapter).toBe('1');
        expect(rs.availableChapters[0]).toBe(1);

        // In KJV, Sirach begins at Chapter 1
        await rs.selectVersion('KJV', false);
        await rs.selectBook('Sir', false);
        expect(rs.selectedChapter).toBe('1');
        expect(rs.availableChapters[0]).toBe(1);
    });

    it('preserves Chapter 0 when loading chapter data and utilizes LRU cache on repeat loads', async () => {
        const mockVerses = Array.from({ length: 36 }, (_, i) => ({
            id: i + 1,
            work_unit_id: `sir_0_${i + 1}`,
            ord: i + 1,
            hierarchy: `0,${i + 1}`,
            body: `Verse ${i + 1} text`,
            version: 'LXX',
            native_citation: `0:${i + 1}`
        }));

        const mockLoadResult: bibleDataLoader.ChapterDataResult = {
            verses: mockVerses as any,
            verseKeys: mockVerses.map((_, i) => String(i + 1)),
            chapterDataByVerse: Object.fromEntries(
                mockVerses.map((_, i) => [
                    String(i + 1),
                    {
                        LXX: {
                            exists: true,
                            omitted: false,
                            label: `0:${i + 1}`,
                            verseData: { text: `Verse ${i + 1} text` }
                        }
                    }
                ])
            )
        };

        const loadDbSpy = vi.spyOn(bibleDataLoader, 'loadChapterFromDb').mockResolvedValue(mockLoadResult);

        const rs = new ReaderState();
        await rs.selectVersion('LXX', false);
        await rs.selectBook('Sir', false);

        expect(rs.selectedChapter).toBe('0');

        // First load from DB
        await rs.loadCurrentChapter(false);

        expect(rs.selectedChapter).toBe('0');
        expect(loadDbSpy).toHaveBeenCalledTimes(1);
        // Verify chapNum passed to loadChapterFromDb was 0, not coerced to 1
        expect(loadDbSpy).toHaveBeenCalledWith('Sir', 0, rs.activeVersions, 'LXX');
        expect(rs.chapterVerseKeys).toHaveLength(36);

        // Repeat load should be served directly from LRU cache without hitting loadChapterFromDb
        await rs.loadCurrentChapter(false);
        expect(loadDbSpy).toHaveBeenCalledTimes(1);
        expect(rs.chapterVerseKeys).toHaveLength(36);
        expect(rs.selectedChapter).toBe('0');
    });
});
import * as BibleUtils from "$lib/utils/bible-utils.js";
import { Lexeme } from "../Lexeme.js";

export class VocabDataset {
    name = '';
    abbrev = '';
    dbAbbrev = '';
    lang = '';
    /**
     * @type {BookDict} booksDict
     * */
    booksDict = new BookDict();
    /**
     * @type {Object<number,string[]>} posDict
     */
    posDict = {};
    /**
     * @type {Object<string,number[]>} posGroups
     */
    posGroups = {};

    /**
     * @type {Object<string,string>} posGroupsUIDesc
     */
    posGroupsUIDesc = {};

    /**
     * @param {string} posAbbrev
     * @returns {number}
     */
    getPosEnum(posAbbrev) {
        const found = Object.entries(this.posDict).filter(([k, v]) => v == posAbbrev).map(([k, v]) => Number(k));
        return found.length ? found[0] : (Lexeme?.PosEnum?.UNSPECIFIED ?? 15);
    }

    lexStats = {
        totalWords: 0,
        totalLexemes: 0
    };
    /**
     * @type {Object<string,string[]|number[]>}
     */
    lexemes = {};
}

export class BookDict {
    /**
     * @type {Object<number,{abbrev:string,syn:string[],long:string,words:number}>} books
     */
    books = {};

    /** 
     * @type {Object<number,Object<number,number>>} chapters
     */
    chapters = {};

    /**
     * @type {{totalWords:number,totalLexemes:number}} lexStats
     */
    lexStats = { totalWords: 0, totalLexemes: 0 };

    /**
     * 
     * @param {number|string} section -- node ID of text in vocab db.
     * @returns {string} -- the Bible reference (e.g., 'Gen 1:1').
     */
    getRef(section) {
        section = Number(section) ? Number(section) : 0;

        let ref = '';
        if (section) {
            if (this.books[section])
                ref = this.books[section].abbrev;
            else {
                for (const [b, chapL] of Object.entries(this.chapters)) {
                    if (chapL[section]) {
                        ref = this.books[b].abbrev + " " + chapL[section];
                    }
                }
            }
        }
        return ref;
    }

    /**
     * 
     * @param {string[]} refArray  -- an array of strings where each string represents a single bible reference.
     * @returns -- a string with the bible references grouped and combined by book and chapter.
     */
    combineRefs(refArray) {
        let refList = {};
        for (const ref of refArray) {
            const bcVparts = BibleUtils.getBookChapVerseFromRef(ref.trim());
            bcVparts.book = this.lookupBookAbbrev(bcVparts.book ? bcVparts.book : '');

            if (bcVparts.book && !refList[bcVparts.book]) {
                refList[bcVparts.book] = {};
            }
            if (!bcVparts.v) {
                if (bcVparts.book && bcVparts.chap && refList[bcVparts.book] != 'all') {
                    refList[bcVparts.book][bcVparts.chap] = 'all';
                }
            }
            else if (bcVparts.book && bcVparts.chap) {
                if (!refList[bcVparts.book][bcVparts.chap]) {
                    refList[bcVparts.book][bcVparts.chap] = [bcVparts.v];
                }
                else if (refList[bcVparts.book][bcVparts.chap] != 'all' && refList[bcVparts.book][bcVparts.chap]?.push) {
                    refList[bcVparts.book][bcVparts.chap].push(bcVparts.v);
                }
            }
            else if (bcVparts.book) {
                refList[bcVparts.book] = 'all';
            }
        }

        const combined = Object.entries(refList).map(([b, chapList]) => {
            if (chapList == 'all' || Object.keys(chapList).length == 0)
                return b;
            else {
                return (b + " " + Object.entries(chapList).sort((a, b) => a[0] - b[0]).map(
                    ([c, vv]) =>
                        vv.includes("all") ?
                            c
                            : c + ":" + this.joinInRanges(vv.sort((a, b) => Number(a) - Number(b)))
                ).join("; "));
            }
        }).join("; ");
        return combined;
    }

    /**
     * @param {Array.<number|string>} numArray array of numbers (or numeric strings)
     * @returns {string} a string of the numbers, sorted with ranges, each range/number separated by 'separator'
     *  E.g. joinInRanges([1,3,2,5,5,6], ",") => "1-3,5-6".
     */
    joinInRanges(numArray, separator = ",", spreader = "-") {
        let uniqueArray = [...new Set(numArray.map((x) => Number(x)))].sort((x, y) => x - y);

        let rangeString = '';
        let curRangeStart = uniqueArray[0];
        let curRangeEnd = uniqueArray[0];
        if (uniqueArray.length == 1) {
            rangeString += curRangeEnd.toString();
        }
        else {
            for (let [i, num] of uniqueArray.entries()) {
                if (i == 0) {
                }
                else if (num == (curRangeEnd + 1))
                    curRangeEnd = num;
                else {
                    if (rangeString.length > 0)
                        rangeString += separator;
                    if (curRangeStart == curRangeEnd) {
                        rangeString += curRangeEnd.toString();
                    }
                    else {
                        rangeString += curRangeStart.toString() + spreader + curRangeEnd.toString();
                    }
                    curRangeStart = num;
                    curRangeEnd = num;
                }
                if (i == uniqueArray.length - 1 && i > 0) {
                    if (rangeString.length > 0)
                        rangeString += separator;
                    if (num == curRangeStart) {
                        rangeString += num.toString();
                    }
                    else {
                        rangeString += curRangeStart.toString() + spreader + curRangeEnd.toString();
                    }
                }
            }
        }
        return rangeString;
    }

    /**
     * @param {string} bookName 
     * @returns {string} the official abbreviation if matched, empty string otherwise.
     */
    lookupBookAbbrev(bookName) {
        let ret = '';
        const bookNameVariants = new Set([bookName, bookName.toLocaleLowerCase(),
            bookName.toLocaleLowerCase().replace(" ", "_"), bookName.toLocaleLowerCase().replace(" ", "")]);

        let found = Object.values(this.books).find((bookrow) => {
            const possibleBookNames1 = new Set([bookrow?.abbrev, ...(bookrow?.syn || []), bookrow?.long]
                .filter(Boolean).map((bn) => bn.toLocaleLowerCase()));
            let matched = bookNameVariants.intersection(possibleBookNames1).size > 0;

            if (!matched) {
                const possibleBookNames2 = new Set(Array.from(possibleBookNames1).map((bn) =>
                    [bn.replace(" ", ""), bn.replace(" ", "_")]).flat());
                matched = bookNameVariants.intersection(possibleBookNames2).size > 0;
            }
            return matched;
        });

        if (found) {
            ret = found.abbrev;
        }
        return ret;
    }

    /**
     * @param {string} refString 
     * @returns theRefString after removing any references with invalid booknames.
     */
    filterOutInvalidBooks(refString) {
        return this.combineRefs(BibleUtils.expandRefs(refString).map((ref) => {
            const bcv = BibleUtils.getBookChapVerseFromRef(ref);
            return {
                book: this.lookupBookAbbrev(bcv.book ? bcv.book : ''),
                chap: bcv.chap,
                v: bcv.v
            };
        }).filter((bcv) => bcv.book).map(
            (bcv) => BibleUtils.bookChapVerseToString(bcv)));
    }
}

export { VocabDataset as TfDataset };

import { staticDatasetProvider } from "../engine/StaticDatasetProvider.js";

export class GenericVocabDataset extends VocabDataset {
    /**
     * @param {string} dbAbbrev 
     * @param {string} name 
     * @param {string} lang 
     */
    constructor(dbAbbrev = 'kjv', name = 'King James Version', lang = 'english') {
        super();
        this.dbAbbrev = dbAbbrev;
        this.abbrev = dbAbbrev.toUpperCase();
        this.name = name;
        this.lang = lang;
    }

    /**
     * Load books metadata from static data
     */
    async initBooks() {
        try {
            const booksData = await staticDatasetProvider.loadData(this.dbAbbrev, 'books');
            if (booksData) {
                let totalWords = 0;
                for (const [id, b] of Object.entries(booksData)) {
                    const numId = Number(id);
                    const bookId = !isNaN(numId) ? numId : id;
                    const bookEntry = {
                        abbrev: b.abbrev,
                        name: b.name || b.abbrev,
                        long: b.name || b.abbrev,
                        words: b.words || 0,
                        syn: [b.abbrev, b.name].filter(Boolean)
                    };
                    this.booksDict.books[bookId] = bookEntry;
                    this.booksDict.books[b.abbrev] = bookEntry;
                    totalWords += (b.words || 0);
                }
                this.lexStats = { totalWords, totalLexemes: 0 };
            }
        } catch (e) {
            console.warn(`Could not init books for ${this.dbAbbrev}`, e);
        }
        return this;
    }
}


import { Lexeme } from "../Lexeme.js";
import { HebrewUtils } from "$lib/utils/hebrew-utils.js";
import { mylog } from "../env/env.js";
class Filter {
    /**
     * 
     * @param {string} name 
     * @param {function(Lexeme):boolean} func
     */
    constructor(name, func) {
        this.name = name;
        this.pass = func;
    }
}

class LexQueryFilter extends Filter {
    static defaults = {
        minVal: 0,
        maxVal: 100000,
    }


    /**
     * @type {Object.<number, string>} pos
     */

    pos = $state({});
    maxWords = $state(0); // 0 means no limit; set to > 0 for WordCloud
    //these two (maxOn/Off) currently do nothing...
    maxOn = $state(false);
    minOn = $state(true);
    /**
     * TODO: rename and refactor: get rid of all "slider" language and variables,
     *  ecause this class should not know anything about gui "sliders", just *data* filtering options and values.
     */
    //WHAT is this vs. sectionMinMax? DOCUMENT!!! I think these are the ranges for the GUI filter slider...
    // DUMB NAMES!! TO DO: RENAME: these are the visible range of the GUI slider
    sectionMinMaxRange = $state([LexQueryFilter.defaults.minVal, LexQueryFilter.defaults.maxVal]);
    corpusMinMaxRange = $state([LexQueryFilter.defaults.minVal, LexQueryFilter.defaults.maxVal]);

    //DUMB NAMES! I think these are the actual min/max values applied by the filters:
    sectionSliderValues = $state([...this.sectionMinMaxRange]);
    corpusSliderValues = $state([...this.corpusMinMaxRange]);


    englishOnly = $state(false);
    textFilter = $state('');
    textCaseSensitive = $state(false);
    minUniqueness = $state(0); //0-100 (like a percent)
    uniqueFilterType = $state('none');

    //used for second-pass filter, with pass2() calls (added with add2())
    /**
     * @type {Filters[]} this.filters2
     */
    filters2 = [];
    //console.debug("created filter.filters2!");

    /**
     * 
     * @param {Filter} filter -- has pass() 
     */
    add(filter) {
        this.filters.push(filter);
    }

    /**
     * 
     * @param {Filter} filter -- has pass() 
     */
    add2(filter) {
        this.filters2.push(filter);
    }

    /**
     * 
     * @param {Lexeme} lex 
     * @returns boolean
     */
    pass2(lex) {
        let pass = true;
        //console.debug("pass2, do we have  filters2?" + this.filters2 ? "Yes" : "No")
        //console.debug("filters length: " + this.filters2.length)

        for (const f of this.filters2) {
            if (!f.pass(lex)) {
                pass = false;
                break;
            }

        }

        return pass;
    }

    /**
     * 
     * @param {number[]} restricted 
     */
    setRestricted(restricted) {
        for (const key of restricted) {
            this.pos[key] = 'restrict'
        }
    }

    /**
     * 
     * @param {number[]} exclude 
     */
    setExcluded(exclude) {
        for (const key of exclude) {
            this.pos[key] = 'exclude'
        }
    }

    /**
     * 
     * @param {number[]} exclude 
     * @param {number[]} restrict 
     * @param {Filter[]} filters
     */
    constructor(exclude = [], restrict = [], filters = []) {

        super('lexquery', (lex) => {
            let pass = true;

            for (const f of this.filters) {
                if (!f.pass(lex)) {
                    pass = false;
                    break;
                }

            }

            return pass;
        });
        this.posDict = Lexeme.PosDict;
        this.id = Math.floor(Math.random() * 101);
        //        console.debug("queryFilter("+this.id+")");
        // this.filters2 = [];
        //console.debug('creating LexQueryFilter. filters2 has length: ' +this.filters2.length);
        /**
        * @type {Object.<number, string>}
        */

        for (const key of Object.keys(this.posDict)) {
            this.pos[key] = 'include';
        }
        for (const key of exclude) {
            this.pos[key] = 'exclude'
        }
        for (const key of restrict) {
            this.pos[key] = 'restrict'
        }

        /**
         * @type {Filter[]} filters
         */
        this.filters = [];
        for (const f of filters) {
            this.add(f)
        }



        this.add(new Filter('pos', (lex) => {

            let pass = true;
            const lexPosSet = new Set(lex.posEnums);
            const excludedSet = new Set(this.getExcluded());
            const restrictedSet = new Set(this.getRestricted());
            if (excludedSet.intersection(lexPosSet).size > 0) {

                pass = false;
            }
            else if (restrictedSet.size > 0 && restrictedSet.intersection(lexPosSet).size == 0) {

                pass = false;
            }

            return pass;
        }));


        this.add(new Filter('minCorpusCount', (lex) => {

            let pass = true;
            if (lex.stats.total && this.corpusSliderValues[0] > 0 && lex.stats.total < this.corpusSliderValues[0])
                pass = false;
            return pass;
        }));


        this.add(new Filter('minSectionCount', (lex) => {

            let pass = true;
            if (lex.stats.querySectionStats.lexCounts.section && this.sectionSliderValues[0] > 0 && lex.stats.querySectionStats.lexCounts.section < this.sectionSliderValues[0])
                pass = false;
            return pass;
        }));


        this.add(new Filter('maxCorpusCount', (lex) => {

            let pass = true;
            if (lex.stats.total && this.corpusSliderValues[1] > 0 && lex.stats.total > this.corpusSliderValues[1])
                pass = false;
            return pass;
        }));


        this.add(new Filter('maxSectionCount', (lex) => {

            let pass = true;
            if (lex.stats.querySectionStats.lexCounts.section && this.sectionSliderValues[1] > 0 
                && lex.stats.querySectionStats.lexCounts.section > this.sectionSliderValues[1]) {
                pass = false;
                
            }
            return pass;
        }));

        this.add2(new Filter('text', (lex) => {

            let pass = true;
            if (this.textFilter.trim().length > 0) {
                pass = false;
                let input = this.textCaseSensitive ?
                    this.textFilter.trim()
                    : this.textFilter.trim().toLowerCase();


                const lemmaPlain = lex.lang == "hebrew" ?
                    HebrewUtils.removeFinalConsonants(lex.plain)
                    : this.textCaseSensitive ?
                        lex.plain
                        : lex.plain.toLowerCase();
                if (lex.lang == 'hebrew') {
                    input = HebrewUtils.removeFinalConsonants(HebrewUtils.makePlain(input));
                }
                if (lemmaPlain.includes(input)) {
                    pass = true;
                }
                else if (lex.lang == "greek" && input.includes('ς') && lemmaPlain.includes(input.replaceAll('ς', 'σ'))) {
                    pass = true;
                }

            }
            return pass;

        }));

        this.add(new Filter('uniqueness', (lex) => {
            let pass = true;
            if (this.uniqueFilterType == 'remove' && this.minUniqueness > 0) {
                pass = 100 * (lex.stats.querySectionStats.lexCounts.section / lex.stats.total) < this.minUniqueness;
            }
            else if (this.uniqueFilterType == 'isolate' && this.minUniqueness > 0) {
                pass = 100 * (lex.stats.querySectionStats.lexCounts.section / lex.stats.total) >= this.minUniqueness;
            }

            return pass;
        }));

    }
    /**
     * 
     * @param {LexQueryFilter} filter 
     */
    copyFrom(filter) {
        //this.reset();
        for (const k in filter.pos) {
            this.pos[k] = filter.pos[k];
        }
        this.setRestricted(filter.getRestricted());
        this.setExcluded(filter.getExcluded());
        //        console.debug("copyFrom()");
        this.maxWords = filter.maxWords;

        this.setMinMaxRanges(filter.corpusMinMaxRange, filter.sectionMinMaxRange);
        this.englishOnly = filter.englishOnly;
        this.setMinMaxValues(filter.corpusSliderValues, filter.sectionSliderValues);

    }
    /**
     * @description the parts of speech to exclude
     * @returns {number[]}
     */
    getExcluded() {
        const ex = Object.entries(this.pos).filter(([posId, filter]) => filter == 'exclude').map(([posId, filter]) => Number(posId));
        ////console.debug('getExcluded=' + ex.join(','));
        return ex;
    }
    /**
     * @description the parts of speech to restrict to
     * @returns {number[]}
     */
    getRestricted() {
        const inc = Object.entries(this.pos).filter(([posId, filter]) => filter == 'restrict').map(([posId, filter]) => Number(posId));
        //console.debug('getRestricted=' + $state.snapshot(inc.join(',')));
        return inc;
    }


    /**
     * @description returns true if the given lexeme passes the filter.
     * @param {Lexeme} lex 
     * @returns {boolean}
     */
    includesLex(lex) {
        //console.debug("running filter.includes");
        const excludedSet = new Set(this.getExcluded());
        const restrictedSet = new Set(this.getRestricted());
        const lexPosSet = new Set(lex.posEnums);

        return (
            (excludedSet.intersection(lexPosSet).size == 0) // not excluded?
            &&
            (restrictedSet.size == 0 || restrictedSet.intersection(lexPosSet).size > 0) //unrestricted?
        )
            &&
            (lex.stats.total >= this.corpusMinMaxRange[0]) && (lex.stats.querySectionStats.lexCounts.section >= this.sectionMinMaxRange[0])
            &&
            (lex.stats.total <= this.corpusMinMaxRange[1]) && (lex.stats.querySectionStats.lexCounts.section <= this.sectionMinMaxRange[1]);
    }

    reset(corpusRange = null, sectionRange = null) {
        //        console.debug("filter["+this.id+"].reset()");
        const lRange = corpusRange ? corpusRange : this.corpusMinMaxRange;
        const sRange = sectionRange ? sectionRange : this.sectionMinMaxRange;
        let f = new LexQueryFilter();
        this.maxOn = false;
        this.minOn = true;

        this.copyFrom(f);

        this.setMinMaxRanges(lRange, sRange);
    }

    /**
     * 
     * @param {number[]|null} corpusRange 
     * @param {number[]|null} sectionRange 
     */
    setMinMaxRanges(corpusRange = null, sectionRange = null) {


        if (corpusRange && sectionRange) {
            ;

        }
        if (corpusRange) {
            this.corpusMinMaxRange = [...corpusRange];

            if (this.corpusSliderValues[0] < this.corpusMinMaxRange[0])
                this.corpusSliderValues[0] = this.corpusMinMaxRange[0];
            if (this.corpusSliderValues[1] > this.corpusMinMaxRange[1])
                this.corpusSliderValues[1] = this.corpusMinMaxRange[1];

        }

        if (sectionRange) {
            this.sectionMinMaxRange = [...sectionRange];

            if (this.sectionSliderValues[0] < this.sectionMinMaxRange[0])
                this.sectionSliderValues[0] = this.sectionMinMaxRange[0];
            if (this.sectionSliderValues[1] > this.sectionMinMaxRange[1])
                this.sectionSliderValues[1] = this.sectionMinMaxRange[1];

        }
        //        console.debug("ranges ARE: corpus[" + this.corpusMinMaxRange.join(',') + "], sec["+this.sectionMinMaxRange.join(',')+']');
        mylog("setMinMaxRanges([" + corpusRange?.join(',') + "],[" + sectionRange?.join(',') + "])...");
        mylog("...slider vals = corpus([" + this.corpusSliderValues.join(',') + "],[" + this.sectionSliderValues?.join(',') + "]) = ");
    }

    /**
     * 
     * @param {number[] | null} corpusValues 
     * @param {number[] | null} sectionValues 
     */
    setMinMaxValues(corpusValues = null, sectionValues = null) {
        if (corpusValues) {
            this.corpusSliderValues = [...corpusValues];
            if (this.corpusMinMaxRange[0] > this.corpusSliderValues[0])
                this.corpusMinMaxRange[0] = this.corpusSliderValues[0];
            if (this.corpusMinMaxRange[1] < this.corpusSliderValues[1])
                this.corpusMinMaxRange[1] = this.corpusSliderValues[1];
        }
        if (sectionValues) {
            this.sectionSliderValues = [...sectionValues];
            if (this.sectionMinMaxRange[0] > this.sectionSliderValues[0])
                this.sectionMinMaxRange[0] = this.sectionSliderValues[0];
            if (this.sectionMinMaxRange[1] < this.sectionSliderValues[1])
                this.sectionMinMaxRange[1] = this.sectionSliderValues[1];
        }
    }

    /**
     * @description a more granular way to set a min/max value. A 'null' value leaves unchanged.
     * @param {number|null} corpusMin 
     * @param {number|null} corpusMax 
     * @param {number|null} sectionMin 
     * @param {number|null} sectionMax 
     */
    setMinOrMax(corpusMin=null, corpusMax=null,sectionMin=null, sectionMax=null) {
        corpusMin = corpusMin!=null ? corpusMin :  this.corpusSliderValues[0];
        corpusMax = corpusMax!=null ? corpusMax :  this.corpusSliderValues[1];
        sectionMin = sectionMin!=null ? sectionMin :  this.sectionSliderValues[0];
        sectionMax = sectionMax!=null ? sectionMax :  this.sectionSliderValues[1];
        this.setMinMaxValues([corpusMin, corpusMax], [sectionMin, sectionMax]);
    }
        
}



class LexQuery {
    ready = $state(false);
    sent = $state(false);
    common = $state(false);
    unique = $state(false);
    refsText = $state("");
    /**
     * @type {number[]}
     */
    sections =$state([]);
    results = $state(
        {
            /**
             * @type {Lexeme[]} lexemeArray
             */
            lexemeArray: [],
            /**
             * @type {number} avgSectionLexCount
             */
            avgSectionLexCount: 0,
            /**
             * @type {string[]} refs
             */
            refs: [],//not always used,
            /**
             * @type {Object<number,number>} bookCounts
             */
            bookCounts: {}  //bookid->count; not always used
        });

    /**
    *  @type {null|Array.<Object>|Object.<string|number,string|Object>}
    */
    response = $state(null);
    filter = $state(new LexQueryFilter());
    /**
     * 
     * @param {number[]} sections 
     * @param {boolean} ready 
     * @param {boolean} sent 
     * @param {boolean|null} response 
     * @param {LexQueryFilter} filter 
     */
    constructor(sections = [], ready = false, sent = false, response = null, filter = new LexQueryFilter()) {
        this.ready = ready;
        this.sent = sent;
        this.sections = sections;
        this.response = response;
        this.filter = filter;
    }

    reset(resetReady = false) {
        if (resetReady && this.ready) this.ready = false;
        if (this.sent) this.sent = false;
        if (this.response) this.response = null;
    }
    copy() {
        let copy = new LexQuery()
        for (const [k, v] of Object.entries(this)) {
            copy[k] = v;
        }
        copy.sections=this.sections;
        copy.refsText=this.refsText;
        copy.unique=this.unique;
        copy.filter=this.filter;

        return copy;
    }
    makeReady() {
        mylog("LexQuery.svelte.js.makeReady()...")

        if (this.unique) {
            this.results.lexemeArray = this.results.lexemeArray.filter((l) => l.stats.queryCount == l.stats.total)
        }
        this.setFilterRanges();
        if (!this.ready) this.ready = true;
    }


    setFilterRanges() {

        if (this.ready) {
            //         
            let range = this.results.lexemeArray.length > 0 ?
                [Math.min(...this.results.lexemeArray.map((l) => l.stats.total)),
                Math.max(...this.results.lexemeArray.map((l) => l.stats.total))]
                : [0, 90000];
            let secRange = this.results.lexemeArray.length > 0 ?
                [Math.min(...this.results.lexemeArray.map((l) => l.stats.queryCount)),
                Math.max(...this.results.lexemeArray.map((l) => l.stats.queryCount))]
                : [0, 1001];
            //            console.debug("  ...calling filter.setMinMaxRanges([" + corpusRange.join(',') +"], ["+secRange.join(',')+"])");
            this.filter.setMinMaxRanges(range, secRange)
            mylog("setFilterRanges()-->corpus[" + this.filter.corpusMinMaxRange.join(',') + "],section[" + this.filter.sectionMinMaxRange.join(',') + "]");
        }
    }
}


//this needs work/testing before use.
class LexQueryResults {
    filter = new LexQueryFilter();
    response = {};
    sections = {};

    constructor(sections, response, filter) {
        this.sections = sections;
        this.response = response;
        this.filter = filter;
    }


}

export { LexQuery, LexQueryFilter, Filter }
import { mylog } from "./env/env.js";
import { GreekUtils } from "$lib/utils/greek-utils.js";
import { HebrewUtils } from "$lib/utils/hebrew-utils.js";
export class Lexeme {
    lang = "greek";
    stats=new LexStats();

    static PosEnum = {
        NOUN: 4,
        VERB: 11,
        ADJECTIVE: 0,
        ADVERB: 2,
        PRONOUN_DEM: 7,
        PRONOUN_INTER: 8,
        PRONOUN_PRS: 9,
        PRONOUN_RELA: 10,
        PRONOUN: 16,
        CONJUNCTION: 1,
        INTERJECTION: 3,
        PREPOSITION: 5,
        ARTICLE: 6,
        PARTICLE: 12,
        PROPER_NOUN: 13,
        NUMBER: 14,
        UNSPECIFIED: 15,
    }
    static PosDict = new Proxy({
        [Lexeme.PosEnum.NOUN]: { desc: 'Noun', abbrev: 'noun' },
        [Lexeme.PosEnum.VERB]: { desc: 'Verb', abbrev: 'verb' },
        [Lexeme.PosEnum.ADJECTIVE]: { desc: 'Adjective', abbrev: 'adj' },
        [Lexeme.PosEnum.ADVERB]: { desc: 'Adverb', abbrev: 'adv' },
        [Lexeme.PosEnum.PRONOUN_DEM]: { desc: 'Demonstrative Pronoun', abbrev: 'pron-dem' },
        [Lexeme.PosEnum.PRONOUN_INTER]: { desc: 'Interrogative Pronoun', abbrev: 'pron-inter' },
        [Lexeme.PosEnum.PRONOUN_PRS]: { desc: 'Personal Pronoun', abbrev: 'pron-prs' },
        [Lexeme.PosEnum.PRONOUN_RELA]: { desc: 'Relative Pronoun', abbrev: 'pron-rela' },
        [Lexeme.PosEnum.PRONOUN]: { desc: 'Pronoun', abbrev: 'pronoun' },
        [Lexeme.PosEnum.CONJUNCTION]: { desc: 'Conjunction', abbrev: 'conj' },
        [Lexeme.PosEnum.INTERJECTION]: { desc: 'Interjection', abbrev: 'interj' },
        [Lexeme.PosEnum.PREPOSITION]: { desc: 'Preposition', abbrev: 'prep' },
        [Lexeme.PosEnum.ARTICLE]: { desc: 'Definite Article', abbrev: 'art-def' },
        [Lexeme.PosEnum.PARTICLE]: { desc: 'Particle', abbrev: 'partcl' },
        [Lexeme.PosEnum.PROPER_NOUN]: { desc: "Proper Noun, Name", abbrev: 'prop-noun' },
        [Lexeme.PosEnum.NUMBER]: { desc: "Number", abbrev: "num" },
        [Lexeme.PosEnum.UNSPECIFIED]: { desc: "Unspecified", abbrev: "unknown" },

    }, {
        get(target, prop) {
            if (prop in target) return target[prop];
            return { desc: 'Unspecified', abbrev: 'unknown' };
        }
    });
    static posGroups = {
        "CONT": [0, 11, 2, 4],
        "CONTENT": [0, 11, 2, 4],
        "SYNT": [1, 5, 12],
        "SYNTAX": [1, 5, 12],
        "PREP": [5],
        "PREPOSITIONS": [5],
        "PREPOSITION": [5],
        "PART": [12],
        "PARTICLES": [12, 3],
        "PARTICLE": [12, 3],
        "PRON": [7, 8, 9, 16],
        "PRONOUNS": [7, 8, 9, 16],
        "PRONOUN": [7, 8, 9, 16]
    };
    static posGroupsUIDesc = {
        "CONTENT": "Content words (nounds, verbs, adjectives, adverbs)",
        "SYNTAX": "Syntax words (conjuctions, particles, prepositions)",
        "PREPOSITIONS": "Prepositions",
        "PARTICLES": "Particles",
        "PRONOUNS": "Pronouns"
    };

    /** 
     * @param {string} abbrev
     * @returns {number}
    */
    static getPosEnumFromAbbrev(abbrev) {
        const found = Object.entries(this.PosDict).filter(([k, o]) => o['abbrev'] == abbrev).map(([k, o]) => k);
        return found.length > 0 ? Number(found[0]) : this.PosEnum.UNSPECIFIED;
    }
    /**
     * 
     * @param {number} posEnum 
     * @returns {{abbrev: string, desc: string}}
     */
    static getPosFromEnum(posEnum) {
        const n = Number(posEnum);
        return (!isNaN(n) && Lexeme.PosDict[n]) ? Lexeme.PosDict[n] : Lexeme.PosDict[Lexeme.PosEnum.UNSPECIFIED];
    }
    /**
     * 
     * @param {number} id 
     * @param {string} [lang="greek"] 
     * @param {string} lemma 
     * @param {string} gloss 
     * @param {number|LexStats} stats -- stats this lexeme. If a number, this is the total count of the lexeme in the corpus. it can also be a LexStat object which contains more info.
     * @param {number[]} posEnums -- array of parts-of-speech enums, based on PosEnum above.
     * @param {string} beta 
     */
    constructor(id = -1, lang = "greek", lemma = '', gloss = '', stats=new LexStats(), posEnums = [Lexeme.PosEnum.UNSPECIFIED], 
         beta = '',strongs='') {
        // mylog("lexeme constructor(" + id + ", " + lemma + ", " + gloss + ", " + count + ", [" + posEnums.join(',') + "], " + total + ", " + beta + ", " + sectFreq + ", " + totalFreq + ", " + freqSectTotalRatio + ")", true);
        if (id == -1 || lemma == '')
            this.ready = false;
        else
            this.ready = true;
        this.id = id;
        this.strongs = strongs;
        this.lang = lang;
        //this.posDict = posDict;
        this.lemma = lemma;
        this.plain = Lexeme.makePlain(lemma, lang);
        this.gloss = gloss;

        this.stats = typeof stats == "number" && Number(stats) >= 0 ? new LexStats(stats) : typeof stats == 'object' && stats instanceof LexStats ? stats : new LexStats();
        const rawEnums = posEnums && posEnums.length ? posEnums : [Lexeme.PosEnum.UNSPECIFIED];
        this.posEnums = rawEnums.map((p) => {
            const n = Number(p);
            return isNaN(n) ? Lexeme.PosEnum.UNSPECIFIED : n;
        });

        this.beta = beta;

    }




    /**
     * 
     * @param {string} lemma 
     * @returns {string}
     */
    static makePlain(lemma, lang = "greek") {
        if (lang == "greek")
            return GreekUtils.removeDiacritics(lemma);
        else if (lang == "hebrew")
            return HebrewUtils.makePlain(lemma);
    }
    /**
     * 
     */
    copy() {
        const c = new Lexeme(this.id, this.lang, this.lemma, this.gloss, this.stats, this.posEnums, this.beta, this.strongs);
        Object.assign(c, this);
        return c;
    }
    /**
     * 
     * @param {Lexeme} lex 
     */
    copyFrom(lex) {
        for (const [k, v] of Object.entries(lex)) {
            this[k] = v;
        }
    }

    get total() {
        return this.stats?.total ?? 0;
    }
    set total(val) {
        if (!this.stats) this.stats = new LexStats();
        this.stats.total = val;
    }

    get count() {
        return this.stats?.queryCount ?? 0;
    }
    set count(val) {
        if (!this.stats) this.stats = new LexStats();
        this.stats.queryCount = val;
    }
}


export class GreekLexeme extends Lexeme {
    // static posDict=posDict;
    /**
    * 
    * @param {string} lemma 
    * @returns {string}
    */
    static makePlain(lemma) {
        return GreekUtils.removeDiacritics(lemma);
    }
}

export class HebrewLexeme extends Lexeme {
    // static posDict=posDict;
    /**
    * 
    * @param {string} lemma 
    * @returns {string}
    */
    static makePlain(lemma) {
        return HebrewUtils.makePlain(lemma);
    }
}

//TODO ports these to lxx-vocab-www. These are from synoptic-viewer!
export class LexStats {
    
    total=0
    //queryCount=0;
    corpusWordsTotal=0
    totalFreq=0;           
    //sectionFreq=0;
    //queryWordTotal=0;
    calculated=false;
    querySectionStats=new LemmaSectionStats();
    
    /**
     * @type {string[]} references
     */
    references = [];

    /**
     * @type {Object<number,LemmaSectionStats>} bookStats
     * @description: UNUSED currently. From synoptic-viewer class where it was used. TODO: use or remove!
     */
    bookStats={}
    /**
     * @type {Object<string|Object,LemmaSectionStats>} otherSectionStats
     * @description for other sections, as defined and used by the app/component. 
     */
    otherSectionStats={}

    /**
     * @type{Object<number,number>} counts of this lexeme in each NT book. key: book id, value: counts for each book.
     */
    //bookCounts={};

    /**
     * 
     * @param {string[]} [references=[]]
     * @param {number} [thisLexTotalCount=0]
     * @param {number} [corpusWordsTotal=0]
     * @param {LemmaSectionStats} [querySectionStats={}] 
     * @param {Object<number,LemmaSectionStats>} [bookStats={}] 
     * @param {Object<string|Object,LemmaSectionStats>} [otherSectionStats={}] 
     */
    constructor(thisLexTotalCount = 0,corpusWordsTotal = 0, queryCount=0,queryWordTotal=0, references = [], bookStats = {}, otherSectionStats = {}) {
        this.references = references;
        //this.bookCounts=bookCounts;
        this.total = thisLexTotalCount;
        this.corpusWordsTotal = corpusWordsTotal;
        this.totalFreq = 0;
        //this.sectionFreq=0;


        /**
         * @type {LemmaSectionStats}  querySectionStats
         */
        this.querySectionStats=new LemmaSectionStats(queryCount,this.total,queryWordTotal,this.corpusWordsTotal);

        /**
         * @type {Object<Object,LemmaSectionStats>}  otherSectionStats
         */
        this.otherSectionStats=otherSectionStats;

        /**
         * @type {Object<number,LemmaSectionStats>}  bookStats
         */
        this.bookStats = bookStats;
        
        this.queryCount=queryCount;
        this.queryWordTotal=queryWordTotal;
        this.calculated = false;
        if (this.total && this.corpusWordsTotal) {
            this.calculateFrequencies();
            this.calculated = true;
        }
    }

    /**
     * @param {string} type - either 'book' or 'section'.
     * @param {number|string|Object} key book id or section key.
     * @param {number} sectionLexCount -- count of this lemma in section/book.
     * @param {number} sectionWords -- total words in section/book.
     * @param {number} corpusLexCount -- total count in corpus.
     * @param {number} corpusWords -- total words in corpus.
     * @param {boolean} [force=false] force a new stats object and recalculation.
     */
    addAndCalcBookSectionStatsIfNeeded(type, key, sectionLexCount, sectionWords, corpusLexCount, corpusWords, force = false) {
        // Handle argument transposition if called as (key, 'book'|'section', ...)
        if (typeof type === 'number' || (typeof type === 'string' && (key === 'book' || key === 'section'))) {
            const temp = type;
            type = key;
            key = temp;
        }

        const isBook = type === 'book';
        const isSection = type === 'section';
        if (!isBook && !isSection) return;

        const numKey = Number(key);
        const effectiveKey = !isNaN(numKey) ? numKey : key;

        if (isBook) {
            if (force || !this.bookStats[effectiveKey]) {
                const lbStats = new LemmaSectionStats(sectionLexCount, corpusLexCount, sectionWords, corpusWords);
                this.bookStats[effectiveKey] = lbStats;
                this.bookStats[String(effectiveKey)] = lbStats;
            }
        } else if (isSection) {
            if (force || !this.otherSectionStats[key]) {
                const lbStats = new LemmaSectionStats(sectionLexCount, corpusLexCount, sectionWords, corpusWords);
                this.otherSectionStats[key] = lbStats;
            }
        }
    }

    /**
     */
    calculateFrequencies(force = false,book=0) {
        if (force || !this.calculated) {
            this.totalFreq = this.totalFreq ? this.totalFreq : LexStats.calcTotalFrequency(this.total, this.corpusWordsTotal);

            this.sectionFreq=this.sectionFreq ? this.sectionFreq : LexStats.calcTotalFrequency(this.queryCount,this.queryWordTotal)
        }
    }

    /**
     * 
     * @param {number} particularWordCount the number of times a specific word appears in a corpus
     * @param {number} totalCorpusWordsCount the total number of ALL words in that corpus
     * @returns the frequency per 1000 words. namely: 1000 * particularWordCount / totalCorpusWordsCount;
     */
    static calcTotalFrequency(particularWordCount, totalCorpusWordsCount) {
        if (totalCorpusWordsCount > 0) {
            return 1000 * particularWordCount / totalCorpusWordsCount;
        }
        else
            return 0;
    }

    /**
    * 
    * @param {number} sectFreq 
    * @param {number} totalFreq 
    * @returns {number} frequency as number or string. Returns 0 if totalFreq=0.
    */
    static calcFreqRatio(sectFreq, totalFreq) {
        if (sectFreq && sectFreq > 0 && totalFreq && totalFreq > 0) {
            return sectFreq / totalFreq;
        }
        else
            return 0;
    }

    copy() {
        const stats = new LexStats();
        for (const [k, v] of Object.entries(this)) {
            if (k != 'bookStats' && k != 'references')
                stats[k] = v;
        }
        stats.bookStats = Object.fromEntries(Object.entries(this.bookStats));
        stats.references = [...this.references]
        return stats;
    }
}

export class LemmaSectionStats{
    /**
     * @param {number} sectionCount  the Number of times this lemma appears in this book
     * @param {number} sectionWords the total number of words in this book
     * @param {number} corpusCount the number of times this lemma appears in the entire NT
     */
    constructor(sectionCount = 0, corpusCount = 0,sectionWords = 0, corpusWords=0) {
        this.lexCounts = {
            section: sectionCount,
            corpus: corpusCount,
            rest: corpusCount - sectionCount
        };
        this.words = {
            section: sectionWords,
            corpus: corpusWords,
            rest: corpusWords - sectionWords
        }
        this.freq = {
            section: LexStats.calcTotalFrequency(this.lexCounts.section, this.words.section),
            corpus: LexStats.calcTotalFrequency(this.lexCounts.corpus, this.words.corpus),
            rest: LexStats.calcTotalFrequency(this.lexCounts.rest, this.words.rest)
        }
        this.freqRatio = LexStats.calcFreqRatio(this.freq.section, this.freq.rest);

    }

}

import { base } from '$app/paths';

/**
 * StaticDatasetProvider manages build-time static JSON datasets for BHS, LXX, and SBLGNT.
 * It provides in-memory caching and zero-latency client-side querying.
 */
class DatasetProvider {
    constructor() {
        /**
         * Cache for loaded JSON data: Map<string, any> where key is `${db}:${file}`
         */
        this.cache = new Map();
    }

    /**
     * Normalize database abbreviation: 'lxx', 'bhs', 'sblgnt'
     * @param {string} db
     * @returns {string}
     */
    normalizeDb(db) {
        if (!db) return 'lxx';
        const d = String(db).toLowerCase().trim();
        if (d.includes('bhs')) return 'bhs';
        if (d.includes('sbl')) return 'sblgnt';
        return d;
    }

    /**
     * Load a JSON file for a given dataset, with caching.
     * @param {string} db
     * @param {string} name
     * @returns {Promise<any>}
     */
    async loadData(db, name) {
        db = this.normalizeDb(db);
        const cacheKey = `${db}:${name}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        let data;
        if (typeof window === 'undefined') {
            // Server / SSR / Vitest environment: read directly from filesystem
            try {
                const fs = await import('node:fs/promises');
                const path = await import('node:path');
                const filePath = path.resolve(process.cwd(), 'static', 'data', db, `${name}.json`);
                const content = await fs.readFile(filePath, 'utf-8');
                data = JSON.parse(content);
            } catch (err) {
                // Fallback to fetch if filesystem is not accessible
                const url = `/data/${db}/${name}.json`;
                const res = await fetch(url);
                data = await res.json();
            }
        } else {
            // Browser environment: fetch from static assets
            const url = `${base}/data/${db}/${name}.json`;
            const res = await fetch(url);
            data = await res.json();
        }

        this.cache.set(cacheKey, data);
        return data;
    }

    /**
     * Get lexeme metadata by ID.
     * @param {string} db
     * @param {number|string} lexId
     * @returns {Promise<any>}
     */
    async getLexInfo(db, lexId) {
        const lexemes = await this.loadData(db, 'lexemes');
        return lexemes[String(lexId)] || null;
    }

    /**
     * Query lexical statistics across sections.
     * @param {string} db
     * @param {Object} options
     * @param {number[]|string[]} [options.sections] Section node IDs (books or chapters). Defaults to all or first book.
     * @param {boolean} [options.common] Only include lexemes occurring in all queried sections.
     * @param {boolean} [options.unique] Only include lexemes unique to queried sections (count == total).
     * @param {number[]} [options.excludePos] Part of speech IDs to exclude.
     * @param {number[]} [options.restrictPos] Part of speech IDs to restrict to.
     * @param {number} [options.maxWords] Maximum words to return.
     * @param {Object} [options.posDict] POS dictionary for human-readable labels.
     * @returns {Promise<{ totalWords: number, totalLexemes: number, lexemes: Object, common?: string[] }>}
     */
    async querySections(db, options = {}) {
        db = this.normalizeDb(db);
        const [sectionsData, lexemesData, booksData] = await Promise.all([
            this.loadData(db, 'sections'),
            this.loadData(db, 'lexemes'),
            this.loadData(db, 'books')
        ]);

        let sections = options.sections && options.sections.length ? [...options.sections] : [];
        if (options.refsText && options.refsText.trim() !== '') {
            try {
                const BibleUtils = await import('$lib/utils/bible-utils.js');
                const refsArray = BibleUtils.expandRefs(options.refsText, true);
                for (const ref of refsArray) {
                    const bcv = BibleUtils.getBookChapVerseFromRef(ref);
                    if (bcv && bcv.book) {
                        const bookEntry = Object.values(booksData).find(b =>
                            b.abbrev?.toLowerCase() === bcv.book.toLowerCase() ||
                            b.name?.toLowerCase() === bcv.book.toLowerCase()
                        );
                        if (bookEntry) {
                            if (bcv.chap && bookEntry.chapters) {
                                const chapNode = Object.entries(bookEntry.chapters).find(([node, c]) => c === String(bcv.chap));
                                if (chapNode) {
                                    sections.push(chapNode[0]);
                                }
                            } else {
                                sections.push(bookEntry.node);
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('Error expanding refsText in querySections:', e);
            }
        }

        if (sections.length === 0) {
            if (options.refsText && options.refsText.trim() !== '') {
                // User provided refsText but none resolved
                return {
                    totalInstances: 0,
                    totalLexemes: 0,
                    totalWords: 0,
                    lexemes: {}
                };
            }
            // Default to the first book in the dataset
            const firstBookNode = Object.keys(booksData)[0];
            sections = firstBookNode ? [firstBookNode] : [];
        }

        const commonRequested = Boolean(options.common);
        const uniqueRequested = Boolean(options.unique);
        const excludedSet = new Set((options.excludePos || []).map(Number));
        const restrictedSet = new Set((options.restrictPos || []).map(Number));

        let totalWords = 0;
        const counts = new Map(); // lexId -> count in selected sections
        const presence = new Map(); // lexId -> number of queried sections it appears in

        for (const secNode of sections) {
            const secStr = String(secNode);
            const sec = sectionsData[secStr];
            if (!sec) continue;

            totalWords += sec.words || 0;
            if (sec.lex) {
                for (const [lexIdStr, c] of Object.entries(sec.lex)) {
                    counts.set(lexIdStr, (counts.get(lexIdStr) || 0) + c);
                    presence.set(lexIdStr, (presence.get(lexIdStr) || 0) + 1);
                }
            }
        }

        const validSectionsCount = sections.length;
        const resultLexemes = {};
        const commonLemmas = [];

        for (const [lexIdStr, count] of counts.entries()) {
            const lexMeta = lexemesData[lexIdStr];
            if (!lexMeta) continue;

            // POS filtering
            const posNum = Number(lexMeta.pos);
            if (excludedSet.has(posNum)) continue;
            if (restrictedSet.size > 0 && !restrictedSet.has(posNum)) continue;

            // Common filter: must appear in every queried section
            const isCommon = presence.get(lexIdStr) === validSectionsCount;
            if (commonRequested && !isCommon) continue;

            // Unique filter: count in section must equal total in whole corpus
            if (uniqueRequested && count !== lexMeta.total) continue;

            const lemma = lexMeta.lemma;
            const posDesc = options.posDict && options.posDict[posNum]
                ? (options.posDict[posNum].desc || options.posDict[posNum].abbrev)
                : String(posNum);

            resultLexemes[lemma] = {
                id: lexMeta.id,
                lemma: lemma,
                gloss: lexMeta.gloss || '',
                count: count,
                pos: posNum,
                posNum: posNum,
                posDesc: posDesc,
                total: lexMeta.total,
                beta: lexMeta.beta || '',
                plain: lexMeta.plain || '',
                strongs: lexMeta.strongs || ''
            };

            if (isCommon) {
                commonLemmas.push(lemma);
            }
        }

        // Apply maxWords limit if specified
        if (options.maxWords && options.maxWords > 0) {
            const sortedEntries = Object.entries(resultLexemes)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, options.maxWords);
            
            const limitedLexemes = {};
            for (const [k, v] of sortedEntries) {
                limitedLexemes[k] = v;
            }
            return {
                totalWords,
                totalLexemes: sortedEntries.length,
                lexemes: limitedLexemes,
                common: commonRequested ? commonLemmas : undefined
            };
        }

        return {
            totalWords,
            totalLexemes: Object.keys(resultLexemes).length,
            lexemes: resultLexemes,
            common: commonRequested ? commonLemmas : undefined
        };
    }

    /**
     * Get verse concordance and references for a specific lexeme.
     * @param {string} db
     * @param {number|string} lexId
     * @param {number[]|string[]|null} [theSections] Optional section filter
     * @returns {Promise<{ total: number, bookcounts: Object, refs: string[], nodes: number[] }>}
     */
    async getRefs(db, lexId, theSections = null) {
        db = this.normalizeDb(db);
        const [concData, booksData] = await Promise.all([
            this.loadData(db, 'concordance'),
            this.loadData(db, 'books')
        ]);

        const conc = concData ? concData[String(lexId)] : null;
        if (!conc) {
            return { total: 0, bookcounts: {}, refs: [], nodes: [] };
        }

        const isArr = Array.isArray(conc);
        const refs = isArr ? conc : (conc.refs || []);
        const total = typeof conc.total === 'number' ? conc.total : refs.length;
        let bookcounts = conc.bookcounts ? { ...conc.bookcounts } : {};
        const nodes = conc.nodes || [];

        // Dynamically compute bookcounts if missing or empty
        if (Object.keys(bookcounts).length === 0 && refs.length > 0 && booksData) {
            const abbrevToKey = new Map();
            for (const [bKey, bInfo] of Object.entries(booksData)) {
                if (bInfo.abbrev) {
                    abbrevToKey.set(bInfo.abbrev.toLowerCase(), bKey);
                }
            }
            for (const r of refs) {
                const bAbbrev = r.split(' ')[0].toLowerCase();
                const bKey = abbrevToKey.get(bAbbrev) || bAbbrev;
                bookcounts[bKey] = (bookcounts[bKey] || 0) + 1;
            }
        }

        if (!theSections || theSections.length === 0) {
            return {
                total,
                bookcounts,
                refs,
                nodes
            };
        }

        // Build prefix matchers for the specified sections
        const secSet = new Set(theSections.map(String));
        const prefixes = [];

        for (const [bNode, bInfo] of Object.entries(booksData)) {
            const abbrev = bInfo.abbrev;
            if (secSet.has(String(bNode))) {
                // Whole book selected
                prefixes.push(`${abbrev} `);
            } else if (bInfo.chapters) {
                // Check if specific chapters of this book are selected
                for (const [cNode, cNum] of Object.entries(bInfo.chapters)) {
                    if (secSet.has(String(cNode))) {
                        prefixes.push(`${abbrev} ${cNum}:`);
                    }
                }
            }
        }

        const filteredRefs = [];
        const filteredNodes = [];
        const filteredBookCounts = {};

        // Helper to find bookNode from ref abbreviation
        const abbrevToBookNode = new Map();
        for (const [bNode, bInfo] of Object.entries(booksData)) {
            abbrevToBookNode.set(bInfo.abbrev, Number(bNode));
        }

        for (let i = 0; i < conc.refs.length; i++) {
            const ref = conc.refs[i];
            const node = conc.nodes[i];

            let matches = false;
            for (const p of prefixes) {
                if (ref.startsWith(p)) {
                    matches = true;
                    break;
                }
            }

            if (matches) {
                filteredRefs.push(ref);
                filteredNodes.push(node);

                const refBookAbbrev = ref.split(' ')[0];
                const bNode = abbrevToBookNode.get(refBookAbbrev);
                if (bNode) {
                    filteredBookCounts[bNode] = (filteredBookCounts[bNode] || 0) + 1;
                }
            }
        }

        return {
            total: filteredRefs.length,
            bookcounts: filteredBookCounts,
            refs: filteredRefs,
            nodes: filteredNodes
        };
    }

    /**
     * Helper to resolve the correct book filename from raw book name/abbrev.
     * Handles variations like "1 Kgs" -> "1Kgs", "1 Cor" -> "1_Cor", "Genesis" -> "Gen", etc.
     * @param {string} db
     * @param {string} rawBook
     * @returns {Promise<string[]>}
     */
    async getCandidateBookNames(db, rawBook) {
        if (!rawBook) return [];
        const clean = String(rawBook).trim();
        const noSpace = clean.replace(/\s+/g, '');
        const withUnder = clean.replace(/\s+/g, '_');
        const candidates = new Set([clean, noSpace, withUnder]);

        try {
            const booksData = await this.loadData(db, 'books');
            if (booksData) {
                for (const b of Object.values(booksData)) {
                    const match = [b.name, b.abbrev].some(v => v && (
                        v.toLowerCase() === clean.toLowerCase() ||
                        v.toLowerCase() === noSpace.toLowerCase() ||
                        v.toLowerCase() === withUnder.toLowerCase() ||
                        v.replace(/\s+/g, '').toLowerCase() === noSpace.toLowerCase() ||
                        v.replace(/_/g, '').toLowerCase() === noSpace.toLowerCase()
                    ));
                    if (match) {
                        if (b.abbrev) {
                            candidates.add(b.abbrev.replace(/\s+/g, '_'));
                            candidates.add(b.abbrev.replace(/\s+/g, ''));
                            candidates.add(b.abbrev);
                        }
                        if (b.name) {
                            candidates.add(b.name.replace(/\s+/g, '_'));
                            candidates.add(b.name.replace(/\s+/g, ''));
                            candidates.add(b.name);
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore if books.json cannot be read
        }

        return Array.from(candidates);
    }

    /**
     * Load an individual book JSON file with caching.
     * @param {string} db
     * @param {string} book
     * @returns {Promise<any>}
     */
    async loadBook(db, book) {
        db = this.normalizeDb(db);
        const cacheKey = `${db}:book:${book}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const candidates = await this.getCandidateBookNames(db, book);
        let data = null;

        for (const candidate of candidates) {
            const candidateKey = `${db}:book:${candidate}`;
            if (this.cache.has(candidateKey)) {
                data = this.cache.get(candidateKey);
                break;
            }

            try {
                if (typeof window === 'undefined') {
                    const fs = await import('node:fs/promises');
                    const path = await import('node:path');
                    const filePath = path.resolve(process.cwd(), 'static', 'data', db, 'books', `${candidate}.json`);
                    const content = await fs.readFile(filePath, 'utf-8');
                    data = JSON.parse(content);
                } else {
                    const url = `${base}/data/${db}/books/${candidate}.json`;
                    const res = await fetch(url);
                    if (res.ok) {
                        data = await res.json();
                    }
                }
            } catch (err) {
                // Try next candidate
            }

            if (data) {
                this.cache.set(candidateKey, data);
                break;
            }
        }

        if (data) {
            this.cache.set(cacheKey, data);
        } else {
            console.warn(`Could not load book ${book} for ${db} (tried ${candidates.join(', ')})`);
        }
        return data;
    }

    /**
     * Get verse text for a given verse sectionID or ref.
     * Fast-paths by reading the book JSON file rather than the massive 41MB verses.json.
     * @param {string} db
     * @param {number|string} sectionID
     * @param {string} [ref]
     * @returns {Promise<{ id: number|string, section: string, text: string }>}
     */
    async getText(db, sectionID, ref = '') {
        db = this.normalizeDb(db);
        if (ref) {
            // Match any book name followed by chapter:verse, e.g. "1 Kgs 1:1", "1_Cor 11:9", "Gen 1:1"
            const match = String(ref).trim().match(/^(.+?)\s+(\d+):(\d+)$/);
            if (match) {
                const [, rawBook, chap, verse] = match;
                const bookData = await this.loadBook(db, rawBook);
                if (bookData?.chapters?.[chap]?.[verse]) {
                    const v = bookData.chapters[chap][verse];
                    return {
                        id: sectionID || v.id,
                        section: v.section || ref,
                        text: v.text || ''
                    };
                }
            }
        }
        return {
            id: sectionID,
            section: ref || '',
            text: ''
        };
    }
}

export const staticDatasetProvider = new DatasetProvider();

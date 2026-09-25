import { base } from '$app/paths';
import { getBookFile } from '$lib/bookMapping.js';
import { formatHebrew, formatGreek, type HebrewDiacriticMode } from '$lib/utils/diacritics';

const bookCache = new Map<string, any>();

export async function fetchBook(version: string, book: string): Promise<any> {
  const bookFile = getBookFile(version, book);
  if (!bookFile) return null;

  const vLower = version.toLowerCase();
  const cacheKey = `${vLower}_${bookFile}`;
  if (bookCache.has(cacheKey)) {
    return bookCache.get(cacheKey);
  }

  try {
    const res = await fetch(`${base}/data/${vLower}/books/${bookFile}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    bookCache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.error(`Error loading ${version} book ${book} (${bookFile}):`, err);
    return null;
  }
}

export async function loadBooksForVersions(
  activeVersions: string[],
  book: string
): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  const promises = activeVersions.map(async (version) => {
    const data = await fetchBook(version, book);
    results[version] = data;
  });
  await Promise.all(promises);
  return results;
}

export interface LexemeDictionaries {
  alignmentData: any;
  bhs: any;
  lxx: any;
  sblgnt: any;
  vulgate: any;
}

let dictionariesCache: LexemeDictionaries | null = null;

export async function loadLexemeDictionaries(): Promise<LexemeDictionaries> {
  if (dictionariesCache) return dictionariesCache;

  const result: LexemeDictionaries = {
    alignmentData: {},
    bhs: {},
    lxx: {},
    sblgnt: {},
    vulgate: {}
  };

  try {
    const [alignRes, bhsLex, lxxLex, sblgntLex, vulgateLex] = await Promise.all([
      fetch(`${base}/data/tvtms_alignment.json`),
      fetch(`${base}/data/bhs/lexemes.json`),
      fetch(`${base}/data/lxx/lexemes.json`),
      fetch(`${base}/data/sblgnt/lexemes.json`),
      fetch(`${base}/data/vulgate/lexemes.json`)
    ]);

    if (alignRes.ok) result.alignmentData = await alignRes.json();
    if (bhsLex.ok) result.bhs = await bhsLex.json();
    if (lxxLex.ok) result.lxx = await lxxLex.json();
    if (sblgntLex.ok) result.sblgnt = await sblgntLex.json();
    if (vulgateLex && vulgateLex.ok) result.vulgate = await vulgateLex.json();
  } catch (e) {
    console.error('Error loading lexemes or alignment data', e);
  }

  dictionariesCache = result;
  return result;
}

export function formatVerseText(
  text: any,
  version: string,
  hebrewMode: HebrewDiacriticMode,
  greekDiacritics: boolean
): string {
  let ret = text;
  if (version === 'BHS') {
    ret = formatHebrew(text, hebrewMode);
  } else if (version === 'LXX' || version === 'SBLGNT') {
    ret = formatGreek(text, greekDiacritics);
  }
  return ret;
}

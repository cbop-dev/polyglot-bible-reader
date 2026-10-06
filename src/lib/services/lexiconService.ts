/**
 * Lexicon service wrapping database client lookups for words and unabridged dictionaries.
 */
import { getLemma, getLexiconEntry, type LexemeRow, type LexiconEntryRow } from './dbClient';

export async function fetchWordInfo(
	wordObj: any,
	corpus: string
): Promise<{ lexeme?: LexemeRow | null; dictionary?: LexiconEntryRow | null }> {
	if (!wordObj) return { lexeme: null, dictionary: null };
	const lookupKey = wordObj.normalized || wordObj.word || wordObj.id;
	const lexData = await getLemma(corpus, lookupKey);

	const dict = corpus.toLowerCase() === 'bhs' ? 'bdb' : 'lsj';
	const dictEntry = await getLexiconEntry(dict, lookupKey);

	return {
		lexeme: lexData,
		dictionary: dictEntry
	};
}

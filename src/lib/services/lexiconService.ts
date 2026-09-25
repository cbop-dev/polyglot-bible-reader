import { Lexeme } from '$lib/lemma-ui/Lexeme.js';
import { VocabEngine } from '$lib/lemma-ui/engine/VocabEngine.js';
import { GenericVocabDataset } from '$lib/lemma-ui/data/VocabDataset.js';

let TfBhsDataset: any;
let TfLxxDataset: any;
let TfSblgntDataset: any;
export const tfDataMap: Record<string, any> = {};

export async function initDatasets() {
  if (tfDataMap.bhs) return;
  try {
    const bhsMod = await import('$lib/lemma-ui/bhs/bhsDataset.js');
    const lxxMod = await import('$lib/lemma-ui/lxx/lxxDataset.js');
    const sblMod = await import('$lib/lemma-ui/sblgnt/sblgntDataset.js');
    TfBhsDataset = bhsMod.default || bhsMod.BhsVocabDataset || bhsMod.TfBhsDataset;
    TfLxxDataset = lxxMod.default || lxxMod.TfLxxDataset;
    TfSblgntDataset = sblMod.default || sblMod.TfSblgntDataset;

    tfDataMap.bhs = new TfBhsDataset();
    tfDataMap.lxx = new TfLxxDataset();
    tfDataMap.sblgnt = new TfSblgntDataset();
  } catch (e) {
    console.error('Failed to load dataset classes:', e);
  }
}

export async function getDataset(corpus: string) {
  await initDatasets();
  if (tfDataMap[corpus]) return tfDataMap[corpus];

  const names: Record<string, { name: string; lang: string }> = {
    kjv: { name: 'King James Version', lang: 'english' },
    web: { name: 'World English Bible', lang: 'english' },
    vulgate: { name: 'Vulgate', lang: 'latin' },
    brenton: { name: "Brenton's Septuagint", lang: 'english' }
  };
  const meta = names[corpus] || { name: corpus.toUpperCase(), lang: 'english' };
  const ds = new GenericVocabDataset(corpus, meta.name, meta.lang);
  await ds.initBooks();
  tfDataMap[corpus] = ds;
  return ds;
}

export async function fetchWordInfo(wordObj: any, lexemesDict: any, corpus: string): Promise<any> {
  if (!wordObj || !wordObj.id) return null;

  const tfData = await getDataset(corpus);
  const lexemeInstance: any = new Lexeme();

  try {
    await VocabEngine.fetchLexInfo(wordObj.id, lexemeInstance, tfData, corpus);
  } catch (err) {
    console.warn('VocabEngine fetch error:', err);
  }

  if (lexemeInstance.id && lexemeInstance.id !== -1) {
    Object.assign(lexemeInstance, wordObj);
    lexemeInstance.corpus = corpus;
    lexemeInstance._tfData = tfData;
    lexemeInstance.isLoading = false;
    return lexemeInstance;
  } else {
    const lexData = lexemesDict ? lexemesDict[wordObj.id] : null;
    if (lexData) Object.assign(lexemeInstance, lexData);
    Object.assign(lexemeInstance, wordObj);
    lexemeInstance.corpus = corpus;
    lexemeInstance.lemma =
      lexemeInstance.lemma || (wordObj.id ? `Strongs: ${wordObj.id}` : wordObj.word);
    lexemeInstance._tfData = tfData;
    lexemeInstance.isLoading = false;
    return lexemeInstance;
  }
}

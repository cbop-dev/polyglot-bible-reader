import { describe, it, expect } from 'vitest';
import { staticDatasetProvider } from '$lib/lemma-ui/engine/StaticDatasetProvider.js';
import { VocabEngine } from '$lib/lemma-ui/engine/VocabEngine.js';
import { Lexeme } from '$lib/lemma-ui/Lexeme.js';

describe('KJV Vocab & Concordance Pipeline', () => {
  it('should load KJV lexeme metadata via StaticDatasetProvider', async () => {
    const lexMeta = await staticDatasetProvider.getLexInfo('kjv', 'H7225');
    expect(lexMeta).toBeDefined();
    expect(lexMeta.id).toBe('H7225');
    expect(lexMeta.total).toBeGreaterThan(0);
  });

  it('should fetch KJV concordance references and book counts', async () => {
    const res = await staticDatasetProvider.getRefs('kjv', 'H7225');
    expect(res).toBeDefined();
    expect(res.total).toBeGreaterThan(0);
    expect(res.refs.length).toBe(res.total);
    expect(res.refs).toContain('Gen 1:1');
    expect(res.bookcounts).toBeDefined();
    expect(res.bookcounts['Gen']).toBeGreaterThan(0);
  });

  it('should populate a Lexeme instance via VocabEngine.fetchLexInfo', async () => {
    const lemma = new Lexeme();
    await VocabEngine.fetchLexInfo('H7225', lemma, { dbAbbrev: 'kjv', lang: 'english' }, 'kjv');
    expect(lemma.id).toBe('H7225');
    expect(lemma.stats.total).toBeGreaterThan(0);
  });

  it('should fetch verse text when book title has spaces like "1 Kgs"', async () => {
    const bhsVerse = await staticDatasetProvider.getText('bhs', 0, '1 Kgs 1:17');
    expect(bhsVerse.text).toBeTruthy();
    expect(bhsVerse.text.length).toBeGreaterThan(0);

    const kjvVerse = await staticDatasetProvider.getText('kjv', 0, '1 Kgs 1:17');
    expect(kjvVerse.text).toContain('My lord, thou swarest');

    const lxxVerse = await staticDatasetProvider.getText('lxx', 0, '1 Kgs 1:17');
    expect(lxxVerse.text).toBeTruthy();

    const sblgntVerse = await staticDatasetProvider.getText('sblgnt', 0, '1 Cor 11:9');
    expect(sblgntVerse.text).toBeTruthy();
  });
});

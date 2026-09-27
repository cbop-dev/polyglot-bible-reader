import { describe, it, expect, vi } from 'vitest';
import { fetchWordInfo } from '$lib/services/lexiconService';
import * as dbClient from '$lib/services/dbClient';

describe('Lexicon Service & Word Info Pipeline', () => {
  it('should fetch word info for Hebrew word via lexiconService', async () => {
    vi.spyOn(dbClient, 'getLemma').mockResolvedValueOnce({
      id: 1152,
      corpus: 'bhs',
      lex_id: 1152,
      lemma: 'ברא',
      gloss: 'to shape, create',
      pos: 1,
      strongs: 'H1254',
      beta: 'br)',
      plain: 'ברא',
      total: 54
    });

    vi.spyOn(dbClient, 'getLexiconEntry').mockResolvedValueOnce({
      id: 1,
      dictionary: 'bdb',
      key: 'ברא',
      headword: 'ברא',
      strongs: 'H1254',
      definition: '<div><p><b>H1254. bara</b></p></div>'
    });

    const res = await fetchWordInfo({ surface: 'בָּרָ֣א', normalized: 'ברא' }, 'bhs');
    expect(res.lexeme).toBeDefined();
    expect(res.lexeme?.lemma).toBe('ברא');
    expect(res.lexeme?.gloss).toBe('to shape, create');
    expect(res.dictionary).toBeDefined();
    expect(res.dictionary?.strongs).toBe('H1254');
  });

  it('should fetch word info for Greek word via lexiconService', async () => {
    vi.spyOn(dbClient, 'getLemma').mockResolvedValueOnce({
      id: 4025,
      corpus: 'lxx',
      lex_id: 4025,
      lemma: 'ποιέω',
      gloss: 'do, make',
      pos: 2,
      strongs: 'G4160',
      beta: 'poiew',
      plain: 'ποιεω',
      total: 350
    });

    vi.spyOn(dbClient, 'getLexiconEntry').mockResolvedValueOnce({
      id: 2,
      dictionary: 'lsj',
      key: 'ποιεω',
      headword: 'ποιέω',
      lsj_index: 'n84234',
      definition: '**ποιέω**, to make'
    });

    const res = await fetchWordInfo({ surface: 'ἐποίησεν', normalized: 'ποιέω' }, 'lxx');
    expect(res.lexeme).toBeDefined();
    expect(res.lexeme?.plain).toBe('ποιεω');
    expect(res.dictionary).toBeDefined();
    expect(res.dictionary?.lsj_index).toBe('n84234');
  });
});

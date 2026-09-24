import { describe, it, expect } from 'vitest';
import { getBookFile, getMappedReference } from './bookMapping.js';

describe('bookMapping', () => {
  describe('getBookFile', () => {
    it('should map BHS books 1:1', () => {
      expect(getBookFile('BHS', 'Gen')).toBe('Gen');
      expect(getBookFile('BHS', 'Ezra')).toBe('Ezra');
      expect(getBookFile('BHS', 'Neh')).toBe('Neh');
    });

    it('should map LXX Ezra/Neh to 2Esdr', () => {
      expect(getBookFile('LXX', 'Ezra')).toBe('2Esdr');
      expect(getBookFile('LXX', 'Neh')).toBe('2Esdr');
      expect(getBookFile('LXX', 'Gen')).toBe('Gen');
    });
  });

  describe('getMappedReference', () => {
    it('should map BHS Neh 1:1 to LXX 2Esdr 11:1', () => {
      // User requests Nehemiah 1:1. The UI passes version='LXX', book='Neh', ch='1', v='1'
      const ref = getMappedReference('LXX', 'Neh', '1', '1');
      expect(ref.mappedBook).toBe('2Esdr');
      expect(ref.mappedChapter).toBe('11');
      expect(ref.mappedVerse).toBe('1');
    });

    it('should map BHS Ps 22:1 to LXX Ps 21:1', () => {
      const ref = getMappedReference('LXX', 'Ps', '22', '1');
      expect(ref.mappedBook).toBe('Ps');
      expect(ref.mappedChapter).toBe('21');
      expect(ref.mappedVerse).toBe('1');
    });

    it('should map BHS Jer 30:1 to LXX Jer 37:1', () => {
      const ref = getMappedReference('LXX', 'Jer', '30', '1');
      expect(ref.mappedBook).toBe('Jer');
      expect(ref.mappedChapter).toBe('37');
      expect(ref.mappedVerse).toBe('1');
    });

    it('should leave normal references unaffected', () => {
      const ref = getMappedReference('LXX', 'Gen', '1', '1');
      expect(ref.mappedBook).toBe('Gen');
      expect(ref.mappedChapter).toBe('1');
      expect(ref.mappedVerse).toBe('1');
      
      const ref2 = getMappedReference('BHS', 'Jer', '30', '1');
      expect(ref2.mappedBook).toBe('Jer');
      expect(ref2.mappedChapter).toBe('30');
      expect(ref2.mappedVerse).toBe('1');
    });
  });
});

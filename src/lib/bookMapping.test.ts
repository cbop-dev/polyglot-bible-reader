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

    it('should map Maccabees across versions correctly', () => {
      // LXX expects 1Mac / 2Mac / 3Mac / 4Mac
      expect(getBookFile('LXX', '1Mac')).toBe('1Mac');
      expect(getBookFile('LXX', '1Macc')).toBe('1Mac');
      expect(getBookFile('LXX', '2Mac')).toBe('2Mac');
      expect(getBookFile('LXX', '2Macc')).toBe('2Mac');
      expect(getBookFile('LXX', '3Mac')).toBe('3Mac');
      expect(getBookFile('LXX', '4Mac')).toBe('4Mac');

      // English / Latin versions map to standardized 1Mac / 2Mac
      expect(getBookFile('WEB', '1Mac')).toBe('1Mac');
      expect(getBookFile('WEB', '1Macc')).toBe('1Mac');
      expect(getBookFile('Vulgate', '1Mac')).toBe('1Mac');
      expect(getBookFile('Vulgate', '1Macc')).toBe('1Mac');
      expect(getBookFile('KJV', '1Mac')).toBe('1Mac');
      expect(getBookFile('KJV', '1Macc')).toBe('1Mac');
      expect(getBookFile('Brenton', '1Mac')).toBe('1Mac');
      expect(getBookFile('Brenton', '1Macc')).toBe('1Mac');
      expect(getBookFile('Brenton', '3Mac')).toBe('3Mac');
      expect(getBookFile('Brenton', '4Mac')).toBe('4Mac');
    });

    it('should map Ecclesiastes (Qoh/Eccl) and Song of Solomon (Cant/Song)', () => {
      expect(getBookFile('BHS', 'Qoh')).toBe('Qoh');
      expect(getBookFile('BHS', 'Eccl')).toBe('Qoh');
      expect(getBookFile('LXX', 'Qoh')).toBe('Qoh');
      expect(getBookFile('LXX', 'Eccl')).toBe('Qoh');

      expect(getBookFile('KJV', 'Qoh')).toBe('Eccl');
      expect(getBookFile('KJV', 'Eccl')).toBe('Eccl');
      expect(getBookFile('WEB', 'Qoh')).toBe('Eccl');
      expect(getBookFile('Vulgate', 'Qoh')).toBe('Eccl');
      expect(getBookFile('Brenton', 'Qoh')).toBe('Eccl');

      expect(getBookFile('BHS', 'Cant')).toBe('Cant');
      expect(getBookFile('BHS', 'Song')).toBe('Cant');
      expect(getBookFile('LXX', 'Cant')).toBe('Cant');
      expect(getBookFile('LXX', 'Song')).toBe('Cant');

      expect(getBookFile('KJV', 'Cant')).toBe('Song');
      expect(getBookFile('KJV', 'Song')).toBe('Song');
      expect(getBookFile('WEB', 'Cant')).toBe('Song');
      expect(getBookFile('Vulgate', 'Cant')).toBe('Song');
    });

    it('should map Tobit and Esther correctly', () => {
      expect(getBookFile('LXX', 'Tob')).toBe('TobBA');
      expect(getBookFile('LXX', 'TobBA')).toBe('TobBA');
      expect(getBookFile('LXX', 'TobS')).toBe('TobS');

      expect(getBookFile('KJV', 'TobBA')).toBe('Tob');
      expect(getBookFile('KJV', 'TobS')).toBe('Tob');
      expect(getBookFile('WEB', 'TobBA')).toBe('Tob');
      expect(getBookFile('Vulgate', 'TobBA')).toBe('Tob');
      expect(getBookFile('Brenton', 'TobBA')).toBe('Tob');

      expect(getBookFile('Brenton', 'Esth')).toBe('AddEsth');
      expect(getBookFile('LXX', 'AddEsth')).toBe('Esth');
    });
  });

  describe('getMappedReference', () => {
    it('should map BHS Neh 1:1 to LXX 2Esdr 11:1', () => {
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

    it('should map Maccabees references properly across versions', () => {
      const lxxRef = getMappedReference('LXX', '1Mac', '1', '1');
      expect(lxxRef.mappedBook).toBe('1Mac');

      const webRef = getMappedReference('WEB', '1Mac', '1', '1');
      expect(webRef.mappedBook).toBe('1Mac');

      const vulgRef = getMappedReference('Vulgate', '1Mac', '1', '1');
      expect(vulgRef.mappedBook).toBe('1Mac');

      const kjvRef = getMappedReference('KJV', '1Macc', '1', '1');
      expect(kjvRef.mappedBook).toBe('1Mac');
    });

    it('should map Qoh/Eccl and Cant/Song references properly', () => {
      const lxxQoh = getMappedReference('LXX', 'Eccl', '1', '1');
      expect(lxxQoh.mappedBook).toBe('Qoh');

      const kjvQoh = getMappedReference('KJV', 'Qoh', '1', '1');
      expect(kjvQoh.mappedBook).toBe('Eccl');

      const lxxCant = getMappedReference('LXX', 'Song', '1', '1');
      expect(lxxCant.mappedBook).toBe('Cant');

      const webCant = getMappedReference('WEB', 'Cant', '1', '1');
      expect(webCant.mappedBook).toBe('Song');
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

    it('should verify that all getBookFile results for 1-4 Maccabees, Qoh, Cant, Tob exist on disk', async () => {
      const fs = await import('fs');
      const testCases: { version: string; book: string }[] = [
        { version: 'LXX', book: '1Mac' },
        { version: 'LXX', book: '2Mac' },
        { version: 'LXX', book: '3Mac' },
        { version: 'LXX', book: '4Mac' },
        { version: 'WEB', book: '1Mac' },
        { version: 'WEB', book: '2Mac' },
        { version: 'Vulgate', book: '1Mac' },
        { version: 'Vulgate', book: '2Mac' },
        { version: 'KJV', book: '1Mac' },
        { version: 'KJV', book: '2Mac' },
        { version: 'Brenton', book: '1Mac' },
        { version: 'Brenton', book: '2Mac' },
        { version: 'Brenton', book: '3Mac' },
        { version: 'Brenton', book: '4Mac' },
        { version: 'Brenton', book: '2Esdr' },
        { version: 'KJV', book: 'Qoh' },
        { version: 'KJV', book: 'Cant' },
        { version: 'KJV', book: 'TobBA' },
        { version: 'WEB', book: 'Qoh' },
        { version: 'WEB', book: 'Cant' },
        { version: 'Vulgate', book: 'Qoh' },
        { version: 'Vulgate', book: 'Cant' },
        { version: 'Brenton', book: 'Qoh' },
        { version: 'Brenton', book: 'Cant' },
        { version: 'Brenton', book: 'Esth' }
      ];

      for (const tc of testCases) {
        const fileName = getBookFile(tc.version, tc.book);
        const filePath = `static/data/${tc.version.toLowerCase()}/books/${fileName}.json`;
        expect(fs.existsSync(filePath), `File should exist: ${filePath}`).toBe(true);
      }
    });
  });
});

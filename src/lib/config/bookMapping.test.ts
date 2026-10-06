import { describe, it, expect } from 'vitest';
import { getBookFile, getBookForVersion, normalizeBookName, getCanonicalSlug, resolveBookCode } from './bookMapping.js';

describe('bookMapping', () => {
  describe('getBookForVersion / getBookFile', () => {
    it('should map BHS books 1:1', () => {
      expect(getBookFile('BHS', 'Gen')).toBe('Gen');
      expect(getBookFile('BHS', 'Ezra')).toBe('Ezra');
      expect(getBookFile('BHS', 'Neh')).toBe('Neh');
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

      expect(getBookFile('KJV', 'TobBA')).toBe('Tob');
      expect(getBookFile('WEB', 'TobBA')).toBe('Tob');
      expect(getBookFile('Vulgate', 'TobBA')).toBe('Tob');
      expect(getBookFile('Brenton', 'TobBA')).toBe('Tob');

      expect(getBookFile('Brenton', 'AddEsth')).toBe('AddEsth');
      expect(getBookFile('LXX', 'AddEsth')).toBe('Esth');
    });
  });

  describe('normalizeBookName and getCanonicalSlug', () => {
    it('should normalize various aliases to the canonical DB slug', () => {
      expect(getCanonicalSlug('Ezra')).toBe('ezra');
      expect(getCanonicalSlug('Neh')).toBe('nehemiah');
      expect(getCanonicalSlug('Nehemiah')).toBe('nehemiah');
      expect(getCanonicalSlug('2Esdr')).toBe('2-esdras');
      expect(getCanonicalSlug('2 Esdras')).toBe('2-esdras');
      expect(getCanonicalSlug('1Esdr')).toBe('1-esdras');
      expect(getCanonicalSlug('Qoh')).toBe('ecclesiastes');
      expect(getCanonicalSlug('Qoheleth')).toBe('ecclesiastes');
      expect(getCanonicalSlug('Eccl')).toBe('ecclesiastes');
      expect(getCanonicalSlug('Cant')).toBe('song-of-solomon');
      expect(getCanonicalSlug('Song of Songs')).toBe('song-of-solomon');
      expect(getCanonicalSlug('1_Cor')).toBe('1-corinthians');
      expect(getCanonicalSlug('1 Cor')).toBe('1-corinthians');
      expect(getCanonicalSlug('1Cor')).toBe('1-corinthians');
      expect(getCanonicalSlug('1 Sam')).toBe('1-samuel');
      expect(getCanonicalSlug('1 Kingdoms')).toBe('1-samuel');
    });

    it('should return the full CanonicalBook with metadata', () => {
      const def = normalizeBookName('Qoh');
      expect(def).not.toBeNull();
      expect(def?.code).toBe('ECC');
      expect(def?.slug).toBe('ecclesiastes');
      expect(def?.title).toBe('Ecclesiastes');
      expect(def?.standardAbbrev).toBe('Eccl');
      expect(def?.versionBooks?.BHS).toBe('Qoh');
      expect(def?.versionBooks?.KJV).toBe('Eccl');
    });

    it('should resolve standard 3-letter USFM codes via resolveBookCode', () => {
      expect(resolveBookCode('Genesis')).toBe('GEN');
      expect(resolveBookCode('1 Samuel')).toBe('1SA');
      expect(resolveBookCode('1 Kingdoms')).toBe('1SA');
      expect(resolveBookCode('1Kgdms')).toBe('1SA');
      expect(resolveBookCode('Psalms')).toBe('PSA');
      expect(resolveBookCode('Ps')).toBe('PSA');
      expect(resolveBookCode('2 Esdras')).toBe('2ES');
    });
  });
});

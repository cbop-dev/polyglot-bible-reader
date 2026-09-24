export type HebrewDiacriticMode = 'all' | 'vowels' | 'none';

/**
 * Transforms Hebrew text according to the selected diacritic mode:
 * - 'all': full vowels + cantillation / accents
 * - 'vowels': vowels only (strips cantillation marks and meteg)
 * - 'none': consonants only (strips vowels, accents, and dagesh, but retains Shin/Sin dots)
 */
export function formatHebrew(text: string, mode: HebrewDiacriticMode): string {
  if (!text || mode === 'all') return text;

  if (mode === 'vowels') {
    // Strip cantillation (U+0591–U+05AF) and Meteg (U+05BD)
    return text.replace(/[\u0591-\u05AF\u05BD]/g, '');
  }

  // mode === 'none' (consonants only)
  // Strips:
  // - Cantillation (U+0591–U+05AF, U+05BD)
  // - Vowels & Dagesh/Mappiq (U+05B0–U+05BC, U+05C7)
  // - Rafe (U+05BF)
  // - Upper/lower dots (U+05C4, U+05C5)
  // Retains: Shin dot (U+05C1), Sin dot (U+05C2), Maqaf (U+05BE), Sof Pasuq (U+05C3), Paseq (U+05C0)
  return text.replace(/[\u0591-\u05BD\u05BF\u05C4\u05C5\u05C7]/g, '');
}

/**
 * Transforms Greek text:
 * - enabled = true: retains all polytonic accents, breathings, and iota subscripts
 * - enabled = false: strips combining diacritical marks (U+0300–U+036F)
 */
export function formatGreek(text: string, enabled: boolean): string {
  if (!text || enabled) return text;

  // Decompose precomposed characters into base + combining diacritics,
  // strip combining diacritics, then re-normalize into NFC
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
}

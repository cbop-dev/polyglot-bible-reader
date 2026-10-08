/**
 * Transliteration and script normalization utilities for Greek and Hebrew.
 * Follows biblical-lexeme-explorer conventions:
 * - Single-character mapping (no digraphs like 'ch', 'th', 'sh')
 * - Greek: 'x' -> 'ξ', 'c' -> 'χ', 'q' -> 'θ', 'f' -> 'φ', 'y' -> 'ψ', 'w' -> 'ω', 's' -> 'σ'/'ς'
 * - Hebrew: 'j' -> 'ש' (Shin), 'b' -> 'ב', 'm' -> 'מ'/'ם', etc.
 */

// Greek mapping table
const LATIN_TO_GREEK_MAP: Record<string, string> = {
	a: 'α', A: 'Α',
	b: 'β', B: 'Β',
	g: 'γ', G: 'Γ',
	d: 'δ', D: 'Δ',
	e: 'ε', E: 'Ε',
	z: 'ζ', Z: 'Ζ',
	h: 'η', H: 'Η',
	q: 'θ', Q: 'Θ',
	i: 'ι', I: 'Ι',
	k: 'κ', K: 'Κ',
	l: 'λ', L: 'Λ',
	m: 'μ', M: 'Μ',
	n: 'ν', N: 'Ν',
	x: 'ξ', X: 'Ξ',
	o: 'ο', O: 'Ο',
	p: 'π', P: 'Π',
	r: 'ρ', R: 'Ρ',
	s: 'σ', S: 'Σ',
	t: 'τ', T: 'Τ',
	u: 'υ', U: 'Υ',
	f: 'φ', F: 'Φ',
	c: 'χ', C: 'Χ',
	y: 'ψ', Y: 'Ψ',
	w: 'ω', W: 'Ω',
	v: 'ϝ', V: 'Ϝ'
};

// Hebrew mapping table (upper/lower case supported)
const LATIN_TO_HEBREW_MAP: Record<string, string> = {
	')': '\u05D0', // Alef
	'(': '\u05E2', // Ayin
	'>': '\u05D0', // Alef
	'<': '\u05E2', // Ayin
	a: '\u05D0', A: '\u05D0', // Alef
	b: '\u05D1', B: '\u05D1', // Bet
	g: '\u05D2', G: '\u05D2', // Gimel
	d: '\u05D3', D: '\u05D3', // Dalet
	h: '\u05D4', H: '\u05D4', // He
	w: '\u05D5', W: '\u05D5', // Waw
	z: '\u05D6', Z: '\u05D6', // Zayin
	x: '\u05D7', X: '\u05D7', // Het
	'+': '\u05D8',           // Tet
	v: '\u05D8', V: '\u05D8', // Tet
	t: '\u05EA', T: '\u05EA', // Taw
	y: '\u05D9', Y: '\u05D9', // Yod
	k: '\u05DB', K: '\u05DB', // Kaf
	l: '\u05DC', L: '\u05DC', // Lamed
	m: '\u05DE', M: '\u05DE', // Mem
	n: '\u05E0', N: '\u05E0', // Nun
	s: '\u05E1', S: '\u05E1', // Samekh
	p: '\u05E4', P: '\u05E4', // Pe
	c: '\u05E6', C: '\u05E6', // Tsade
	q: '\u05E7', Q: '\u05E7', // Qof
	r: '\u05E8', R: '\u05E8', // Resh
	'#': '\u05E9',           // Shin / Sin general
	'&': '\u05E9',           // Shin / Sin general
	$: '\u05E9',             // Shin
	f: '\uFB2B', F: '\uFB2B', // Sin with dot
	j: '\u05E9', J: '\u05E9'  // Shin
};

// Mapping from regular Hebrew consonants to final forms
const HEBREW_FINAL_CONSONANTS: Record<string, string> = {
	'\u05DB': '\u05DA', // kaf -> final kaf
	'\u05DE': '\u05DD', // mem -> final mem
	'\u05E0': '\u05DF', // nun -> final nun
	'\u05E4': '\u05E3', // pe -> final pe
	'\u05E6': '\u05E5'  // tsade -> final tsade
};

// Reverse mapping: final forms to regular consonants
const HEBREW_REGULAR_CONSONANTS: Record<string, string> = {
	'\u05DA': '\u05DB', // final kaf -> kaf
	'\u05DD': '\u05DE', // final mem -> mem
	'\u05DF': '\u05E0', // final nun -> nun
	'\u05E3': '\u05E4', // final pe -> pe
	'\u05E5': '\u05E6'  // final tsade -> tsade
};

/**
 * Converts Latin Beta Code text to Greek characters.
 * Final sigma is handled: word-final 'σ' becomes 'ς'.
 */
export function latinToGreek(input: string): string {
	if (!input) return '';
	let result = '';
	for (let i = 0; i < input.length; i++) {
		const char = input[i];
		result += LATIN_TO_GREEK_MAP[char] ?? char;
	}
	// Convert medial sigma at the end of word or string to final sigma 'ς'
	return result.replace(/σ(?=[.,;·:!?\s\)\"\'\]]|$)/g, 'ς');
}

/**
 * Normalizes Greek text for search/filtering:
 * - Strips combining accents, breathings, and diacritics
 * - Lowercases
 * - Maps final sigma 'ς' to 'σ'
 */
export function toPlainGreek(greek: string): string {
	if (!greek) return '';
	return greek
		.normalize('NFD')
		.replace(/[\u0300-\u036f\u0313\u0314\u0342\u0345\u0308']+/g, '')
		.normalize('NFC')
		.toLowerCase()
		.replace(/ς/g, 'σ')
		.replace(/[.,;·:!?᾽’”“«»\-—\(\)\[\]⟦⟧⟨⟩⸂⸃⸆⸇⸀⸁⸄⸅⸈⸉⸊⸋†‡*0-9\s]+/gu, ' ')
		.trim();
}

/**
 * Converts trailing Hebrew letters in each word to their final form.
 */
export function convertHebrewFinalConsonants(hebrew: string): string {
	if (!hebrew) return '';
	return hebrew.replace(/([\u05DB\u05DE\u05E0\u05E4\u05E6])(?=[\s.,:;!?\)\"\'\]]|$)/g, (_, c) => {
		return HEBREW_FINAL_CONSONANTS[c] || c;
	});
}

/**
 * Converts any final Hebrew consonants back to regular consonants.
 */
export function removeHebrewFinalConsonants(hebrew: string): string {
	if (!hebrew) return '';
	return hebrew.replace(/[\u05DA\u05DD\u05DF\u05E3\u05E5]/g, (c) => {
		return HEBREW_REGULAR_CONSONANTS[c] || c;
	});
}

/**
 * Converts Latin text to Hebrew consonants with correct final letter forms.
 */
export function latinToHebrew(input: string): string {
	if (!input) return '';
	let chars: string[] = [];
	for (let i = 0; i < input.length; i++) {
		const c = input[i];
		chars.push(LATIN_TO_HEBREW_MAP[c] ?? c);
	}
	const hebrewRaw = chars.join('');
	return convertHebrewFinalConsonants(hebrewRaw);
}

/**
 * Normalizes Hebrew text for search/filtering:
 * - Strips niqqud (vowels), cantillation, meteg, and punctuation
 * - Converts final consonants to normal forms for uniform matching
 */
export function toPlainHebrew(hebrew: string): string {
	if (!hebrew) return '';
	// Strip Hebrew vowel points & cantillation marks (\u0591 - \u05C7)
	const stripped = hebrew.replace(/[\u0591-\u05C7]/g, '');
	// Normalize final consonants so מ and ם match identically
	const normalizedConsonants = removeHebrewFinalConsonants(stripped);
	return normalizedConsonants.replace(/[\s\u05BE]+/g, ' ').trim();
}

/**
 * Transliterates input based on language: 'greek' | 'hebrew'.
 */
export function transliterate(input: string, lang: 'greek' | 'hebrew'): string {
	if (lang === 'greek') {
		return latinToGreek(input);
	} else if (lang === 'hebrew') {
		return latinToHebrew(input);
	}
	return input;
}

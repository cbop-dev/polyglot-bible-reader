import hebrewDict from '$lib/lemma-ui/data/hebrew_morph_dict.json' with { type: 'json' };

const GREEK_POS = {
  "V": "Verb", "N": "Noun", "A": "Adjective", "RA": "Article", "RD": "Demonstrative Pronoun",
  "RI": "Interrogative/Indefinite Pronoun", "RP": "Personal Pronoun", "RR": "Relative Pronoun",
  "C": "Conjunction", "P": "Preposition", "D": "Adverb", "X": "Particle", "I": "Interjection",
  "PREP": "Preposition", "CONJ": "Conjunction", "ADV": "Adverb", "PRON": "Pronoun", "NUM": "Numeral",
  "INTERJ": "Interjection", "PART": "Particle"
};

const GREEK_TENSE = { "P": "Present", "I": "Imperfect", "F": "Future", "A": "Aorist", "X": "Perfect", "Y": "Pluperfect" };
const GREEK_VOICE = { "A": "Active", "M": "Middle", "P": "Passive", "E": "Middle/Passive" };
const GREEK_MOOD = { "I": "Indicative", "S": "Subjunctive", "O": "Optative", "M": "Imperative", "N": "Infinitive", "P": "Participle" };
const GREEK_CASE = { "N": "Nominative", "G": "Genitive", "D": "Dative", "A": "Accusative", "V": "Vocative" };
const GREEK_NUMBER = { "S": "Singular", "P": "Plural" };
const GREEK_GENDER = { "M": "Masculine", "F": "Feminine", "N": "Neuter" };
const GREEK_PERSON = { "1": "1st Person", "2": "2nd Person", "3": "3rd Person" };

/**
 * Decodes Greek morphological tags from both Swete LXX and SBLGNT (MorphGNT).
 * @param {string} code 
 * @returns {string[]} Array of human-readable grammatical breakdown badges
 */
export function decodeGreekMorph(code) {
  if (!code) return [];
  const trimmed = code.trim();
  if (GREEK_POS[trimmed]) return [GREEK_POS[trimmed]];

  // 1. MorphGNT format: 11 characters, e.g. "V- 3AAI-S--", "N- ----NSF-", "RA ----ASM-"
  if (trimmed.length === 11 && trimmed[2] === ' ') {
    const posCode = trimmed.slice(0, 2).replace(/-/g, '').trim();
    const pos = GREEK_POS[posCode] || (posCode === 'RA' ? 'Definite Article' : posCode);
    const badges = [pos];

    const person = trimmed[3];
    const tense = trimmed[4];
    const voice = trimmed[5];
    const mood = trimmed[6];
    const kase = trimmed[7];
    const number = trimmed[8];
    const gender = trimmed[9];

    const t = GREEK_TENSE[tense] || '';
    const v = GREEK_VOICE[voice] || '';
    const md = GREEK_MOOD[mood] || '';
    const tvm = [t, v, md].filter(Boolean).join(' ');
    if (tvm) badges.push(tvm);

    if (person !== '-') {
      const pStr = GREEK_PERSON[person] || '';
      const nStr = GREEK_NUMBER[number] || '';
      badges.push([pStr, nStr].filter(Boolean).join(' '));
    }

    if (kase !== '-') {
      const c = GREEK_CASE[kase] || '';
      const n = person === '-' ? (GREEK_NUMBER[number] || '') : '';
      const g = GREEK_GENDER[gender] || '';
      const cng = [c, n, g].filter(Boolean).join(' ');
      if (cng) badges.push(cng);
    }
    return badges;
  }

  // 2. Swete format: e.g. "V-AAI-3S", "N-DSF", "D-NSM", "A-NSF", "PRON-P1-S"
  const sweteParts = trimmed.split('-');
  if (sweteParts.length >= 2) {
    const posCode = sweteParts[0];
    const pos = posCode === 'D' ? 'Article / Demonstrative' : (GREEK_POS[posCode] || posCode);
    const badges = [pos];

    if (posCode === 'V') {
      const tvm = sweteParts[1] || '';
      const t = GREEK_TENSE[tvm[0]] || '';
      const v = GREEK_VOICE[tvm[1]] || '';
      const m = GREEK_MOOD[tvm[2]] || '';
      const tvmStr = [t, v, m].filter(Boolean).join(' ');
      if (tvmStr) badges.push(tvmStr);

      const pn = sweteParts[2] || '';
      if (pn.length === 2 && GREEK_PERSON[pn[0]] && GREEK_NUMBER[pn[1]]) {
        badges.push(`${GREEK_PERSON[pn[0]]} ${GREEK_NUMBER[pn[1]]}`);
      } else if (pn.length === 3 && GREEK_CASE[pn[0]] && GREEK_NUMBER[pn[1]] && GREEK_GENDER[pn[2]]) {
        badges.push(`${GREEK_CASE[pn[0]]} ${GREEK_NUMBER[pn[1]]} ${GREEK_GENDER[pn[2]]}`);
      }
      return badges;
    } else {
      const cng = sweteParts[1] || '';
      if (cng.length === 3) {
        const c = GREEK_CASE[cng[0]] || '';
        const n = GREEK_NUMBER[cng[1]] || '';
        const g = GREEK_GENDER[cng[2]] || '';
        const cngStr = [c, n, g].filter(Boolean).join(' ');
        if (cngStr) badges.push(cngStr);
      } else if (cng.startsWith('P') && cng.length >= 2) {
        badges.push(`${GREEK_PERSON[cng[1]] || ''} ${sweteParts[2] ? GREEK_NUMBER[sweteParts[2]] || '' : ''}`.trim());
      }
      return badges;
    }
  }

  return [trimmed];
}

/**
 * Decodes Hebrew morphological codes (ETCBC BHSA / eliranwong format).
 * E.g. "4c.verb.qal.perf.p3.m.sg", "4c.subs.f.sg.a"
 * @param {string} code 
 * @returns {string[]} Array of human-readable grammatical breakdown badges
 */
export function decodeHebrewMorph(code) {
  if (!code) return [];
  const trimmed = code.trim();
  const desc = hebrewDict[trimmed];

  if (desc) {
    const parts = desc.split(',').map((p) => p.trim());
    const badges = [];
    const suffixParts = [];
    let isSuffix = false;

    for (const p of parts) {
      if (p === 'pronominal suffix') {
        isSuffix = true;
        continue;
      }
      const cap = p.charAt(0).toUpperCase() + p.slice(1);
      if (isSuffix) {
        suffixParts.push(
          cap.replace('Third person', '3p').replace('Second person', '2p').replace('First person', '1p')
        );
      } else {
        badges.push(
          cap.replace('Third person', '3rd Person').replace('Second person', '2nd Person').replace('First person', '1st Person')
        );
      }
    }
    if (suffixParts.length > 0) {
      badges.push(`Suffix: ${suffixParts.join(' ')}`);
    }
    return badges;
  }

  // Fallback: parse dot-separated components
  const parts = trimmed.split('.').filter((p) => p !== '4c');
  const HEB_PARTS = {
    'verb': 'Verb', 'subs': 'Noun', 'adjv': 'Adjective', 'prep': 'Preposition', 'conj': 'Conjunction',
    'art': 'Article', 'nmpr': 'Proper Noun', 'prin': 'Interrogative Pronoun', 'prps': 'Personal Pronoun',
    'prde': 'Demonstrative Pronoun', 'inrg': 'Interrogative', 'nega': 'Negative', 'intj': 'Interjection',
    'qal': 'Qal', 'nif': 'Nif‘al', 'piel': 'Pi‘el', 'pual': 'Pu‘al', 'hif': 'Hif‘il', 'hof': 'Hof‘al', 'hit': 'Hitpa“el',
    'perf': 'Perfect', 'impf': 'Imperfect', 'wayq': 'Wayyiqtol', 'impv': 'Imperative', 'infc': 'Infinitive Construct',
    'infa': 'Infinitive Absolute', 'ptca': 'Participle Active', 'ptcp': 'Participle Passive',
    'p1': '1st Person', 'p2': '2nd Person', 'p3': '3rd Person',
    'm': 'Masculine', 'f': 'Feminine', 'u': 'Common/Unknown',
    'sg': 'Singular', 'pl': 'Plural', 'du': 'Dual',
    'a': 'Absolute', 'c': 'Construct', 'e': 'Emphatic'
  };

  const badges = parts.map((p) => HEB_PARTS[p] || p.charAt(0).toUpperCase() + p.slice(1));
  return badges.length > 0 ? badges : [trimmed];
}

/**
 * Universal dispatcher for formatting morph badges according to language/corpus.
 * @param {string} morph 
 * @param {string} lang 'hebrew' | 'greek'
 * @returns {string[]}
 */
export function formatMorphBadges(morph, lang = 'greek') {
  if (!morph) return [];
  if (lang === 'hebrew' || morph.startsWith('4c.')) {
    return decodeHebrewMorph(morph);
  } else {
    return decodeGreekMorph(morph);
  }
}

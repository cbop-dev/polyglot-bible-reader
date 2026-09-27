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

export const HEBREW_PREFIX_MAP = {
  'Prep-b': {
    code: 'Prep-b',
    prefix: 'בְּ',
    name: 'Preposition',
    gloss: 'in, with, by',
    strongs: 'H9003',
    headword: 'בְּ',
    key: 'ב'
  },
  'Prep-k': {
    code: 'Prep-k',
    prefix: 'כְּ',
    name: 'Preposition',
    gloss: 'as, like',
    strongs: 'H9004',
    headword: 'כְּ',
    key: 'כ'
  },
  'Prep-l': {
    code: 'Prep-l',
    prefix: 'לְ',
    name: 'Preposition',
    gloss: 'to, for',
    strongs: 'H9005',
    headword: 'לְ',
    key: 'ל'
  },
  'Prep-m': {
    code: 'Prep-m',
    prefix: 'מִ',
    name: 'Preposition',
    gloss: 'from, out of',
    strongs: 'H4480',
    headword: 'מִן',
    key: 'מן'
  },
  'Conj-w': {
    code: 'Conj-w',
    prefix: 'וְ',
    name: 'Conjunction',
    gloss: 'and, but, then',
    strongs: 'H9000',
    headword: 'וְ',
    key: 'ו'
  },
  'Art': {
    code: 'Art',
    prefix: 'הַ',
    name: 'Definite Article',
    gloss: 'the',
    strongs: 'H9009',
    headword: 'הַ',
    key: 'ה'
  },
  'Interrog': {
    code: 'Interrog',
    prefix: 'הֲ',
    name: 'Interrogative Particle',
    gloss: 'whether, if',
    strongs: 'H9008',
    headword: 'הֲ',
    key: 'ה'
  },
  'Rel': {
    code: 'Rel',
    prefix: 'שֶׁ',
    name: 'Relative Particle',
    gloss: 'who, which, that',
    strongs: 'H7945',
    headword: 'שֶׁ',
    key: 'ש'
  },
  'Pro-r': {
    code: 'Pro-r',
    prefix: 'שֶׁ',
    name: 'Relative Particle',
    gloss: 'who, which, that',
    strongs: 'H7945',
    headword: 'שֶׁ',
    key: 'ש'
  },
  'DirObjM': {
    code: 'DirObjM',
    prefix: 'אֵת',
    name: 'Direct Object Marker',
    gloss: '[direct object]',
    strongs: 'H853',
    headword: 'אֵת',
    key: 'את'
  }
};

/**
 * Splits Hebrew compound morphology into prefix segments and stem segment.
 * E.g. "Prep-b | N-fs" -> { prefixes: [ { code: 'Prep-b', prefix: 'בְּ', ... } ], stem: 'N-fs' }
 * "Conj-w, Art | N-fs" -> { prefixes: [ Conj-w, Art ], stem: 'N-fs' }
 * @param {string} morphCode
 */
export function parseHebrewMorphSegments(morphCode) {
  if (!morphCode) return { prefixes: [], stem: '' };
  const str = morphCode.trim();
  if (!str.includes('|')) {
    if (HEBREW_PREFIX_MAP[str]) {
      return { prefixes: [HEBREW_PREFIX_MAP[str]], stem: '' };
    }
    return { prefixes: [], stem: str };
  }

  const parts = str.split('|').map((p) => p.trim());
  const prefixStr = parts[0];
  const stemStr = parts.slice(1).join(' | ');

  const prefixCodes = prefixStr.split(',').map((c) => c.trim()).filter(Boolean);
  const prefixes = prefixCodes.map((c) => {
    return HEBREW_PREFIX_MAP[c] || {
      code: c,
      prefix: c,
      name: c,
      gloss: '',
      strongs: '',
      headword: c,
      key: c
    };
  });

  return { prefixes, stem: stemStr };
}

const HEB_STEM_MAP = {
  'q': 'Qal', 'n': 'Nif‘al', 'p': 'Pi‘el', 'P': 'Pu‘al', 'h': 'Hif‘il', 'H': 'Hof‘al', 't': 'Hitpa“el',
  'o': 'Polel', 'O': 'Polal', 'r': 'Hitpolel', 'm': 'Poel', 'M': 'Poal', 'k': 'Palel', 'K': 'Pulal'
};

const HEB_ASPECT_MAP = {
  'p': 'Perfect', 'i': 'Imperfect', 'w': 'Wayyiqtol', 'v': 'Imperative',
  'c': 'Infinitive Construct', 'a': 'Infinitive Absolute', 'r': 'Participle Active', 's': 'Participle Passive'
};

const HEB_PERSON_MAP = { '1': '1st Person', '2': '2nd Person', '3': '3rd Person' };
const HEB_GENDER_MAP = { 'm': 'Masculine', 'f': 'Feminine', 'c': 'Common' };
const HEB_NUMBER_MAP = { 's': 'Singular', 'p': 'Plural', 'd': 'Dual' };
const HEB_STATE_MAP = { 'a': 'Absolute', 'c': 'Construct', 'e': 'Emphatic' };

function decodeHebrewStemCode(rawStem) {
  if (!rawStem) return [];
  const trimmed = rawStem.trim();

  // Verbs: V-qp3ms, V-qc, etc.
  if (trimmed.startsWith('V-')) {
    const badges = ['Verb'];
    const rest = trimmed.slice(2);
    if (rest.length >= 2) {
      const stemLetter = rest[0];
      const aspectLetter = rest[1];
      const stemName = HEB_STEM_MAP[stemLetter] || '';
      const aspectName = HEB_ASPECT_MAP[aspectLetter] || '';
      const sa = [stemName, aspectName].filter(Boolean).join(' ');
      if (sa) badges.push(sa);

      const p = rest[2] ? HEB_PERSON_MAP[rest[2]] || '' : '';
      const g = rest[3] ? HEB_GENDER_MAP[rest[3]] || '' : '';
      const n = rest[4] ? HEB_NUMBER_MAP[rest[4]] || '' : '';
      const pgn = [p, g, n].filter(Boolean).join(' ');
      if (pgn) badges.push(pgn);
    }
    return badges;
  }

  // Nouns / Adjectives: N-fs, N-mp, A-ms, etc.
  if (trimmed.startsWith('N-') || trimmed.startsWith('A-')) {
    const badges = [trimmed.startsWith('N-') ? 'Noun' : 'Adjective'];
    const rest = trimmed.slice(2);
    let g = '', n = '', st = '';
    for (const char of rest) {
      if (HEB_GENDER_MAP[char]) g = HEB_GENDER_MAP[char];
      else if (HEB_NUMBER_MAP[char]) n = HEB_NUMBER_MAP[char];
      else if (HEB_STATE_MAP[char]) st = HEB_STATE_MAP[char];
    }
    const gns = [g, n, st].filter(Boolean).join(' ');
    if (gns) badges.push(gns);
    return badges;
  }

  if (trimmed.startsWith('Pp')) return ['Personal Pronoun'];
  if (trimmed.startsWith('Pd')) return ['Demonstrative Pronoun'];
  if (trimmed.startsWith('Pr')) return ['Relative Pronoun'];
  if (trimmed === 'DirObjM') return ['Direct Object Marker'];
  if (trimmed === 'Interrog') return ['Interrogative Particle'];

  return [];
}

/**
 * Decodes Hebrew morphological codes (ETCBC BHSA / eliranwong format and Open Scriptures format).
 * E.g. "Prep-b | N-fs", "V-qp3ms", "4c.verb.qal.perf.p3.m.sg", "4c.subs.f.sg.a"
 * @param {string} code 
 * @returns {string[]} Array of human-readable grammatical breakdown badges
 */
export function decodeHebrewMorph(code) {
  if (!code) return [];
  const trimmed = code.trim();

  // If compound morphology (e.g. "Prep-b | N-fs", "Conj-w, Art | N-fs")
  if (trimmed.includes('|')) {
    const { prefixes, stem } = parseHebrewMorphSegments(trimmed);
    const badges = [];
    for (const p of prefixes) {
      badges.push(`${p.name} ${p.prefix}`.trim());
    }
    if (stem) {
      const stemBadges = decodeHebrewMorph(stem);
      badges.push(...stemBadges);
    }
    return badges;
  }

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

  // Try Open Scriptures stem parser
  const openScripturesBadges = decodeHebrewStemCode(trimmed);
  if (openScripturesBadges && openScripturesBadges.length > 0) {
    return openScripturesBadges;
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
  if (lang === 'hebrew' || morph.includes('|') || morph.startsWith('Prep-') || morph.startsWith('Conj-') || morph.startsWith('V-') || morph.startsWith('N-') || morph.startsWith('4c.')) {
    return decodeHebrewMorph(morph);
  } else {
    return decodeGreekMorph(morph);
  }
}

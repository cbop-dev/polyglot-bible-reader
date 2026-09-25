import { bibleRefReverseLookupHash } from '$lib/utils/bible-utils.js';

export function getBookFile(version: string, canonicalBook: string): string {
  const normKey = bibleRefReverseLookupHash[canonicalBook.toLowerCase()] || canonicalBook;

  if (version === 'LXX') {
    if (canonicalBook === 'Ezra' || canonicalBook === 'Neh') return '2Esdr';
    if (normKey === '1 Macc' || canonicalBook === '1Macc') return '1Mac';
    if (normKey === '2 Macc' || canonicalBook === '2Macc') return '2Mac';
    if (normKey === '3 Macc' || canonicalBook === '3Macc') return '3Mac';
    if (normKey === '4 Macc' || canonicalBook === '4Macc') return '4Mac';
    if (normKey === 'Eccl' || canonicalBook === 'Eccl') return 'Qoh';
    if (normKey === 'Song' || canonicalBook === 'Song') return 'Cant';
    if (canonicalBook === 'Tob') return 'TobBA';
    if (canonicalBook === 'AddEsth') return 'Esth';
    return canonicalBook;
  }

  if (version === 'BHS') {
    if (normKey === 'Eccl' || canonicalBook === 'Eccl') return 'Qoh';
    if (normKey === 'Song' || canonicalBook === 'Song') return 'Cant';
    return canonicalBook;
  }

  // Versions: KJV, Vulgate, WEB, Brenton
  if (normKey === '1 Macc') return '1Mac';
  if (normKey === '2 Macc') return '2Mac';
  if (normKey === '3 Macc') return '3Mac';
  if (normKey === '4 Macc') return '4Mac';
  if (normKey === 'Eccl' || canonicalBook === 'Qoh') return 'Eccl';
  if (normKey === 'Song' || canonicalBook === 'Cant') return 'Song';
  if (canonicalBook === 'TobBA' || canonicalBook === 'TobS') return 'Tob';
  if (canonicalBook === 'DanTh') return 'Dan';
  if (canonicalBook === 'SusTh') return 'Sus';
  if (canonicalBook === 'BelTh') return 'Bel';

  if (version === 'Brenton') {
    if (canonicalBook === 'Esth') return 'AddEsth';
    if (canonicalBook === '2Esdr') return '2Esdr';
  }

  return canonicalBook;
}

export function getMappedReference(version: string, book: string, chapter: string, verse: string) {
  let mappedBook = book;
  let mappedChapter = chapter;
  let mappedVerse = verse;

  const chNum = Number(chapter);
  const normKey = bibleRefReverseLookupHash[book.toLowerCase()] || book;

  if (version === 'LXX') {
    // Book mappings
    if (book === 'Ezra') {
      mappedBook = '2Esdr';
    } else if (book === 'Neh') {
      mappedBook = '2Esdr';
      if (!isNaN(chNum)) {
        mappedChapter = String(chNum + 10);
      }
    } else if (normKey === '1 Macc' || book === '1Macc') {
      mappedBook = '1Mac';
    } else if (normKey === '2 Macc' || book === '2Macc') {
      mappedBook = '2Mac';
    } else if (normKey === '3 Macc' || book === '3Macc') {
      mappedBook = '3Mac';
    } else if (normKey === '4 Macc' || book === '4Macc') {
      mappedBook = '4Mac';
    } else if (normKey === 'Eccl' || book === 'Eccl') {
      mappedBook = 'Qoh';
    } else if (normKey === 'Song' || book === 'Song') {
      mappedBook = 'Cant';
    } else if (book === 'Tob') {
      mappedBook = 'TobBA';
    } else if (book === 'AddEsth') {
      mappedBook = 'Esth';
    }

    // Chapter mappings
    if (book === 'Ps') {
      // General LXX Psalms offset (BHS Ps 10-146 -> LXX Ps 9-145 roughly)
      if (!isNaN(chNum) && chNum >= 10 && chNum <= 146) {
        if (chNum === 10) mappedChapter = '9';
        else if (chNum >= 11 && chNum <= 113) mappedChapter = String(chNum - 1);
        else if (chNum >= 116 && chNum <= 145) mappedChapter = String(chNum - 1);
        else mappedChapter = String(chNum - 1); // Simplification for now, works for Ps 22 -> 21
      }
    } else if (book === 'Jer') {
      if (chNum === 30) {
        mappedChapter = '37';
      }
    }
  } else if (version === 'BHS') {
    if (normKey === 'Eccl' || book === 'Eccl') {
      mappedBook = 'Qoh';
    } else if (normKey === 'Song' || book === 'Song') {
      mappedBook = 'Cant';
    }
  } else {
    // English / Latin versions: KJV, Vulgate, WEB, Brenton
    if (normKey === '1 Macc' || book === '1Macc') {
      mappedBook = '1Mac';
    } else if (normKey === '2 Macc' || book === '2Macc') {
      mappedBook = '2Mac';
    } else if (normKey === '3 Macc' || book === '3Macc') {
      mappedBook = '3Mac';
    } else if (normKey === '4 Macc' || book === '4Macc') {
      mappedBook = '4Mac';
    } else if (normKey === 'Eccl' || book === 'Qoh') {
      mappedBook = 'Eccl';
    } else if (normKey === 'Song' || book === 'Cant') {
      mappedBook = 'Song';
    } else if (book === 'TobBA' || book === 'TobS') {
      mappedBook = 'Tob';
    } else if (book === 'DanTh') {
      mappedBook = 'Dan';
    } else if (book === 'SusTh') {
      mappedBook = 'Sus';
    } else if (book === 'BelTh') {
      mappedBook = 'Bel';
    } else if (version === 'Brenton' && book === 'Esth') {
      mappedBook = 'AddEsth';
    }
  }

  return { mappedBook, mappedChapter, mappedVerse };
}

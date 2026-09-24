export function getBookFile(version: string, canonicalBook: string): string {
  if (version === 'LXX') {
    if (canonicalBook === 'Ezra') return '2Esdr';
    if (canonicalBook === 'Neh') return '2Esdr';
  }
  return canonicalBook;
}

export function getMappedReference(version: string, book: string, chapter: string, verse: string) {
  let mappedBook = book;
  let mappedChapter = chapter;
  let mappedVerse = verse;

  const chNum = Number(chapter);

  if (version === 'LXX') {
    // Book mappings
    if (book === 'Ezra') {
      mappedBook = '2Esdr';
    } else if (book === 'Neh') {
      mappedBook = '2Esdr';
      if (!isNaN(chNum)) {
        mappedChapter = String(chNum + 10);
      }
    } 
    // Chapter mappings
    else if (book === 'Ps') {
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
      // Note: we can add more specific Jer offsets here (e.g. Jer 27:1-15 = 34:1-15, etc.)
    }
  }

  return { mappedBook, mappedChapter, mappedVerse };
}

import { CANONICAL_BOOK_DEFINITIONS,normalizeBookName } from "./canonicalBooks.generated";

export const biblesByLanguage={
  english:['KJV', 'Brenton'],
  greek:['LXX']
}

export class Dataset{
  abbrev= '';
  language='';
  description='';
  lemmaInfoEnabled=false;
  testament=''; //ot, nt, or both

  constructor(abbrev: string, language: string,testament: string,description='', lemmaInfoEnabled=false){
    this.abbrev=abbrev;
    this.language=language;
    this.testament=testament;
    this.description=description;
    this.lemmaInfoEnabled=lemmaInfoEnabled;
  }
}




export const datasetsDict=
{
  'KJV': {language:'English',testament: 'both', lemmas:false},
  'Vulgate':{language:'Latin', testament: 'both', lemmas:false},
  'WEB':{language:'English',testament: 'both', lemmas:false},
   'Brenton':{language: 'English', testament: 'ot', lemmas:false},
   'BHS':{language:'Hebrew', testament: 'ot', lemmas:true},
   'LXX':{language:'Greek', testament: 'ot', lemmas:true},
   'OpenGNT':{language:'Greek', testament: 'nt', lemmas:true}
};

/**
 * Case-insensitive aliases for URL parameters, legacy links, and alternate acronyms.
 */
export const VERSION_ALIASES: Record<string, string> = {
  sblgnt: 'OpenGNT',
  sbl: 'OpenGNT',
  ognt: 'OpenGNT',
  opengnt: 'OpenGNT'
};

export const dataSets = Object.entries(datasetsDict).map(([k,v])=>new Dataset(k, v.language,v.testament,'', v.lemmas));
//mylog(`datasets abbrevs: [${dataSets.map((ds)=>ds.abbrev).join(',')}]`, true);


export const myDataSets={
  dataSets: dataSets,
  lookup(abbrev:string){
    if (!abbrev) return undefined;
    const clean = abbrev.trim().toLowerCase();
    const resolved = VERSION_ALIASES[clean] || abbrev;
    return dataSets.find((ds)=>ds.abbrev.toLocaleLowerCase()==resolved.toLocaleLowerCase());
  },
  
  /**
   * 
   * @param {string} language The language to check for.
   * @returns {Dataset[]} an array of the versions which are in this language group 
   */
  getByLang(language: string): Dataset[]{
    return dataSets.filter((ds)=>ds.language.toLocaleLowerCase()==language.toLocaleLowerCase());
  }

}

export const availableBibles=Object.keys(datasetsDict);

export function getCorrectVersionName(fuzzyName: string){
	if (!fuzzyName) return undefined;
	const clean = fuzzyName.trim().toLowerCase();
	if (VERSION_ALIASES[clean]) {
		return VERSION_ALIASES[clean];
	}
	return availableBibles.find((ver)=>ver.toLocaleLowerCase() == clean);
}

export function isValidVersion(versionName: string, caseSensitive=false): boolean{
	if (!versionName) return false;
	const clean = versionName.trim().toLowerCase();
	if (VERSION_ALIASES[clean]) return true;
	return availableBibles.some((ver)=>{
		if (caseSensitive){
			return ver === versionName;
		}
		return ver.toLowerCase() === clean;
	});
}


export interface VersionGroup {
  language: string;
  versions: string[];
}

export const versionGroups: VersionGroup[] = [
  {
    language: 'Hebrew',
    versions: ['BHS']
  },
  {
    language: 'Greek',
    versions: ['LXX', 'OpenGNT']
  },
  {
    language: 'Latin',
    versions: ['Vulgate']
  },
  {
    language: 'English',
    versions: ['KJV', 'WEB', 'Brenton']
  }
];

export function getVersionLanguage(version:string){
  if (!version) return '';
  const clean = version.trim().toLowerCase();
  const resolved = VERSION_ALIASES[clean] || version;
  return versionGroups.find((vg)=>vg.versions.map((v)=>v.toLocaleLowerCase()).includes (resolved.toLocaleLowerCase()))?.language ?? '';
}

export const allVersions: string[] = versionGroups.flatMap((g) => g.versions);

export function formatVersionLabel(opt: string, short=false): string {
  if (short){
    return opt
  }
  else{
    const ds = myDataSets.lookup(opt);

    return ds ? `${ds.language} (${ds?.abbrev})` : opt;
  }
  
}

import { VERSION_AVAILABLE_BOOKS, getCanonicalBookChapters } from './canonicalBooks.generated.js';

export const bhsBooks = VERSION_AVAILABLE_BOOKS['BHS'] || [];
export const lxxBooks = VERSION_AVAILABLE_BOOKS['LXX'] || [];
export const ntBooks = VERSION_AVAILABLE_BOOKS['OpenGNT'] || [];
export const kjvBooks = VERSION_AVAILABLE_BOOKS['KJV'] || [];
export const vulgateBooks = VERSION_AVAILABLE_BOOKS['Vulgate'] || [];
export const webBooks = VERSION_AVAILABLE_BOOKS['WEB'] || [];
export const brentonBooks = VERSION_AVAILABLE_BOOKS['Brenton'] || [];

export function getVersionBooks(version: string): string[] {
  if (!version) return VERSION_AVAILABLE_BOOKS['OpenGNT'] || [];
  const clean = version.trim().toLowerCase();
  const resolved = VERSION_ALIASES[clean] || getCorrectVersionName(version) || version;
  return VERSION_AVAILABLE_BOOKS[resolved] || VERSION_AVAILABLE_BOOKS['OpenGNT'] || [];
}

export function isBookInVersion(book: string, version: string): boolean {
  const books = getVersionBooks(version);
  if (!books || books.length === 0) return false;
  const clean = book.trim().toLowerCase();
  return books.some((b) => b.toLowerCase() === clean);
}

export function getVersionBookChapters(version: string, book: string): number[] {
  const clean = (version || '').trim().toLowerCase();
  const resolved = VERSION_ALIASES[clean] || getCorrectVersionName(version) || version;
  return getCanonicalBookChapters(resolved, book);
}

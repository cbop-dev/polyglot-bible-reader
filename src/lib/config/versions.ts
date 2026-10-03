
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

export const bhsBooks = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs',
  '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Qoh', 'Cant', 'Isa', 'Jer',
  'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph',
  'Hag', 'Zech', 'Mal'
];

export const lxxBooks = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs',
  '1Chr', '2Chr', '1Esdr', '2Esdr', 'Esth', 'Jdt', 'TobBA', 'TobS', '1Mac', '2Mac', '3Mac', '4Mac',
  'Ps', 'Od', 'Prov', 'Qoh', 'Cant', 'Job', 'Wis', 'Sir', 'PsSol', 'Hos', 'Mic', 'Amos', 'Joel',
  'Jonah', 'Obad', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal', 'Isa', 'Jer', 'Bar', 'EpJer',
  'Lam', 'Ezek', 'Bel', 'BelTh', 'Dan', 'DanTh', 'Sus', 'SusTh'
];

export const ntBooks = [
  'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1_Cor', '2_Cor', 'Gal', 'Eph', 'Phil', 'Col',
  '1_Thess', '2_Thess', '1_Tim', '2_Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1_Pet', '2_Pet',
  '1_John', '2_John', '3_John', 'Jude', 'Rev'
];

export const kjvBooks = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs',
  '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer',
  'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph',
  'Hag', 'Zech', 'Mal', 'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1_Cor', '2_Cor', 'Gal',
  'Eph', 'Phil', 'Col', '1_Thess', '2_Thess', '1_Tim', '2_Tim', 'Titus', 'Phlm', 'Heb', 'Jas',
  '1_Pet', '2_Pet', '1_John', '2_John', '3_John', 'Jude', 'Rev', 'Tob', 'Jdt', 'Wis', 'Sus',
  'Bel', '1Mac', '2Mac', '1Esdr', 'PrMan', '2Esdr', 'AddEsth', 'Sir', 'Bar', 'PrAzar'
];

export const vulgateBooks = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs',
  '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer',
  'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph',
  'Hag', 'Zech', 'Mal', 'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1_Cor', '2_Cor', 'Gal',
  'Eph', 'Phil', 'Col', '1_Thess', '2_Thess', '1_Tim', '2_Tim', 'Titus', 'Phlm', 'Heb', 'Jas',
  '1_Pet', '2_Pet', '1_John', '2_John', '3_John', 'Jude', 'Tob', 'Jdt', 'Wis', 'Sir', 'Bar',
  '1Mac', '2Mac'
];

export const webBooks = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs',
  '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer',
  'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph',
  'Hag', 'Zech', 'Mal', 'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1_Cor', '2_Cor', 'Gal',
  'Eph', 'Phil', 'Col', '1_Thess', '2_Thess', '1_Tim', '2_Tim', 'Titus', 'Phlm', 'Heb', 'Jas',
  '1_Pet', '2_Pet', '1_John', '2_John', '3_John', 'Jude', 'Rev', 'Tob', 'Jdt', 'AddEsth',
  'Wis', 'Sir', 'Bar', '1Mac', '2Mac', '1Esdr', '2Esdr', 'PrMan'
];

export const brentonBooks = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs',
  '1Chr', '2Chr', 'Ezra', 'Neh', 'Ps', 'Prov', 'Eccl', 'Song', 'Job', 'Isa', 'Jer', 'Lam',
  'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag',
  'Zech', 'Mal', '1Esdr', '2Esdr', 'Tob', 'Jdt', 'AddEsth', 'Wis', 'Sir', 'Bar', 'EpJer',
  'Sus', 'Bel', '1Mac', '2Mac', '3Mac', '4Mac', 'PrMan'
];

export function getVersionBooks(version: string): string[] {
  const clean = version?.trim().toLowerCase();
  const resolved = VERSION_ALIASES[clean] || version;
  switch (resolved) {
    case 'BHS': return bhsBooks;
    case 'LXX': return lxxBooks;
    case 'OpenGNT':
    case 'OGNT':
    case 'SBLGNT': return ntBooks;
    case 'KJV': return kjvBooks;
    case 'Vulgate': return vulgateBooks;
    case 'WEB': return webBooks;
    case 'Brenton': return brentonBooks;
    default: return ntBooks;
  }
}

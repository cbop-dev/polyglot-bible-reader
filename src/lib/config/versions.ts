
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
   'SBLGNT':{language:'Greek', testament: 'nt', lemmas:true}
};

export const dataSets = Object.entries(datasetsDict).map(([k,v])=>new Dataset(k, v.language,v.testament,'', v.lemmas));
//mylog(`datasets abbrevs: [${dataSets.map((ds)=>ds.abbrev).join(',')}]`, true);


export const myDataSets={
  dataSets: dataSets,
  lookup(abbrev:string){
    return dataSets.find((ds)=>ds.abbrev.toLocaleLowerCase()==abbrev.toLocaleLowerCase());
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
	return availableBibles.find((ver)=>ver.toLocaleLowerCase() == fuzzyName.toLocaleLowerCase());
}

export function isValidVersion(versionName: string, caseSensitive=false): boolean{

	let ret = false;

	return availableBibles.find((ver)=>{
		if (caseSensitive){
			return isValidVersion(ver) ? true : false;
		}
		else{
			return ver == versionName;
		}
	})? true: false;
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
    versions: ['LXX', 'SBLGNT']
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
  return versionGroups.find((vg)=>vg.versions.map((v)=>v.toLocaleLowerCase()).includes (version.toLocaleLowerCase()))?.language ?? '';
}

export const allVersions: string[] = versionGroups.flatMap((g) => g.versions);

export function formatVersionLabel(opt: string, short=false): string {
  if (short){
    return opt
  }
  else{
    const ds = myDataSets.lookup(opt);

    return ds ? `${ds.language} (${ds?.abbrev})` : '';
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
  switch (version) {
    case 'BHS': return bhsBooks;
    case 'LXX': return lxxBooks;
    case 'SBLGNT': return ntBooks;
    case 'KJV': return kjvBooks;
    case 'Vulgate': return vulgateBooks;
    case 'WEB': return webBooks;
    case 'Brenton': return brentonBooks;
    default: return ntBooks;
  }
}

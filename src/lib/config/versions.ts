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

export function formatVersionLabel(opt: string): string {
  if (opt === 'BHS') return 'Hebrew (BHS)';
  if (opt === 'LXX') return 'Greek (LXX)';
  if (opt === 'SBLGNT') return 'Greek NT (SBLGNT)';
  if (opt === 'WEB') return 'English (WEB)';
  if (opt === 'Vulgate') return 'Latin (Vulgate)';
  if (opt === 'KJV') return 'English (KJV)';
  if (opt === 'Brenton') return "Brenton's (LXX)";
  return opt;
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

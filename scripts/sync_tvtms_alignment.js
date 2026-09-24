import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_URL = 'https://raw.githubusercontent.com/metaxiamultimedia/scriptures-js-source-stepbible-versification/master/data/stepbible-versification/mapping.json';
const OUTPUT_PATH = path.join(__dirname, '..', 'static', 'data', 'tvtms_alignment.json');

const METAXIA_TO_APP_BOOK = {
  Genesis: 'Gen',
  Exodus: 'Exod',
  Leviticus: 'Lev',
  Numbers: 'Num',
  Deuteronomy: 'Deut',
  Joshua: 'Josh',
  Judges: 'Judg',
  Ruth: 'Ruth',
  '1 Samuel': '1Sam',
  '2 Samuel': '2Sam',
  '1 Kings': '1Kgs',
  '2 Kings': '2Kgs',
  '1 Chronicles': '1Chr',
  '2 Chronicles': '2Chr',
  Ezra: 'Ezra',
  Nehemiah: 'Neh',
  Esther: 'Esth',
  Job: 'Job',
  Psalms: 'Ps',
  Proverbs: 'Prov',
  Ecclesiastes: 'Qoh',
  'Song of Solomon': 'Cant',
  Isaiah: 'Isa',
  Jeremiah: 'Jer',
  Lamentations: 'Lam',
  Ezekiel: 'Ezek',
  Daniel: 'Dan',
  Hosea: 'Hos',
  Joel: 'Joel',
  Amos: 'Amos',
  Obadiah: 'Obad',
  Jonah: 'Jonah',
  Micah: 'Mic',
  Nahum: 'Nah',
  Habakkuk: 'Hab',
  Zephaniah: 'Zeph',
  Haggai: 'Hag',
  Zechariah: 'Zech',
  Malachi: 'Mal'
};

async function syncTvtms() {
  console.log(`Fetching STEPBible TVTMS versification mapping from:\n  ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch mapping: ${res.status} ${res.statusText}`);
  }

  const raw = await res.json();
  const mtLxx = raw['MT->LXX'] || {};

  const normalized = {};
  for (const [key, val] of Object.entries(mtLxx)) {
    const lastSpace = key.lastIndexOf(' ');
    if (lastSpace === -1) continue;
    const bookFull = key.substring(0, lastSpace);
    const chVs = key.substring(lastSpace + 1);

    const appBook = METAXIA_TO_APP_BOOK[bookFull];
    if (!appBook) continue;

    const appKey = `${appBook} ${chVs}`;
    if (val === null) {
      normalized[appKey] = null;
    } else {
      normalized[appKey] = {
        chapter: val.chapter,
        verse: val.verse
      };
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(normalized, null, 2), 'utf-8');
  console.log(`Successfully generated ${OUTPUT_PATH} with ${Object.keys(normalized).length} mapping rules.`);
}

syncTvtms().catch((err) => {
  console.error('Error syncing TVTMS mapping:', err);
  process.exit(1);
});

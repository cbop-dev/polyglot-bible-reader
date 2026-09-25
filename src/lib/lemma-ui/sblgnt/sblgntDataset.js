import { VocabDataset, BookDict } from "../data/VocabDataset.js";
import { SblgntBooksDict } from "./ntbooks.js";
import SblgntLexes from "./sblGntLexes.json";

export class SblGntVocabDataset extends VocabDataset {
    static booksDict = new BookDict();
    static books = SblgntBooksDict;
    static posDict = {
        0:  { 'abbrev': 'RP', 'desc': 'Personal pronoun' },
        1:  { 'abbrev': 'RR', 'desc': 'Relative pronoun' },
        2:  { 'abbrev': 'RI', 'desc': 'Interrogative pronoun' },
        3:  { 'abbrev': 'V',  'desc': 'Verb' },
        4:  { 'abbrev': 'I',  'desc': 'Interjection' },
        5:  { 'abbrev': 'C',  'desc': 'Conjunction' },
        6:  { 'abbrev': 'D',  'desc': 'Adverb' },
        7:  { 'abbrev': 'RD', 'desc': 'Demonstrative pronoun' },
        8:  { 'abbrev': 'X',  'desc': 'Indefinite pronoun' },
        9:  { 'abbrev': 'N',  'desc': 'Noun' },
        10: { 'abbrev': 'P',  'desc': 'Preposition' },
        11: { 'abbrev': 'A',  'desc': 'Adjective' },
        12: { 'abbrev': 'RA', 'desc': 'Definite article' }
    };

    static chapters = { 
        137555: { 137582: 1, 137583: 2, 137584: 3, 137585: 4, 137586: 5, 137587: 6, 137588: 7, 137589: 8, 137590: 9, 137591: 10, 137592: 11, 137593: 12, 137594: 13, 137595: 14, 137596: 15, 137597: 16, 137598: 17, 137599: 18, 137600: 19, 137601: 20, 137602: 21, 137603: 22, 137604: 23, 137605: 24, 137606: 25, 137607: 26, 137608: 27, 137609: 28 }, 
        137556: { 137610: 1, 137611: 2, 137612: 3, 137613: 4, 137614: 5, 137615: 6, 137616: 7, 137617: 8, 137618: 9, 137619: 10, 137620: 11, 137621: 12, 137622: 13, 137623: 14, 137624: 15, 137625: 16 }, 
        137557: { 137626: 1, 137627: 2, 137628: 3, 137629: 4, 137630: 5, 137631: 6, 137632: 7, 137633: 8, 137634: 9, 137635: 10, 137636: 11, 137637: 12, 137638: 13, 137639: 14, 137640: 15, 137641: 16, 137642: 17, 137643: 18, 137644: 19, 137645: 20, 137646: 21, 137647: 22, 137648: 23, 137649: 24 }, 
        137558: { 137650: 1, 137651: 2, 137652: 3, 137653: 4, 137654: 5, 137655: 6, 137656: 7, 137657: 8, 137658: 9, 137659: 10, 137660: 11, 137661: 12, 137662: 13, 137663: 14, 137664: 15, 137665: 16, 137666: 17, 137667: 18, 137668: 19, 137669: 20, 137670: 21 }, 
        137559: { 137671: 1, 137672: 2, 137673: 3, 137674: 4, 137675: 5, 137676: 6, 137677: 7, 137678: 8, 137679: 9, 137680: 10, 137681: 11, 137682: 12, 137683: 13, 137684: 14, 137685: 15, 137686: 16, 137687: 17, 137688: 18, 137689: 19, 137690: 20, 137691: 21, 137692: 22, 137693: 23, 137694: 24, 137695: 25, 137696: 26, 137697: 27, 137698: 28 }, 
        137560: { 137699: 1, 137700: 2, 137701: 3, 137702: 4, 137703: 5, 137704: 6, 137705: 7, 137706: 8, 137707: 9, 137708: 10, 137709: 11, 137710: 12, 137711: 13, 137712: 14, 137713: 15, 137714: 16 }, 
        137561: { 137715: 1, 137716: 2, 137717: 3, 137718: 4, 137719: 5, 137720: 6, 137721: 7, 137722: 8, 137723: 9, 137724: 10, 137725: 11, 137726: 12, 137727: 13, 137728: 14, 137729: 15, 137730: 16 }, 
        137562: { 137731: 1, 137732: 2, 137733: 3, 137734: 4, 137735: 5, 137736: 6, 137737: 7, 137738: 8, 137739: 9, 137740: 10, 137741: 11, 137742: 12, 137743: 13 }, 
        137563: { 137744: 1, 137745: 2, 137746: 3, 137747: 4, 137748: 5, 137749: 6 }, 
        137564: { 137750: 1, 137751: 2, 137752: 3, 137753: 4, 137754: 5, 137755: 6 }, 
        137565: { 137756: 1, 137757: 2, 137758: 3, 137759: 4 }, 
        137566: { 137760: 1, 137761: 2, 137762: 3, 137763: 4 }, 
        137567: { 137764: 1, 137765: 2, 137766: 3, 137767: 4, 137768: 5 }, 
        137568: { 137769: 1, 137770: 2, 137771: 3 }, 
        137569: { 137772: 1, 137773: 2, 137774: 3, 137775: 4, 137776: 5, 137777: 6 }, 
        137570: { 137778: 1, 137779: 2, 137780: 3, 137781: 4 }, 
        137571: { 137782: 1, 137783: 2, 137784: 3 }, 
        137572: { 137785: 1 }, 
        137573: { 137786: 1, 137787: 2, 137788: 3, 137789: 4, 137790: 5, 137791: 6, 137792: 7, 137793: 8, 137794: 9, 137795: 10, 137796: 11, 137797: 12, 137798: 13 }, 
        137574: { 137799: 1, 137800: 2, 137801: 3, 137802: 4, 137803: 5 }, 
        137575: { 137804: 1, 137805: 2, 137806: 3, 137807: 4, 137808: 5 }, 
        137576: { 137809: 1, 137810: 2, 137811: 3 }, 
        137577: { 137812: 1, 137813: 2, 137814: 3, 137815: 4, 137816: 5 }, 
        137578: { 137817: 1 }, 
        137579: { 137818: 1 }, 
        137580: { 137819: 1 }, 
        137581: { 137820: 1, 137821: 2, 137822: 3, 137823: 4, 137824: 5, 137825: 6, 137826: 7, 137827: 8, 137828: 9, 137829: 10, 137830: 11, 137831: 12, 137832: 13, 137833: 14, 137834: 15, 137835: 16, 137836: 17, 137837: 18, 137838: 19, 137839: 20, 137840: 21, 137841: 22 } 
    };

    static posGroups = {};
    static posGroupsUIDesc = {
        "CONTENT": "Content words (nouns, verbs, adjectives, adverbs)",
        "SYNTAX": "Syntax words (conjunctions, particles, prepositions)",
        "PREPOSITIONS": "Prepositions",
        "PARTICLES": "Particles",
        "PRONOUNS": "Pronouns"
    };

    static SblgntLexes = SblgntLexes;
    static totalWords = 137554;
    static totalLexemes = 5461;

    constructor() {
        super();
        this.lang = "greek";
        this.name = "SBLGNT";
        this.abbrev = "SBLGNT";
        this.dbAbbrev = "sblgnt";
        this.booksDict = SblGntVocabDataset.booksDict;
        this.booksDict.books = SblGntVocabDataset.books;
        this.booksDict.chapters = SblGntVocabDataset.chapters;
        this.posDict = SblGntVocabDataset.posDict;
        this.posGroups = SblGntVocabDataset.posGroups;
        this.posGroupsUIDesc = SblGntVocabDataset.posGroupsUIDesc;
        this.lexStats.totalWords = SblGntVocabDataset.totalWords;
        this.lexStats.totalLexemes = SblGntVocabDataset.totalLexemes;
        this.lexemes = SblGntVocabDataset.SblgntLexes;
    }
}

// Backward compatibility alias
export { SblGntVocabDataset as TfSblGntDataset };
export default SblGntVocabDataset;

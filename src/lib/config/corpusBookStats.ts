/**
 * Pre-computed word and verse totals by biblical book and corpus.
 * Serves as an instant in-memory lookup and static/offline fallback.
 */

export interface BookWordStat {
	words: number;
	verses: number;
}

export const CORPUS_TOTAL_WORDS: Record<string, number> = {
  "kjv": 556037,
  "ognt": 138013,
  "swete_lxx": 605183,
  "wlc": 420141
};

export const CORPUS_BOOK_STATS: Record<string, Record<string, BookWordStat>> = {
  "kjv": {
    "1CH": {
      "words": 20489,
      "verses": 942
    },
    "1CO": {
      "words": 6086,
      "verses": 437
    },
    "1ES": {
      "words": 11790,
      "verses": 448
    },
    "1JN": {
      "words": 2520,
      "verses": 105
    },
    "1KI": {
      "words": 9726,
      "verses": 816
    },
    "1MA": {
      "words": 23177,
      "verses": 924
    },
    "1PE": {
      "words": 2481,
      "verses": 105
    },
    "1SA": {
      "words": 25195,
      "verses": 810
    },
    "1TH": {
      "words": 1849,
      "verses": 89
    },
    "1TI": {
      "words": 2263,
      "verses": 113
    },
    "2CH": {
      "words": 10260,
      "verses": 822
    },
    "2CO": {
      "words": 6095,
      "verses": 257
    },
    "2ES": {
      "words": 20446,
      "verses": 874
    },
    "2JN": {
      "words": 299,
      "verses": 13
    },
    "2KI": {
      "words": 23644,
      "verses": 719
    },
    "2MA": {
      "words": 16370,
      "verses": 555
    },
    "2PE": {
      "words": 1555,
      "verses": 61
    },
    "2SA": {
      "words": 20771,
      "verses": 695
    },
    "2TH": {
      "words": 1033,
      "verses": 47
    },
    "2TI": {
      "words": 1696,
      "verses": 83
    },
    "3JN": {
      "words": 295,
      "verses": 14
    },
    "ACT": {
      "words": 15891,
      "verses": 1007
    },
    "AMO": {
      "words": 1574,
      "verses": 146
    },
    "BAR": {
      "words": 5058,
      "verses": 213
    },
    "BEL": {
      "words": 1074,
      "verses": 42
    },
    "COL": {
      "words": 1373,
      "verses": 95
    },
    "DAN": {
      "words": 5066,
      "verses": 357
    },
    "DEU": {
      "words": 10153,
      "verses": 959
    },
    "ECC": {
      "words": 2107,
      "verses": 222
    },
    "EPH": {
      "words": 2031,
      "verses": 155
    },
    "ESG": {
      "words": 2712,
      "verses": 105
    },
    "EST": {
      "words": 2322,
      "verses": 167
    },
    "EXO": {
      "words": 12541,
      "verses": 1213
    },
    "EZK": {
      "words": 14092,
      "verses": 1273
    },
    "EZR": {
      "words": 3254,
      "verses": 280
    },
    "GAL": {
      "words": 2003,
      "verses": 149
    },
    "GEN": {
      "words": 15469,
      "verses": 1533
    },
    "HAB": {
      "words": 546,
      "verses": 56
    },
    "HAG": {
      "words": 449,
      "verses": 38
    },
    "HEB": {
      "words": 4302,
      "verses": 303
    },
    "HOS": {
      "words": 1836,
      "verses": 197
    },
    "ISA": {
      "words": 13399,
      "verses": 1292
    },
    "JAS": {
      "words": 1529,
      "verses": 108
    },
    "JDG": {
      "words": 7357,
      "verses": 618
    },
    "JDT": {
      "words": 11071,
      "verses": 339
    },
    "JER": {
      "words": 15707,
      "verses": 1364
    },
    "JHN": {
      "words": 13619,
      "verses": 879
    },
    "JOB": {
      "words": 6693,
      "verses": 1070
    },
    "JOL": {
      "words": 760,
      "verses": 73
    },
    "JON": {
      "words": 509,
      "verses": 48
    },
    "JOS": {
      "words": 7400,
      "verses": 658
    },
    "JUD": {
      "words": 397,
      "verses": 25
    },
    "LAM": {
      "words": 1277,
      "verses": 154
    },
    "LEV": {
      "words": 8493,
      "verses": 859
    },
    "LUK": {
      "words": 17146,
      "verses": 1151
    },
    "MAL": {
      "words": 639,
      "verses": 55
    },
    "MAN": {
      "words": 408,
      "verses": 1
    },
    "MAT": {
      "words": 15899,
      "verses": 1071
    },
    "MIC": {
      "words": 1096,
      "verses": 105
    },
    "MRK": {
      "words": 10026,
      "verses": 678
    },
    "NAM": {
      "words": 467,
      "verses": 47
    },
    "NEH": {
      "words": 4274,
      "verses": 406
    },
    "NUM": {
      "words": 12856,
      "verses": 1288
    },
    "OBA": {
      "words": 221,
      "verses": 21
    },
    "PHM": {
      "words": 319,
      "verses": 25
    },
    "PHP": {
      "words": 1457,
      "verses": 104
    },
    "PRO": {
      "words": 6105,
      "verses": 915
    },
    "PSA": {
      "words": 16517,
      "verses": 2461
    },
    "REV": {
      "words": 8103,
      "verses": 404
    },
    "ROM": {
      "words": 6121,
      "verses": 433
    },
    "RUT": {
      "words": 931,
      "verses": 85
    },
    "S3Y": {
      "words": 1411,
      "verses": 68
    },
    "SIR": {
      "words": 28316,
      "verses": 1392
    },
    "SNG": {
      "words": 1022,
      "verses": 117
    },
    "SUS": {
      "words": 1450,
      "verses": 64
    },
    "TIT": {
      "words": 627,
      "verses": 46
    },
    "TOB": {
      "words": 6978,
      "verses": 244
    },
    "WIS": {
      "words": 10618,
      "verses": 436
    },
    "ZEC": {
      "words": 2339,
      "verses": 211
    },
    "ZEP": {
      "words": 587,
      "verses": 53
    }
  },
  "ognt": {
    "1CO": {
      "words": 6830,
      "verses": 437
    },
    "1JN": {
      "words": 2140,
      "verses": 105
    },
    "1PE": {
      "words": 1679,
      "verses": 105
    },
    "1TH": {
      "words": 1481,
      "verses": 89
    },
    "1TI": {
      "words": 1591,
      "verses": 113
    },
    "2CO": {
      "words": 4477,
      "verses": 256
    },
    "2JN": {
      "words": 245,
      "verses": 13
    },
    "2PE": {
      "words": 1099,
      "verses": 61
    },
    "2TH": {
      "words": 823,
      "verses": 47
    },
    "2TI": {
      "words": 1238,
      "verses": 83
    },
    "3JN": {
      "words": 218,
      "verses": 15
    },
    "ACT": {
      "words": 18450,
      "verses": 1002
    },
    "COL": {
      "words": 1582,
      "verses": 95
    },
    "EPH": {
      "words": 2422,
      "verses": 155
    },
    "GAL": {
      "words": 2230,
      "verses": 149
    },
    "HEB": {
      "words": 4953,
      "verses": 303
    },
    "JAS": {
      "words": 1745,
      "verses": 108
    },
    "JHN": {
      "words": 15635,
      "verses": 878
    },
    "JUD": {
      "words": 458,
      "verses": 25
    },
    "LUK": {
      "words": 19482,
      "verses": 1149
    },
    "MAT": {
      "words": 18346,
      "verses": 1068
    },
    "MRK": {
      "words": 11304,
      "verses": 673
    },
    "PHM": {
      "words": 335,
      "verses": 25
    },
    "PHP": {
      "words": 1629,
      "verses": 104
    },
    "REV": {
      "words": 9851,
      "verses": 405
    },
    "ROM": {
      "words": 7111,
      "verses": 432
    },
    "TIT": {
      "words": 659,
      "verses": 46
    }
  },
  "swete_lxx": {
    "1CH": {
      "words": 16244,
      "verses": 930
    },
    "1ES": {
      "words": 8994,
      "verses": 434
    },
    "1KI": {
      "words": 20803,
      "verses": 756
    },
    "1MA": {
      "words": 18292,
      "verses": 924
    },
    "1SA": {
      "words": 20131,
      "verses": 772
    },
    "2CH": {
      "words": 21353,
      "verses": 821
    },
    "2KI": {
      "words": 18853,
      "verses": 719
    },
    "2MA": {
      "words": 11917,
      "verses": 555
    },
    "2SA": {
      "words": 17927,
      "verses": 695
    },
    "3MA": {
      "words": 5110,
      "verses": 228
    },
    "4MA": {
      "words": 7859,
      "verses": 479
    },
    "AMO": {
      "words": 3210,
      "verses": 146
    },
    "BAR": {
      "words": 3869,
      "verses": 213
    },
    "BEL": {
      "words": 871,
      "verses": 42
    },
    "BLG": {
      "words": 901,
      "verses": 37
    },
    "DAG": {
      "words": 10781,
      "verses": 406
    },
    "DAN": {
      "words": 10453,
      "verses": 424
    },
    "DEU": {
      "words": 22990,
      "verses": 959
    },
    "ECC": {
      "words": 4546,
      "verses": 222
    },
    "EST": {
      "words": 5843,
      "verses": 164
    },
    "EXO": {
      "words": 24816,
      "verses": 1163
    },
    "EZK": {
      "words": 29658,
      "verses": 1267
    },
    "EZR": {
      "words": 5586,
      "verses": 280
    },
    "GEN": {
      "words": 32566,
      "verses": 1531
    },
    "HAB": {
      "words": 1105,
      "verses": 56
    },
    "HAG": {
      "words": 947,
      "verses": 38
    },
    "HOS": {
      "words": 3941,
      "verses": 197
    },
    "ISA": {
      "words": 27075,
      "verses": 1289
    },
    "JDG": {
      "words": 15947,
      "verses": 618
    },
    "JDT": {
      "words": 9174,
      "verses": 340
    },
    "JER": {
      "words": 28948,
      "verses": 1298
    },
    "JOB": {
      "words": 13561,
      "verses": 1069
    },
    "JOL": {
      "words": 1580,
      "verses": 73
    },
    "JON": {
      "words": 1090,
      "verses": 48
    },
    "JOS": {
      "words": 13670,
      "verses": 596
    },
    "LAM": {
      "words": 2391,
      "verses": 151
    },
    "LEV": {
      "words": 19082,
      "verses": 859
    },
    "LJE": {
      "words": 24,
      "verses": 1
    },
    "MAL": {
      "words": 1416,
      "verses": 55
    },
    "MIC": {
      "words": 2368,
      "verses": 105
    },
    "NAM": {
      "words": 937,
      "verses": 47
    },
    "NEH": {
      "words": 7676,
      "verses": 392
    },
    "NUM": {
      "words": 25059,
      "verses": 1287
    },
    "OBA": {
      "words": 472,
      "verses": 21
    },
    "ODA": {
      "words": 4187,
      "verses": 288
    },
    "PRO": {
      "words": 10524,
      "verses": 846
    },
    "PSA": {
      "words": 34964,
      "verses": 2533
    },
    "PSS": {
      "words": 4926,
      "verses": 310
    },
    "RUT": {
      "words": 2072,
      "verses": 85
    },
    "SIR": {
      "words": 18658,
      "verses": 1402
    },
    "SNG": {
      "words": 2025,
      "verses": 117
    },
    "SUG": {
      "words": 792,
      "verses": 36
    },
    "SUS": {
      "words": 1134,
      "verses": 64
    },
    "TOB": {
      "words": 12736,
      "verses": 480
    },
    "WIS": {
      "words": 6943,
      "verses": 435
    },
    "ZEC": {
      "words": 4963,
      "verses": 211
    },
    "ZEP": {
      "words": 1223,
      "verses": 53
    }
  },
  "wlc": {
    "1CH": {
      "words": 15333,
      "verses": 943
    },
    "1KI": {
      "words": 18408,
      "verses": 817
    },
    "1SA": {
      "words": 18665,
      "verses": 811
    },
    "2CH": {
      "words": 19448,
      "verses": 822
    },
    "2KI": {
      "words": 17107,
      "verses": 719
    },
    "2SA": {
      "words": 15453,
      "verses": 695
    },
    "AMO": {
      "words": 2726,
      "verses": 146
    },
    "DAN": {
      "words": 8021,
      "verses": 357
    },
    "DEU": {
      "words": 19812,
      "verses": 959
    },
    "ECC": {
      "words": 4144,
      "verses": 222
    },
    "EST": {
      "words": 4551,
      "verses": 167
    },
    "EXO": {
      "words": 23385,
      "verses": 1213
    },
    "EZK": {
      "words": 25746,
      "verses": 1273
    },
    "EZR": {
      "words": 5217,
      "verses": 280
    },
    "GEN": {
      "words": 28478,
      "verses": 1533
    },
    "HAB": {
      "words": 879,
      "verses": 56
    },
    "HAG": {
      "words": 860,
      "verses": 38
    },
    "HOS": {
      "words": 3086,
      "verses": 197
    },
    "ISA": {
      "words": 22501,
      "verses": 1291
    },
    "JDG": {
      "words": 13899,
      "verses": 618
    },
    "JER": {
      "words": 29261,
      "verses": 1364
    },
    "JOB": {
      "words": 10737,
      "verses": 1070
    },
    "JOL": {
      "words": 1297,
      "verses": 73
    },
    "JON": {
      "words": 977,
      "verses": 48
    },
    "JOS": {
      "words": 14307,
      "verses": 658
    },
    "LAM": {
      "words": 1893,
      "verses": 154
    },
    "LEV": {
      "words": 16759,
      "verses": 859
    },
    "MAL": {
      "words": 1168,
      "verses": 55
    },
    "MIC": {
      "words": 1868,
      "verses": 105
    },
    "NAM": {
      "words": 725,
      "verses": 47
    },
    "NEH": {
      "words": 7717,
      "verses": 405
    },
    "NUM": {
      "words": 22812,
      "verses": 1289
    },
    "OBA": {
      "words": 387,
      "verses": 21
    },
    "PRO": {
      "words": 8725,
      "verses": 915
    },
    "PSA": {
      "words": 24964,
      "verses": 2527
    },
    "RUT": {
      "words": 1787,
      "verses": 85
    },
    "SNG": {
      "words": 1632,
      "verses": 117
    },
    "ZEC": {
      "words": 4392,
      "verses": 211
    },
    "ZEP": {
      "words": 1014,
      "verses": 53
    }
  }
};

export function getStaticCorpusTotalWords(corpusId: string): number {
	const c = corpusId.toLowerCase();
	return CORPUS_TOTAL_WORDS[c] || 0;
}

export function getStaticBookWordStats(corpusId: string, bookCode: string): BookWordStat | null {
	const c = corpusId.toLowerCase();
	const b = (bookCode || '').toUpperCase();
	return CORPUS_BOOK_STATS[c]?.[b] || null;
}

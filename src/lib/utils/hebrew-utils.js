export class HebrewUtils {
	static hebLetters

	static hebVowels
	static hebNormalMarks
	static hebSpaces
	static latinBetaCodeLetters
	static latinGreekMap
	static keepChars
	static {
		this.keepChars = ".: -\u0BC3\u0BCE".split("");
		this.hebLetters = "\u05D0\u05D1\u05D2\u05D3\u05D4\u05D5\u05D6\u05D7\u05D8\u05D9\u05DA\u05DB\u05DC\u05DD\u05DE\u05E0\u05E1\u05E2\u05E3\u05E4\u05E5\u05E6\u05E7\u05E8\u05E9\uFB2B\uFB2A\u05EA\u05F0\u05F1\u05F2".split("")
		this.hebMarks = ["\u0591", "\u0592", "\u0593", "\u0594", "\u0595", "\u0596", "\u0597", "\u0598", "\u0599", "\u059A", "\u059B", "\u059C", "\u059D", "\u059E", "\u059F", "\u05A0", "\u05A1", "\u05A2", "\u05A3", "\u05A4", "\u05A5", "\u05A6", "\u05A7", "\u05A8", "\u05A9", "\u05AA", "\u05AB", "\u05AC", "\u05AD", "\u05AE", "\u05AF", "\u05B0", "\u05B1", "\u05B2", "\u05B3", "\u05B4", "\u05B5", "\u05B6", "\u05B7", "\u05B8", "\u05B9", "\u05BA", "\u05BB", "\u05BC", "\u05BD", "\u05C0", "\u05C1", "\u05C2", "\u05C3", "\u05C4", "\u05C5", "\u05C6", "\u05C7"]
		this.hebSpaces = ["\u05BE"]
		this.hebNormalMarks = "\u05DA\u05DD\u05DF\u05E5\u05E3".split("")
		this.allHebrew = this.keepChars + this.hebLetters + this.hebMarks + this.hebSpaces + this.hebNormalMarks




	}

	static removeNonHebrew(s) {
		var hebRe = new RegExp("[^" + this.allHebrew + ".: -]", "g");
		console.log("HebRe: " + hebRe.toString())

		return s.replace(/(u202C|\s)+/g, " ").replace(hebRe, '').replaceAll(/ +/g, ' ');
	}
	/**
	 * 
	 * @param {string} h 
	 * @returns {string} input, removing all hebrew vowel and other marking characters
	 */
	static makePlain(h) {
		return this.normalizeHebrew(h).replaceAll(new RegExp("[" + this.hebMarks + "]+", "g"), "");
	}

	static consonantsEqual(h1, h2) {
		return this.removeFinalConsonants(this.makePlain(h1)) == this.removeFinalConsonants(this.makePlain(h2));
	}

	static betaCodeToHebrew = {
		// Consonants
		')': '\u05D0', // Alef
		'A': '\u05D0', // Alef
		'>': '\u05D0', // Alef
		'B': '\u05D1', // Bet
		'G': '\u05D2', // Gimel
		'D': '\u05D3', // Dalet
		'H': '\u05D4', // He
		'W': '\u05D5', // Waw
		'Z': '\u05D6', // Zayin
		'X': '\u05D7', // Het
		'+': '\u05D8', // Tet
		'V': '\u05D8', // Tet
		'Y': '\u05D9', // Yod
		'K': '\u05DB', // Kaf
		'L': '\u05DC', // Lamed
		'M': '\u05DD', // Mem
		'N': '\u05E0', // Nun
		'S': '\u05E1', // Samekh
		'(': '\u05E2', // Ayin
		'<': '\u05E2', // Ayin
		'P': '\u05E4', // Pe
		'C': '\u05E6', // Tsade
		'Q': '\u05E7', // Qof
		'R': '\u05E8', // Resh
		'#': '\u05E9', // Sin/Shin (General)
		'&': '\u05E9', // Sin/shin (general)
		'F': '\uFB2B', // Sin with dot
		'$': '\uFB2A', // Shin with dot
		'J': '\uFB2A', // Shin with dot
		'T': '\u05EA', // Taw

	};


	/**
	 * @type {Object<string,string>} betaCodeFinalConsonants
	 * @description mapping of normal consonants (keys) to final forms (values)
	 */
	static betaCodeFinalConsonants =
		{


			//kaf:
			'\u05DB': '\u05DA',
			//mem:
			'\u05DE': '\u05DD',
			//nun:
			'\u05E0': '\u05DF',
			//pe:
			'\u05E4': '\u05E3',
			//tsade:
			'\u05E6': '\u05E5'

		}

	/**
	 * 
	 * @param {string} hebrewString 
	 * @returns  {string}
	 */
	static removeFinalConsonants(hebrewString) {
		return hebrewString.replaceAll(/./g,
			(x) => (Object.entries(this.betaCodeFinalConsonants)
				.find(([k, v]) => v == x)
				?.find((_) => _)) || x);	//NB: this is a bit of a hack, but it works: if an array, get the first item. otherwise, return the input.
	}

	/**
	 * 
	 * @param {string} hebrewString 
	 * @description return the string with any ending Hebrew consonants (i.e., not followed by another letter) converted to their final form (if such exists)
	 */
	static convertFinalConsonant(hebrewString) {
		return this.removeFinalConsonants(hebrewString)
			.replaceAll(/.(?=$|\s)/g, (x) => (this.betaCodeFinalConsonants[x] || x));

	}
	/**
	 * 
	 * @param {string} beta 
	 * @returns  {string}
	 */
	static beta2Hebrew(beta) {
		return HebrewUtils.convertFinalConsonant(beta.toLocaleUpperCase().split('').map(char => HebrewUtils.betaCodeToHebrew[char] || char).join(''));
	}

	/**
	 * 
	 * @param {string} hebrew 
	 * @returns {string}
	 */
	static normalizeHebrew(hebrew) {
		const theMap = {
			"שׁ": "\uFB2A",//#two characters of shin with dot -> combined single unicode char
			"שׂ": "\uFB2B"
		};

		for (const [old, replace] of Object.entries(theMap)) {
			hebrew = hebrew.replaceAll(old, replace);
		}

		return hebrew.replaceAll(/./g, (c) => Object.values(theMap).includes(c) ? c : c.normalize("NFD"));
	}
}

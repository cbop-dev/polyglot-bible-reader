class GreekUtils {
	static greekLetters
	static latinBetaCodeLetters
	static latinGreekMap
	
	static {
		this.greekLetters = "αβγδεζηιθκλμνξοπρσςτυφχψωϝΑΒΓΔΕΖΗΙΘΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩϜ".split("")
		this.greekDiac = '\u0314\u0313\u0342\u0301\u0345\u0308\u0300\'';
		this.greek = this.greekLetters + this.greekDiac;
		this.greekBetaDiac = '()=/|+\\#';
		this.latinBetaCodeLetters = "abgdezhiqklmncoprsstufxywvABGDEZHIQKLMNCOPRSTUFXYWV".split("")
		this.beta = this.latinBetaCodeLetters + this.greekBetaDiac;
		this.latinGreekMap = new Object();
		
		for (var i = 0; i < this.greekLetters.length; i++){
			this.latinGreekMap[this.latinBetaCodeLetters[i]] = this.greekLetters[i];
		}
		
		this.greekLatinMap = new Object();
		
		for (var i = 0; i < this.latinBetaCodeLetters.length; i++){
			this.greekLatinMap[this.greekLetters[i]] = this.latinBetaCodeLetters[i];
		}
	}

	static greek2Beta(greekString) {
		var betaChars = []
		var greekChars = greekString.split("");
		for (var i = 0; i <  greekChars.length; i++) {
			var lookupIndex = this.greekLetters.indexOf(greekChars[i]);
			/*if ( lookupIndex >= 0) {
				betaChars.push(this.latinBetaCodeLetters[lookupIndex] || greekChars[i]);
			}*/
		}
		return betaChars.join("");
	}
	static beta2Greek(betaString) {

		var greekChars = []
		var latinChars = betaString.split("");
		for (var i = 0; i < latinChars.length; i++) {
			var lookupIndex = this.beta.indexOf(betaString[i]);
			/* if (lookupIndex >= 0) {*/			
				greekChars.push(this.greek[lookupIndex] || latinChars[i]);
			/* } */	
		}		
		return greekChars.join("").replaceAll('ς','σ').replace(/σ$/, 'ς');
	}
	
	/** TODO 
	 *  searches an array of strings for all strings that contain searchString
	 * 
	 * **/
	static fuzzySearchArray(searchString, stringArray, limit = -1) {
		var sString = searchString.replace('ς','σ');
		var toCheck = ['*', '?', '.', '+'];

		if (toCheck.some(c => sString.includes(c))) /* (sString.includes("*"))*/
		{
			sString = sString.replace("*", ".*");
			sString = sString.replace("?", ".?");
			sString = sString.replace("+", ".+");
			var regex = new RegExp("^" + sString);
			var partialMatch = function(stringObj) {
				//console.debug("Limit: " + limit)
				var sObj = stringObj.replace('ς','σ')
				if (false) {
					//console.debug("Yep!")
					return (sObj.search(regex) >= 0);
				}
				else if ((limit < 1 || this.count < limit) && (sObj.search(regex) >= 0)) {
					//console.debug("Here we is!")
					this.count++;
					return true;
				}
				else {
					//console.debug("Dare we are!")
					return false
				}

			}
		}
		else
		{

			var partialMatch = function(stringObj) {
				//console.debug("Limit: " + limit)
				var sObj = stringObj.replace('ς','σ')
				if (false) {
					//console.debug("Yep!")
					return sObj.includes(sString)

				}
				else if ((limit < 1 || this.count < limit) && sObj.includes(sString)) {
					//console.debug("Here we is!")
					this.count++;

					return true;
				}
				else {
					//console.debug("Dare we are!")
					return false
				}

			}
		}
		
		return stringArray.filter(partialMatch, {count: 0})
		
	}
	
	/**
	 * 
	 * @param {string} greek 
	 * @returns {string} input with diacritics removed
	 */
	static removeDiacritics (greek) {
		if (!greek || typeof greek !== 'string') return '';
		let norm = greek.normalize('NFD').replace(/[\u0300-\u036f\u0313\u0314\u0342\u0345\u0308']+/g, '').normalize('NFC');
		return norm.replace(/[.,;·:!?᾽’”“«»\-—\(\)\[\]⟦⟧⟨⟩⟪⟫⸂⸃⸆⸇⸀⸁⸄⸅⸈⸉⸊⸋†‡*0-9\s]+/gu, '');
	}


	/**
	 * 
	 * @param {string} greek 
	 * @returns {string} input without diacritics. Easy for sorting/searching!
	 */
	static plainGreek(greek){
		return this.removeDiacritics(greek).toLowerCase().replace(/ς/g, 'σ').trim();
	}	
}

//module.exports= GreekUtils;
export {GreekUtils};


//GreekUtils.fuzzySearchArray("fred", ["fred", "fresd", "afredas", "Jokfres"]);

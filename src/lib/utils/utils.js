const Utils = {
    copyToClipboard(text) {
        navigator.clipboard.writeText(text);
    },
    

    /**
     * @description searches an array of strings for all strings that contain searchString*, and returns the matching strings in an array.
     * Empty array if no matches.
     * @param {string} searchString 
     * @param {string[]} stringArray 
     * @param {number} limit 
     * @returns {string[]}
     */
    fuzzySearchArray(searchString, stringArray, limit = -1) {
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
}

export {Utils}
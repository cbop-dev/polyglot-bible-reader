import { writable, get } from 'svelte/store';

export const server = '';

export const debug = writable(false);

export const levels = {
    RIDICULOUS: -100,
    DEBUG: 0,
    INFO: 1,
    LOG: 2,
    WARNING: 3,
    ERROR: 4,
    NONE: 100
};

let defaultLevel = 0;

export function mylog(msg, debugOn = get(debug), thelevel = defaultLevel) {
    if (debugOn && thelevel >= defaultLevel) {
        console.log(msg);
    }
}

/**
 * @param {number} level
 * @returns {boolean}
 */
export function setLogLevel(level) {
    let success = false;
    if (Object.values(levels).includes(level)) {
        success = true;
    }
    return success;
}

export let log = {
    debug: debug,
    defaultLevel: defaultLevel,
    levels: levels,
    mylog: mylog,
    setLogLevel: setLogLevel
};

export default {
    debug: debug,
    mylog: mylog
};

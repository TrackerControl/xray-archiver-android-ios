
const ios = require('app-store-scraper');

const logger = require('../../util/logger');
const DB = require('../../db/db_ios');
const db = new DB('explorer');

/**
 * Wipes a file at a specified location of text
 * @param {*Location of the file to be written to...} location
 */
/*
function wipeScrapedWords(location) {
    fs.writeFile(location, '', (err) => {
        if (err) {
            logger.err(err.message);
        }
    });
}
*/

/**
 *  Writes a word to a file at a specified location
 * @param {*The word to be written to a file...} word
 * @param {*The location of the file to be written to...} location
 */
/*
function writeScrapedWords(word, location) {
    fs.appendFile(location, `${word}\n`, (err) => {
        if (err) {
            logger.err(err.message);
        }
    });
}
*/

/**
 * Used returns an array where each line is a search term.
 * @param {*the location of the file that is to be read} filepath
 */
/*
function openSearchTerms(filepath) {
    return fs.readFileSync(filepath).toString().split('\n');
}
*/

/**
 * Parses a file of search terms, adding each line as a search term to the DB
 * @param {*Location of a file to import search terms from} filepath
 */
/*
function importFileTerms(filepath) {
    openSearchTerms(filepath).forEach((term) => db.insertSearchTerm(term));
}
*/
function flatten(arr) {
    return arr.reduce((a, b) => a.concat(b), []);
}

/**
 * Creates a cartesion product of arrays of strings.
 * https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
 * Eg, ['a', 'b', 'c'] x2 => ['aa' ''ab' 'ac' 'ba' 'bb'] ...
 */
function cartesianProductChars(...args) {
    return args.reduce((prods, arr) =>
        flatten(prods.map((prod) => arr.map((v) => prod.concat(v)))), [[]])
            .map( x => x.join('') ); // flatten
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Creates a file of suggestions made by Google play when passing
 * the start of strings, eg. 'a', 'b', 'aa', 'ab' ...
 *
 * @param {*The list of words used to get autocompletes} startingWords
 */
async function scrapeSuggestedWords(startingTokens) {
    // TODO: return array of suggested search terms
    for (const token of startingTokens) {
        try {
            const suggestions = await ios.suggest({ country: 'gb', term: token, throttle: 3 });
            for (const suggestion of suggestions) {
                logger.debug(`Inserting to DB: ${suggestion.term}`);
                await db.insertSearchTerm(suggestion.term).catch((err) => logger.err(err));
            }
        } catch(err) {            
            logger.debug(`pausing due to error while downloading: ${err}`);
            await sleep(2 * 60 * 1000); // wait for two minutes
        }
    }
}

// TODO this stuff needs moving somewhere...
const single = 'abcdefghijklmnopqrstuvwxyz '.split('');
const double = cartesianProductChars(single, single);
const triple = cartesianProductChars(single, single, single);

const charTriples = single.concat(double).concat(triple);

scrapeSuggestedWords(charTriples);

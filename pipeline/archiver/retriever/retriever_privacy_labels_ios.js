
const ios = require('app-store-scraper');

const logger = require('../../util/logger');
const db = new (require('../../db/db_ios'))('retriever');

const region = 'gb';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

(async() => {
    const apps = await db.getMissingPrivacyLabels();
    for (const app of apps) {
        logger.info(`fetching privacy labels for: ${app.app}`);
        try {
	    let regexId = /https:\/\/apps\.apple\.com\/[^\/]+\/[^\/]+\/[^\/]+\/id([0-9]+)/g;	
            let match = regexId.exec(app.store_url);
	    
	    if (!match || !match[1])
	    	continue;

	    let id = match[1];
	    let privacyLabels = await ios.privacy({id: id});

	    console.log(privacyLabels);
	   
            // update in database
	    await db.updatePrivacyLabel(id, privacyLabels)
        } catch(err) {
            logger.debug(`pausing due to error while fetching privacy labels: ${err}`);
            await sleep(30 * 1000); // wait
        }
    }
})();

const logger = require('../../util/logger');

const region = 'gb';

let db = new (require('../../db/db'))('retriever');
let retriever = require('google-play-scraper');
let throttle = 10;
let timeout = 10 * 1000;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

(async() => {
    while(true) {
        const batch = 1000;
        const res = await db.query(
            'SELECT a.id, app, store_url \
             FROM playstore_apps b \
             JOIN app_versions a ON a.id = b.id \
             WHERE offersIAP IS NULL AND date_part(\'year\', released) > 2000 \
             ORDER BY updated DESC \
             LIMIT $1 ', [batch]);
        if (res.rowCount <= 0) {
            logger.info('No more apps to process. Exiting..');
            break;
        }
        logger.info('Found apps to process:', res.rowCount);

        try {
            await Promise.all( res.rows.map( app => {
                let id = app.app;
                return retriever.app({
                    appId: id, 
                    throttle: throttle,
                    country: region
                }).then(async(appData) => {
                    if (appData.offersIAP !== undefined) {                                
                        logger.debug(`updating ${appData.title} with ${appData.offersIAP} in DB`);
                        await db.query(
                            'UPDATE playstore_apps \
                             SET offersIAP = $1 \
                             WHERE id = $2',
                             [appData.offersIAP ? 1 : 0, app.id]
                        );
                    } else {
                        logger.debug(`nothing to update for ${appData.title} in DB`);
                        await db.query(
                            'UPDATE playstore_apps \
                             SET offersIAP = $1 \
                             WHERE id = $2',
                             [-2, app.id]
                        );
                    }
                },
                async (err) => {
                    logger.err(`Error Requesting processing: ${app.app} (${id}). Error: ${err}`);
                    if (err.message.includes('App not found (404)')) {
                        await db.query(
                            'UPDATE playstore_apps \
                             SET offersIAP = $1 \
                             WHERE id = $2',
                             [-1, app.id]
                        );
                        logger.err('APP NOT FOUND 404');
                    } else {
                        throw err;
                    }
                });
            }))
        } catch(err) {
            logger.debug(`pausing due to error while processing: ${err}`);
            await sleep(timeout);
        }
    }
})();

const logger = require('../../util/logger');

const region = 'gb';
const platform = process.argv[2];

let db;
let retriever;
let throttle;
let timeout;
db = new (require('../../db/db_ios'))('retriever');
retriever = require('app-store-scraper');
timeout = 2 * 60 * 1000;
throttle = 3;
chunkSize = 200;

const requestLib = require('request');
const request = require('throttled-request')(requestLib);
request.configure({
  requests: throttle,
  milliseconds: 1000
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const LOOKUP_URL = 'https://uclient-api.itunes.apple.com/WebObjects/MZStorePlatform.woa/wa/lookup?version=2&p=mdm-lockup&caller=MDM&cc=gb&l=en';

const doRequest = (url, headers, requestOptions) => new Promise(function (resolve, reject) {
  console.log('Making request: ', url, headers, requestOptions);

  requestOptions = Object.assign({ method: 'GET' }, requestOptions);

  request(Object.assign({ url, headers }, requestOptions), (error, response, body) => {
    if (error) {
      console.log('Request error', error);
      return reject(error);
    }
    if (response.statusCode >= 400) {
      return reject({ response });
    }
    console.log('Finished request');
    resolve(body);
  });
});

function lookup (ids, idField, requestOptions) {
  idField = idField || 'bundleId';
  const joinedIds = ids.join(',');
  const url = `${LOOKUP_URL}&${idField}=${joinedIds}`;
  return doRequest(url, {}, requestOptions)
    .then(JSON.parse);
}

(async() => {
  const res = await db.query(
      'SELECT a.id, app \
       FROM playstore_apps b \
       JOIN app_versions a ON a.id = b.id \
       WHERE offersIAP IS NULL', []);
  logger.info('Found apps to process:', res.rowCount);

  let chunk = [];
  let i = 0;
  for (let row of res.rows) {
    chunk.push(row);
    i++;

    if (chunk.length == chunkSize) {
      try {
         console.log('Processed:', i, 'Percent:', Math.round(i / res.rows.length * 10000) / 100, '%');
         let ids = [];
         for (let rowi of chunk) {
            ids.push(rowi.app);
         }
         let apps = await lookup(ids);

         for (let rowi of chunk) {
           if (rowi.app in apps.results) {
             let IAP = ('hasInAppPurchases' in apps.results[rowi.app]) && apps.results[rowi.app].hasInAppPurchases;
             await db.query(
                 'UPDATE playstore_apps \
                  SET offersIAP = $1, extendedInfo = $2 \
                  WHERE id = $3',
                  [IAP, apps.results[rowi.app], rowi.id]
             );
           }
         }
      } catch(err) {
          logger.debug(`pausing due to error while processing: ${err}`);
          await sleep(timeout);
      }
      
      chunk = [];
    }
  }
})();

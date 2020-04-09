/*
Download process spawner
*/
const logger = require('../util/logger');
const db = new (require('../db/db'))('downloader');
const trackerSignatures = require('./tracker_signatures');

const analysisVersion = 2;

async function analyse(app) {    
    logger.info('Starting analysis attempt for:', app.app);
    await db.updatedAnalyseAttempt(app);
    let manifestJson = JSON.stringify(app.manifest);

    // Detect trackers
    let trackers = [];
    trackerSignatures.manifest.forEach(signature => {
        if (manifestJson.includes(signature.signature))
            trackers.push(signature.name);
    });

    let hasFB = trackers.includes('FB');
    let hasFirebase = trackers.includes('Firebase');
    let hasGAds = trackers.includes('GAds');
    let hasGCM = trackers.includes('GCM');

    // Check if the app uses any tracking settings
    let metaData = app.manifest['manifest']['application']['meta-data'];
    let trackerSettings = [];
    if (metaData) {
        // object instead of array?
        if (!Array.isArray(metaData))
            metaData = [metaData];

        trackerSignatures.settings.forEach(setting => {
            metaData.forEach(metaDatum => {
                if (metaDatum['-name'] == setting.signature
                    && metaDatum['-value'] === setting.value)
                trackerSettings.push(setting.name);
            });
        });
    }
    await db.updateAppAnalysis(app, trackers, trackerSettings, hasFB, hasFirebase, hasGAds, hasGCM, analysisVersion);
}

function getWorkerDetails() {
    let args = process.argv.slice(2);
    let workerNumber = args[0];
    let workerTotal = args[1];
    let isWorker = workerNumber !== undefined
                    && workerTotal !== undefined

    return { isWorker, workerNumber, workerTotal };
}

async function main() {
    let { isWorker, workerNumber, workerTotal } = getWorkerDetails();
    console.log('isWorker', isWorker, 'workerNumber', workerNumber, 'workerTotal', workerTotal);

    for (;;) {
        let apps;
        try {
            apps = await db.queryAppsToAnalyse(1000, analysisVersion);
        } catch (err) {
            await new Promise((resolve) => setTimeout(resolve, 30000));
            continue;
        }

        for (const app of apps ) {
            if (isWorker && app.id % workerTotal != workerNumber) {
                console.log('Skipping app ' + app.id);
                continue;
            }

            try {
                await analyse(app).catch((err) => {
                    throw err;
                });
            } catch (err) {
                logger.err(
                    `Error Analysing application with package name: ${app.app}.`,
                    `Error: ${err}`
                );
            }
        }
    }
}

main();
